import os
import json
import zipfile
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.core.config import REPORTS_DIR

def generate_pdf_report(
    project_name: str,
    project_domain: str,
    reconciliation_results: List[Dict[str, Any]],
    risk_summary: Dict[str, Any],
    audit_chain_verified: bool
) -> str:
    """Generates an executive/technical compliance report PDF."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"Compliance_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = REPORTS_DIR / filename
    
    c = canvas.Canvas(str(filepath), pagesize=letter)
    width, height = letter
    
    # Header Banner
    c.setFillColorRGB(0.04, 0.06, 0.1) # Dark charcoal
    c.rect(0, height - 90, width, 90, fill=True, stroke=False)
    c.setFillColorRGB(0.95, 0.96, 0.98) # Ivory
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, height - 45, "EERE v2 Compliance Verification Report")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 65, f"Project: {project_name} | Domain: {project_domain.upper()} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    # Verification Badge
    badge_text = "CRYPTOGRAPHIC AUDIT CHAIN VERIFIED" if audit_chain_verified else "UNVERIFIED AUDIT CHAIN"
    badge_color = (0.06, 0.72, 0.5) if audit_chain_verified else (0.93, 0.27, 0.27)
    c.setFillColorRGB(*badge_color)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(width - 250, height - 65, f"[{badge_text}]")
    
    # Executive Summary Totals
    y = height - 120
    total = len(reconciliation_results)
    compliant = sum(1 for r in reconciliation_results if r.get("status") == "COMPLIANT")
    non_compliant = sum(1 for r in reconciliation_results if r.get("status") == "NON_COMPLIANT")
    unverifiable = sum(1 for r in reconciliation_results if r.get("status") == "UNVERIFIABLE")
    needs_review = sum(1 for r in reconciliation_results if r.get("status") in ["NEEDS_REVIEW", "CONFLICT"])
    comp_pct = (compliant / total * 100) if total > 0 else 0.0
    
    c.setFillColorRGB(0.1, 0.15, 0.2)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "1. Executive Compliance Summary")
    y -= 25
    c.setFont("Helvetica", 10)
    c.drawString(60, y, f"Total Requirements: {total}    |    Compliant: {compliant} ({comp_pct:.1f}%)    |    Non-Compliant: {non_compliant}    |    Unverifiable: {unverifiable}    |    Review/Conflict: {needs_review}")
    
    y -= 35
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "2. Requirement Reconciliation Decisions")
    y -= 20
    
    # Table Header
    c.setFillColorRGB(0.9, 0.92, 0.95)
    c.rect(50, y - 5, width - 100, 18, fill=True, stroke=False)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(55, y, "REQ ID")
    c.drawString(120, y, "SPEC LIMIT")
    c.drawString(230, y, "TEST MEASURED")
    c.drawString(330, y, "DEVIATION")
    c.drawString(400, y, "STATUS")
    c.drawString(480, y, "RULE FIRED")
    y -= 18
    
    # Rows
    c.setFont("Helvetica", 9)
    for r in reconciliation_results[:18]: # First page rows
        status = r.get("status", "")
        if status == "COMPLIANT":
            c.setFillColorRGB(0.06, 0.6, 0.3)
        elif status == "NON_COMPLIANT":
            c.setFillColorRGB(0.8, 0.1, 0.1)
        elif status == "UNVERIFIABLE":
            c.setFillColorRGB(0.4, 0.45, 0.55)
        else:
            c.setFillColorRGB(0.9, 0.5, 0.0)
            
        c.drawString(55, y, str(r.get("requirement_id", ""))[:10])
        c.drawString(120, y, str(r.get("spec_limit", ""))[:20])
        c.drawString(230, y, str(r.get("actual", ""))[:18])
        dev = r.get("percentage_deviation")
        dev_str = f"{dev:+.1f}%" if dev is not None else "--"
        c.drawString(330, y, dev_str)
        c.drawString(400, y, status[:14])
        c.drawString(480, y, str(r.get("rule_id_fired", "")))
        y -= 16
        if y < 80:
            break
            
    # Footer
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.setFont("Helvetica", 8)
    c.drawString(50, 40, "Confidential - Engineering Evidence Reconciliation Engine (EERE v2) - SHA-256 Tamper-Evident Ledger")
    c.drawString(width - 120, 40, "Page 1 of 1")
    
    c.save()
    return str(filepath)

def generate_excel_compliance_matrix(
    project_name: str,
    reconciliation_results: List[Dict[str, Any]]
) -> str:
    """Generates an Excel (.xlsx) compliance and traceability matrix."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"Compliance_Matrix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = REPORTS_DIR / filename
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Compliance Matrix"
    
    headers = ["Requirement ID", "Statement", "Specification Limit", "Design Claim", "Test Measurement", "Unit", "Difference", "Deviation %", "Status", "Rule ID", "Reason"]
    ws.append(headers)
    
    # Styling
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        
    for r in reconciliation_results:
        row = [
            r.get("requirement_id", ""),
            r.get("statement", ""),
            r.get("spec_limit", ""),
            r.get("design_claim", ""),
            r.get("actual", ""),
            r.get("unit", ""),
            r.get("difference"),
            r.get("percentage_deviation"),
            r.get("status", ""),
            r.get("rule_id_fired", ""),
            r.get("reason", "")
        ]
        ws.append(row)
        
    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)
        
    wb.save(str(filepath))
    return str(filepath)

def generate_digital_evidence_pack(
    project_name: str,
    pdf_path: str,
    excel_path: str,
    audit_records: List[Dict[str, Any]]
) -> str:
    """Creates a Digital Evidence Pack (.zip) containing report, matrix, audit extract, and SHA-256 manifest."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"Digital_Evidence_Pack_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = REPORTS_DIR / filename
    
    manifest = {
        "pack_name": f"{project_name}_Evidence_Pack",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files": [],
        "audit_chain_summary": {
            "total_records": len(audit_records),
            "latest_record_hash": audit_records[-1].get("record_hash") if audit_records else "None"
        }
    }
    
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(pdf_path):
            zf.write(pdf_path, arcname=os.path.basename(pdf_path))
            with open(pdf_path, "rb") as f:
                manifest["files"].append({"file": os.path.basename(pdf_path), "sha256": hashlib.sha256(f.read()).hexdigest()})
                
        if os.path.exists(excel_path):
            zf.write(excel_path, arcname=os.path.basename(excel_path))
            with open(excel_path, "rb") as f:
                manifest["files"].append({"file": os.path.basename(excel_path), "sha256": hashlib.sha256(f.read()).hexdigest()})
                
        # Write audit records JSON
        audit_json_str = json.dumps(audit_records, indent=2)
        zf.writestr("audit_chain_extract.json", audit_json_str)
        manifest["files"].append({"file": "audit_chain_extract.json", "sha256": hashlib.sha256(audit_json_str.encode()).hexdigest()})
        
        # Write manifest
        zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2))
        
    return str(zip_path)

