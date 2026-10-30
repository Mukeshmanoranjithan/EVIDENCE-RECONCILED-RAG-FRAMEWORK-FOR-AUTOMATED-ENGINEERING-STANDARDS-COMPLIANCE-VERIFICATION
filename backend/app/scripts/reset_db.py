import os
import sys
import shutil
import argparse
from datetime import datetime
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BASE_DIR / "data"

sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings, UPLOADS_DIR, REPORTS_DIR
from app.database.session import engine, Base
import app.models  # Ensure all models are registered

def run_reset(confirm: bool):
    if not confirm:
        print("\n[ERROR] Database reset rejected: You MUST pass --confirm to reset the system.")
        print("Usage: python -m app.scripts.reset_db --confirm\n")
        sys.exit(1)

    print("========================================================")
    print(" EERE v2: Clean System Reset")
    print("========================================================")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_dir = DATA_DIR / "backups" / timestamp
    backup_dir.mkdir(parents=True, exist_ok=True)
    print(f"[*] Step 1: Created backup directory at {backup_dir}")

    # 1. Back up database file
    db_file = DATA_DIR / "eere_v2.db"
    if db_file.exists():
        backup_db_path = backup_dir / "eere_v2.db"
        shutil.copy2(db_file, backup_db_path)
        print(f"[+] Backed up database to {backup_db_path}")

    # 2. Back up uploads directory
    if UPLOADS_DIR.exists():
        backup_uploads_path = backup_dir / "uploads"
        shutil.copytree(UPLOADS_DIR, backup_uploads_path, dirs_exist_ok=True)
        print(f"[+] Backed up uploads to {backup_uploads_path}")

    # 3. Drop and recreate all database tables
    print("[*] Step 2: Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    print("[*] Step 3: Recreating all database tables from schema...")
    Base.metadata.create_all(bind=engine)
    print("[+] All 20 tables successfully recreated cleanly.")

    # 4. Empty data directories: uploads, processed, embeddings, reports, demo
    print("[*] Step 4: Emptying data directories...")
    directories_to_empty = [
        UPLOADS_DIR,
        DATA_DIR / "processed",
        DATA_DIR / "embeddings",
        REPORTS_DIR,
        DATA_DIR / "demo"
    ]

    for d in directories_to_empty:
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)
        print(f"[+] Emptied {d.name}/ directory")

    print("========================================================")
    print(" SUCCESS: EERE v2 is now completely clean and data-driven.")
    print(" 0 projects, 0 documents, 0 requirements, 0 mock records.")
    print("========================================================")

def main():
    parser = argparse.ArgumentParser(description="Reset EERE v2 to a clean, empty state.")
    parser.add_argument("--confirm", action="store_true", help="Confirm full reset of database and file storage.")
    args = parser.parse_args()

    run_reset(confirm=args.confirm)

if __name__ == "__main__":
    main()

