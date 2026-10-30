from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from app.services.units_service import are_units_compatible, convert_value, calculate_deviation

@dataclass
class RequirementInput:
    req_id: str
    parameter: str
    operator: str # "<=", ">=", "==", "<", ">", "range", "within_range", "boolean"
    threshold: Any # float, int, str like "5.0,5.5" or tuple
    unit: Optional[str] = None
    condition_context: Optional[str] = None
    priority: str = "SHALL"
    tolerance_authorized: bool = False
    allowed_tolerance: Optional[float] = None
    revision: Optional[str] = None

@dataclass
class EvidenceInput:
    evidence_id: str
    statement_type: str # "design_claim" or "measured_result"
    parameter: str
    operator: str
    value: Any
    unit: Optional[str] = None
    condition_context: Optional[str] = None
    revision: Optional[str] = None
    measurement_uncertainty: Optional[float] = None
    source_doc_id: Optional[str] = None
    page: int = 1

@dataclass
class ReconciliationDecision:
    requirement_id: str
    spec_limit: str
    design_claim: Optional[str]
    test_measurement: Optional[str]
    expected: str
    actual: str
    difference: Optional[float]
    percentage_deviation: Optional[float]
    unit: Optional[str]
    status: str # COMPLIANT, NON_COMPLIANT, CONFLICT, UNVERIFIABLE, NEEDS_REVIEW
    reason: str
    rule_id_fired: str
    evidence_references: List[str]
    page_numbers: List[int]
    is_marginal: bool = False
    calculation_formula: Optional[str] = None
    margin_to_limit: Optional[float] = None
    design_test_discrepancy: bool = False

def _parse_num(val: Any) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.strip().replace(",", "")
        return float(cleaned)
    raise ValueError(f"Cannot parse numeric value from {val}")

def _parse_range(threshold: Any) -> Tuple[float, float]:
    if isinstance(threshold, (tuple, list)) and len(threshold) == 2:
        return float(threshold[0]), float(threshold[1])
    if isinstance(threshold, str):
        if "," in threshold:
            parts = threshold.split(",")
            return float(parts[0].strip()), float(parts[1].strip())
        if " to " in threshold:
            parts = threshold.split(" to ")
            return float(parts[0].strip()), float(parts[1].strip())
        if " - " in threshold:
            parts = threshold.split(" - ")
            return float(parts[0].strip()), float(parts[1].strip())
    raise ValueError(f"Cannot parse range from {threshold}")

def _evaluate_operator(actual: float, operator: str, expected: Any) -> bool:
    op = operator.strip()
    if op in ["<=", "≤"]:
        return actual <= expected
    elif op in ["<"]:
        return actual < expected
    elif op in [">=", "≥"]:
        return actual >= expected
    elif op in [">"]:
        return actual > expected
    elif op in ["==", "=", "equals"]:
        return abs(actual - expected) < 1e-6
    elif op in ["range", "between", "within_range"]:
        low, high = _parse_range(expected)
        return low <= actual <= high
    elif op in ["boolean"]:
        return bool(actual) == bool(expected)
    return False

def _conditions_match(req_cond: Optional[str], ev_cond: Optional[str]) -> bool:
    if not req_cond:
        return True
    if not ev_cond:
        return False
    # Normalize condition strings
    rc = req_cond.strip().lower()
    ec = ev_cond.strip().lower()
    return rc == ec

