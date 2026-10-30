from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.services.reconciliation_engine import (
    RequirementInput,
    EvidenceInput,
    reconcile_requirement,
    ReconciliationDecision
)
from app.services.risk_service import compute_risk_score, RiskFactorBreakdown
from app.services.dependency_service import DependencyGraphService, ImpactedNode

@dataclass
class SimulationResult:
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

def run_what_if_simulation(
    requirement_id: str,
    base_req: RequirementInput,
    base_design: List[EvidenceInput],
    base_test: List[EvidenceInput],
    original_status: str,
    original_risk_score: float,
    original_risk_level: str,
    override_threshold: Optional[Any] = None,
    override_measured_value: Optional[Any] = None,
    override_unit: Optional[str] = None,
    override_tolerance_authorized: Optional[bool] = None,
    override_allowed_tolerance: Optional[float] = None,
    dependency_graph: Optional[DependencyGraphService] = None
) -> SimulationResult:
    """
    Runs an isolated in-memory what-if scenario.
    Never alters stored database entities.
    """
    sim_req = RequirementInput(
        req_id=base_req.req_id,
        parameter=base_req.parameter,
        operator=base_req.operator,
        threshold=override_threshold if override_threshold is not None else base_req.threshold,
        unit=override_unit if override_unit is not None else base_req.unit,
        condition_context=base_req.condition_context,
        priority=base_req.priority,
        tolerance_authorized=override_tolerance_authorized if override_tolerance_authorized is not None else base_req.tolerance_authorized,
        allowed_tolerance=override_allowed_tolerance if override_allowed_tolerance is not None else base_req.allowed_tolerance,
        revision=base_req.revision
    )
    
    sim_test = []
    for t in base_test:
        sim_val = override_measured_value if override_measured_value is not None else t.value
        sim_unit = override_unit if override_unit is not None else t.unit
        sim_test.append(EvidenceInput(
            evidence_id=f"sim_{t.evidence_id}",
            statement_type=t.statement_type,
            parameter=t.parameter,
            operator=t.operator,
            value=sim_val,
            unit=sim_unit,
            condition_context=t.condition_context,
            revision=t.revision,
            measurement_uncertainty=t.measurement_uncertainty,
            page=t.page
        ))
        
    decision = reconcile_requirement(sim_req, base_design, sim_test)
    
    risk_breakdown = compute_risk_score(
        compliance_status=decision.status,
        priority=sim_req.priority,
        percentage_deviation=decision.percentage_deviation,
        has_failed_upstream=False,
        is_stale=False,
        is_conflicting=(decision.status == "CONFLICT")
    )
    
    impacted_nodes = []
    if dependency_graph and decision.status in ["NON_COMPLIANT", "UNVERIFIABLE"]:
        downstream = dependency_graph.propagate_failures([requirement_id])
        impacted_nodes = [{"requirement_id": i.requirement_id, "status": i.status, "distance": i.graph_distance} for i in downstream]
        
    return SimulationResult(
        requirement_id=requirement_id,
        original_status=original_status,
        hypothetical_status=decision.status,
        original_risk_score=original_risk_score,
        hypothetical_risk_score=risk_breakdown.total_score,
        original_risk_level=original_risk_level,
        hypothetical_risk_level=risk_breakdown.risk_level,
        reconciliation_details={
            "spec_limit": decision.spec_limit,
            "actual": decision.actual,
            "difference": decision.difference,
            "percentage_deviation": decision.percentage_deviation,
            "rule_id_fired": decision.rule_id_fired,
            "reason": decision.reason,
            "calculation_formula": decision.calculation_formula
        },
        impacted_dependencies=impacted_nodes,
        is_hypothetical=True
    )

