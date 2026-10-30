import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey, DateTime, JSON
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    spec_limit = Column(String(64), nullable=False)
    design_claim = Column(String(64), nullable=True)
    test_measurement = Column(String(64), nullable=True)
    unit = Column(String(32), nullable=True)
    difference = Column(Float, nullable=True)
    percentage_deviation = Column(Float, nullable=True)
    status = Column(String(32), nullable=False, index=True) # COMPLIANT, NON_COMPLIANT, CONFLICT, UNVERIFIABLE, NEEDS_REVIEW
    reason = Column(Text, nullable=False)
    rule_id_fired = Column(String(32), nullable=False) # RULE_1 to RULE_7
    is_marginal = Column(Boolean, default=False)
    calculation_formula = Column(Text, nullable=True)
    margin_to_limit = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Dependency(Base):
    __tablename__ = "dependencies"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source_req_id = Column(String(64), nullable=False, index=True) # Origin requirement
    target_req_id = Column(String(64), nullable=False, index=True) # Impacted requirement
    dependency_type = Column(String(32), default="structural") # structural, thermal, material, electrical, custom
    source = Column(String(32), default="explicit_reference") # explicit_reference, shared_parameter_inference
    status = Column(String(32), default="verified") # verified, suggested
    created_at = Column(DateTime(timezone=True), default=utc_now)

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(32), default="Low") # Critical, High, Medium, Low
    risk_score = Column(Float, default=0.0) # 0 to 100
    non_compliance_factor = Column(Float, default=0.0)
    criticality_factor = Column(Float, default=0.0)
    missing_evidence_factor = Column(Float, default=0.0)
    deviation_factor = Column(Float, default=0.0)
    failed_dependency_factor = Column(Float, default=0.0)
    rationale = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    owner = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

