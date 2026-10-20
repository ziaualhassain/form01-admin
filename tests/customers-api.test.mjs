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

test("customer APIs authenticate, paginate and encode searches and IDs", async () => {
  const calls = [];
  const { customersApi } = loadApi(async (url, options) => {
    calls.push({ url, options });
    return Response.json({ items: [], total: 0, offset: 20, limit: 20 });
  });
  await customersApi.list("name+tag@example.test & phone", 20);
  await customersApi.get("customer/id");
  await customersApi.orders("customer/id", 40);
  await customersApi.order("FO-/1");
  const search = new URL(calls[0].url).searchParams;
  assert.equal(search.get("q"), "name+tag@example.test & phone");
  assert.equal(search.get("limit"), "20");
  assert.equal(search.get("offset"), "20");
  assert.equal(calls[1].url, "https://api.example.test/api/v1/admin/customers/customer%2Fid");
  assert.equal(calls[2].url, "https://api.example.test/api/v1/admin/customers/customer%2Fid/orders?limit=20&offset=40");
  assert.equal(calls[3].url, "https://api.example.test/api/v1/admin/orders/FO-%2F1");
  assert.ok(calls.every(({ options }) => options.headers.Authorization === "Bearer admin-fixture" && options.cache === "no-store" && options.signal));
});

test("customer API failures are surfaced, not replaced by fabricated records", async () => {
  const api = loadApi(async () => new Response('{"detail":"Customer not found"}', { status: 404 }));
  await assert.rejects(api.customersApi.get("missing"), (error) =>
    error.status === 404 && api.apiErrorMessage(error) === "Customer not found");
  const denied = loadApi(async () => new Response('{"detail":"Admin access required"}', { status: 403 }));
  await assert.rejects(denied.customersApi.list(""), (error) => error.status === 403);
});
