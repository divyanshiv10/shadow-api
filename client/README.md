# ShadowAPI — Autonomous AI API Contract Testing & Diagnostics Engine

**ShadowAPI** is a full-stack hybrid API testing platform that bridges the gap between probabilistic LLM test generation and deterministic contract verification. Given an HTTP endpoint specification, it synthesizes positive, negative, boundary, and edge-case test suites using **Google Gemini AI**, executes live requests behind a hardened **SSRF Guard**, enforces strict JSON schema validation via **Ajv v8**, persists suites and resilience scores in **MongoDB Atlas**, and generates AI root-cause diagnostics for failures.

---

## Why ShadowAPI?

Traditional API clients (like Postman) rely on manual request crafting and shallow `status === 200` checks, allowing silent schema drift and unhandled edge cases to reach production. Meanwhile, standalone LLM chats can suggest test ideas but cannot execute live requests or deterministically validate response contracts.

**ShadowAPI solves this by separating AI synthesis from deterministic execution:**
1. **AI Test Matrix Synthesis (Gemini):** Automatically generates positive, negative, boundary, and edge-case test payloads alongside expected JSON Schemas.
2. **SSRF Guard (`dns.lookup` + CIDR Filtering):** Resolves target hostnames before execution and blocks loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata endpoints (`169.254.169.254`).
3. **Deterministic Contract Validation (`Ajv v8`):** Strictly validates live response bodies against generated JSON schemas (data types, required fields, nested structures) to catch silent schema regressions.
4. **AI Root-Cause Diagnostics:** Analyzes failed test payloads, HTTP status mismatches, and schema diffs to produce actionable root-cause summaries, severity ratings, and suggested fixes.
5. **Cloud Persistence & Resilience Scoring (`MongoDB Atlas`):** Stores saved endpoints, synthesized test matrices, execution history, and calculated Resilience Scores across sessions.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express.js, Axios |
| **AI Engine** | Google Gemini API (`@google/generative-ai`) |
| **Validation & Security** | Ajv v8 (JSON Schema Validator), Custom SSRF Guard (`dns.lookup` / CIDR) |
| **Database** | MongoDB Atlas, Mongoose |

---

## Architecture Flow

```text
[React + Vite Workspace]
        │
        ├──► POST /api/endpoints/synthesize  ──► [Gemini AI] ──► Generates Test Matrix + JSON Schemas
        │
        └──► POST /api/endpoints/run-suite   ──► [SSRF Guard] ──► [Live HTTP Execution (Axios)]
                                                                         │
                                                                         ▼
                                                                 [Ajv v8 Schema Check]
                                                                         │
                                                      ┌──────────────────┴──────────────────┐
                                                      ▼                                     ▼
                                                [Pass / Score]                   [Failure Diagnostics (Gemini)]
                                                      │                                     │
                                                      └──────────────────┬──────────────────┘
                                                                         ▼
                                                                [MongoDB Atlas Save]
```

---

## Project Structure

```text
shadow-api/
├── client/                  # React + Vite + Tailwind frontend workspace
│   ├── src/
│   │   ├── App.jsx          # 3-pane API studio, test matrix runner, diagnostics & resilience UI
│   │   └── main.jsx
│   └── package.json
├── server/                  # Node.js + Express backend & execution engines
│   ├── engines/
│   │   ├── aiService.js     # Gemini test matrix synthesis & failure diagnostics
│   │   ├── ssrfGuard.js     # DNS resolution & private/loopback IP CIDR blocker
│   │   └── testRunner.js    # Live HTTP runner + Ajv v8 strict schema validation
│   ├── models/
│   │   └── Endpoint.js      # Mongoose schema for endpoints, test suites & resilience scores
│   ├── index.js             # Express REST API routes & MongoDB connection
│   └── package.json
└── .gitignore
```

---

## Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URI
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone [https://github.com/divyanshiv10/shadow-api.git](https://github.com/divyanshiv10/shadow-api.git)
cd shadow-api
```

### 2. Configure Backend (`server/.env`)
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Install Dependencies & Start Backend
```bash
cd server
npm install
npm run dev
```

### 4. Install Dependencies & Start Frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.
