# SpecForge — Course Specification Builder

An AI-assisted, outcome-based education (OBE) course specification builder and accreditation compliance workbench for engineering institutions. SpecForge transforms unstructured course documents into rigorous, NBA/ABET-compliant course specifications.

---

## 1. Quick Start & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (starts Express server with Vite middleware on Port 3000)
npm run dev

# 3. Check types and run quality checks
npm run typecheck
npm run check
npm run verify

# 4. Production start
npm start
```

---

## 2. API Endpoints

- `GET /api/v1/health`
  Returns system operational status: `{ "success": true, "data": { "status": "up" } }`.

- `GET /api/v1/llm-check`
  Probes model connectivity with client-passed `x-llm-*` headers.

- `POST /api/v1/parse` (multipart/form-data)
  Accepts `spec` (required) and `blueprint` (optional), extracts text, runs Zod schema validation, and returns structured `CourseSpec`.

- `POST /api/v1/workflow/transition`
  Enforces multi-role RBAC (`Author`, `Reviewer`, `HOD`) and returns HTTP 403 on invalid transitions.

- `POST /api/v1/generate` (multipart/form-data)
  End-to-end evaluation endpoint. Runs the full ingestion, template selection, CO-PO-PSO mapping, and deterministic V1–V10 validation pipeline without clicks. Returns `{ "success": true, "data": { "output": <specforge_output>, "html": <filled HTML> } }`.

---

## 3. AI Key Flow & Security Architecture

1. **Client-Side Key Entry**: The user inputs their API key in the Settings modal (persisted solely in browser memory / `localStorage`).
2. **Stateless Request Flow**: The key is attached to outgoing requests via custom HTTP headers:
   - `x-llm-provider`: Provider name (`gemini`, `openai`, `anthropic`)
   - `x-llm-key` / `x-llm-api-key`: API access token
   - `x-llm-model`: Model identifier (e.g. `gemini-2.5-flash`)
3. **Zero Server Storage**: The server extracts headers on a per-request basis, calls the API dynamically, and never logs or saves the key to disk, code, or `.env`.

---

## 4. Deterministic Quality Rules (V1 to V10)

- **V1**: Course Code pattern (`CS-482`) and non-empty Title matching.
- **V2**: Carnegie credit calculation $L + T + P/2 = \text{Credits}$ and $(L + T + P) \times 15 = \text{Hours}$.
- **V3**: Bloom's Revised Taxonomy action verb enforcement (passive verbs like *Understand* or *Know* flagged as High severity).
- **V4**: Higher-order cognitive progression ($\ge 60\%$ outcomes in Apply, Analyze, Evaluate, Create).
- **V5**: Outcome threshold (4 to 6 Course Outcomes).
- **V6**: Unit syllabus hours sum reconciliation against total lecture contact hours.
- **V7**: Assessment weight balance (CIE + SEE = exactly 100%).
- **V8**: Complete CO-PO matrix coverage (every CO mapped to at least one PO with rationale).
- **V9**: Template placeholder token sanitization (zero residual sample strings).
- **V10**: Template suitability concordance ($P > 0$ or laboratory $\to$ Integrated).

---

## 5. Multi-Role Approval Workflow

- **States**: `Draft` $\to$ `Submitted` $\to$ `Under Review` $\to$ `Pending HOD` $\to$ `Approved` (or `Returned`).
- **RBAC**: Only the `Author` can modify course content, and solely when in `Draft` or `Returned`.
- **DRAFT Watermark**: Diagonal translucent watermark is dynamically rendered on document previews and exports until status reaches `Approved`.
- **Audit Ledger**: Immutable chronological history with timestamp, actor, role, and comments.

---

## 6. AI Tools Used

- `@google/genai` TypeScript SDK (Interactions and generateContent via Google Gemini API).
