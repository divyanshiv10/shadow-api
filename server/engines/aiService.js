import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const MODEL = process.env.LLM_MODEL || "gemini-3.5-flash-lite";

// Helper to safely clean & parse JSON returned by LLMs
function safeJsonParse(rawText) {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  // Extract first outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// 1. Generate Positive, Negative, Boundary & Edge-Case Test Scenarios
export async function generateTestCases({
  method = "GET",
  url,
  headers = {},
  body = null,
  description = "",
}) {
  const prompt = `
You are a Senior QA Automation Engineer. Analyze this API endpoint and generate 5 thorough, realistic test cases covering:
- 2 positive (happy path)
- 1 negative (invalid input or missing fields)
- 1 boundary (extreme lengths, zero/negative numbers, or empty payload)
- 1 edge_case (unexpected data types or null values — avoid unescaped double quotes inside strings)

Endpoint Details:
- Method: ${method}
- URL: ${url}
- Headers: ${JSON.stringify(headers)}
- Sample Body: ${JSON.stringify(body)}
- Description: ${description || "Not provided"}

Return ONLY a valid JSON object matching this exact structure:
{
  "testCases": [
    {
      "title": "Short descriptive test name",
      "category": "positive",
      "method": "${method}",
      "url": "${url}",
      "headers": {},
      "params": {},
      "body": null,
      "expectedStatus": 200,
      "expectedSchema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  ]
}
Rules:
- Keep "expectedSchema" a valid, concise JSON Schema Draft-07 object compatible with Ajv.
- Ensure all strings inside JSON properly escape any inner quotes.
`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "You output strictly valid, properly escaped JSON objects with no markdown formatting." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawText = response.choices[0].message.content;
  const parsed = safeJsonParse(rawText);
  return parsed.testCases || [];
}

// 2. Diagnose Failed Test Results & Recommend Fixes
export async function analyzeFailure({ testCase, executionResult }) {
  const prompt = `
You are an expert Backend & API Debugging Engineer. An automated API test just failed. Analyze why it failed and how to fix it.

Test Case Executed:
- Title: ${testCase.title}
- Category: ${testCase.category}
- Request: ${testCase.method} ${testCase.url}
- Request Body: ${JSON.stringify(testCase.body)}
- Expected Status: ${testCase.expectedStatus}
- Expected Schema: ${JSON.stringify(testCase.expectedSchema)}

Actual Execution Result:
- Actual Status: ${executionResult.actualStatus}
- Latency: ${executionResult.latencyMs}ms
- Validation Errors: ${JSON.stringify(executionResult.validationErrors)}
- Actual Response Body: ${JSON.stringify(executionResult.responseBody).slice(0, 1200)}

Return ONLY a valid JSON object with this exact structure:
{
  "rootCause": "Clear 1-2 sentence explanation of why the API failed this test",
  "severity": "low",
  "possibleCauses": ["Cause 1", "Cause 2"],
  "suggestedFix": "Concrete code or API contract fix recommendation"
}
`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: "You output strictly valid, properly escaped JSON objects with no markdown formatting." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawText = response.choices[0].message.content;
  return safeJsonParse(rawText);
}