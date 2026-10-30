import os
import json
import sqlite3
import shutil
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from app.database.session import SessionLocal, init_db
from app.models.project import Project, ProjectDocument, DocumentRevision
from app.models.requirement import Requirement
from app.models.evidence import EvidenceRecord, EvidenceMapping
from app.models.reconciliation import ReconciliationResult, RiskAssessment
from app.models.governance import AuditRecord

V1_DB_PATH = Path("D:/EERE/data/runs.db")
V1_UPLOADS_PATH = Path("D:/EERE/data/uploads")
V2_UPLOADS_PATH = Path("D:/proversion/data/uploads")

def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def migrate_v1():
    init_db()
    
    if not V1_DB_PATH.exists():
        print(f"V1 database not found at {V1_DB_PATH}")
        return
        
    conn = sqlite3.connect(str(V1_DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM runs")
    runs = c.fetchall()
    
    db: Session = SessionLocal()
    migrated_count = 0
    
    try:
        for run in runs:
            run_id = run["id"]
            
            # Check if project already exists
            existing_proj = db.query(Project).filter(Project.id == run_id).first()
            if existing_proj:
                print(f"Run {run_id} already migrated, skipping.")
                continue
                
            project = Project(
                id=run_id,
                name=f"V1 Run {run_id[:8]}",
                description="Imported from EERE v1 historical run",
                domain="general",
                version="v1.0",
                preset="Balanced",
                is_demo=False,
                created_at=datetime.now(timezone.utc)
            )
            db.add(project)
            db.flush()
            
            # Copy and register documents if they exist
            run_upload_dir = V1_UPLOADS_PATH / run_id
            target_upload_dir = V2_UPLOADS_PATH / run_id
            target_upload_dir.mkdir(parents=True, exist_ok=True)
            
            doc_id_map = {}
            if run_upload_dir.exists():
                for doc_file, doc_type in [("spec.pdf", "specification"), ("design.pdf", "design"), ("test.pdf", "test_report")]:
                    src_file = run_upload_dir / doc_file
                    if src_file.exists():
                        dest_file = target_upload_dir / doc_file
                        shutil.copy2(src_file, dest_file)
                        sha = compute_sha256(dest_file)
                        
                        proj_doc = ProjectDocument(
                            project_id=project.id,
                            filename=doc_file,
                            file_path=str(dest_file),
                            doc_type=doc_type,
                            file_hash=sha,
                            file_size=dest_file.stat().st_size,
                            page_count=1
                        )
                        db.add(proj_doc)
                        db.flush()
                        doc_id_map[doc_type] = proj_doc.id
                        
            # Parse evidence_json
            evidence_data = json.loads(run["evidence_json"]) if run["evidence_json"] else []
            mapping_data = json.loads(run["mapping_json"]) if run["mapping_json"] else []
            reconciliation_data = json.loads(run["reconciliation_json"]) if run["reconciliation_json"] else []
            report_data = json.loads(run["report_json"]) if run["report_json"] else []
            
            # Build requirement ID mapping
            ev_to_req = {}
            for link in mapping_data:
                req_id = link.get("requirement_id")
                for eid in link.get("linked_evidence_ids", []):
                    ev_to_req[eid] = req_id
                    
            req_db_map = {} # req_id -> Requirement.id
            ev_db_map = {}  # evidence_id -> EvidenceRecord.id
            
            for ev in evidence_data:
                stmt_type = ev.get("statement_type")
                if stmt_type == "specified_requirement":
                    req_id = ev_to_req.get(ev.get("evidence_id"), f"REQ-{len(req_db_map)+1:03d}")
                    req_model = Requirement(
                        project_id=project.id,
                        document_id=doc_id_map.get("specification"),
                        req_id=req_id,
                        statement=f"The {ev.get('parameter')} shall be {ev.get('operator')} {ev.get('value')} {ev.get('unit') or ''}".strip(),
                        category="general",
                        parameter=ev.get("parameter", "unknown"),
                        operator=ev.get("operator", "<="),
                        threshold=str(ev.get("value", "")),
                        unit=ev.get("unit"),
                        condition_context=ev.get("condition_context"),
                        priority="SHALL",
                        page=1,
                        extraction_confidence=ev.get("extraction_confidence", 1.0),
                        extraction_method=ev.get("extraction_method", "rule")
                    )
                    db.add(req_model)
                    db.flush()
                    req_db_map[req_id] = req_model.id
                else:
                    ev_model = EvidenceRecord(
                        project_id=project.id,
                        document_id=doc_id_map.get("test_report" if stmt_type == "measured_result" else "design"),
                        evidence_id=ev.get("evidence_id", ""),
                        statement_type=stmt_type,
                        raw_statement=f"{ev.get('parameter')} {ev.get('operator')} {ev.get('value')} {ev.get('unit') or ''}",
                        parameter=ev.get("parameter", "unknown"),
                        operator=ev.get("operator", "=="),
                        value=str(ev.get("value", "")),
                        unit=ev.get("unit"),
                        condition_context=ev.get("condition_context"),
                        configuration_id=ev.get("configuration_id"),
                        revision=ev.get("revision"),
                        measurement_uncertainty=ev.get("measurement_uncertainty"),
                        page=1,
                        extraction_confidence=ev.get("extraction_confidence", 1.0),
                        extraction_method=ev.get("extraction_method", "nlp")
                    )
                    db.add(ev_model)
                    db.flush()
                    ev_db_map[ev.get("evidence_id")] = ev_model.id
                    
            # Parse Mappings
            for link in mapping_data:
                req_id = link.get("requirement_id")
                req_internal_id = req_db_map.get(req_id)
                if not req_internal_id:
                    continue
                confidences = link.get("match_confidences", {})
                for eid in link.get("linked_evidence_ids", []):
                    ev_internal_id = ev_db_map.get(eid)
                    if ev_internal_id:
                        conf = confidences.get(eid, 0.8)
                        mapping = EvidenceMapping(
                            project_id=project.id,
                            requirement_id=req_internal_id,
                            evidence_id=ev_internal_id,
                            score_composite=conf,
                            score_semantic=conf,
                            status="auto_accepted" if conf >= 0.75 else "in_review"
                        )
                        db.add(mapping)
                        
            # Parse Reconciliation Results
            for rec in reconciliation_data:
                req_id = rec.get("requirement_id")
                req_internal_id = req_db_map.get(req_id)
                if not req_internal_id:
                    continue
                v1_class = rec.get("classification")
                status_v2 = "COMPLIANT" if v1_class == "consistent" else ("NON_COMPLIANT" if v1_class == "conflicting" else "UNVERIFIABLE")
                rule_id = "RULE_6" if status_v2 == "COMPLIANT" else ("RULE_2" if status_v2 == "NON_COMPLIANT" else "RULE_1")
                
                res = ReconciliationResult(
                    project_id=project.id,
                    requirement_id=req_internal_id,
                    spec_limit="",
                    status=status_v2,
                    reason=rec.get("reasoning", "V1 migrated decision"),
                    rule_id_fired=rule_id,
                    is_marginal=False
                )
                db.add(res)
                
            # Parse Risk Assessments from report
            for rep in report_data:
                req_id = rep.get("requirement_id")
                req_internal_id = req_db_map.get(req_id)
                if not req_internal_id:
                    continue
                root_cause = rep.get("root_cause") or {}
                verdict = rep.get("verdict", "")
                risk_level = "High" if verdict == "non_compliant" else ("Medium" if verdict == "unverifiable" else "Low")
                risk = RiskAssessment(
                    project_id=project.id,
                    requirement_id=req_internal_id,
                    risk_level=risk_level,
                    risk_score=75.0 if risk_level == "High" else (45.0 if risk_level == "Medium" else 15.0),
                    rationale=root_cause.get("rationale") or rep.get("explanation"),
                    recommended_action=root_cause.get("recommended_action") or "Review compliance evidence"
                )
                db.add(risk)
                
            # Create Initial Hash-Chained Audit Record
            payload = f"Imported V1 run {run_id}"
            audit_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            audit = AuditRecord(
                project_id=project.id,
                record_index=1,
                actor="v1_migrator",
                action="import_v1_run",
                target_type="project",
                target_id=project.id,
                details={"v1_status": run["status"]},
                prev_record_hash="0000000000000000000000000000000000000000000000000000000000000000",
                record_hash=audit_hash
            )
            db.add(audit)
            
            db.commit()
            migrated_count += 1
            print(f"Successfully migrated run {run_id}")
            
    finally:
        db.close()
        conn.close()
        
    print(f"Migration complete! Total runs migrated: {migrated_count}")

if __name__ == "__main__":
    migrate_v1()