def reconcile_requirement(
    req: RequirementInput,
    design_evidence: List[EvidenceInput],
    test_evidence: List[EvidenceInput],
    repeatability_band: float = 0.5
) -> ReconciliationDecision:
    """
    Deterministic 7-tier rule reconciliation engine.
    Produces traceable, explainable compliance decisions.
    """
    spec_limit_str = f"{req.operator} {req.threshold} {req.unit or ''}".strip()
    design_claim_str = None
    if design_evidence:
        d = design_evidence[0]
        design_claim_str = f"{d.operator} {d.value} {d.unit or ''}".strip()
        
    all_ev_ids = [e.evidence_id for e in design_evidence + test_evidence]
    all_pages = sorted(list(set([e.page for e in design_evidence + test_evidence])))
    
    # -------------------------------------------------------------------------
    # RULE 1: No valid test evidence -> UNVERIFIABLE
    # (Design claims alone never substitute for test measurements)
    # -------------------------------------------------------------------------
    if not test_evidence:
        return ReconciliationDecision(
            requirement_id=req.req_id,
            spec_limit=spec_limit_str,
            design_claim=design_claim_str,
            test_measurement=None,
            expected=spec_limit_str,
            actual="None (Missing Test Evidence)",
            difference=None,
            percentage_deviation=None,
            unit=req.unit,
            status="UNVERIFIABLE",
            reason="No test report or measured result was provided. Design claims alone cannot substantiate compliance.",
            rule_id_fired="RULE_1",
            evidence_references=all_ev_ids,
            page_numbers=all_pages
        )

    # -------------------------------------------------------------------------
    # STALE EVIDENCE CHECK: Test run against older revision
    # -------------------------------------------------------------------------
    for te in test_evidence:
        if req.revision and te.revision and req.revision.lower() != te.revision.lower():
            return ReconciliationDecision(
                requirement_id=req.req_id,
                spec_limit=spec_limit_str,
                design_claim=design_claim_str,
                test_measurement=f"{te.value} {te.unit or ''} (Rev: {te.revision})",
                expected=f"{spec_limit_str} (Req Rev: {req.revision})",
                actual=f"{te.value} {te.unit or ''}",
                difference=None,
                percentage_deviation=None,
                unit=req.unit,
                status="NEEDS_REVIEW",
                reason=f"Stale Evidence: Test evidence was conducted on revision '{te.revision}', but requirement was updated to revision '{req.revision}'.",
                rule_id_fired="RULE_3_STALE_REVISION",
                evidence_references=all_ev_ids,
                page_numbers=all_pages
            )

    # -------------------------------------------------------------------------
    # RULE 2: Incompatible unit dimensions or unresolved ambiguity -> NEEDS_REVIEW
    # -------------------------------------------------------------------------
    for te in test_evidence:
        if not are_units_compatible(req.unit, te.unit):
            return ReconciliationDecision(
                requirement_id=req.req_id,
                spec_limit=spec_limit_str,
                design_claim=design_claim_str,
                test_measurement=f"{te.value} {te.unit or ''}",
                expected=spec_limit_str,
                actual=f"{te.value} {te.unit or ''}",
                difference=None,
                percentage_deviation=None,
                unit=req.unit,
                status="NEEDS_REVIEW",
                reason=f"Incompatible unit dimension: Requirement requires '{req.unit}', but test measurement was measured in incompatible unit '{te.unit}'.",
                rule_id_fired="RULE_2",
                evidence_references=all_ev_ids,
                page_numbers=all_pages
            )

    # -------------------------------------------------------------------------
    # RULE 3: Test condition mismatch with requirement -> NEEDS_REVIEW
    # -------------------------------------------------------------------------
    for te in test_evidence:
        if not _conditions_match(req.condition_context, te.condition_context):
            return ReconciliationDecision(
                requirement_id=req.req_id,
                spec_limit=spec_limit_str,
                design_claim=design_claim_str,
                test_measurement=f"{te.value} {te.unit or ''} (at {te.condition_context or 'unspecified'})",
                expected=f"{spec_limit_str} (at {req.condition_context or 'unspecified'})",
                actual=f"{te.value} {te.unit or ''}",
                difference=None,
                percentage_deviation=None,
                unit=req.unit,
                status="NEEDS_REVIEW",
                reason=f"Test condition mismatch: Requirement specifies condition '{req.condition_context}', but test was conducted under '{te.condition_context}'.",
                rule_id_fired="RULE_3",
                evidence_references=all_ev_ids,
                page_numbers=all_pages
            )

    # -------------------------------------------------------------------------
    # RULE 4: Disagreeing or non-repeatable test records -> CONFLICT
    # -------------------------------------------------------------------------
    if len(test_evidence) >= 2:
        # Normalize first two tests for repeatability comparison
        t1, t2 = test_evidence[0], test_evidence[1]
        v1, _ = convert_value(_parse_num(t1.value), t1.unit, req.unit)
        v2, _ = convert_value(_parse_num(t2.value), t2.unit, req.unit)
        
        # Check if one passes and one fails, or difference exceeds repeatability
        if req.operator not in ["range", "between", "within_range"]:
            req_thr = _parse_num(req.threshold)
            p1 = _evaluate_operator(v1, req.operator, req_thr)
            p2 = _evaluate_operator(v2, req.operator, req_thr)
            if p1 != p2 or abs(v1 - v2) > repeatability_band:
                return ReconciliationDecision(
                    requirement_id=req.req_id,
                    spec_limit=spec_limit_str,
                    design_claim=design_claim_str,
                    test_measurement=f"Test 1: {t1.value} {t1.unit}, Test 2: {t2.value} {t2.unit}",
                    expected=spec_limit_str,
                    actual=f"{v1:.4g} vs {v2:.4g} {req.unit}",
                    difference=abs(v1 - v2),
                    percentage_deviation=None,
                    unit=req.unit,
                    status="CONFLICT",
                    reason=f"Conflicting test measurements: Two test records under the same condition produced divergent results ({v1:.4g} vs {v2:.4g} {req.unit}).",
                    rule_id_fired="RULE_4",
                    evidence_references=all_ev_ids,
                    page_numbers=all_pages
                )

    # Primary test record evaluation
    primary_test = test_evidence[0]
    raw_test_val = _parse_num(primary_test.value)
    converted_test_val, unit_conv_trail = convert_value(raw_test_val, primary_test.unit, req.unit)
    
    # -------------------------------------------------------------------------
    # RULE 5: Design claim contradiction flag
    # -------------------------------------------------------------------------
    design_test_discrepancy = False
    if design_evidence:
        d = design_evidence[0]
        if are_units_compatible(req.unit, d.unit):
            d_val, _ = convert_value(_parse_num(d.value), d.unit, req.unit)
            if req.operator not in ["range", "between", "within_range"]:
                req_thr = _parse_num(req.threshold)
                d_pass = _evaluate_operator(d_val, req.operator, req_thr)
                t_pass = _evaluate_operator(converted_test_val, req.operator, req_thr)
                if d_pass != t_pass:
                    design_test_discrepancy = True

    # -------------------------------------------------------------------------
    # RULE 6 & 7: Operator Evaluation & Tolerance Checks
    # -------------------------------------------------------------------------
    if req.operator in ["range", "between", "within_range"]:
        low, high = _parse_range(req.threshold)
        is_compliant = (low <= converted_test_val <= high)
        margin_to_limit = min(converted_test_val - low, high - converted_test_val)
        calc_formula = f"{low} <= {converted_test_val:.4g} <= {high} -> {'PASS' if is_compliant else 'FAIL'}"
        diff = 0.0 if is_compliant else (converted_test_val - high if converted_test_val > high else low - converted_test_val)
        pct_dev = 0.0
    else:
        threshold_val = _parse_num(req.threshold)
        diff, pct_dev, dev_formula = calculate_deviation(converted_test_val, threshold_val)
        
        # Calculate base operator compliance (strict boundary)
        is_compliant = _evaluate_operator(converted_test_val, req.operator, threshold_val)
        
        # Margin to limit (distance from boundary)
        margin_to_limit = threshold_val - converted_test_val if req.operator in ["<=", "<"] else converted_test_val - threshold_val
        
        # RULE 7: Apply tolerance only if authorized by specification
        if not is_compliant and req.tolerance_authorized and req.allowed_tolerance:
            effective_diff = abs(converted_test_val - threshold_val)
            if effective_diff <= req.allowed_tolerance:
                is_compliant = True
                calc_formula = f"Authorized tolerance applied: difference {effective_diff:.4g} <= allowed tolerance {req.allowed_tolerance:.4g}"
            else:
                calc_formula = f"Exceeds authorized tolerance: difference {effective_diff:.4g} > allowed tolerance {req.allowed_tolerance:.4g}"
        else:
            calc_formula = dev_formula

    # Check guard-band warning (margin smaller than measurement uncertainty)
    is_marginal = False
    if is_compliant and primary_test.measurement_uncertainty is not None and margin_to_limit is not None:
        if 0 <= margin_to_limit < primary_test.measurement_uncertainty:
            is_marginal = True

    final_status = "COMPLIANT" if is_compliant else "NON_COMPLIANT"
    rule_fired = "RULE_7" if (req.tolerance_authorized and req.allowed_tolerance) else "RULE_6"
    
    if final_status == "COMPLIANT":
        reason = f"Measured test result ({converted_test_val:.4g} {req.unit or ''}) satisfies specification limit ({req.operator} {req.threshold} {req.unit or ''})."
        if unit_conv_trail and primary_test.unit != req.unit:
            reason += f" Converted via: {unit_conv_trail}."
    else:
        reason = f"Measured test result ({converted_test_val:.4g} {req.unit or ''}) violates specification limit ({req.operator} {req.threshold} {req.unit or ''})."
        if pct_dev is not None and abs(pct_dev) > 0.001:
            reason += f" Deviation: {diff:+.4g} {req.unit or ''} ({pct_dev:+.2f}%)."
            
    if design_test_discrepancy:
        reason += " [Notice: Design claim contradicted test measurement; compliance follows physical test.]"
    if is_marginal:
        reason += " [Warning: Margin is within measurement uncertainty band.]"

    return ReconciliationDecision(
        requirement_id=req.req_id,
        spec_limit=spec_limit_str,
        design_claim=design_claim_str,
        test_measurement=f"{primary_test.value} {primary_test.unit or ''}".strip(),
        expected=spec_limit_str,
        actual=f"{converted_test_val:.4g} {req.unit or ''}".strip(),
        difference=diff,
        percentage_deviation=pct_dev,
        unit=req.unit,
        status=final_status,
        reason=reason,
        rule_id_fired=rule_fired,
        evidence_references=all_ev_ids,
        page_numbers=all_pages,
        is_marginal=is_marginal,
        calculation_formula=calc_formula,
        margin_to_limit=margin_to_limit,
        design_test_discrepancy=design_test_discrepancy
    )

