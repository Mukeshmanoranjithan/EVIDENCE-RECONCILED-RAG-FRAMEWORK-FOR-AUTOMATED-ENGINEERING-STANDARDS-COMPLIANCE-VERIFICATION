import pytest
hypothesis = pytest.importorskip("hypothesis")
from hypothesis import given, strategies as st
from app.services.units_service import convert_value
from app.services.reconciliation_engine import (
    RequirementInput,
    EvidenceInput,
    reconcile_requirement,
)

# Test 1: Temperature round-trip invariance (°C -> °F -> °C)
@given(temp_c=st.floats(min_value=-50.0, max_value=250.0))
def test_temperature_roundtrip(temp_c):
    # Convert C -> F
    temp_f, _ = convert_value(temp_c, "C", "F")
    # Convert F -> C
    temp_c_back, _ = convert_value(temp_f, "F", "C")
    assert abs(temp_c - temp_c_back) < 1e-4

# Test 2: Length round-trip invariance (mm -> m -> mm)
@given(length_mm=st.floats(min_value=0.01, max_value=10000.0))
def test_length_roundtrip(length_mm):
    length_m, _ = convert_value(length_mm, "mm", "m")
    length_mm_back, _ = convert_value(length_m, "m", "mm")
    assert abs(length_mm - length_mm_back) < 1e-4

# Test 3: Operator monotonicity (if measured <= threshold for operator <=, then it MUST be COMPLIANT)
@given(
    limit=st.floats(min_value=10.0, max_value=100.0),
    delta=st.floats(min_value=0.0, max_value=50.0)
)
def test_less_than_equal_monotonicity(limit, delta):
    # measured = limit - delta <= limit -> COMPLIANT
    measured = limit - delta
    req = RequirementInput(req_id="REQ-MONO", parameter="val", operator="<=", threshold=limit, unit="m")
    test = [EvidenceInput(evidence_id="t1", statement_type="measured_result", parameter="val", operator="==", value=measured, unit="m")]
    
    dec = reconcile_requirement(req, [], test)
    assert dec.status == "COMPLIANT"

# Test 4: Missing test evidence MUST ALWAYS be UNVERIFIABLE regardless of design claim
@given(
    limit=st.floats(min_value=1.0, max_value=100.0),
    design_val=st.floats(min_value=1.0, max_value=100.0)
)
def test_missing_test_always_unverifiable(limit, design_val):
    req = RequirementInput(req_id="REQ-UNV", parameter="val", operator="<=", threshold=limit, unit="kg")
    design = [EvidenceInput(evidence_id="d1", statement_type="design_claim", parameter="val", operator="<=", value=design_val, unit="kg")]
    
    dec = reconcile_requirement(req, design, [])
    assert dec.status == "UNVERIFIABLE"
    assert dec.rule_id_fired == "RULE_1"

