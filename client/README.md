# ShadowAPI — Autonomous AI API Contract Testing & Diagnostics Engine

**ShadowAPI** is a full-stack hybrid API testing platform that bridges the gap between probabilistic LLM test generation and deterministic contract verification. Given an HTTP endpoint specification, it synthesizes positive, negative, boundary, and edge-case test suites using **Google Gemini AI**, executes live requests behind a hardened **SSRF Guard**, enforces strict JSON schema validation via **Ajv v8**, persists suites and resilience scores in **MongoDB Atlas**, and generates AI root-cause diagnostics for failures.

---

## Why ShadowAPI?

Testing APIs manually is slow, and relying only on AI chat has limits:
* **Manual testing misses edge cases:** In tools like Postman, developers usually test only the "happy path" (`200 OK`) and skip negative or boundary inputs because writing them by hand takes hours.
* **Silent bugs break frontends:** An API might return `200 OK` even when a field is missing or its data type changed (e.g., a number turned into a string).
* **AI chats don't execute live tests:** LLMs can brainstorm test cases, but they cannot send real HTTP requests or strictly verify live JSON responses on their own.

**ShadowAPI combines AI speed with real, reliable testing:**
1. **Click Test Generation:** Gemini AI automatically creates positive, negative, boundary, and edge-case tests from a single endpoint description.
2. **Strict Response Checking (Ajv v8):** Verifies that every live response matches the exact expected JSON structure and data types—not just the status code.
3. **Built-in Security (SSRF Guard):** Automatically blocks private/local IP addresses (`127.0.0.1`, internal networks) so arbitrary URLs cannot access internal server resources.
4. **Instant Failure Explanations:** When a test fails, AI explains the exact root cause and how to fix it.
5. **Saved History (MongoDB Atlas):** Keeps all your endpoints, test suites, and Resilience Scores saved in the cloud.
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
