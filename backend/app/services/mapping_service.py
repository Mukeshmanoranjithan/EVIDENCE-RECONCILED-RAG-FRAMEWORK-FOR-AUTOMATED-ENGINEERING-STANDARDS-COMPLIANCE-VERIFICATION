from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.services.extraction_service import ExtractedRequirement, ExtractedEvidence
from app.ml.hybrid_matcher import match_requirement_and_evidence, MatchBreakdown

@dataclass
class MappingCandidate:
    requirement_id: str
    evidence_id: str
    score: float
    breakdown: MatchBreakdown

@dataclass
class RequirementMappingResult:
    requirement_id: str
    best_match: Optional[MappingCandidate]
    alternative_matches: List[MappingCandidate]
    unmapped: bool
    status: str # auto_accepted, in_review, unmapped

def map_project_evidence(
    requirements: List[ExtractedRequirement],
    evidence_items: List[ExtractedEvidence],
    auto_accept_threshold: float = 0.80,
    review_queue_threshold: float = 0.55
) -> List[RequirementMappingResult]:
    """
    Maps extracted requirements to extracted evidence candidates.
    Produces best match, alternative ranked matches, score breakdowns, and review queue flags.
    """
    results: List[RequirementMappingResult] = []
    
    for req in requirements:
        candidates: List[MappingCandidate] = []
        
        for ev in evidence_items:
            breakdown = match_requirement_and_evidence(
                req_statement=req.statement,
                req_param=req.parameter,
                req_unit=req.unit,
                req_context=req.condition_context,
                ev_statement=ev.raw_statement,
                ev_param=ev.parameter,
                ev_unit=ev.unit,
                ev_context=ev.condition_context,
                auto_accept_threshold=auto_accept_threshold,
                review_queue_threshold=review_queue_threshold
            )
            
            if breakdown.status != "rejected":
                candidates.append(MappingCandidate(
                    requirement_id=req.req_id,
                    evidence_id=ev.evidence_id,
                    score=breakdown.score_composite,
                    breakdown=breakdown
                ))
                
        # Sort candidates descending by score
        candidates.sort(key=lambda c: c.score, reverse=True)
        
        if not candidates:
            results.append(RequirementMappingResult(
                requirement_id=req.req_id,
                best_match=None,
                alternative_matches=[],
                unmapped=True,
                status="unmapped"
            ))
        else:
            best = candidates[0]
            alts = candidates[1:]
            results.append(RequirementMappingResult(
                requirement_id=req.req_id,
                best_match=best,
                alternative_matches=alts,
                unmapped=False,
                status=best.breakdown.status
            ))
            
    return results

