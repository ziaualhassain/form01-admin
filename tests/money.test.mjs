import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const filename = new URL("../src/lib/money.ts", import.meta.url);
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const exports = {};
vm.runInNewContext(outputText, { exports });
const { money } = exports;

for (const [minor, expected] of [
  [12900, "₹129"],
  [12950, "₹129.5"],
  [12999, "₹129.99"],
  [1, "₹0.01"],
  [0, "₹0"],
  [12900000, "₹1,29,000"],
]) {
  test(`${minor} paise renders as ${expected}`, () => {
    assert.equal(money(minor), expected);
  });
}
