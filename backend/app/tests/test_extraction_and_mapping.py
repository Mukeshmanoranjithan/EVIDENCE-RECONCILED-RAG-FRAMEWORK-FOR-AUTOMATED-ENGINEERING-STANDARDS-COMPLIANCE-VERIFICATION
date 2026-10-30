import pytest
from app.services.extraction_service import (
    split_compound_statements,
    detect_priority,
    extract_conditions,
    ExtractedNode,
    extract_requirements_from_nodes,
    extract_evidence_from_nodes,
)
from app.ml.hybrid_matcher import match_requirement_and_evidence

def test_split_compound_statements():
    compound_text = "The max_operating_temperature shall be <= 50 C and the max_weight shall be <= 10.0 kg."
    parts = split_compound_statements(compound_text)
    assert len(parts) == 2
    assert "max_operating_temperature" in parts[0]
    assert "max_weight" in parts[1]

def test_modal_verb_priority():
    assert detect_priority("The system SHALL shut down within 10 ms.") == "SHALL"
    assert detect_priority("The enclosure MUST withstand 100 bar.") == "MUST"
    assert detect_priority("The user interface SHOULD show a confirmation.") == "SHOULD"
    assert detect_priority("An operator MAY override the warning.") == "MAY"

def test_condition_extraction():
    cond1 = extract_conditions("Measured max_operating_temperature was == 82 C at 25 C ambient.")
    assert cond1 is not None
    assert "25 C" in cond1

def test_compound_requirement_extraction_from_nodes():
    node = ExtractedNode(
        node_id="n1",
        doc_id="spec_doc",
        doc_type="specification",
        section_path="Thermal",
        page=1,
        bbox=[0, 0, 100, 100],
        content_type="text",
        raw_text="REQ-100: The max_operating_temperature shall be <= 50 C and the max_weight shall be <= 10.0 kg."
    )
    reqs = extract_requirements_from_nodes([node])
    assert len(reqs) == 2
    assert reqs[0].req_id == "REQ-100.1"
    assert reqs[0].parent_req_id == "REQ-100"
    assert reqs[0].parameter == "max_operating_temperature"
    assert reqs[1].req_id == "REQ-100.2"
    assert reqs[1].parent_req_id == "REQ-100"
    assert reqs[1].parameter == "max_weight"

def test_hybrid_matching_high_confidence():
    breakdown = match_requirement_and_evidence(
        req_statement="The max_operating_temperature shall be <= 50 C.",
        req_param="max_operating_temperature",
        req_unit="C",
        req_context="ambient 25C",
        ev_statement="Measured max_operating_temperature was == 48 C at ambient 25C.",
        ev_param="max_operating_temperature",
        ev_unit="C",
        ev_context="ambient 25C"
    )
    assert breakdown.score_composite >= 0.80
    assert breakdown.status == "auto_accepted"
    assert breakdown.score_parameter >= 0.90

def test_hybrid_matching_hard_gate_unit_dimension():
    # Comparing temperature (C) to voltage (V) MUST be hard-gated to rejected
    breakdown = match_requirement_and_evidence(
        req_statement="The max_operating_temperature shall be <= 50 C.",
        req_param="temperature",
        req_unit="C",
        req_context=None,
        ev_statement="Measured voltage_output was == 50 V.",
        ev_param="voltage",
        ev_unit="V",
        ev_context=None
    )
    assert breakdown.score_composite <= 0.20
    assert breakdown.status == "rejected"
    assert "Hard Gate: Incompatible unit dimensions" in breakdown.explanation

def test_hybrid_matching_hard_gate_parameter_mismatch():
    # Completely different parameter names
    breakdown = match_requirement_and_evidence(
        req_statement="The acoustic_noise shall be <= 40 dB.",
        req_param="acoustic_noise",
        req_unit="dB",
        req_context=None,
        ev_statement="Measured hydraulic_flow_rate was == 35 dB.",
        ev_param="hydraulic_flow_rate",
        ev_unit="dB",
        ev_context=None
    )
    assert breakdown.score_composite <= 0.40
    assert breakdown.status == "rejected"
    assert "Hard Gate: Parameter mismatch" in breakdown.explanation

