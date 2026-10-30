"""
EERE v2 Maintenance and Cleanup Utility
Allows deleting demo projects, orphaned upload folders, and resetting test runs.
"""
import os
import shutil
import argparse
from app.database.session import SessionLocal
from app.models.project import Project, ProjectDocument
from app.models.requirement import Requirement, RequirementCorrection
from app.models.evidence import EvidenceRecord, EvidenceMapping, ReviewTask
from app.models.reconciliation import ReconciliationResult, Dependency, RiskAssessment
from app.models.governance import AuditRecord, SimulationRun

def purge_demos():
    db = SessionLocal()
    demos = db.query(Project).filter(Project.is_demo == True).all()
    print(f"Found {len(demos)} demo projects.")
    for d in demos:
        print(f"Deleting demo project: {d.name} ({d.id})")
        _delete_project_db_and_disk(db, d.id)
    db.commit()
    print("Demo projects purged successfully.")

def purge_orphaned_uploads():
    db = SessionLocal()
    existing_ids = {p.id for p in db.query(Project.id).all()}
    uploads_dir = os.path.join("data", "uploads")
    count = 0
    if os.path.exists(uploads_dir):
        for entry in os.listdir(uploads_dir):
            full_path = os.path.join(uploads_dir, entry)
            if os.path.isdir(full_path) and entry not in existing_ids:
                print(f"Removing orphaned upload folder: {entry}")
                shutil.rmtree(full_path, ignore_errors=True)
                count += 1
    print(f"Removed {count} orphaned folders.")

def _delete_project_db_and_disk(db, project_id: str):
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
    db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id).delete()
    db.query(AuditRecord).filter(AuditRecord.project_id == project_id).delete()
    db.query(SimulationRun).filter(SimulationRun.project_id == project_id).delete()
    
    db.query(Project).filter(Project.id == project_id).delete()
    db.commit()

    upload_path = os.path.join("data", "uploads", project_id)
    if os.path.exists(upload_path):
        shutil.rmtree(upload_path, ignore_errors=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EERE v2 Data Cleanup")
    parser.add_argument("--demos", action="store_true", help="Purge all demo projects")
    parser.add_argument("--orphans", action="store_true", help="Clean up orphaned upload folders on disk")
    parser.add_argument("--all", action="store_true", help="Purge demos and clean orphaned uploads")
    args = parser.parse_args()

    if args.demos or args.all:
        purge_demos()
    if args.orphans or args.all:
        purge_orphaned_uploads()
    if not (args.demos or args.orphans or args.all):
        print("Specify --demos, --orphans, or --all")

