import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from app.services.document_service import ExtractedNode

@dataclass
class ExtractedRequirement:
    req_id: str
    parent_req_id: Optional[str]
    statement: str
    category: str
    parameter: str
    operator: str
    threshold: str
    unit: Optional[str]
    condition_context: Optional[str]
    priority: str
    page: int
    bbox: List[float]
    extraction_confidence: float

@dataclass
class ExtractedEvidence:
    evidence_id: str
    source_doc_id: str
    statement_type: str # design_claim, measured_result
    raw_statement: str
    parameter: str
    operator: str
    value: str
    unit: Optional[str]
    condition_context: Optional[str]
    revision: Optional[str]
    measurement_uncertainty: Optional[float]
    instrument_id: Optional[str]
    page: int
    bbox: List[float]
    extraction_confidence: float

# Regex patterns for engineering parameters and statements
PARAM_PATTERN = r'\b([a-zA-Z][a-zA-Z0-9_\-\s]{1,35}?)\s*(?:shall\s+not\s+exceed|must\s+not\s+exceed|shall\s+be\s+strictly\s+less\s+than|shall\s+be|must\s+be|should\s+be|is\s+required\s+to\s+be|is\s+designed\s+to\s+be|will\s+be|measured|was|tested\s+at|is)\s*(<=|>=|==|<=|>=|<|>|=|ranges?\s+between|between|to\s+be\s+between|±|\+/-)?\s*([\d\.]+)(?:\s*(?:to|and)\s*([\d\.]+))?\s*([A-Za-z°%][A-Za-z0-9°%/]*)?'

# Condition pattern: e.g. "at 25 C ambient", "under 12V supply", "during cold start"
CONDITION_PATTERN = r'\b(at\s+[\d\.]+\s*[A-Za-z°%]+(?:\s+ambient)?|under\s+[\w\s]{3,20}|during\s+[\w\s]{3,20})\b'

# Revision pattern: e.g. "Rev A", "Rev-C", "v1.2"
REVISION_PATTERN = r'\b(?:Rev(?:ision)?[\s\-:]*|v)([A-Za-z0-9\.]+)\b'

# Modal verb detection
def detect_priority(text: str) -> str:
    upper = text.upper()
    if "SHALL" in upper:
        return "SHALL"
    if "MUST" in upper:
        return "MUST"
    if "SHOULD" in upper:
        return "SHOULD"
    if "MAY" in upper:
        return "MAY"
    return "SHALL"

def detect_statement_type(doc_type: str, text: str) -> str:
    if doc_type == "specification":
        return "specified_requirement"
    elif doc_type == "test_report":
        return "measured_result"
    elif doc_type == "design":
        if re.search(r'\b(shall|must|required)\b', text, re.IGNORECASE):
            return "specified_requirement"
        return "design_claim"
    return "design_claim"

def extract_conditions(text: str) -> Optional[str]:
    match = re.search(CONDITION_PATTERN, text, re.IGNORECASE)
    return match.group(1).strip() if match else None

def extract_revision(text: str) -> Optional[str]:
    match = re.search(REVISION_PATTERN, text, re.IGNORECASE)
    return match.group(0).strip() if match else None

