from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    domain: str = "general"
    version: str = "v1.0"
    preset: str = "Balanced"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    is_archived: bool
    is_demo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    doc_type: str
    file_hash: str
    file_size: int
    page_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
