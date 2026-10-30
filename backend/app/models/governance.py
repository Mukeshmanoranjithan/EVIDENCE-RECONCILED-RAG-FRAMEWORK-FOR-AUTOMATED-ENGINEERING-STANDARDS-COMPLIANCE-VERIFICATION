import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, JSON
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class AuditRecord(Base):
    __tablename__ = "audit_records"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    record_index = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)
    actor = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False) # upload, extraction, mapping, decision, review, correction
    target_type = Column(String(64), nullable=False) # document, requirement, evidence, verdict
    target_id = Column(String(64), nullable=False)
    details = Column(JSON, nullable=True)
    prev_record_hash = Column(String(64), nullable=True) # SHA-256 of previous record
    record_hash = Column(String(64), nullable=False, index=True) # SHA-256 of canonical record content + prev_hash

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    simulation_name = Column(String(128), nullable=False)
    parameter_overrides = Column(JSON, nullable=False) # {req_id: {threshold, measured_value, unit}}
    hypothetical_results = Column(JSON, nullable=False) # list of hypothetical verdicts
    created_at = Column(DateTime(timezone=True), default=utc_now)

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    dataset_name = Column(String(128), nullable=False)
    model_name = Column(String(128), nullable=False)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    f1 = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    false_mapping_rate = Column(Float, default=0.0)
    metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class GeneratedReport(Base):
    __tablename__ = "generated_reports"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    template_type = Column(String(64), default="technical") # executive, technical, auditor_pack
    file_path = Column(String(512), nullable=False)
    file_format = Column(String(16), default="pdf") # pdf, xlsx, zip
    file_hash = Column(String(64), nullable=False) # SHA-256
    created_at = Column(DateTime(timezone=True), default=utc_now)

