from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AuditRecordResponse(BaseModel):
    id: str
    project_id: str
    record_index: int
    timestamp: datetime
    actor: str
    action: str
    target_type: str
    target_id: str
    details: Optional[Dict[str, Any]] = None
    prev_record_hash: Optional[str] = None
    record_hash: str

    model_config = {"from_attributes": True}

class AuditVerifyResponse(BaseModel):
    is_valid: bool
    message: str
    verified_records_count: int

class RAGQueryRequest(BaseModel):
    query: str

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[Dict[str, Any]]
    prompt_injection_detected: bool = False
