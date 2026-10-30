import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(128), nullable=False, index=True)
    description = Column(Text, nullable=True)
    domain = Column(String(64), default="general") # automotive, aerospace, medical, industrial
    version = Column(String(32), default="v1.0")
    preset = Column(String(32), default="Balanced")
    is_archived = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    documents = relationship("ProjectDocument", back_populates="project", cascade="all, delete-orphan")
    requirements = relationship("Requirement", back_populates="project", cascade="all, delete-orphan")

class ProjectDocument(Base):
    __tablename__ = "project_documents"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    doc_type = Column(String(32), nullable=False) # specification, design, test_report
    file_hash = Column(String(64), nullable=False, index=True) # SHA-256
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    project = relationship("Project", back_populates="documents")
    revisions = relationship("DocumentRevision", back_populates="document", cascade="all, delete-orphan")

class DocumentRevision(Base):
    __tablename__ = "document_revisions"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("project_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_tag = Column(String(32), default="v1.0")
    file_path = Column(String(512), nullable=False)
    file_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    document = relationship("ProjectDocument", back_populates="revisions")

