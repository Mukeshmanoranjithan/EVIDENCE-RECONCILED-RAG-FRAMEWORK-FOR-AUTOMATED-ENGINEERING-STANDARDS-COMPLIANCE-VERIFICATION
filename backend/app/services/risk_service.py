from typing import Dict, Any, List, Optional
from dataclasses import dataclass

@dataclass
class RiskFactorBreakdown:
    non_compliance_factor: float
    criticality_factor: float
    missing_evidence_factor: float
    deviation_factor: float
    failed_dependency_factor: float
    stale_document_factor: float
    total_score: float
    risk_level: str # Critical, High, Medium, Low
    rationale: str
    recommended_action: str

def compute_risk_score(
    compliance_status: str,
    priority: str,
    percentage_deviation: Optional[float],
    has_failed_upstream: bool,
    is_stale: bool = False,
    is_conflicting: bool = False
) -> RiskFactorBreakdown:
    """
    Computes transparent, explainable 0-100 risk score based on rule factors.
    NOTE: Not a certified safety assessment.
    """
    non_comp_factor = 0.0
    criticality_factor = 0.0
    missing_ev_factor = 0.0
    deviation_factor = 0.0
    dep_factor = 0.0
    stale_factor = 0.0
    
    rationale_points = []
    
    # 1. Non-Compliance or Conflict (+40 pts)
    if compliance_status == "NON_COMPLIANT":
        non_comp_factor = 40.0
        rationale_points.append("Requirement is non-compliant based on physical test measurements (+40 pts).")
    elif compliance_status == "CONFLICT" or is_conflicting:
        non_comp_factor = 35.0
        rationale_points.append("Conflicting test records detected (+35 pts).")
    elif compliance_status == "NEEDS_REVIEW":
        non_comp_factor = 25.0
        rationale_points.append("Measurement or condition ambiguity requires human review (+25 pts).")
        
    # 2. Criticality / Priority
    p_upper = priority.upper()
    if p_upper == "MUST" or "SAFETY" in p_upper:
        criticality_factor = 25.0
        rationale_points.append("Mandatory safety / MUST priority (+25 pts).")
    elif p_upper == "SHALL":
        criticality_factor = 20.0
        rationale_points.append("Normative SHALL requirement (+20 pts).")
    elif p_upper == "SHOULD":
        criticality_factor = 10.0
    else:
        criticality_factor = 5.0
        
    # 3. Missing Evidence
    if compliance_status == "UNVERIFIABLE":
        missing_ev_factor = 25.0
        rationale_points.append("Missing test evidence: requirement is unverifiable (+25 pts).")
        
    # 4. Deviation Magnitude
    if percentage_deviation is not None:
        abs_dev = abs(percentage_deviation)
        if abs_dev > 10.0:
            deviation_factor = 15.0
            rationale_points.append(f"Severe limit deviation ({abs_dev:.1f}% > 10%) (+15 pts).")
        elif abs_dev > 5.0:
            deviation_factor = 10.0
            rationale_points.append(f"Moderate limit deviation ({abs_dev:.1f}% > 5%) (+10 pts).")
        elif abs_dev > 0.0:
            deviation_factor = 5.0
            
    # 5. Failed Upstream Dependency
    if has_failed_upstream:
        dep_factor = 15.0
        rationale_points.append("Upstream prerequisite requirement has failed or is unverifiable (+15 pts).")
        
    # 6. Stale Evidence
    if is_stale:
        stale_factor = 10.0
        rationale_points.append("Evidence was gathered on a superseded specification revision (+10 pts).")
        
    total_score = min(100.0, non_comp_factor + criticality_factor + missing_ev_factor + deviation_factor + dep_factor + stale_factor)
    
    if total_score >= 75.0:
        risk_level = "Critical"
        recommended_action = "Initiate immediate design review and test re-evaluation. Do not baseline."
    elif total_score >= 50.0:
        risk_level = "High"
        recommended_action = "Conduct targeted root-cause analysis and execute supplemental physical testing."
    elif total_score >= 25.0:
        risk_level = "Medium"
        recommended_action = "Review tolerance margins and schedule verification in next test cycle."
    else:
        risk_level = "Low"
        recommended_action = "Nominal compliance. Archive evidence and proceed to report."
        
    rationale = " ".join(rationale_points) if rationale_points else "All parameters within specified limits and tolerances."
    
    return RiskFactorBreakdown(
        non_compliance_factor=non_comp_factor,
        criticality_factor=criticality_factor,
        missing_evidence_factor=missing_ev_factor,
        deviation_factor=deviation_factor,
        failed_dependency_factor=dep_factor,
        stale_document_factor=stale_factor,
        total_score=round(total_score, 1),
        risk_level=risk_level,
        rationale=rationale,
        recommended_action=recommended_action
    )

