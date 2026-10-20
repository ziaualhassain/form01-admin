import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadApi(fetch, browser = {}) {
  const filename = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, fetch, AbortSignal,
    process: { env: { NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1" } },
    window: { localStorage: { getItem: () => "fixture-admin-token" }, setTimeout: (callback) => callback() },
    ...browser,
  }, { filename });
  return exports;
}

test("GST settings and simulation use authenticated backend endpoints without activation", async () => {
  const requests = [];
  const { gstApi } = loadApi(async (url, options) => {
    requests.push({ url, options });
    return Response.json({ version: 1, configuration: {} });
  });
  const configuration = { draft_only: true, registration: "UNKNOWN", rules: [] };
  await gstApi.get();
  await gstApi.save(configuration);
  await gstApi.preview({ configuration, destination_state_code: "36", on_date: "2026-05-01", discount_minor: 0, lines: [] });
  assert.equal(requests[0].url, "https://api.example.test/api/v1/admin/gst");
  assert.equal(requests[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].options.body), configuration);
  assert.equal(requests[2].url, "https://api.example.test/api/v1/admin/gst/preview");
  assert.equal(requests[2].options.method, "POST");
  assert.ok(requests.every(({ options }) => options.headers.Authorization === "Bearer fixture-admin-token"));
});

test("admin PDF download uses authorization, encodes references and releases its blob URL", async () => {
  let received, clicked = false, revoked;
  const anchor = { click: () => { clicked = true; }, remove: () => {} };
  const { downloadDraftInvoice } = loadApi(async (url, options) => {
    received = { url, options };
    return new Response("%PDF-1.4", { headers: { "content-type": "application/pdf" } });
  }, {
    document: { createElement: () => anchor, body: { appendChild: () => {} } },
    URL: { createObjectURL: () => "blob:fixture", revokeObjectURL: (url) => { revoked = url; } },
  });
  await downloadDraftInvoice("FO-/1");
  assert.equal(received.url, "https://api.example.test/api/v1/admin/orders/FO-%2F1/draft-invoice");
  assert.equal(received.options.headers.Authorization, "Bearer fixture-admin-token");
  assert.equal(received.options.cache, "no-store");
  assert.equal(anchor.download, "draft-FO-_1.pdf");
  assert.ok(clicked);
  assert.equal(revoked, "blob:fixture");
});

test("admin PDF errors do not download success-shaped JSON", async () => {
  const denied = loadApi(async () => new Response('{"detail":"Not authorized"}', { status: 403 }));
  await assert.rejects(denied.downloadDraftInvoice("FO-1"), (error) =>
    error.status === 403 && denied.apiErrorMessage(error) === "Not authorized");
  const invalid = loadApi(async () => Response.json({ status: "ok" }));
  await assert.rejects(invalid.downloadDraftInvoice("FO-1"), /Expected a PDF/);
});

test("draft validation exposes actionable rule messages without submitted values", () => {
  const { ApiRequestError, apiErrorMessage } = loadApi();
  const error = new ApiRequestError(422, JSON.stringify({ error: {
    message: "The request could not be processed.",
    details: [{ loc: ["body", "rules", 0], msg: "Final slab must have no upper bound", input: "private" }],
  } }));
  assert.equal(apiErrorMessage(error), "rules: Final slab must have no upper bound");
});
