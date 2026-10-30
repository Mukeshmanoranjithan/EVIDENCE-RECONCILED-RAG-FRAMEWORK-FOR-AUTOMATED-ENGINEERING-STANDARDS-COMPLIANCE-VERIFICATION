# EERE v2: Engineering Evidence Reconciliation Engine

> **Explainable, Evidence-Driven Standards Compliance Verification Platform**  
> *Production-Grade Upgrade adhering to Strict Deterministic Engineering Verification Principles.*

---

## 1. What Changed from v1

- **UX-First Design**: Guided workflow wizard, plain-language vs engineer toggle, role-based views, keyboard-friendly command palette (`Ctrl+K`), signature 3-pane split-view Decision Detail with interactive SVG number-line gauge.
- **Scenario E Bug Fix**:
  $$\text{Spec: } \le 85^\circ\text{C}, \quad \text{Test: } 176^\circ\text{F} = (176 - 32) \times \frac{5}{9} = 80^\circ\text{C} \le 85^\circ\text{C} \implies \mathbf{COMPLIANT}$$
  *Asserted and verified in both deterministic test suites and live reconciliation.*
- **Deterministic 7-Tier Rule Hierarchy**: Eliminated v1 mock injections. Replaced similarity-based compliance scoring with exact Pint dimensional analysis and boundary operator logic.
- **Zero Evidence Invention**: Missing evidence strictly maps to `UNVERIFIABLE`. Design claims never substitute for test measurements.
- **Complete Suite of Advanced Modules**:
  - What-If Simulation Laboratory (in-memory counterfactual branch execution)
  - Review & Sign-Off Queue with uncertainty sorting
  - Document Intelligence with OCR bounding box overlays and CSV export
  - System Dependency DAG with failure-propagation highlighting
  - Revision Intelligence with word-level diff and stale-evidence detection
  - Evidence Sufficiency Coverage Heatmap
  - Factor-by-factor Risk Intelligence ($0-100$ exposure scoring)
  - Standards Knowledge Base (DO-160G, ISO 26262, DO-178C, IEC 61508)
  - Evaluation Lab with confusion matrix and live weight-tuning simulation
  - Cryptographic Audit Trail with SHA-256 hash chaining and tamper detection
  - Reports & Digital Evidence Packs (PDF via ReportLab, Excel matrix via openpyxl, ZIP with SHA-256 manifest)

---

## 2. 10 Non-Negotiable Engineering Principles

| # | Principle | Implementation Enforcement |
|---|---|---|
| **1** | Never invent evidence | Every parameter, threshold, and bounding box grounds directly to PyMuPDF document extracts. |
| **2** | Missing evidence is UNVERIFIABLE | Missing test measurements strictly yield `UNVERIFIABLE`, never `NON_COMPLIANT`. |
| **3** | Design claims never substitute for test | Analytical claims alone cannot confirm compliance; empirical test data is required. |
| **4** | No LLM decides compliance | Compliance is calculated solely by deterministic rule logic (`RULE_1` - `RULE_7`) and Pint unit algebra. |
| **5** | Incompatible units are never compared | Hard dimensionality gates prevent cross-unit comparison (e.g. Volts vs Celsius $\to$ `NEEDS_REVIEW`). |
| **6** | Test conditions must match | Environmental ambient mismatch (e.g. $25^\circ\text{C}$ vs $60^\circ\text{C}$) triggers `NEEDS_REVIEW`. |
| **7** | Every decision shows its calculation | Full formula derivation: $(\text{val} - \text{limit}) / \text{limit} \times 100$, margin, and source page citations. |
| **8** | Untrusted document input | Regex pattern extraction and RAG query sanitization guard against prompt injection. |
| **9** | Never claims official certification | Formal disclaimer presented across UI headers, exports, and reports. |
| **10** | 100% Real user data only | Zero fabricated numbers. All analysis originates strictly from uploaded engineering documentation. |

---