def extract_uncertainty(text: str) -> Optional[float]:
    # e.g. "+/- 0.5 C", "uncertainty: 0.2 V"
    match = re.search(r'(?:±|\+/-|uncertainty[:\s]+)([\d\.]+)', text, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None

def split_compound_statements(text: str) -> List[str]:
    """
    Detects and splits compound engineering requirements joined by ' and ' or ' as well as '.
    e.g. 'The max_operating_temperature shall be <= 50 C and the max_weight shall be <= 10 kg.'
    """
    # Look for compound requirement conjunctions
    parts = re.split(r'\s+(?:and|as\s+well\s+as)\s+(?=(?:the\s+)?[a-zA-Z_]+\s+(?:shall|must|should|is|was))', text, flags=re.IGNORECASE)
    return [p.strip() for p in parts if len(p.strip()) > 10]

def extract_requirements_from_nodes(nodes: List[ExtractedNode]) -> List[ExtractedRequirement]:
    """
    Extracts atomic requirements from specification DocumentNodes.
    Splits compound requirements into linked parent-child items.
    """
    requirements: List[ExtractedRequirement] = []
    req_counter = 1
    
    for node in nodes:
        if node.doc_type != "specification" or not node.raw_text:
            continue
            
        # Check if text contains explicit REQ-ID
        explicit_id_match = re.search(r'\b(REQ-[\w\-]+)\b', node.raw_text)
        base_req_id = explicit_id_match.group(1) if explicit_id_match else f"REQ-{req_counter:03d}"
        
        # Check for compound sentences
        sub_statements = split_compound_statements(node.raw_text)
        is_compound = len(sub_statements) > 1
        
        for idx, stmt in enumerate(sub_statements):
            req_id = f"{base_req_id}.{idx+1}" if is_compound else base_req_id
            parent_id = base_req_id if is_compound else None
            
            # Find parameter match
            match = re.search(PARAM_PATTERN, stmt, re.IGNORECASE)
            if match:
                raw_param = match.group(1).strip()
                # Clean parameter name
                clean_param = re.sub(r'^(the|a|an|measured|estimated|system)\s+', '', raw_param, flags=re.IGNORECASE).strip()
                clean_param = clean_param.replace(" ", "_").lower()
                
                raw_op = match.group(2) or "<="
                op = "<="
                if "between" in raw_op.lower() or "range" in raw_op.lower():
                    op = "range"
                elif ">=" in raw_op or "≥" in raw_op:
                    op = ">="
                elif "<=" in raw_op or "≤" in raw_op:
                    op = "<="
                elif ">" in raw_op:
                    op = ">"
                elif "<" in raw_op:
                    op = "<"
                elif "==" in raw_op or "=" in raw_op:
                    op = "=="
                    
                val1 = match.group(3)
                val2 = match.group(4)
                threshold = f"{val1},{val2}" if (val2 and op == "range") else val1
                unit = match.group(5)
                
                cond = extract_conditions(stmt)
                priority = detect_priority(stmt)
                
                req = ExtractedRequirement(
                    req_id=req_id,
                    parent_req_id=parent_id,
                    statement=stmt,
                    category=node.section_path if node.section_path else "general",
                    parameter=clean_param,
                    operator=op,
                    threshold=threshold,
                    unit=unit,
                    condition_context=cond,
                    priority=priority,
                    page=node.page,
                    bbox=node.bbox,
                    extraction_confidence=0.95
                )
                requirements.append(req)
                
        if not explicit_id_match:
            req_counter += 1
            
    return requirements

def extract_evidence_from_nodes(nodes: List[ExtractedNode]) -> List[ExtractedEvidence]:
    """
    Extracts design claims and test measurements from design and test report nodes.
    Pure-local deterministic extraction with no fake mock injections.
    """
    evidence_list: List[ExtractedEvidence] = []
    
    for node in nodes:
        if node.doc_type == "specification" or not node.raw_text:
            continue
            
        stmt_type = detect_statement_type(node.doc_type, node.raw_text)
        
        # Check for parameter statements
        for line in node.raw_text.split("\n"):
            line = line.strip()
            if len(line) < 5:
                continue
                
            match = re.search(PARAM_PATTERN, line, re.IGNORECASE)
            if match:
                raw_param = match.group(1).strip()
                clean_param = re.sub(r'^(the|a|an|measured|estimated|for|regarding)\s+', '', raw_param, flags=re.IGNORECASE).strip()
                clean_param = clean_param.replace(" ", "_").lower()
                
                raw_op = match.group(2) or "=="
                op = "=="
                if "<=" in raw_op or "≤" in raw_op:
                    op = "<="
                elif ">=" in raw_op or "≥" in raw_op:
                    op = ">="
                elif "<" in raw_op:
                    op = "<"
                elif ">" in raw_op:
                    op = ">"
                elif "between" in raw_op.lower() or "range" in raw_op.lower():
                    op = "range"
                else:
                    op = "=="
                    
                val1 = match.group(3)
                val2 = match.group(4)
                val = f"{val1},{val2}" if (val2 and op == "range") else val1
                unit = match.group(5)
                
                cond = extract_conditions(line) or extract_conditions(node.raw_text)
                rev = extract_revision(line) or extract_revision(node.raw_text)
                unc = extract_uncertainty(line) or extract_uncertainty(node.raw_text)
                
                ev = ExtractedEvidence(
                    evidence_id=str(uuid.uuid4()),
                    source_doc_id=node.doc_id,
                    statement_type=stmt_type,
                    raw_statement=line,
                    parameter=clean_param,
                    operator=op,
                    value=val,
                    unit=unit,
                    condition_context=cond,
                    revision=rev,
                    measurement_uncertainty=unc,
                    instrument_id=None,
                    page=node.page,
                    bbox=node.bbox,
                    extraction_confidence=0.90
                )
                evidence_list.append(ev)
                
    return evidence_list

