import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Endpoint from "./models/Endpoint.js";
import { validateTargetUrl } from "./engines/ssrfGuard.js";
import { executeAndValidateTest } from "./engines/testRunner.js";
import { generateTestCases, analyzeFailure } from "./engines/aiService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Atlas Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected (shadowapi)"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// Health Check Route
app.get("/", (req, res) => {
  res.json({ status: "ShadowAPI Engine Online", timestamp: new Date().toISOString() });
});

// 1. Manual Single Request Executor (with SSRF Guard)
app.post("/api/execute", async (req, res) => {
  try {
    const { method = "GET", url, headers = {}, params = {}, body = null } = req.body;
    if (!url) return res.status(400).json({ error: "Target URL is required." });

    await validateTargetUrl(url);
    const result = await executeAndValidateTest({
      method,
      url,
      headers,
      params,
      body,
      expectedStatus: 200,
      expectedSchema: {},
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. AI Test Suite Synthesizer
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { method, url, headers, body, description } = req.body;
    if (!url) return res.status(400).json({ error: "Target URL is required." });

    await validateTargetUrl(url);
    const testCases = await generateTestCases({ method, url, headers, body, description });
    res.json({ testCases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Automated Suite Runner (Ajv v8 Validation + AI Root-Cause Diagnostics)
app.post("/api/ai/run-suite", async (req, res) => {
  try {
    const { testCases = [] } = req.body;
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: "No test cases provided to execute." });
    }

    const enrichedResults = await Promise.all(
      testCases.map(async (tc) => {
        const executionResult = await executeAndValidateTest(tc);
        let aiAnalysis = null;
        if (!executionResult.passed) {
          aiAnalysis = await analyzeFailure({ testCase: tc, executionResult });
        }
        return { testCase: tc, result: executionResult, aiAnalysis };
      })
    );

    const passed = enrichedResults.filter((r) => r.result.passed).length;
    const failed = enrichedResults.length - passed;

    res.json({
      summary: { total: enrichedResults.length, passed, failed },
      results: enrichedResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. MongoDB Saved Endpoints CRUD Routes
app.get("/api/endpoints", async (req, res) => {
  try {
    const endpoints = await Endpoint.find().sort({ updatedAt: -1 });
    res.json(endpoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/endpoints", async (req, res) => {
  try {
    const ep = await Endpoint.create(req.body);
    res.status(201).json(ep);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/endpoints/:id", async (req, res) => {
  try {
    const updated = await Endpoint.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/endpoints/:id", async (req, res) => {
  try {
    await Endpoint.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});