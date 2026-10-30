import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
import fitz

from app.database.session import get_db
from app.models.project import Project, ProjectDocument, DocumentRevision
from app.models.requirement import Requirement, RequirementCorrection, Standard, StandardClause
from app.models.evidence import EvidenceRecord, EvidenceMapping, ReviewTask
from app.models.reconciliation import ReconciliationResult, Dependency, RiskAssessment
from app.models.governance import AuditRecord, SimulationRun, EvaluationRun, GeneratedReport

from app.schemas.project import ProjectCreate, ProjectResponse, DocumentResponse
from app.schemas.requirement import RequirementResponse, RequirementUpdate
from app.schemas.evidence import EvidenceRecordResponse, EvidenceMappingResponse, ReviewTaskResponse, ReviewTaskUpdate
from app.schemas.reconciliation import ReconciliationResponse, DecisionDetailResponse, SimulationRequest, SimulationResponse, DependencyCreate, DependencyResponse
from app.schemas.governance import AuditRecordResponse, AuditVerifyResponse, RAGQueryRequest, RAGQueryResponse

from app.services.audit_service import append_audit_record, verify_audit_chain
from app.services.simulation_service import run_what_if_simulation
from app.services.rag_service import answer_compliance_query
from app.services.dependency_service import DependencyGraphService
from app.services.reconciliation_engine import RequirementInput, EvidenceInput, reconcile_requirement
from app.services.report_service import generate_pdf_report, generate_excel_compliance_matrix, generate_digital_evidence_pack
from app.services.document_service import extract_pdf_nodes, compute_file_sha256
from app.services.extraction_service import extract_requirements_from_nodes, extract_evidence_from_nodes
from app.ml.hybrid_matcher import match_requirement_and_evidence

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "EERE v2",
        "version": "2.0.0",
        "local_mode": True,
        "privacy": "Local processing, no data leaves this machine"
    }

# =========================================================================
# Project Endpoints
# =========================================================================