## 3. Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (PostgreSQL-compatible schema), Alembic, Pint, RapidFuzz, SentenceTransformers (`all-MiniLM-L6-v2`), NetworkX, ReportLab, OpenPyXL, Hypothesis.
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Framer Motion, React Router v7.
- **Database**: SQLite / PostgreSQL schema (`data/eere_v2.db`) containing 20 relational tables, with historical runs migrated from v1.

---

## 4. Directory Layout

```
d:/proversion/
├── backend/
│   └── app/
│       ├── api/v1/router.py          # REST API endpoints
│       ├── core/config.py            # Presets, weights, thresholds, vocabulary
│       ├── database/                 # SQLAlchemy 2 engine, session, migrate_v1.py
│       ├── models/                   # 20 relational models
│       ├── schemas/                  # Pydantic v2 schemas
│       ├── ml/
│       │   ├── embeddings.py         # Offline-safe SentenceTransformers & disk cache
│       │   └── hybrid_matcher.py     # 4-way matching + hard dimensional gates
│       ├── services/
│       │   ├── units_service.py      # Pint conversion & dimensional compatibility
│       │   ├── reconciliation_engine.py # Deterministic 7-tier rule hierarchy
│       │   ├── document_service.py   # PyMuPDF parser, OCR fallback, bounding boxes
│       │   ├── extraction_service.py # Pure-local regex library, modal verbs, conditions
│       │   ├── dependency_service.py # NetworkX DAG & failure propagation
│       │   ├── risk_service.py       # Factor-by-factor risk exposure scoring
│       │   ├── audit_service.py      # Cryptographic SHA-256 hash chaining
│       │   ├── simulation_service.py # What-if in-memory simulator
│       │   ├── rag_service.py        # Local sanitized assistant
│       │   └── report_service.py     # PDF, Excel matrix, Digital Evidence Pack ZIP
│       ├── scripts/
│       │   └── reset_db.py           # Clean database reset & automated backup
│       └── tests/
│           ├── test_mandatory_scenarios.py   # 100% assertions on Scenarios A - L
│           ├── test_property_based.py        # Hypothesis invariance & monotonicity
│           ├── test_extraction_and_mapping.py# Extraction & hybrid matcher tests
│           ├── test_enterprise_services.py   # Dependency, risk, audit, simulator
│           └── test_api_endpoints.py         # Health & demo endpoints
├── data/
│   ├── eere_v2.db                    # 20 SQLite tables (migrated & seeded)
│   ├── uploads/                      # Document store
│   ├── embeddings/cache.json         # Offline vector cache
│   └── reports/                      # Generated PDF, Excel, ZIP artifacts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/CommandPalette.tsx    # Ctrl+K global keyboard palette
│   │   │   ├── decision/DecisionDetailView.tsx # 3-pane split view & SVG number-line gauge
│   │   │   └── layout/AppLayout.tsx         # Sidebar, project switcher, demo pill
│   │   ├── pages/                           # 17 enterprise pages
│   │   ├── services/api.ts                  # Typed client
│   │   ├── types/index.ts                   # TypeScript interfaces
│   │   └── App.tsx                          # Full routing table
│   └── package.json
├── run_backend.bat                   # Start backend server
└── run_frontend.bat                  # Start frontend dev server
```

---

## 5. Execution & Verification Instructions

### 5.1 Run All Backend Tests (100% Pass)
```powershell
$env:PYTHONPATH='d:\proversion\backend'
& 'D:\EERE\venv\Scripts\python.exe' -m pytest d:\proversion\backend\app\tests\test_mandatory_scenarios.py d:\proversion\backend\app\tests\test_property_based.py d:\proversion\backend\app\tests\test_extraction_and_mapping.py d:\proversion\backend\app\tests\test_enterprise_services.py -v
```

### 5.2 Build Frontend
```powershell
Set-Location -Path d:\proversion\frontend
npm run build
```

### 5.3 Launch Servers
- **Backend**: Double-click `run_backend.bat` or run:
  ```powershell
  $env:PYTHONPATH='d:\proversion\backend'
  & 'D:\EERE\venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Frontend**: Double-click `run_frontend.bat` or run:
  ```powershell
  Set-Location -Path d:\proversion\frontend
  npm run dev
  ```
- Open `http://localhost:5173` in your browser.

