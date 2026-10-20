import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadApi(fetch) {
  const filename = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, fetch, URLSearchParams, AbortSignal,
    process: { env: { NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1" } },
    window: { localStorage: { getItem: () => "admin-fixture" } },
  }, { filename });
  return exports;
}

test("queue sends server-side time, search, status and snapshot pagination filters", async () => {
  const calls = [];
  const { orderQueueApi } = loadApi(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ items: [], total: 0, limit: 20, offset: 40 });
  });
  const filters = { period: "custom", date_from: "2026-10-01", date_to: "2026-10-20", q: "Coat & hat+1", stage: "incoming", payment: "PAID", fulfilment: "UNFULFILLED" };
  await orderQueueApi.list(filters, 40, "2026-10-20T10:00:00+00:00");
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, "/api/v1/admin/order-queue");
  for (const [key, value] of Object.entries(filters)) assert.equal(url.searchParams.get(key), value);
  assert.equal(url.searchParams.get("snapshot_at"), "2026-10-20T10:00:00+00:00");
  assert.equal(url.searchParams.get("offset"), "40");
  assert.equal(url.searchParams.get("limit"), "20");
  assert.equal(calls[0].options.headers.Authorization, "Bearer admin-fixture");
  assert.equal(calls[0].options.cache, "no-store");
  assert.ok(calls[0].options.signal);
});

test("queue refresh requests a fresh snapshot and uses cancellation", async () => {
  const controller = new AbortController();
  let signal;
  const { orderQueueApi } = loadApi(async (url, options) => {
    assert.equal(new URL(url).searchParams.has("snapshot_at"), false);
    assert.equal(new URL(url).searchParams.has("date_from"), false);
    signal = options.signal;
    return Response.json({ items: [] });
  });
  await orderQueueApi.list({ period: "today", date_from: undefined, date_to: undefined, q: "", stage: "all", payment: "all", fulfilment: "all" }, 0, undefined, controller.signal);
  controller.abort();
  assert.equal(signal.aborted, true);
});

test("queue API errors remain explicit instead of presenting empty success results", async () => {
  const { orderQueueApi } = loadApi(async () => Response.json({ detail: "Admin access required" }, { status: 403 }));
  await assert.rejects(orderQueueApi.list({ period: "all", q: "", stage: "all", payment: "all", fulfilment: "all" }), (error) => error.status === 403);
});
