import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, JSON
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("project_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    evidence_id = Column(String(64), nullable=False, index=True)
    statement_type = Column(String(32), nullable=False) # design_claim, measured_result
    raw_statement = Column(Text, nullable=True)
    parameter = Column(String(128), nullable=False, index=True)
    operator = Column(String(32), default="==")
    value = Column(String(64), nullable=False)
    unit = Column(String(32), nullable=True)
    condition_context = Column(String(256), nullable=True)
    configuration_id = Column(String(64), nullable=True)
    revision = Column(String(32), nullable=True)
    measurement_uncertainty = Column(Float, nullable=True)
    instrument_id = Column(String(64), nullable=True)
    sample_size = Column(Integer, nullable=True)
    run_id = Column(String(64), nullable=True)
    timestamp = Column(String(64), nullable=True)
    page = Column(Integer, default=1)
    bbox = Column(JSON, nullable=True)
    extraction_confidence = Column(Float, default=1.0)
    extraction_method = Column(String(32), default="rule")
    created_at = Column(DateTime(timezone=True), default=utc_now)

class EvidenceMapping(Base):
    __tablename__ = "evidence_mappings"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence_records.id", ondelete="CASCADE"), nullable=False, index=True)
    score_composite = Column(Float, default=0.0)
    score_semantic = Column(Float, default=0.0)
    score_keyword = Column(Float, default=0.0)
    score_parameter = Column(Float, default=0.0)
    score_context = Column(Float, default=0.0)
    status = Column(String(32), default="auto_accepted") # auto_accepted, in_review, rejected, manual
    reviewer_id = Column(String(64), nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class ReviewTask(Base):
    __tablename__ = "review_tasks"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence_records.id", ondelete="SET NULL"), nullable=True)
    mapping_id = Column(String(36), ForeignKey("evidence_mappings.id", ondelete="SET NULL"), nullable=True)
    priority = Column(String(32), default="medium") # high, medium, low
    status = Column(String(32), default="open") # open, in_review, resolved
    reason = Column(Text, nullable=False)
    assigned_to = Column(String(64), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

