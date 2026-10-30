# EERE: Engineering Evidence Reconciliation Engine

An explainable, evidence-driven platform that checks whether an engineering
product meets its requirements. It compares three documents and decides,
requirement by requirement, with every step traceable to the source page.

| Document | Question it answers |
|---|---|
| Specification | What MUST the product achieve? |
| Design | What does the design CLAIM? |
| Test report | What was ACTUALLY MEASURED? |

> EERE supports compliance review. It does not certify a product against any
> standard, and its risk scores are not safety assessments.

## Key principles

- **Deterministic decisions.** A fixed rule engine decides compliance. AI and
  similarity scores never decide, and the assistant can never change a status.
- **Missing evidence is not failure.** No test data gives `UNVERIFIABLE`,
  not `NON_COMPLIANT`.
- **Design claims never replace measurements.**
- **Units are respected.** Values are converted with Pint (for example,
  176 °F = 80 °C). Incompatible units are flagged, never compared.
- **Everything is traceable.** Each result links to document, page and the
  exact calculation used.
- **Data comes only from your uploads.** The system starts empty. Every record
  belongs to a project and is saved in the database.
- **Runs locally.** No paid APIs or keys are required. A local LLM is optional.

## Compliance statuses

| Status | Meaning |
|---|---|
| COMPLIANT | Measured evidence satisfies the requirement |
| NON_COMPLIANT | Measured evidence violates the requirement |
| CONFLICT | Evidence contradicts itself |
| UNVERIFIABLE | Not enough evidence to decide |
| NEEDS_REVIEW | Ambiguous, or needs human judgment |

## How it works

1. Upload specification, design and test PDFs into a project (SHA-256 hashed).
2. Extract requirements and evidence with page references (PyMuPDF, pdfplumber, OCR).
3. Map evidence to requirements with a hybrid score
   (semantic + keyword + parameter + context), with human review for uncertain links.
4. Normalize units and check operators, boundaries and test conditions.
5. Reconcile with the deterministic rule engine and show the calculation.
6. Analyze risk, dependencies and revision impact.
7. Export PDF, Excel and evidence-pack reports.

## Modules

- **Overview:** Command Center, Projects, New Analysis
- **Analyze:** Document Intelligence, Requirement Explorer, Evidence Mapping,
  AI Reconciliation, Dependency Graph
- **Assure:** Revision Intelligence, Evidence Sufficiency, Risk Intelligence,
  Review Queue, What-If Simulator
- **Knowledge:** Standards Knowledge Base, AI Engineering Assistant (local RAG)
- **Govern:** Audit & Integrity (hash-chained log), Evaluation Lab, Reports, Settings

## Tech stack

**Frontend:** React, Vite, TypeScript, Tailwind, shadcn/ui, Recharts, React Flow, TanStack Query
**Backend:** Python, FastAPI, Pydantic, SQLAlchemy, SQLite (PostgreSQL-ready)
**AI/NLP:** Sentence Transformers (all-MiniLM-L6-v2), TF-IDF, RapidFuzz, spaCy, scikit-learn, NetworkX, Pint
**Documents:** PyMuPDF, pdfplumber, Tesseract OCR, OpenCV
**Optional:** Ollama (Llama 3.1 / Qwen2.5) for explanations only

## Getting started

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app starts empty: create a project, then upload
your three PDFs.

To wipe all data and start fresh (a backup is made first):

```bash
python -m app.scripts.reset_db --confirm
```

## Example

| Requirement | Limit | Design | Test | Result |
|---|---|---|---|---|
| REQ-001 | max_operating_temperature ≤ 50 C | 49 C | 50.5 C | NON_COMPLIANT (+0.5 C, 1.00%) |
| REQ-004 | max_noise_level ≤ 40 dB | 35 dB | none | UNVERIFIABLE |

## Testing

```bash
pytest backend/app/tests
npm --prefix frontend test
```

Includes scenarios for compliant, non-compliant, missing evidence, conflicts,
unit conversion, boundaries, condition mismatch and stale revisions.

## Audit and integrity

Each audit record stores the hash of the previous one, so any alteration of
history can be detected. This is tamper-evident, not tamper-proof.

## Limitations

- Extraction quality depends on document layout and OCR quality.
- Risk scores are configurable rules, not certified safety assessments.
- Standards content must be lawfully obtained by the user.

## License

Add your license here (for example, MIT).
