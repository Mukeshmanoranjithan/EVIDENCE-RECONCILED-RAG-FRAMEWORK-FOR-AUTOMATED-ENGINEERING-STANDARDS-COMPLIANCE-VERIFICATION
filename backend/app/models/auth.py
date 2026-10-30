import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from app.database.session import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False)
    full_name = Column(String(128), nullable=True)
    role_name = Column(String(32), default="engineer") # admin, engineer, reviewer, viewer, auditor
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(32), unique=True, nullable=False)
    description = Column(String(256), nullable=True)
    permissions = Column(JSON, default=list)

class SettingsProfile(Base):
    __tablename__ = "settings_profiles"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(64), unique=True, nullable=False)
    is_active = Column(Boolean, default=False)
    preset_name = Column(String(32), default="Balanced")
    weights = Column(JSON, nullable=True)
    thresholds = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

