@echo off
echo ========================================================
echo Starting EERE v2 Backend (FastAPI + Uvicorn)
echo ========================================================
set PYTHONPATH=d:\proversion\backend
if exist "d:\EERE\venv\Scripts\python.exe" (
    d:\EERE\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
pause
