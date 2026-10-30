import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

@dataclass
class Citation:
    document_name: str
    page: int
    text_snippet: str

@dataclass
class AssistantResponse:
    query: str
    answer: str
    citations: List[Citation]
    prompt_injection_detected: bool = False

INJECTION_PATTERNS = [
    r'ignore\s+(?:all\s+)?previous\s+instructions',
    r'you\s+are\s+now\s+a',
    r'system\s+prompt',
    r'disregard\s+the\s+above',
    r'override\s+system',
    r'delete\s+all',
]

def sanitize_query(query: str) -> Tuple[str, bool]:
    """Scans and sanitizes user input for prompt-injection attacks."""
    injection_detected = False
    for pat in INJECTION_PATTERNS:
        if re.search(pat, query, re.IGNORECASE):
            injection_detected = True
            query = re.sub(pat, '[REDACTED_ATTEMPTED_INJECTION]', query, flags=re.IGNORECASE)
    return query, injection_detected

def answer_compliance_query(
    query: str,
    project_name: str,
    requirements: List[Dict[str, Any]],
    reconciliation_results: List[Dict[str, Any]],
    documents: List[Dict[str, Any]]
) -> AssistantResponse:
    """
    Structured local RAG assistant.
    Strictly answers using project data and provides clickable citations.
    """
    clean_query, injection_detected = sanitize_query(query)
    q_lower = clean_query.lower()
    citations: List[Citation] = []
    
    # Query 1: Why is REQ-xxx non-compliant / unverifiable?
    req_match = re.search(r'\b(REQ-[\w\.\-]+)\b', clean_query, re.IGNORECASE)
    if req_match:
        target_req = req_match.group(1).upper()
        res = next((r for r in reconciliation_results if r.get("requirement_id") == target_req), None)
        req_obj = next((r for r in requirements if r.get("req_id") == target_req), None)
        
        if res:
            status = res.get("status")
            reason = res.get("reason")
            formula = res.get("calculation_formula")
            doc_name = "Specification Document"
            page = req_obj.get("page", 1) if req_obj else 1
            
            citations.append(Citation(
                document_name=doc_name,
                page=page,
                text_snippet=req_obj.get("statement", "") if req_obj else f"Limit: {res.get('spec_limit')}"
            ))
            
            answer = f"**{target_req}** is currently evaluated as **{status}**.\n\n"
            answer += f"• **Limit**: `{res.get('spec_limit')}`\n"
            answer += f"• **Actual Measurement**: `{res.get('actual')}`\n"
            answer += f"• **Rule Applied**: `{res.get('rule_id_fired')}`\n"
            answer += f"• **Deterministic Calculation**: `{formula or 'Direct boundary comparison'}`\n\n"
            answer += f"**Reason**: {reason}"
            return AssistantResponse(query=clean_query, answer=answer, citations=citations, prompt_injection_detected=injection_detected)
            
    # Query 2: Missing test evidence / unverifiable requirements
    if "missing" in q_lower or "unverifiable" in q_lower or "lack" in q_lower:
        unverifiable_items = [r for r in reconciliation_results if r.get("status") == "UNVERIFIABLE"]
        if unverifiable_items:
            answer = f"Found **{len(unverifiable_items)} unverifiable requirement(s)** lacking valid physical test reports:\n\n"
            for u in unverifiable_items:
                rid = u.get("requirement_id")
                req_obj = next((r for r in requirements if r.get("req_id") == rid), None)
                answer += f"• **{rid}** (`{u.get('spec_limit')}`): Missing measured test data.\n"
                if req_obj:
                    citations.append(Citation(
                        document_name="Specification",
                        page=req_obj.get("page", 1),
                        text_snippet=req_obj.get("statement", "")
                    ))
            answer += "\n*Note: In accordance with Non-negotiable Principle #2, missing test measurements evaluate to UNVERIFIABLE, never COMPLIANT or NON_COMPLIANT.*"
            return AssistantResponse(query=clean_query, answer=answer, citations=citations, prompt_injection_detected=injection_detected)
        else:
            return AssistantResponse(query=clean_query, answer="All requirements currently have associated test measurement evidence.", citations=[], prompt_injection_detected=injection_detected)

    # Query 3: Non-compliant requirements summary
    if "non-compliant" in q_lower or "failing" in q_lower or "failed" in q_lower:
        non_comp = [r for r in reconciliation_results if r.get("status") == "NON_COMPLIANT"]
        if non_comp:
            answer = f"Found **{len(non_comp)} non-compliant requirement(s)**:\n\n"
            for nc in non_comp:
                rid = nc.get("requirement_id")
                dev = nc.get("percentage_deviation")
                dev_str = f"({dev:+.2f}%)" if dev is not None else ""
                answer += f"• **{rid}**: Measured `{nc.get('actual')}` violates `{nc.get('spec_limit')}` {dev_str}.\n"
                citations.append(Citation(
                    document_name="Test Report",
                    page=1,
                    text_snippet=f"Measured: {nc.get('actual')} vs limit {nc.get('spec_limit')}"
                ))
            return AssistantResponse(query=clean_query, answer=answer, citations=citations, prompt_injection_detected=injection_detected)
            
    # Default summary response
    total = len(reconciliation_results)
    compliant = sum(1 for r in reconciliation_results if r.get("status") == "COMPLIANT")
    comp_rate = (compliant / total * 100) if total > 0 else 0.0
    
    answer = f"**Project Summary for {project_name}**:\n\n"
    answer += f"• Total Requirements: **{total}**\n"
    answer += f"• Verified Compliant: **{compliant} ({comp_rate:.1f}%)**\n"
    answer += f"• Total Documents: **{len(documents)}**\n\n"
    answer += "Ask specific questions like *'Why is REQ-001 compliant?'* or *'Show requirements lacking test reports'*."
    
    return AssistantResponse(query=clean_query, answer=answer, citations=[], prompt_injection_detected=injection_detected)
