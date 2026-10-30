import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Standard(Base):
    __tablename__ = "standards"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    code = Column(String(64), unique=True, nullable=False, index=True) # ISO 26262, IEC 61508
    title = Column(String(256), nullable=False)
    version = Column(String(32), default="2018")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    clauses = relationship("StandardClause", back_populates="standard", cascade="all, delete-orphan")

class StandardClause(Base):
    __tablename__ = "standard_clauses"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    standard_id = Column(String(36), ForeignKey("standards.id", ondelete="CASCADE"), nullable=False, index=True)
    clause_number = Column(String(32), nullable=False, index=True) # 7.4.2
    title = Column(String(256), nullable=False)
    text_excerpt = Column(Text, nullable=False)
    category = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    standard = relationship("Standard", back_populates="clauses")

class Requirement(Base):
    __tablename__ = "requirements"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("project_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    req_id = Column(String(64), nullable=False, index=True) # REQ-001
    parent_req_id = Column(String(64), nullable=True, index=True)
    statement = Column(Text, nullable=False)
    category = Column(String(64), default="general")
    parameter = Column(String(128), nullable=False, index=True)
    operator = Column(String(32), default="<=") # <=, >=, ==, <, >, range, boolean
    threshold = Column(String(64), nullable=False) # raw value or range string
    unit = Column(String(32), nullable=True)
    condition_context = Column(String(256), nullable=True)
    priority = Column(String(32), default="SHALL") # SHALL, MUST, SHOULD, MAY
    page = Column(Integer, default=1)
    bbox = Column(JSON, nullable=True) # [x0, y0, x1, y1]
    extraction_confidence = Column(Float, default=1.0)
    extraction_method = Column(String(32), default="rule") # rule, nlp, hybrid
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    project = relationship("Project", back_populates="requirements")
    corrections = relationship("RequirementCorrection", back_populates="requirement", cascade="all, delete-orphan")

class RequirementCorrection(Base):
    __tablename__ = "requirement_corrections"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    requirement_id = Column(String(36), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_statement = Column(Text, nullable=False)
    new_statement = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    actor = Column(String(64), default="user")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    requirement = relationship("Requirement", back_populates="corrections")

