import os
import io
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from app.main import app

client = TestClient(app)

def create_test_pdf_bytes(lines: list[str]) -> io.BytesIO:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in lines:
        c.drawString(72, y, line)
        y -= 30
    c.save()
    buf.seek(0)
    return buf

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "EERE v2"

def test_api_project_lifecycle_and_analysis():
    # 1. Initially projects list is clean or queryable
    p_res = client.get("/api/projects")
    assert p_res.status_code == 200

    # 2. Create project
    create_res = client.post("/api/projects", json={
        "name": "Unit Test Flight Computer",
        "description": "Clean test project",
        "domain": "aerospace",
        "version": "v1.0",
        "preset": "Strict"
    })
    assert create_res.status_code == 200
    proj = create_res.json()
    proj_id = proj["id"]
    assert proj["name"] == "Unit Test Flight Computer"

    # 3. Upload specification PDF
    spec_pdf = create_test_pdf_bytes([
        "SYSTEM SPECIFICATION",
        "REQ-001: The operating temperature shall not exceed 85 C.",
        "REQ-002: Total unit weight shall not exceed 10.0 kg."
    ])
    up_spec = client.post(
        f"/api/projects/{proj_id}/documents",
        files={"file": ("spec.pdf", spec_pdf.getvalue(), "application/pdf")},
        data={"doc_type": "specification"}
    )
    assert up_spec.status_code == 200
    spec_doc = up_spec.json()
    assert spec_doc["filename"] == "spec.pdf"
    assert spec_doc["doc_type"] == "specification"

    # 4. Upload test report PDF (Scenario E: 176 F = 80 C <= 85 C -> COMPLIANT)
    test_pdf = create_test_pdf_bytes([
        "PHYSICAL TEST REPORT",
        "TR-001: Measured operating temperature was 176 F under full computational load.",
        "TR-002: Measured dry weight was 14.2 kg on calibrated balance."
    ])
    up_test = client.post(
        f"/api/projects/{proj_id}/documents",
        files={"file": ("test.pdf", test_pdf.getvalue(), "application/pdf")},
        data={"doc_type": "test_report"}
    )
    assert up_test.status_code == 200

    # 5. Execute Analysis
    analyze_res = client.post(f"/api/projects/{proj_id}/analyze")
    assert analyze_res.status_code == 200
    analyze_data = analyze_res.json()
    assert analyze_data["requirements_extracted"] >= 2

    # 6. Check Requirements
    reqs_res = client.get(f"/api/projects/{proj_id}/requirements")
    assert reqs_res.status_code == 200
    reqs = reqs_res.json()
    assert len(reqs) >= 2

    # 7. Check Reconciliation Results
    rec_res = client.get(f"/api/projects/{proj_id}/reconciliation")
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) >= 2

    # Scenario E: 176 F = 80 C <= 85 C -> COMPLIANT
    r_temp = next((r for r in recs if "temp" in r["req_code"].lower() or "001" in r["req_code"]), None)
    assert r_temp is not None
    assert r_temp["status"] == "COMPLIANT"

    # Scenario B: 14.2 kg > 10 kg -> NON_COMPLIANT
    r_wt = next((r for r in recs if "weight" in r["req_code"].lower() or "002" in r["req_code"]), None)
    assert r_wt is not None
    assert r_wt["status"] == "NON_COMPLIANT"

    # 8. Decision Detail Endpoint
    detail_res = client.get(f"/api/projects/{proj_id}/reconciliation/{r_temp['req_code']}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "COMPLIANT"
    assert "source_page" in detail
    assert "calculation_formula" in detail

    # 9. Audit Chain Verification
    audit_res = client.post(f"/api/projects/{proj_id}/audit/verify")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["is_valid"] is True
    assert audit_data["verified_records_count"] >= 3

    # 10. Report Generation
    rep_res = client.post(f"/api/projects/{proj_id}/reports/generate?template=technical")
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["pdf_report"].endswith(".pdf")
    assert rep_data["excel_matrix"].endswith(".xlsx")

    # 11. Delete Project
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify project is gone
    check_proj = client.get(f"/api/projects/{proj_id}")
    assert check_proj.status_code == 404