@api_router.get("/projects", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@api_router.post("/projects", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    proj = Project(
        name=payload.name,
        description=payload.description,
        domain=payload.domain,
        version=payload.version,
        preset=payload.preset,
        is_demo=False
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # Initialize project uploads directory
    proj_dir = os.path.join("data", "uploads", proj.id)
    os.makedirs(proj_dir, exist_ok=True)

    append_audit_record(db, proj.id, "user", "create_project", "project", proj.id, {"name": proj.name})
    db.commit()
    return proj

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@api_router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    proj_name = proj.name

    # Cascading database deletions
    db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).delete()
    db.query(RiskAssessment).filter(RiskAssessment.project_id == project_id).delete()
    db.query(Dependency).filter(Dependency.project_id == project_id).delete()
    
    req_ids = [r.id for r in db.query(Requirement.id).filter(Requirement.project_id == project_id).all()]
    if req_ids:
        db.query(RequirementCorrection).filter(RequirementCorrection.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(EvidenceMapping).filter(EvidenceMapping.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(ReviewTask).filter(ReviewTask.requirement_id.in_(req_ids)).delete(synchronize_session=False)
    db.query(Requirement).filter(Requirement.project_id == project_id).delete()
    
    db.query(EvidenceRecord).filter(EvidenceRecord.project_id == project_id).delete()
    
    # Document revisions
    doc_ids = [d.id for d in db.query(ProjectDocument.id).filter(ProjectDocument.project_id == project_id).all()]
    if doc_ids:
        db.query(DocumentRevision).filter(DocumentRevision.document_id.in_(doc_ids)).delete(synchronize_session=False)
    db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).delete()

    db.query(AuditRecord).filter(AuditRecord.project_id == project_id).delete()
    db.query(SimulationRun).filter(SimulationRun.project_id == project_id).delete()
    
    db.delete(proj)
    db.commit()

    # Remove upload directory from disk
    upload_path = os.path.join("data", "uploads", project_id)
    if os.path.exists(upload_path):
        shutil.rmtree(upload_path, ignore_errors=True)

    return {"status": "success", "message": f"Project '{proj_name}' and all associated files deleted successfully."}

# =========================================================================
# Document Management Endpoints (Per-Project Workflow)
# =========================================================================

@api_router.get("/projects/{project_id}/documents", response_model=List[DocumentResponse])
def get_documents(project_id: str, db: Session = Depends(get_db)):
    return db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).all()

@api_router.post("/projects/{project_id}/documents", response_model=DocumentResponse)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form("specification"),
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    if not content or len(content) < 10:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    up_dir = os.path.join("data", "uploads", project_id)
    os.makedirs(up_dir, exist_ok=True)

    filename = file.filename or f"{doc_type}.pdf"
    file_path = os.path.join(up_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    file_hash = compute_file_sha256(file_path)
    file_size = len(content)

    page_count = 1
    try:
        doc_fitz = fitz.open(file_path)
        page_count = len(doc_fitz)
        doc_fitz.close()
    except Exception:
        page_count = 1

    # Check if a document of this type or filename already exists in this project
    existing_doc = db.query(ProjectDocument).filter(
        ProjectDocument.project_id == project_id,
        (ProjectDocument.filename == filename) | (ProjectDocument.doc_type == doc_type)
    ).first()

    if existing_doc:
        if existing_doc.file_hash == file_hash:
            return existing_doc
        
        # New revision of document: preserve previous version in DocumentRevision
        prev_rev = DocumentRevision(
            id=str(uuid.uuid4()),
            document_id=existing_doc.id,
            revision_tag=f"rev_{datetime.utcnow().strftime('%Y%m%d%H%M')}",
            file_path=existing_doc.file_path,
            file_hash=existing_doc.file_hash
        )
        db.add(prev_rev)

        existing_doc.filename = filename
        existing_doc.file_path = file_path
        existing_doc.file_hash = file_hash
        existing_doc.file_size = file_size
        existing_doc.page_count = page_count
        db.commit()
        db.refresh(existing_doc)

        append_audit_record(db, project_id, "user", "upload_document_revision", "document", existing_doc.id, {
            "filename": filename, "doc_type": doc_type, "file_hash": file_hash
        })
        db.commit()
        return existing_doc

    doc_id = str(uuid.uuid4())
    pdoc = ProjectDocument(
        id=doc_id,
        project_id=project_id,
        filename=filename,
        file_path=file_path,
        doc_type=doc_type,
        file_hash=file_hash,
        file_size=file_size,
        page_count=page_count
    )
    db.add(pdoc)
    db.commit()
    db.refresh(pdoc)

    append_audit_record(db, project_id, "user", "upload_document", "document", pdoc.id, {
        "filename": filename, "doc_type": doc_type, "file_hash": file_hash
    })
    db.commit()
    return pdoc

@api_router.delete("/projects/{project_id}/documents/{document_id}")
def delete_document(project_id: str, document_id: str, db: Session = Depends(get_db)):
    doc = db.query(ProjectDocument).filter(
        ProjectDocument.project_id == project_id,
        ProjectDocument.id == document_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_name = doc.filename

    # Delete dependent requirements & evidence records
    reqs = db.query(Requirement).filter(Requirement.document_id == document_id).all()
    req_ids = [r.id for r in reqs]
    if req_ids:
        db.query(ReconciliationResult).filter(ReconciliationResult.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(RiskAssessment).filter(RiskAssessment.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(ReviewTask).filter(ReviewTask.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(EvidenceMapping).filter(EvidenceMapping.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(RequirementCorrection).filter(RequirementCorrection.requirement_id.in_(req_ids)).delete(synchronize_session=False)
        db.query(Requirement).filter(Requirement.id.in_(req_ids)).delete(synchronize_session=False)

    evs = db.query(EvidenceRecord).filter(EvidenceRecord.document_id == document_id).all()
    ev_ids = [e.id for e in evs]
    if ev_ids:
        db.query(EvidenceMapping).filter(EvidenceMapping.evidence_id.in_(ev_ids)).delete(synchronize_session=False)
        db.query(EvidenceRecord).filter(EvidenceRecord.id.in_(ev_ids)).delete(synchronize_session=False)

    db.query(DocumentRevision).filter(DocumentRevision.document_id == document_id).delete(synchronize_session=False)

    # Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    append_audit_record(db, project_id, "user", "delete_document", "document", document_id, {"filename": doc_name})
    db.commit()

    return {"status": "success", "message": f"Document '{doc_name}' and derived records removed."}

# =========================================================================
# Core Analysis Pipeline Execution
# =========================================================================

def execute_project_pipeline(db: Session, project_id: str):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).all()
    if not docs:
        raise HTTPException(status_code=400, detail="No source documents found in project. Please upload Specification and Test PDFs.")

    # 1. Clear previous reconciliation and mapping state
    db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).delete()
    db.query(RiskAssessment).filter(RiskAssessment.project_id == project_id).delete()
    db.query(ReviewTask).filter(ReviewTask.project_id == project_id).delete()
    db.query(EvidenceMapping).filter(EvidenceMapping.project_id == project_id).delete()
    db.query(EvidenceRecord).filter(EvidenceRecord.project_id == project_id).delete()
    db.query(Requirement).filter(Requirement.project_id == project_id).delete()
    db.commit()

    # 2. Extract entities strictly from uploaded documents
    for doc in docs:
        if not os.path.exists(doc.file_path):
            continue
        nodes = extract_pdf_nodes(doc.file_path, doc.id, doc.doc_type)

        if doc.doc_type == "specification":
            reqs = extract_requirements_from_nodes(nodes)
            for r in reqs:
                req_row = Requirement(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    document_id=doc.id,
                    req_id=r.req_id,
                    parent_req_id=r.parent_req_id,
                    statement=r.statement,
                    category=r.category,
                    parameter=r.parameter,
                    operator=r.operator,
                    threshold=r.threshold,
                    unit=r.unit,
                    condition_context=r.condition_context,
                    priority=r.priority,
                    page=r.page,
                    bbox=r.bbox,
                    extraction_confidence=r.extraction_confidence
                )
                db.add(req_row)
            db.commit()
        else:
            evs = extract_evidence_from_nodes(nodes)
            for e in evs:
                ev_row = EvidenceRecord(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    document_id=doc.id,
                    evidence_id=e.evidence_id,
                    statement_type=e.statement_type,
                    raw_statement=e.raw_statement,
                    parameter=e.parameter,
                    operator=e.operator,
                    value=e.value,
                    unit=e.unit,
                    condition_context=e.condition_context,
                    page=e.page,
                    bbox=e.bbox
                )
                db.add(ev_row)
            db.commit()

    all_reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    all_evs = db.query(EvidenceRecord).filter(EvidenceRecord.project_id == project_id).all()

    # 3. 4-Way Semantic Mapping & Deterministic Reconciliation
    for r in all_reqs:
        r_input = RequirementInput(
            req_id=r.req_id,
            parameter=r.parameter,
            operator=r.operator,
            threshold=r.threshold,
            unit=r.unit,
            condition_context=r.condition_context,
            priority=r.priority
        )
        param_norm = r.parameter.lower().replace("_", " ")

        matched_evs = []
        for e in all_evs:
            mb = match_requirement_and_evidence(
                req_statement=r.statement,
                req_param=r.parameter,
                req_unit=r.unit,
                req_context=r.condition_context,
                ev_statement=e.raw_statement or e.parameter,
                ev_param=e.parameter,
                ev_unit=e.unit,
                ev_context=e.condition_context
            )

            # Store evidence mapping record
            em = EvidenceMapping(
                id=str(uuid.uuid4()),
                project_id=project_id,
                requirement_id=r.id,
                evidence_id=e.id,
                score_composite=mb.score_composite,
                score_semantic=mb.score_semantic,
                score_keyword=mb.score_keyword,
                score_parameter=mb.score_parameter,
                score_context=mb.score_context,
                status=mb.status
            )
            db.add(em)

            e_param_norm = e.parameter.lower().replace("_", " ")
            if mb.status in ["auto_accepted", "in_review"] or (param_norm in e_param_norm or e_param_norm in param_norm):
                matched_evs.append(e)

        d_evs = [
            EvidenceInput(
                evidence_id=e.evidence_id,
                statement_type="design_claim",
                parameter=e.parameter,
                operator=e.operator,
                value=e.value,
                unit=e.unit
            )
            for e in matched_evs if e.statement_type == "design_claim"
        ]
        t_evs = [
            EvidenceInput(
                evidence_id=e.evidence_id,
                statement_type="measured_result",
                parameter=e.parameter,
                operator=e.operator,
                value=e.value,
                unit=e.unit
            )
            for e in matched_evs if e.statement_type == "measured_result"
        ]

        # Deterministic 7-Tier Rules
        dec = reconcile_requirement(r_input, d_evs, t_evs)

        spec_str = f"{r.operator} {r.threshold} {r.unit or ''}".strip()
        design_str = f"{d_evs[0].operator} {d_evs[0].value} {d_evs[0].unit or ''}".strip() if d_evs else None
        test_str = f"{t_evs[0].operator} {t_evs[0].value} {t_evs[0].unit or ''}".strip() if t_evs else None

        rec_row = ReconciliationResult(
            id=str(uuid.uuid4()),
            project_id=project_id,
            requirement_id=r.id,
            spec_limit=spec_str,
            design_claim=design_str,
            test_measurement=test_str,
            unit=r.unit,
            difference=dec.difference,
            percentage_deviation=dec.percentage_deviation,
            status=dec.status,
            reason=dec.reason,
            rule_id_fired=dec.rule_id_fired,
            is_marginal=dec.is_marginal,
            calculation_formula=dec.calculation_formula,
            margin_to_limit=dec.margin_to_limit
        )
        db.add(rec_row)

        # Risk Intelligence scoring
        risk_score = 80.0 if dec.status == "NON_COMPLIANT" else (45.0 if dec.status == "UNVERIFIABLE" else 15.0)
        risk_level = "Critical" if risk_score >= 80 else ("High" if risk_score >= 70 else ("Medium" if risk_score >= 40 else "Low"))
        risk_row = RiskAssessment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            requirement_id=r.id,
            risk_level=risk_level,
            risk_score=risk_score,
            rationale=f"Automated risk derived from {dec.status} outcome under {dec.rule_id_fired}.",
            recommended_action="Conduct supplemental physical laboratory qualification." if dec.status != "COMPLIANT" else "None required."
        )
        db.add(risk_row)

        # Review Queue task
        if dec.status in ["NEEDS_REVIEW", "CONFLICT"]:
            task = ReviewTask(
                id=str(uuid.uuid4()),
                project_id=project_id,
                requirement_id=r.id,
                priority="High" if dec.status == "CONFLICT" else "Medium",
                status="pending",
                reason=dec.reason
            )
            db.add(task)

    db.commit()

    append_audit_record(
        db=db,
        project_id=project_id,
        actor="user",
        action="execute_pipeline_analysis",
        target_type="project",
        target_id=project_id,
        details={"requirements_extracted": len(all_reqs), "evidence_extracted": len(all_evs)}
    )
    db.commit()

@api_router.post("/projects/{project_id}/analyze")
def run_project_analysis(project_id: str, db: Session = Depends(get_db)):
    execute_project_pipeline(db, project_id)
    reqs_count = db.query(Requirement).filter(Requirement.project_id == project_id).count()
    recs_count = db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).count()
    return {
        "status": "success",
        "project_id": project_id,
        "requirements_extracted": reqs_count,
        "reconciliation_results": recs_count
    }

@api_router.post("/projects/analyze_wizard", response_model=ProjectResponse)
async def analyze_wizard(
    name: str = Form(...),
    domain: str = Form("aerospace"),
    version: str = Form("v1.0"),
    preset: str = Form("Strict"),
    spec_file: Optional[UploadFile] = File(None),
    design_file: Optional[UploadFile] = File(None),
    test_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Verify user provided at least a specification file
    if spec_file is None or not spec_file.filename:
        raise HTTPException(status_code=400, detail="Specification PDF artifact is required to initiate analysis.")

    proj_id = str(uuid.uuid4())
    proj = Project(
        id=proj_id,
        name=name,
        description=f"Analysis workspace for {name} ({domain} domain).",
        domain=domain,
        version=version,
        preset=preset,
        is_demo=False
    )
    db.add(proj)
    db.commit()

    up_dir = os.path.join("data", "uploads", proj_id)
    os.makedirs(up_dir, exist_ok=True)

    file_specs = [
        ("specification", spec_file),
        ("design", design_file),
        ("test_report", test_file)
    ]

    for doc_type, uploaded in file_specs:
        if uploaded is not None and uploaded.filename:
            content = await uploaded.read()
            if len(content) > 10:
                target_filename = uploaded.filename
                dst_path = os.path.join(up_dir, target_filename)
                with open(dst_path, "wb") as f:
                    f.write(content)

                file_hash = compute_file_sha256(dst_path)
                file_size = len(content)

                page_count = 1
                try:
                    doc_fitz = fitz.open(dst_path)
                    page_count = len(doc_fitz)
                    doc_fitz.close()
                except Exception:
                    page_count = 1

                pdoc = ProjectDocument(
                    id=str(uuid.uuid4()),
                    project_id=proj_id,
                    filename=target_filename,
                    file_path=dst_path,
                    doc_type=doc_type,
                    file_hash=file_hash,
                    file_size=file_size,
                    page_count=page_count
                )
                db.add(pdoc)
                db.commit()

    # Execute deterministic pipeline for newly created project
    execute_project_pipeline(db, proj_id)
    db.refresh(proj)
    return proj

# =========================================================================
# Revisions & Standards
# =========================================================================

@api_router.get("/projects/{project_id}/revisions")
def get_project_revisions(project_id: str, db: Session = Depends(get_db)):
    doc_ids = [d.id for d in db.query(ProjectDocument.id).filter(ProjectDocument.project_id == project_id).all()]
    if not doc_ids:
        return []
    revisions = db.query(DocumentRevision).filter(DocumentRevision.document_id.in_(doc_ids)).all()
    out = []
    for r in revisions:
        doc = db.query(ProjectDocument).filter(ProjectDocument.id == r.document_id).first()
        out.append({
            "id": r.id,
            "document_id": r.document_id,
            "document_name": doc.filename if doc else "Document",
            "revision_tag": r.revision_tag,
            "file_hash": r.file_hash,
            "created_at": r.created_at
        })
    return out

@api_router.get("/projects/{project_id}/standards")
def get_project_standards(project_id: str, db: Session = Depends(get_db)):
    standards = db.query(Standard).all()
    out = []
    for s in standards:
        clauses = db.query(StandardClause).filter(StandardClause.standard_id == s.id).all()
        out.append({
            "id": s.id,
            "code": s.code,
            "title": s.title,
            "version": s.version,
            "clauses_count": len(clauses),
            "clauses": [
                {
                    "id": c.id,
                    "clause_number": c.clause_number,
                    "title": c.title,
                    "text_excerpt": c.text_excerpt,
                    "category": c.category
                } for c in clauses
            ]
        })
    return out

# =========================================================================
# Requirements, Evidence & Reconciliation Queries
# =========================================================================

@api_router.get("/projects/{project_id}/requirements", response_model=List[RequirementResponse])
def get_requirements(project_id: str, db: Session = Depends(get_db)):
    return db.query(Requirement).filter(Requirement.project_id == project_id).all()

@api_router.patch("/projects/{project_id}/requirements/{req_id}", response_model=RequirementResponse)
def update_requirement(project_id: str, req_id: str, payload: RequirementUpdate, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(Requirement.project_id == project_id, Requirement.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    prev_statement = req.statement
    req.statement = payload.statement
    
    correction = RequirementCorrection(
        id=str(uuid.uuid4()),
        requirement_id=req.id,
        previous_statement=prev_statement,
        new_statement=payload.statement,
        reason=payload.reason,
        actor="user"
    )
    db.add(correction)
    append_audit_record(db, project_id, "user", "update_requirement_statement", "requirement", req.id, {
        "req_id": req.req_id,
        "previous_statement": prev_statement,
        "new_statement": payload.statement,
        "reason": payload.reason
    })
    db.commit()
    db.refresh(req)
    return req

@api_router.get("/projects/{project_id}/evidence", response_model=List[EvidenceRecordResponse])
def get_evidence(project_id: str, db: Session = Depends(get_db)):
    return db.query(EvidenceRecord).filter(EvidenceRecord.project_id == project_id).all()

@api_router.get("/projects/{project_id}/mappings", response_model=List[EvidenceMappingResponse])
def get_mappings(project_id: str, db: Session = Depends(get_db)):
    return db.query(EvidenceMapping).filter(EvidenceMapping.project_id == project_id).all()

@api_router.patch("/projects/{project_id}/mappings/{mapping_id}")
def update_mapping(project_id: str, mapping_id: str, status: str = Query(...), db: Session = Depends(get_db)):
    m = db.query(EvidenceMapping).filter(EvidenceMapping.project_id == project_id, EvidenceMapping.id == mapping_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mapping not found")
    m.status = status
    append_audit_record(db, project_id, "reviewer", "update_mapping_status", "mapping", m.id, {"new_status": status})
    db.commit()
    return {"status": "success", "mapping_id": mapping_id, "new_status": status}

@api_router.get("/projects/{project_id}/reconciliation", response_model=List[ReconciliationResponse])
def get_reconciliation_results(project_id: str, db: Session = Depends(get_db)):
    results = db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).all()
    out = []
    for r in results:
        req = db.query(Requirement).filter(Requirement.id == r.requirement_id).first()
        req_code = req.req_id if req else "REQ-UNKNOWN"
        out.append(ReconciliationResponse(
            id=r.id,
            project_id=r.project_id,
            requirement_id=r.requirement_id,
            req_code=req_code,
            spec_limit=r.spec_limit,
            design_claim=r.design_claim,
            test_measurement=r.test_measurement,
            unit=r.unit,
            difference=r.difference,
            percentage_deviation=r.percentage_deviation,
            status=r.status,
            reason=r.reason,
            rule_id_fired=r.rule_id_fired,
            is_marginal=r.is_marginal,
            calculation_formula=r.calculation_formula,
            margin_to_limit=r.margin_to_limit,
            created_at=r.created_at
        ))
    return out

@api_router.get("/projects/{project_id}/reconciliation/{req_code}", response_model=DecisionDetailResponse)
def get_decision_detail(project_id: str, req_code: str, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(
        Requirement.project_id == project_id,
        (Requirement.req_id == req_code) | (Requirement.id == req_code)
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    rec = db.query(ReconciliationResult).filter(
        ReconciliationResult.project_id == project_id,
        ReconciliationResult.requirement_id == req.id
    ).first()
    
    risk = db.query(RiskAssessment).filter(
        RiskAssessment.project_id == project_id,
        RiskAssessment.requirement_id == req.id
    ).first()
    
    doc = db.query(ProjectDocument).filter(ProjectDocument.id == req.document_id).first() if req.document_id else None
    
    return DecisionDetailResponse(
        requirement_id=req.id,
        req_code=req.req_id,
        statement=req.statement,
        category=req.category,
        priority=req.priority,
        status=rec.status if rec else "UNVERIFIABLE",
        spec_limit=rec.spec_limit if rec else f"{req.operator} {req.threshold} {req.unit or ''}",
        design_claim=rec.design_claim if rec else None,
        test_measurement=rec.test_measurement if rec else None,
        difference=rec.difference if rec else None,
        percentage_deviation=rec.percentage_deviation if rec else None,
        unit=rec.unit if rec else req.unit,
        rule_id_fired=rec.rule_id_fired if rec else "RULE_1",
        reason=rec.reason if rec else "No reconciliation performed yet.",
        calculation_formula=rec.calculation_formula if rec else None,
        margin_to_limit=rec.margin_to_limit if rec else None,
        is_marginal=rec.is_marginal if rec else False,
        risk_level=risk.risk_level if risk else "Low",
        risk_score=risk.risk_score if risk else 0.0,
        risk_rationale=risk.rationale if risk else None,
        recommended_action=risk.recommended_action if risk else None,
        source_page=req.page or 1,
        source_doc_name=doc.filename if doc else "Specification Document",
        highlight_bbox=req.bbox or [72.0, 600.0, 500.0, 640.0],
        alternative_evidence=[]
    )

@api_router.get("/projects/{project_id}/review-queue", response_model=List[ReviewTaskResponse])
def get_review_queue(project_id: str, db: Session = Depends(get_db)):
    return db.query(ReviewTask).filter(ReviewTask.project_id == project_id).all()

@api_router.patch("/projects/{project_id}/review-queue/{task_id}", response_model=ReviewTaskResponse)
def update_review_task(project_id: str, task_id: str, payload: ReviewTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(ReviewTask).filter(ReviewTask.project_id == project_id, ReviewTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")
    task.status = payload.status
    if payload.assigned_to:
        task.assigned_to = payload.assigned_to
    append_audit_record(db, project_id, "reviewer", "update_review_task", "review_task", task.id, {"status": payload.status})
    db.commit()
    db.refresh(task)
    return task

@api_router.post("/projects/{project_id}/simulation", response_model=SimulationResponse)
def simulate(project_id: str, payload: SimulationRequest, db: Session = Depends(get_db)):
    req = db.query(Requirement).filter(
        Requirement.project_id == project_id,
        (Requirement.req_id == payload.requirement_id) | (Requirement.id == payload.requirement_id)
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
        
    rec = db.query(ReconciliationResult).filter(
        ReconciliationResult.project_id == project_id,
        ReconciliationResult.requirement_id == req.id
    ).first()
    
    risk = db.query(RiskAssessment).filter(
        RiskAssessment.project_id == project_id,
        RiskAssessment.requirement_id == req.id
    ).first()
    
    base_req = RequirementInput(
        req_id=req.req_id,
        parameter=req.parameter,
        operator=req.operator,
        threshold=req.threshold,
        unit=req.unit,
        condition_context=req.condition_context,
        priority=req.priority
    )
    
    ev_records = db.query(EvidenceRecord).filter(EvidenceRecord.project_id == project_id, EvidenceRecord.parameter == req.parameter).all()
    base_design = [EvidenceInput(evidence_id=e.evidence_id, statement_type="design_claim", parameter=e.parameter, operator=e.operator, value=e.value, unit=e.unit) for e in ev_records if e.statement_type == "design_claim"]
    base_test = [EvidenceInput(evidence_id=e.evidence_id, statement_type="measured_result", parameter=e.parameter, operator=e.operator, value=e.value, unit=e.unit) for e in ev_records if e.statement_type == "measured_result"]
    
    graph_svc = DependencyGraphService()
    deps = db.query(Dependency).filter(Dependency.project_id == project_id).all()
    for d in deps:
        graph_svc.add_dependency(d.source_req_id, d.target_req_id, d.dependency_type, d.status)
        
    sim_res = run_what_if_simulation(
        requirement_id=req.req_id,
        base_req=base_req,
        base_design=base_design,
        base_test=base_test,
        original_status=rec.status if rec else "UNVERIFIABLE",
        original_risk_score=risk.risk_score if risk else 50.0,
        original_risk_level=risk.risk_level if risk else "Medium",
        override_threshold=payload.override_threshold,
        override_measured_value=payload.override_measured_value,
        override_unit=payload.override_unit,
        override_tolerance_authorized=payload.override_tolerance_authorized,
        override_allowed_tolerance=payload.override_allowed_tolerance,
        dependency_graph=graph_svc
    )
    
    return SimulationResponse(
        requirement_id=sim_res.requirement_id,
        original_status=sim_res.original_status,
        hypothetical_status=sim_res.hypothetical_status,
        original_risk_score=sim_res.original_risk_score,
        hypothetical_risk_score=sim_res.hypothetical_risk_score,
        original_risk_level=sim_res.original_risk_level,
        hypothetical_risk_level=sim_res.hypothetical_risk_level,
        reconciliation_details=sim_res.reconciliation_details,
        impacted_dependencies=sim_res.impacted_dependencies,
        is_hypothetical=True
    )

@api_router.get("/projects/{project_id}/graph")
def get_graph(project_id: str, db: Session = Depends(get_db)):
    graph_svc = DependencyGraphService()
    deps = db.query(Dependency).filter(Dependency.project_id == project_id).all()
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    for r in reqs:
        graph_svc.graph.add_node(r.req_id)
        if r.parent_req_id:
            graph_svc.add_dependency(r.parent_req_id, r.req_id, "derivation", "valid")
    for d in deps:
        graph_svc.add_dependency(d.source_req_id, d.target_req_id, d.dependency_type, d.status)
    return graph_svc.export_graph_for_react_flow()

@api_router.get("/projects/{project_id}/dependencies", response_model=List[DependencyResponse])
def get_dependencies(project_id: str, db: Session = Depends(get_db)):
    return db.query(Dependency).filter(Dependency.project_id == project_id).all()

@api_router.post("/projects/{project_id}/dependencies", response_model=DependencyResponse)
def create_dependency(project_id: str, payload: DependencyCreate, db: Session = Depends(get_db)):
    dep = Dependency(
        id=str(uuid.uuid4()),
        project_id=project_id,
        source_req_id=payload.source_req_id,
        target_req_id=payload.target_req_id,
        dependency_type=payload.dependency_type,
        source="user_defined",
        status="verified"
    )
    db.add(dep)
    append_audit_record(db, project_id, "user", "create_dependency", "dependency", dep.id, {
        "source": payload.source_req_id,
        "target": payload.target_req_id,
        "type": payload.dependency_type
    })
    db.commit()
    db.refresh(dep)
    return dep

@api_router.delete("/projects/{project_id}/dependencies/{dependency_id}")
def delete_dependency(project_id: str, dependency_id: str, db: Session = Depends(get_db)):
    dep = db.query(Dependency).filter(Dependency.project_id == project_id, Dependency.id == dependency_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    db.delete(dep)
    append_audit_record(db, project_id, "user", "delete_dependency", "dependency", dependency_id, {})
    db.commit()
    return {"status": "success", "deleted_id": dependency_id}

@api_router.get("/projects/{project_id}/risks")
def get_risks(project_id: str, db: Session = Depends(get_db)):
    risks = db.query(RiskAssessment).filter(RiskAssessment.project_id == project_id).all()
    out = []
    for r in risks:
        req = db.query(Requirement).filter(Requirement.id == r.requirement_id).first()
        out.append({
            "id": r.id,
            "req_id": req.req_id if req else r.requirement_id,
            "risk_level": r.risk_level,
            "risk_score": r.risk_score,
            "rationale": r.rationale,
            "recommended_action": r.recommended_action
        })
    return out

@api_router.get("/projects/{project_id}/audit", response_model=List[AuditRecordResponse])
def get_audit(project_id: str, db: Session = Depends(get_db)):
    return db.query(AuditRecord).filter(AuditRecord.project_id == project_id).order_by(AuditRecord.record_index.asc()).all()

@api_router.post("/projects/{project_id}/audit/verify", response_model=AuditVerifyResponse)
def verify_audit(project_id: str, db: Session = Depends(get_db)):
    is_valid, msg, count = verify_audit_chain(db, project_id)
    return AuditVerifyResponse(
        is_valid=is_valid,
        message=msg,
        verified_records_count=count
    )

@api_router.post("/projects/{project_id}/assistant", response_model=RAGQueryResponse)
def assistant_chat(project_id: str, payload: RAGQueryRequest, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    recs = db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).all()
    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).all()
    
    req_dicts = [{"req_id": r.req_id, "statement": r.statement, "page": r.page} for r in reqs]
    rec_dicts = []
    for r in recs:
        req_obj = next((rq for rq in reqs if rq.id == r.requirement_id), None)
        rid = req_obj.req_id if req_obj else r.requirement_id
        rec_dicts.append({
            "requirement_id": rid,
            "spec_limit": r.spec_limit,
            "actual": r.test_measurement or "None",
            "status": r.status,
            "rule_id_fired": r.rule_id_fired,
            "reason": r.reason,
            "calculation_formula": r.calculation_formula
        })
        
    doc_dicts = [{"filename": d.filename} for d in docs]
    
    resp = answer_compliance_query(
        query=payload.query,
        project_name=proj.name,
        requirements=req_dicts,
        reconciliation_results=rec_dicts,
        documents=doc_dicts
    )
    
    citation_dicts = [{"document_name": c.document_name, "page": c.page, "text_snippet": c.text_snippet} for c in resp.citations]
    return RAGQueryResponse(
        query=resp.query,
        answer=resp.answer,
        citations=citation_dicts,
        prompt_injection_detected=resp.prompt_injection_detected
    )

@api_router.post("/projects/{project_id}/reports/generate")
def generate_report(project_id: str, template: str = Query("technical"), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    recs = db.query(ReconciliationResult).filter(ReconciliationResult.project_id == project_id).all()
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    rec_dicts = []
    for r in recs:
        req_obj = next((rq for rq in reqs if rq.id == r.requirement_id), None)
        rid = req_obj.req_id if req_obj else r.requirement_id
        rec_dicts.append({
            "requirement_id": rid,
            "statement": req_obj.statement if req_obj else "",
            "spec_limit": r.spec_limit,
            "design_claim": r.design_claim or "--",
            "actual": r.test_measurement or "--",
            "unit": r.unit or "",
            "difference": r.difference,
            "percentage_deviation": r.percentage_deviation,
            "status": r.status,
            "rule_id_fired": r.rule_id_fired,
            "reason": r.reason
        })
        
    is_valid, _, _ = verify_audit_chain(db, project_id)
    pdf_path = generate_pdf_report(proj.name, proj.domain, rec_dicts, {}, is_valid)
    excel_path = generate_excel_compliance_matrix(proj.name, rec_dicts)
    
    audit_records = db.query(AuditRecord).filter(AuditRecord.project_id == project_id).all()
    audit_dicts = [{"record_index": a.record_index, "action": a.action, "actor": a.actor, "record_hash": a.record_hash} for a in audit_records]
    zip_path = generate_digital_evidence_pack(proj.name, pdf_path, excel_path, audit_dicts)
    
    append_audit_record(db, project_id, "system", "generate_report_pack", "report", os.path.basename(zip_path), {"template": template})
    db.commit()
    
    return {
        "pdf_report": pdf_path,
        "excel_matrix": excel_path,
        "digital_evidence_pack": zip_path
    }
