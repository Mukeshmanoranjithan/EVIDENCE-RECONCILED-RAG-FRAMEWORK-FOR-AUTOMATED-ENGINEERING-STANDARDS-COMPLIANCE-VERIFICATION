import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from rapidfuzz import fuzz
import numpy as np

from app.services.units_service import are_units_compatible
from app.ml.embeddings import get_text_embedding, compute_cosine_similarity

@dataclass
class MatchBreakdown:
    score_composite: float
    score_semantic: float
    score_keyword: float
    score_parameter: float
    score_context: float
    status: str # auto_accepted, in_review, rejected
    explanation: str

def compute_keyword_similarity(text1: str, text2: str) -> float:
    """
    Computes keyword token similarity for engineering texts using RapidFuzz token set ratio.
    Normalizes out common punctuation and operators.
    """
    cleaned1 = re.sub(r'[\<\>\=\:\,\.\;\(\)]', ' ', text1).lower().strip()
    cleaned2 = re.sub(r'[\<\>\=\:\,\.\;\(\)]', ' ', text2).lower().strip()
    return float(fuzz.token_set_ratio(cleaned1, cleaned2) / 100.0)

def compute_rapidfuzz_similarity(s1: str, s2: str) -> float:
    """Computes RapidFuzz token similarity normalized to 0.0 - 1.0."""
    norm1 = s1.replace("_", " ").lower().strip()
    norm2 = s2.replace("_", " ").lower().strip()
    r1 = fuzz.token_set_ratio(norm1, norm2) / 100.0
    r2 = fuzz.ratio(norm1, norm2) / 100.0
    return float((r1 + r2) / 2.0)

def compute_context_overlap(ctx1: Optional[str], ctx2: Optional[str]) -> float:
    if not ctx1 and not ctx2:
        return 0.8 # Both unspecified, neutral high
    if not ctx1 or not ctx2:
        return 0.5 # One specified, one unspecified
    c1 = set(ctx1.lower().split())
    c2 = set(ctx2.lower().split())
    if not c1 or not c2:
        return 0.5
    intersection = c1.intersection(c2)
    union = c1.union(c2)
    return float(len(intersection) / len(union))

def match_requirement_and_evidence(
    req_statement: str,
    req_param: str,
    req_unit: Optional[str],
    req_context: Optional[str],
    ev_statement: str,
    ev_param: str,
    ev_unit: Optional[str],
    ev_context: Optional[str],
    w_sem: float = 0.45,
    w_key: float = 0.20,
    w_param: float = 0.20,
    w_ctx: float = 0.15,
    auto_accept_threshold: float = 0.80,
    review_queue_threshold: float = 0.55
) -> MatchBreakdown:
    """
    Executes 4-way hybrid matching with hard dimension & parameter gating.
    """
    # 1. Parameter similarity via RapidFuzz
    s_param = compute_rapidfuzz_similarity(req_param, ev_param)
    
    # 2. Keyword similarity via RapidFuzz token set ratio
    s_key = compute_keyword_similarity(req_statement, ev_statement)
    
    # 3. Semantic similarity via sentence-transformers embeddings
    emb1 = get_text_embedding(req_statement)
    emb2 = get_text_embedding(ev_statement)
    if emb1 is not None and emb2 is not None:
        s_sem = compute_cosine_similarity(emb1, emb2)
    else:
        # Fallback to lexical combo if embedding is unavailable
        s_sem = (s_param + s_key) / 2.0
        
    # 4. Context compatibility
    s_ctx = compute_context_overlap(req_context, ev_context)
    
    # Raw composite score
    raw_composite = (w_sem * s_sem) + (w_key * s_key) + (w_param * s_param) + (w_ctx * s_ctx)
    raw_composite = min(1.0, max(0.0, raw_composite))
    
    # HARD GATE 1: Physical Unit Dimension Compatibility
    dimension_compatible = are_units_compatible(req_unit, ev_unit)
    if not dimension_compatible and req_unit and ev_unit:
        final_score = min(raw_composite, 0.20)
        explanation = f"Hard Gate: Incompatible unit dimensions ('{req_unit}' vs '{ev_unit}'). Score capped below review threshold."
        status = "rejected"
        return MatchBreakdown(
            score_composite=round(final_score, 4),
            score_semantic=round(s_sem, 4),
            score_keyword=round(s_key, 4),
            score_parameter=round(s_param, 4),
            score_context=round(s_ctx, 4),
            status=status,
            explanation=explanation
        )
        
    # HARD GATE 2: Parameter Compatibility
    if s_param < 0.40:
        final_score = min(raw_composite, 0.35)
        explanation = f"Hard Gate: Parameter mismatch ('{req_param}' vs '{ev_param}'). Score capped."
        status = "rejected"
        return MatchBreakdown(
            score_composite=round(final_score, 4),
            score_semantic=round(s_sem, 4),
            score_keyword=round(s_key, 4),
            score_parameter=round(s_param, 4),
            score_context=round(s_ctx, 4),
            status=status,
            explanation=explanation
        )
        
    final_score = raw_composite
    if final_score >= auto_accept_threshold:
        status = "auto_accepted"
        explanation = f"High confidence match ({final_score:.2f} >= {auto_accept_threshold}): parameters and statements closely align."
    elif final_score >= review_queue_threshold:
        status = "in_review"
        explanation = f"Moderate confidence match ({final_score:.2f}): queued for human reviewer confirmation."
    else:
        status = "rejected"
        explanation = f"Low confidence match ({final_score:.2f} < {review_queue_threshold}): evidence candidate rejected."
        
    return MatchBreakdown(
        score_composite=round(final_score, 4),
        score_semantic=round(s_sem, 4),
        score_keyword=round(s_key, 4),
        score_parameter=round(s_param, 4),
        score_context=round(s_ctx, 4),
        status=status,
        explanation=explanation
    )
