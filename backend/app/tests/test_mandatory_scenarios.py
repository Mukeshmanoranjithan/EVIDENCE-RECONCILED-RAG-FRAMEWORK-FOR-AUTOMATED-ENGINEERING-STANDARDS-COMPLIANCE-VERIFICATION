import pytest
from app.services.reconciliation_engine import (
    RequirementInput,
    EvidenceInput,
    reconcile_requirement,
)

def test_scenario_a_compliant():
    """Scenario A: Temp <= 85 C, Design 80 C, Test 82 C -> COMPLIANT"""
    req = RequirementInput(req_id="REQ-A", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="temperature", operator="<=", value=80.0, unit="C")]
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=82.0, unit="C")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "COMPLIANT"
    assert dec.rule_id_fired == "RULE_6"
    assert "satisfies specification limit" in dec.reason

def test_scenario_b_non_compliant():
    """Scenario B: Temp <= 85 C, Design 80 C, Test 91 C -> NON_COMPLIANT (+6 C, 7.06 %)"""
    req = RequirementInput(req_id="REQ-B", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="temperature", operator="<=", value=80.0, unit="C")]
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=91.0, unit="C")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NON_COMPLIANT"
    assert dec.difference == 6.0
    assert dec.percentage_deviation is not None
    assert round(dec.percentage_deviation, 2) == 7.06
    assert "violates specification limit" in dec.reason

def test_scenario_c_missing_test():
    """Scenario C: Temp <= 85 C, Design 80 C, Test none -> UNVERIFIABLE"""
    req = RequirementInput(req_id="REQ-C", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="temperature", operator="<=", value=80.0, unit="C")]
    test = []
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "UNVERIFIABLE"
    assert dec.rule_id_fired == "RULE_1"
    assert "Design claims alone cannot substantiate compliance" in dec.reason

def test_scenario_d_conflict():
    """Scenario D: Temp <= 85 C, Design 80 C, Test 91 C and 82 C under same conditions -> CONFLICT"""
    req = RequirementInput(req_id="REQ-D", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="temperature", operator="<=", value=80.0, unit="C")]
    test = [
        EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=91.0, unit="C"),
        EvidenceInput(evidence_id="t2", statement_type="measured_result", parameter="temperature", operator="==", value=82.0, unit="C"),
    ]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "CONFLICT"
    assert dec.rule_id_fired == "RULE_4"
    assert "Conflicting test measurements" in dec.reason

def test_scenario_e_unit_conversion():
    """Scenario E (Bug fix from v1): Temp <= 85 C, Test 176 F = 80 C -> COMPLIANT"""
    # Math: (176 - 32) * 5/9 = 80 C <= 85 C -> COMPLIANT
    req = RequirementInput(req_id="REQ-E", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = []
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=176.0, unit="F")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "COMPLIANT"
    assert dec.rule_id_fired == "RULE_6"
    assert "Converted via:" in dec.reason
    assert "80" in dec.actual

def test_scenario_f_boundary_inclusive():
    """Scenario F: Temp <= 85 C, Test 85 C -> COMPLIANT (inclusive)"""
    req = RequirementInput(req_id="REQ-F", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = []
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=85.0, unit="C")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "COMPLIANT"
    assert dec.difference == 0.0

def test_scenario_g_strict_operator():
    """Scenario G: Temp < 85 C, Test 85 C -> NON_COMPLIANT"""
    req = RequirementInput(req_id="REQ-G", parameter="temperature", operator="<", threshold=85.0, unit="C")
    design = []
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=85.0, unit="C")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NON_COMPLIANT"
    assert dec.difference == 0.0

def test_scenario_h_incompatible_unit():
    """Scenario H: Temp <= 85 C, Test 80 V -> NEEDS_REVIEW"""
    req = RequirementInput(req_id="REQ-H", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = []
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="voltage", operator="==", value=80.0, unit="V")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NEEDS_REVIEW"
    assert dec.rule_id_fired == "RULE_2"
    assert "Incompatible unit dimension" in dec.reason

def test_scenario_i_condition_mismatch():
    """Scenario I: Temp <= 85 C at 25 C ambient, Test 82 C at 60 C ambient -> NEEDS_REVIEW"""
    req = RequirementInput(
        req_id="REQ-I", parameter="temperature", operator="<=", threshold=85.0, unit="C",
        condition_context="ambient 25C"
    )
    design = []
    test = [
        EvidenceInput(
            evidence_id="t1", statement_type="measured_result", parameter="temperature",
            operator="==", value=82.0, unit="C", condition_context="ambient 60C"
        )
    ]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NEEDS_REVIEW"
    assert dec.rule_id_fired == "RULE_3"
    assert "Test condition mismatch" in dec.reason

def test_scenario_j_unauthorized_tolerance():
    """Scenario J: Temp <= 85 C, no tolerance clause, Test 85.5 C -> NON_COMPLIANT"""
    req = RequirementInput(
        req_id="REQ-J", parameter="temperature", operator="<=", threshold=85.0, unit="C",
        tolerance_authorized=False, allowed_tolerance=None
    )
    design = []
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="temperature", operator="==", value=85.5, unit="C")]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NON_COMPLIANT"
    assert dec.difference == 0.5

def test_scenario_k_design_only():
    """Scenario K: Temp <= 85 C, Design 80 C, Test none -> UNVERIFIABLE"""
    req = RequirementInput(req_id="REQ-K", parameter="temperature", operator="<=", threshold=85.0, unit="C")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="temperature", operator="<=", value=80.0, unit="C")]
    test = []
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "UNVERIFIABLE"
    assert dec.rule_id_fired == "RULE_1"

def test_scenario_l_stale_evidence():
    """Scenario L: Spec v2 limit changed, Test against v1 -> NEEDS_REVIEW (flagged stale)"""
    req = RequirementInput(
        req_id="REQ-L", parameter="temperature", operator="<=", threshold=85.0, unit="C",
        revision="v2.0"
    )
    design = []
    test = [
        EvidenceInput(
            evidence_id="t1", statement_type="measured_result", parameter="temperature",
            operator="==", value=80.0, unit="C", revision="v1.0"
        )
    ]
    
    dec = reconcile_requirement(req, design, test)
    assert dec.status == "NEEDS_REVIEW"
    assert "Stale Evidence" in dec.reason

