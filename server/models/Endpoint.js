import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema({
  title: String,
  category: String,
  method: String,
  url: String,
  headers: { type: Object, default: {} },
  params: { type: Object, default: {} },
  body: { type: mongoose.Schema.Types.Mixed, default: null },
  expectedStatus: Number,
  expectedSchema: { type: Object, default: {} },
});

const endpointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    method: { type: String, required: true, default: "GET" },
    url: { type: String, required: true },
    headers: { type: Array, default: [{ key: "Content-Type", value: "application/json" }] },
    bodyText: { type: String, default: "" },
    description: { type: String, default: "" },
    generatedTests: { type: [testCaseSchema], default: [] },
    lastReport: { type: Object, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Endpoint", endpointSchema);