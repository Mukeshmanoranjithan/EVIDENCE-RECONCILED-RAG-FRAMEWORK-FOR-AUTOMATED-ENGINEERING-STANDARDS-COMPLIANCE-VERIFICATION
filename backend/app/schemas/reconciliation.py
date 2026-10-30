from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReconciliationResponse(BaseModel):
    id: str
    project_id: str
    requirement_id: str
    req_code: Optional[str] = None
    spec_limit: str
    design_claim: Optional[str] = None
    test_measurement: Optional[str] = None
    unit: Optional[str] = None
    difference: Optional[float] = None
    percentage_deviation: Optional[float] = None
    status: str # COMPLIANT, NON_COMPLIANT, CONFLICT, UNVERIFIABLE, NEEDS_REVIEW
    reason: str
    rule_id_fired: str
    is_marginal: bool = False
    calculation_formula: Optional[str] = None
    margin_to_limit: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class DecisionDetailResponse(BaseModel):
    requirement_id: str
    req_code: str
    statement: str
    category: str
    priority: str
    status: str
    spec_limit: str
    design_claim: Optional[str] = None
    test_measurement: Optional[str] = None
    difference: Optional[float] = None
    percentage_deviation: Optional[float] = None
    unit: Optional[str] = None
    rule_id_fired: str
    reason: str
    calculation_formula: Optional[str] = None
    margin_to_limit: Optional[float] = None
    is_marginal: bool = False
    risk_level: str
    risk_score: float
    risk_rationale: Optional[str] = None
    recommended_action: Optional[str] = None
    source_page: int
    source_doc_name: str
    highlight_bbox: Optional[List[float]] = None
    alternative_evidence: List[Dict[str, Any]] = []

class SimulationRequest(BaseModel):
    requirement_id: str
    override_threshold: Optional[Any] = None
    override_measured_value: Optional[Any] = None
    override_unit: Optional[str] = None
    override_tolerance_authorized: Optional[bool] = None
    override_allowed_tolerance: Optional[float] = None

class SimulationResponse(BaseModel):
    requirement_id: str
    original_status: str
    hypothetical_status: str
    original_risk_score: float
    hypothetical_risk_score: float
    original_risk_level: str
    hypothetical_risk_level: str
    reconciliation_details: Dict[str, Any]
    impacted_dependencies: List[Dict[str, Any]]
    is_hypothetical: bool = True

class DependencyCreate(BaseModel):
    source_req_id: str
    target_req_id: str
    dependency_type: str = "functional"

class DependencyResponse(BaseModel):
    id: str
    project_id: str
    source_req_id: str
    target_req_id: str
    dependency_type: str
    source: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}
