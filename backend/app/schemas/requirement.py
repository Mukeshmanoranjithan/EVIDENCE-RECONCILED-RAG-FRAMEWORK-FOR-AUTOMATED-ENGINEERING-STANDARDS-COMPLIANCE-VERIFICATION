from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class RequirementBase(BaseModel):
    req_id: str
    parent_req_id: Optional[str] = None
    statement: str
    category: str = "general"
    parameter: str
    operator: str = "<="
    threshold: str
    unit: Optional[str] = None
    condition_context: Optional[str] = None
    priority: str = "SHALL"
    page: int = 1
    bbox: Optional[List[float]] = None

class RequirementResponse(RequirementBase):
    id: str
    project_id: str
    document_id: Optional[str] = None
    extraction_confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}

class RequirementUpdate(BaseModel):
    statement: Optional[str] = None
    parameter: Optional[str] = None
    operator: Optional[str] = None
    threshold: Optional[str] = None
    unit: Optional[str] = None
    condition_context: Optional[str] = None
    priority: Optional[str] = None
    reason: str # Mandatory reason for edit
