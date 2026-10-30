import os
import hashlib
import json
import logging
from typing import List, Dict, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Ensure offline environment variables for HuggingFace
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

_model = None
_embedding_cache: Dict[str, List[float]] = {}
CACHE_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "embeddings", "cache.json")

def _load_cache():
    global _embedding_cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                _embedding_cache = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read embedding cache: {e}")

def _save_cache():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(_embedding_cache, f)
    except Exception as e:
        logger.warning(f"Failed to save embedding cache: {e}")

def get_sentence_transformer():
    """Lazily loads SentenceTransformer model with offline safety."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('all-MiniLM-L6-v2', local_files_only=True)
        except Exception as e:
            try:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e2:
                logger.warning(f"Could not load SentenceTransformer: {e2}. Will fall back to lexical matcher.")
                _model = None
    return _model

def get_text_embedding(text: str) -> Optional[np.ndarray]:
    """Returns cached embedding for text, or computes and caches it."""
    if not text:
        return None
        
    cleaned = text.strip().lower()
    content_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
    
    if not _embedding_cache:
        _load_cache()
        
    if content_hash in _embedding_cache:
        return np.array(_embedding_cache[content_hash], dtype=np.float32)
        
    model = get_sentence_transformer()
    if model is None:
        return None
        
    try:
        emb = model.encode(cleaned, convert_to_numpy=True)
        _embedding_cache[content_hash] = emb.tolist()
        _save_cache()
        return emb
    except Exception as e:
        logger.error(f"Embedding computation error: {e}")
        return None

def compute_cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Computes cosine similarity between two numpy vectors."""
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 < 1e-9 or norm2 < 1e-9:
        return 0.0
    return float(np.dot(emb1, emb2) / (norm1 * norm2))

