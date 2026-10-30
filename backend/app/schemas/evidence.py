from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class EvidenceRecordResponse(BaseModel):
    id: str
    project_id: str
    document_id: Optional[str] = None
    evidence_id: str
    statement_type: str
    raw_statement: Optional[str] = None
    parameter: str
    operator: str
    value: str
    unit: Optional[str] = None
    condition_context: Optional[str] = None
    configuration_id: Optional[str] = None
    revision: Optional[str] = None
    measurement_uncertainty: Optional[float] = None
    page: int = 1
    bbox: Optional[List[float]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class EvidenceMappingResponse(BaseModel):
    id: str
    project_id: str
    requirement_id: str
    evidence_id: str
    score_composite: float
    score_semantic: float
    score_keyword: float
    score_parameter: float
    score_context: float
    status: str
    reviewer_id: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ReviewTaskResponse(BaseModel):
    id: str
    project_id: str
    requirement_id: str
    evidence_id: Optional[str] = None
    priority: str
    status: str
    reason: str
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ReviewTaskUpdate(BaseModel):
    status: str # open, in_review, resolved
    assigned_to: Optional[str] = None
    comment: Optional[str] = None
