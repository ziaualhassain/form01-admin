import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(fs.readFileSync(new URL("../src/lib/inventory.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const exports = {};
vm.runInNewContext(outputText, { exports });
const products = [{ id: "p", variants: [{ id: "v", sku: "SKU-1", available: 3 }] }];
const now = Date.parse("2026-10-19T12:00:00Z");
const order = (overrides = {}) => ({
  status: "CONFIRMED", payment_status: "PAID", placed_at: "2026-10-18T12:00:00Z",
  items: [{ sku_snapshot: "SKU-1", quantity: 2 }], ...overrides,
});

test("sales sum quantities by SKU, not product title or order count", () => {
  const rows = exports.inventoryRows(products, [order(), order()], 7, now);
  assert.equal(rows[0].sold, 4);
  assert.equal(rows[0].variant.available, 3);
});

test("cancelled, unpaid and refunded orders do not count as paid sales", () => {
  const orders = [order({ status: "CANCELLED" }), order({ payment_status: "PENDING" }), order({ payment_status: "REFUNDED" }), order({ payment_status: "PARTIALLY_REFUNDED" })];
  assert.equal(exports.inventoryRows(products, orders, 30, now)[0].sold, 0);
});

test("sales window excludes old, undated and future orders", () => {
  const orders = [order(), order({ placed_at: "2026-01-01" }), order({ placed_at: null }), order({ placed_at: "2027-01-01" })];
  assert.equal(exports.inventoryRows(products, orders, 7, now)[0].sold, 2);
  assert.equal(exports.inventoryRows(products, orders, 0, now)[0].sold, 8);
});

test("unknown SKUs do not inflate the current catalogue totals", () => {
  assert.equal(exports.inventoryRows(products, [order({ items: [{ sku_snapshot: "REMOVED", quantity: 20 }] })], 30, now)[0].sold, 0);
});
