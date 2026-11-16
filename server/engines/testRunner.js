import axios from "axios";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { validateTargetUrl } from "./ssrfGuard.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export async function executeAndValidateTest({
  method = "GET",
  url,
  headers = {},
  params = {},
  body = null,
  expectedStatus = null,
  expectedSchema = null,
  timeoutMs = 8000,
}) {
  // 1. Check URL for SSRF security
  const safeUrl = await validateTargetUrl(url);

  // 2. Execute HTTP request & measure time
  const startTime = performance.now();
  let response;
  try {
    response = await axios({
      method: method.toUpperCase(),
      url: safeUrl,
      headers,
      params,
      data: ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()) ? body : undefined,
      timeout: timeoutMs,
      maxContentLength: 5 * 1024 * 1024, // 5MB max
      validateStatus: () => true, // Capture 400/500 responses without throwing
    });
  } catch (networkErr) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      passed: false,
      actualStatus: 0,
      latencyMs,
      responseBody: null,
      validationErrors: [
        {
          type: "NETWORK_ERROR",
          message: networkErr.code === "ECONNABORTED" ? "Request timed out" : networkErr.message,
        },
      ],
    };
  }

  const latencyMs = Math.round(performance.now() - startTime);
  const validationErrors = [];

  // 3. Validate expected HTTP status code (if provided)
  if (expectedStatus !== null && response.status !== Number(expectedStatus)) {
    validationErrors.push({
      type: "STATUS_MISMATCH",
      expected: Number(expectedStatus),
      actual: response.status,
      message: `Expected HTTP ${expectedStatus}, but received ${response.status}`,
    });
  }

  // 4. Validate response JSON against Ajv schema (if provided)
  if (expectedSchema && Object.keys(expectedSchema).length > 0) {
    try {
      const validate = ajv.compile(expectedSchema);
      const isValid = validate(response.data);

      if (!isValid && validate.errors) {
        for (const err of validate.errors) {
          validationErrors.push({
            type: "SCHEMA_MISMATCH",
            path: err.instancePath || "/",
            keyword: err.keyword,
            message: err.message,
          });
        }
      }
    } catch (schemaErr) {
      validationErrors.push({
        type: "INVALID_SCHEMA",
        message: `Schema error: ${schemaErr.message}`,
      });
    }
  }

  return {
    passed: validationErrors.length === 0,
    actualStatus: response.status,
    latencyMs,
    responseHeaders: response.headers,
    responseBody: response.data,
    validationErrors,
  };
}