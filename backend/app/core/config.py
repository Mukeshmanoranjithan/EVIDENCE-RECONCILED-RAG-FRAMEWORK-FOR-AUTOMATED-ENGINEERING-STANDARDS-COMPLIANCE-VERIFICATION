import os
from pathlib import Path
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
STANDARDS_DIR = DATA_DIR / "standards"
EVALUATION_DIR = DATA_DIR / "evaluation"
REPORTS_DIR = DATA_DIR / "reports"

for folder in [DATA_DIR, UPLOADS_DIR, STANDARDS_DIR, EVALUATION_DIR, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Engineering Evidence Reconciliation Engine (EERE v2)"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'eere_v2.db'}")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eere-v2-dev-secret-key-change-in-prod")
    API_KEY_HEADER_NAME: str = "X-API-Key"
    DEFAULT_API_KEY: str = os.getenv("EERE_API_KEY", "dev-secret-key")
    
    # Offline & Local AI defaults
    HF_HUB_OFFLINE: bool = True
    TRANSFORMERS_OFFLINE: bool = True
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # Hybrid Matching Weights Default
    WEIGHT_SEMANTIC: float = 0.45
    WEIGHT_KEYWORD: float = 0.20
    WEIGHT_PARAMETER: float = 0.20
    WEIGHT_CONTEXT: float = 0.15
    
    # Matching Bands
    THRESHOLD_AUTO_ACCEPT: float = 0.80
    THRESHOLD_REVIEW_QUEUE: float = 0.55
    
    # Status Vocabulary
    STATUS_COMPLIANT: str = "COMPLIANT"
    STATUS_NON_COMPLIANT: str = "NON_COMPLIANT"
    STATUS_CONFLICT: str = "CONFLICT"
    STATUS_UNVERIFIABLE: str = "UNVERIFIABLE"
    STATUS_NEEDS_REVIEW: str = "NEEDS_REVIEW"
    
    # Presets
    PRESETS: Dict[str, Dict[str, Any]] = {
        "Strict": {
            "auto_accept_threshold": 0.85,
            "review_queue_threshold": 0.60,
            "allow_tolerance": False,
            "condition_strictness": "exact",
        },
        "Balanced": {
            "auto_accept_threshold": 0.80,
            "review_queue_threshold": 0.55,
            "allow_tolerance": True,
            "condition_strictness": "standard",
        },
        "Exploratory": {
            "auto_accept_threshold": 0.70,
            "review_queue_threshold": 0.45,
            "allow_tolerance": True,
            "condition_strictness": "relaxed",
        }
    }

settings = Settings()
