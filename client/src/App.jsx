import { useState, useEffect } from "react";
import axios from "axios";
import {
  Play,
  Sparkles,
  Check,
  X,
  Plus,
  Trash2,
  Activity,
  Terminal,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  Cpu,
  ShieldCheck,
  Copy,
  Download,
  Wand2,
  Gauge,
  Save,
  Database,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const INITIAL_SEED_ENDPOINTS = [
  {
    name: "Create Post (Mock 201)",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    description: "Creates a new blog post and returns created resource with ID",
    bodyText: '{\n  "title": "Distributed Consensus",\n  "body": "Raft vs Paxos overview",\n  "userId": 42\n}',
    headers: [{ key: "Content-Type", value: "application/json" }],
  },
  {
    name: "GitHub User Profile",
    method: "GET",
    url: "https://api.github.com/users/octocat",
    description: "Fetches real GitHub user profile by username; returns 404 if user does not exist",
    bodyText: "",
    headers: [{ key: "Accept", value: "application/vnd.github+json" }],
  },
];

export default function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [name, setName] = useState("New API Endpoint");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/users/octocat");
  const [description, setDescription] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [headers, setHeaders] = useState([{ key: "Content-Type", value: "application/json" }]);

  const [activeLeftTab, setActiveLeftTab] = useState("body");
  const [activeRightTab, setActiveRightTab] = useState("response");

  const [manualResult, setManualResult] = useState(null);
  const [generatedTests, setGeneratedTests] = useState([]);
  const [expandedMatrixIdx, setExpandedMatrixIdx] = useState(0);
  const [suiteReport, setSuiteReport] = useState(null);
  const [selectedTestIdx, setSelectedTestIdx] = useState(0);

  const [loadingManual, setLoadingManual] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingSuite, setLoadingSuite] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  const loadEndpointIntoEditor = (ep) => {
    setActiveId(ep._id);
    setName(ep.name || "Untitled Endpoint");
    setMethod(ep.method || "GET");
    setUrl(ep.url || "");
    setDescription(ep.description || "");
    setBodyText(ep.bodyText || "");
    setHeaders(
      ep.headers && ep.headers.length > 0
        ? ep.headers
        : [{ key: "Content-Type", value: "application/json" }]
    );
    setGeneratedTests(ep.generatedTests || []);
    setSuiteReport(ep.lastReport || null);
    setManualResult(null);
    setErrorMsg("");
  };

  // Load saved endpoints from MongoDB on mount
  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/endpoints`);
        if (data.length === 0) {
          // Seed initial endpoints into MongoDB on first run
          const created = [];
          for (const seed of INITIAL_SEED_ENDPOINTS) {
            const res = await axios.post(`${API_BASE}/endpoints`, seed);
            created.push(res.data);
          }
          setEndpoints(created);
          loadEndpointIntoEditor(created[0]);
        } else {
          setEndpoints(data);
          loadEndpointIntoEditor(data[0]);
        }
      } catch (err) {
        setErrorMsg("Failed to load endpoints from MongoDB: " + err.message);
      }
    };
    fetchEndpoints();
  }, []);

  // Live heartbeat check against backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get("http://localhost:5000/");
        setServerOnline(true);
      } catch {
        setServerOnline(false);
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleAddEndpoint = async () => {
    setErrorMsg("");
    try {
      const payload = {
        name: `Endpoint #${endpoints.length + 1}`,
        method: "GET",
        url: "https://api.github.com/zen",
        description: "Custom endpoint specification",
        bodyText: '{\n  "sample": true\n}',
        headers: [{ key: "Content-Type", value: "application/json" }],
      };
      const { data } = await axios.post(`${API_BASE}/endpoints`, payload);
      setEndpoints([data, ...endpoints]);
      loadEndpointIntoEditor(data);
    } catch (err) {
      setErrorMsg("Could not create endpoint: " + err.message);
    }
  };

  const handleSaveEndpoint = async (overrideTests = null, overrideReport = null) => {
    if (!activeId) return;
    setSavingDb(true);
    setErrorMsg("");
    try {
      const payload = {
        name,
        method,
        url,
        description,
        bodyText,
        headers,
        generatedTests: overrideTests !== null ? overrideTests : generatedTests,
        lastReport: overrideReport !== null ? overrideReport : suiteReport,
      };
      const { data } = await axios.put(`${API_BASE}/endpoints/${activeId}`, payload);
      setEndpoints((prev) => prev.map((ep) => (ep._id === activeId ? data : ep)));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1800);
    } catch (err) {
      setErrorMsg("Failed to save to MongoDB: " + err.message);
    } finally {
      setSavingDb(false);
    }
  };

  const handleDeleteEndpoint = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/endpoints/${id}`);
      const remaining = endpoints.filter((ep) => ep._id !== id);
      setEndpoints(remaining);
      if (activeId === id && remaining.length > 0) {
        loadEndpointIntoEditor(remaining[0]);
      } else if (remaining.length === 0) {
        setActiveId(null);
      }
    } catch (err) {
      setErrorMsg("Failed to delete endpoint: " + err.message);
    }
  };

  const buildHeadersObject = () => {
    const obj = {};
    headers.forEach((h) => {
      if (h.key.trim()) obj[h.key.trim()] = h.value;
    });
    return obj;
  };

  const parseJsonSafe = (text) => {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("SyntaxError: Invalid JSON in request payload.");
    }
  };

  const handlePrettifyJson = () => {
    setErrorMsg("");
    try {
      if (!bodyText.trim()) return;
      const parsed = JSON.parse(bodyText);
      setBodyText(JSON.stringify(parsed, null, 2));
    } catch {
      setErrorMsg("Cannot format: Invalid JSON syntax in editor.");
    }
  };

  const handleCopyCurl = () => {
    const hdrFlags = headers
      .filter((h) => h.key.trim())
      .map((h) => `-H "${h.key}: ${h.value}"`)
      .join(" ");
    const dataFlag =
      ["POST", "PUT", "PATCH", "DELETE"].includes(method) && bodyText.trim()
        ? `-d '${bodyText.replace(/\n/g, "")}'`
        : "";
    const cmd = `curl -X ${method} "${url}" ${hdrFlags} ${dataFlag}`.trim();
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1800);
  };

  const handleExportReport = () => {
    if (!suiteReport) return;
    const blob = new Blob([JSON.stringify({ endpoint: { name, method, url }, report: suiteReport }, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `shadowapi-report-${Date.now()}.json`;
    link.click();
  };

  const handleManualSend = async () => {
    setErrorMsg("");
    setLoadingManual(true);
    setActiveRightTab("response");
    try {
      const parsedBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method) ? parseJsonSafe(bodyText) : null;
      const { data } = await axios.post(`${API_BASE}/execute`, {
        method,
        url,
        headers: buildHeadersObject(),
        body: parsedBody,
      });
      setManualResult(data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoadingManual(false);
    }
  };

  const handleGenerateTests = async () => {
    setErrorMsg("");
    setLoadingAI(true);
    setSuiteReport(null);
    try {
      const parsedBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method) ? parseJsonSafe(bodyText) : null;
      const { data } = await axios.post(`${API_BASE}/ai/generate`, {
        method,
        url,
        headers: buildHeadersObject(),
        body: parsedBody,
        description,
      });
      const tests = data.testCases || [];
      setGeneratedTests(tests);
      setExpandedMatrixIdx(0);
      setActiveRightTab("suite");
      // Auto-persist generated test suite to MongoDB
      await handleSaveEndpoint(tests, null);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleRunSuite = async () => {
    setErrorMsg("");
    setLoadingSuite(true);
    try {
      const { data } = await axios.post(`${API_BASE}/ai/run-suite`, {
        testCases: generatedTests,
      });
      setSuiteReport(data);
      setSelectedTestIdx(0);
      setActiveRightTab("report");
      // Auto-persist execution diagnostics report to MongoDB
      await handleSaveEndpoint(generatedTests, data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoadingSuite(false);
    }
  };

  const methodStyles = {
    GET: "text-emerald-400",
    POST: "text-amber-400",
    PUT: "text-sky-400",
    PATCH: "text-violet-400",
    DELETE: "text-rose-400",
  };

  const categoryTag = (cat) => {
    const map = {
      positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
      negative: "text-rose-400 bg-rose-500/10 border-rose-500/25",
      boundary: "text-amber-400 bg-amber-500/10 border-amber-500/25",
      edge_case: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
    };
    return map[cat] || "text-zinc-300 bg-zinc-800 border-zinc-700";
  };

  const healthScore = suiteReport
    ? Math.round((suiteReport.summary.passed / suiteReport.summary.total) * 100)
    : null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Global Top Command Bar */}
      <header className="h-13 border-b border-zinc-800/90 bg-[#0c0c0e] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Terminal size={15} strokeWidth={2.5} />
          </div>
          <span className="font-mono text-base font-bold tracking-tight text-white">
            shadow<span className="text-amber-400">.api</span>
          </span>
          <span className="text-zinc-700">/</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900/80 hover:bg-zinc-900 focus:bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-none w-52"
          />
        </div>

        <div className="flex items-center gap-5 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Database size={14} className="text-sky-400" />
            MongoDB Atlas
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <ShieldCheck size={15} className="text-emerald-400" />
            SSRF Guard
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Cpu size={15} className="text-amber-400" />
            Ajv v8
          </span>
          <span
            className={`flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 font-semibold ${
              serverOnline ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            {serverOnline ? "ENGINE ONLINE" : "ENGINE OFFLINE"}
          </span>
        </div>
      </header>

      {/* Main 3-Pane Split Workspace */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* PANE 1: Left Saved Endpoints Sidebar */}
        <aside className="w-60 border-r border-zinc-800/90 bg-[#0b0b0d] flex flex-col shrink-0">
          <div className="h-14 px-4 border-b border-zinc-800/90 bg-[#0c0c0e] flex items-center justify-between shrink-0">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Layers size={14} /> Saved ({endpoints.length})
            </span>
            <button
              onClick={handleAddEndpoint}
              title="Create New Endpoint in MongoDB"
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto">
            {endpoints.map((ep) => (
              <div
                key={ep._id}
                onClick={() => loadEndpointIntoEditor(ep)}
                className={`group w-full text-left px-3 py-2.5 rounded-lg transition flex items-start justify-between gap-2 cursor-pointer border ${
                  activeId === ep._id
                    ? "bg-zinc-800/80 border-zinc-700/80 text-white"
                    : "border-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className={`font-mono text-xs font-bold mt-0.5 w-10 shrink-0 ${methodStyles[ep.method]}`}>
                    {ep.method}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{ep.name}</div>
                    <div className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                      {ep.url.replace(/^https?:\/\//, "")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteEndpoint(e, ep._id)}
                  title="Delete Endpoint"
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Bottom Telemetry Gauge */}
          <div className="p-4 border-t border-zinc-800/80 text-xs font-mono space-y-2.5 shrink-0 bg-[#0c0c0e]">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Gauge size={13} className="text-amber-400" /> Resilience Score
              </span>
              <span
                className={`font-bold ${
                  healthScore === null
                    ? "text-zinc-500"
                    : healthScore >= 80
                    ? "text-emerald-400"
                    : healthScore >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {healthScore !== null ? `${healthScore}%` : "N/A"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  healthScore === null
                    ? "w-0"
                    : healthScore >= 80
                    ? "bg-emerald-400"
                    : healthScore >= 50
                    ? "bg-amber-400"
                    : "bg-rose-500"
                }`}
                style={{ width: `${healthScore || 0}%` }}
              />
            </div>
          </div>
        </aside>

        {/* PANE 2: Center Request & Specification Editor */}
        <section className="flex-1 flex flex-col border-r border-zinc-800/90 min-w-0 bg-[#09090b]">
          {/* URL Execution Bar */}
          <div className="h-14 px-3.5 border-b border-zinc-800/90 bg-[#0c0c0e] flex items-center gap-2 shrink-0 min-w-0">
            <div className="flex-1 min-w-0 flex items-center bg-[#121215] border border-zinc-800 rounded-lg focus-within:border-zinc-500 transition">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={`bg-transparent pl-3 pr-2 py-2 font-mono text-sm font-bold focus:outline-none cursor-pointer shrink-0 ${methodStyles[method]}`}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m} className="bg-zinc-900 text-zinc-100">
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-zinc-700 shrink-0">|</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/v1/endpoint"
                className="flex-1 min-w-0 bg-transparent px-3 py-2 font-mono text-sm text-zinc-100 focus:outline-none truncate"
              />
            </div>

            <button
              onClick={() => handleSaveEndpoint()}
              disabled={savingDb || !activeId}
              title="Save changes to MongoDB"
              className="h-9 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Save size={13} className={savedToast ? "text-emerald-400" : "text-sky-400"} />
              {savedToast ? "Saved!" : savingDb ? "..." : "Save"}
            </button>

            <button
              onClick={handleManualSend}
              disabled={loadingManual}
              className="h-9 px-3.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-sm font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Play size={14} />
              {loadingManual ? "..." : "Send"}
            </button>

            <button
              onClick={handleGenerateTests}
              disabled={loadingAI}
              className="h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Sparkles size={14} />
              {loadingAI ? "Synthesizing..." : "Synthesize"}
            </button>
          </div>

          {errorMsg && (
            <div className="px-4 py-2.5 bg-rose-950/70 border-b border-rose-500/40 text-rose-200 font-mono text-sm flex items-center gap-2 shrink-0">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span className="truncate">{errorMsg}</span>
            </div>
          )}

          {/* Editor Sub-Tabs + Power Utilities */}
          <div className="h-11 border-b border-zinc-800/80 px-5 flex items-center justify-between bg-[#0b0b0d] text-sm shrink-0">
            <div className="flex items-center gap-7 h-full">
              {[
                { id: "body", label: "JSON Payload" },
                { id: "headers", label: `Headers (${headers.length})` },
                { id: "context", label: "AI Spec Context" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLeftTab(tab.id)}
                  className={`h-full border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                    activeLeftTab === tab.id
                      ? "border-amber-400 text-white"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeLeftTab === "body" && (
                <button
                  onClick={handlePrettifyJson}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Wand2 size={12} className="text-amber-400" /> Format
                </button>
              )}
              <button
                onClick={handleCopyCurl}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy size={12} /> {copiedCurl ? "Copied!" : "cURL"}
              </button>
            </div>
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col">
            {activeLeftTab === "body" && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono text-zinc-400">application/json</span>
                  {!["POST", "PUT", "PATCH", "DELETE"].includes(method) && (
                    <span className="text-xs font-mono text-amber-400">
                      Payload ignored for {method} requests
                    </span>
                  )}
                </div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  spellCheck={false}
                  placeholder='{ "key": "value" }'
                  className="flex-1 w-full bg-[#0d0d10] border border-zinc-800/90 rounded-lg p-4 font-mono text-sm leading-relaxed text-zinc-100 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
            )}

            {activeLeftTab === "headers" && (
              <div className="space-y-3">
                {headers.map((h, i) => (
                  <div key={i} className="flex gap-2.5">
                    <input
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[i].key = e.target.value;
                        setHeaders(copy);
                      }}
                      placeholder="Header-Name"
                      className="flex-1 min-w-0 bg-[#121215] border border-zinc-800 rounded-lg px-3.5 py-2 font-mono text-sm text-zinc-100 focus:outline-none"
                    />
                    <input
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[i].value = e.target.value;
                        setHeaders(copy);
                      }}
                      placeholder="Value"
                      className="flex-1 min-w-0 bg-[#121215] border border-zinc-800 rounded-lg px-3.5 py-2 font-mono text-sm text-zinc-100 focus:outline-none"
                    />
                    <button
                      onClick={() => setHeaders(headers.filter((_, idx) => idx !== i))}
                      className="p-2 text-zinc-400 hover:text-rose-400 cursor-pointer shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setHeaders([...headers, { key: "", value: "" }])}
                  className="text-sm font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1.5 pt-1 cursor-pointer"
                >
                  <Plus size={15} /> Add Header
                </button>
              </div>
            )}

            {activeLeftTab === "context" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-200">
                  Endpoint Behavior & Business Rules
                </label>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Describe expected status codes, required fields, or auth constraints so the AI generates sharper negative and boundary test cases.
                </p>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-zinc-800 rounded-lg p-3.5 text-sm leading-relaxed text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>
            )}
          </div>
        </section>

        {/* PANE 3: Right Telemetry, Test Matrix & Failure Diagnostics */}
        <section className="w-[41%] flex flex-col bg-[#0b0b0d] shrink-0 min-w-0">
          <div className="h-14 border-b border-zinc-800/90 px-5 flex items-center justify-between bg-[#0c0c0e] shrink-0">
            <div className="flex items-center gap-6 h-full text-sm">
              <button
                onClick={() => setActiveRightTab("response")}
                className={`h-full border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                  activeRightTab === "response"
                    ? "border-amber-400 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Raw Response
              </button>
              <button
                onClick={() => setActiveRightTab("suite")}
                className={`h-full border-b-2 font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeRightTab === "suite"
                    ? "border-amber-400 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Test Matrix
                {generatedTests.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-xs text-zinc-200">
                    {generatedTests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveRightTab("report")}
                className={`h-full border-b-2 font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeRightTab === "report"
                    ? "border-amber-400 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Diagnostics
                {suiteReport && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-xs ${
                      suiteReport.summary.failed > 0
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {suiteReport.summary.passed}/{suiteReport.summary.total}
                  </span>
                )}
              </button>
            </div>

            {generatedTests.length > 0 && (
              <button
                onClick={handleRunSuite}
                disabled={loadingSuite}
                className="h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Activity size={14} />
                {loadingSuite ? "EXECUTING..." : "RUN SUITE"}
              </button>
            )}
          </div>

          {/* Right Pane Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeRightTab === "response" && (
              <>
                {!manualResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2.5">
                    <Terminal size={28} />
                    <p className="text-sm font-mono">Hit Send to inspect live response & latency</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800/90 space-y-2.5">
                      <div className="flex items-center justify-between font-mono text-sm">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              manualResult.actualStatus < 400
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            HTTP {manualResult.actualStatus}
                          </span>
                          <span className="text-zinc-200 font-semibold">{manualResult.latencyMs} ms</span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {JSON.stringify(manualResult.responseBody)?.length || 0} bytes
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            manualResult.latencyMs < 300
                              ? "bg-emerald-400"
                              : manualResult.latencyMs < 800
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, (manualResult.latencyMs / 1000) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <pre className="font-mono text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-all bg-[#0d0d10] border border-zinc-800/80 rounded-lg p-4">
                      {JSON.stringify(manualResult.responseBody, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            {activeRightTab === "suite" && (
              <>
                {generatedTests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2.5">
                    <Sparkles size={28} />
                    <p className="text-sm font-mono">Click Synthesize to generate edge cases</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedTests.map((tc, idx) => {
                      const isExpanded = expandedMatrixIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setExpandedMatrixIdx(isExpanded ? -1 : idx)}
                          className="p-4 rounded-lg bg-[#111114] border border-zinc-800/90 hover:border-zinc-700 transition cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isExpanded ? (
                                <ChevronDown size={15} className="text-amber-400 shrink-0" />
                              ) : (
                                <ChevronRight size={15} className="text-zinc-500 shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-zinc-100 truncate">{tc.title}</span>
                            </div>
                            <span
                              className={`text-xs font-mono px-2 py-0.5 rounded border shrink-0 ${categoryTag(
                                tc.category
                              )}`}
                            >
                              {tc.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 pl-5">
                            <span>EXPECT: HTTP {tc.expectedStatus}</span>
                            <span>•</span>
                            <span>AJV FIELDS: {Object.keys(tc.expectedSchema?.properties || {}).length}</span>
                          </div>

                          {isExpanded && (
                            <div className="pt-2 pl-5 space-y-2">
                              {tc.body && (
                                <div>
                                  <div className="text-[11px] font-mono text-zinc-500 mb-1">REQUEST PAYLOAD</div>
                                  <pre className="bg-[#09090b] border border-zinc-800/80 rounded-md p-2.5 font-mono text-xs text-zinc-300 overflow-x-auto">
                                    {JSON.stringify(tc.body, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <div className="text-[11px] font-mono text-zinc-500 mb-1">AJV EXPECTED SCHEMA</div>
                                <pre className="bg-[#09090b] border border-zinc-800/80 rounded-md p-2.5 font-mono text-xs text-amber-300/90 overflow-x-auto">
                                  {JSON.stringify(tc.expectedSchema, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeRightTab === "report" && (
              <>
                {!suiteReport ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2.5">
                    <Activity size={28} />
                    <p className="text-sm font-mono">Run the synthesized suite to view Ajv & AI diagnostics</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Execution Summary
                      </span>
                      <button
                        onClick={handleExportReport}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Download size={12} className="text-amber-400" /> Export JSON
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800">
                        <div className="text-xs text-zinc-400">EXECUTED</div>
                        <div className="text-lg font-bold text-zinc-100 mt-0.5">{suiteReport.summary.total}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800">
                        <div className="text-xs text-zinc-400">PASSED</div>
                        <div className="text-lg font-bold text-emerald-400 mt-0.5">{suiteReport.summary.passed}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800">
                        <div className="text-xs text-zinc-400">FAILED</div>
                        <div className="text-lg font-bold text-rose-400 mt-0.5">{suiteReport.summary.failed}</div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {suiteReport.results.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedTestIdx(idx)}
                          className={`p-3.5 rounded-lg border transition cursor-pointer ${
                            selectedTestIdx === idx
                              ? "bg-[#141418] border-zinc-600"
                              : "bg-[#101013] border-zinc-800/80 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {item.result.passed ? (
                                <Check size={16} className="text-emerald-400 shrink-0" />
                              ) : (
                                <X size={16} className="text-rose-400 shrink-0" />
                              )}
                              <span className="text-sm font-medium text-zinc-100 truncate">
                                {item.testCase.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
                              <span className={item.result.passed ? "text-emerald-400" : "text-rose-400"}>
                                {item.result.actualStatus}
                              </span>
                              <span className="text-zinc-500">{item.result.latencyMs}ms</span>
                              <ChevronRight size={15} className="text-zinc-500" />
                            </div>
                          </div>

                          {!item.result.passed && item.aiAnalysis && (
                            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2.5 text-sm">
                              <div className="flex items-center justify-between font-mono text-xs">
                                <span className="text-rose-400 font-bold">ROOT CAUSE ANALYSIS</span>
                                <span className="text-amber-400 uppercase">{item.aiAnalysis.severity}</span>
                              </div>
                              <p className="text-zinc-200 leading-relaxed">{item.aiAnalysis.rootCause}</p>
                              <div className="p-2.5 rounded-md bg-[#09090b] border border-zinc-800 font-mono text-xs text-emerald-400">
                                Fix: {item.aiAnalysis.suggestedFix}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}