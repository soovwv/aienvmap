import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { schemaContract } from "../src/contract.js";
import { documentedRootFieldMap, verifyContractFreeze } from "../src/contract-freeze.js";

const baselineUrl = new URL("../contracts/ai-json-root-fields.v1.json", import.meta.url);

test("reviewed AI JSON root fields match the 0.2.0 freeze candidate", async () => {
  const baseline = JSON.parse(await fs.readFile(baselineUrl, "utf8"));
  const result = verifyContractFreeze(schemaContract(), baseline);
  assert.equal(result.pass, true);
  assert.equal(result.status, "frozen-and-verified");
  assert.equal(result.surfaces.length, 14);
  assert.equal(result.surfaceFieldCounts.trial, 13);
});

test("contract freeze fails closed on an unreviewed root-field change", async () => {
  const schema = structuredClone(schemaContract());
  const baseline = JSON.parse(await fs.readFile(baselineUrl, "utf8"));
  schema.outputs.start.rootFields.push("unreviewedField");
  const result = verifyContractFreeze(schema, baseline);
  assert.equal(result.pass, false);
  assert.ok(result.failures.includes("root-field-digest-mismatch"));
  assert.ok(result.failures.includes("surface-field-count-mismatch"));
});

test("contract freeze rejects missing and duplicate documented fields", () => {
  const missing = structuredClone(schemaContract());
  delete missing.outputs.demo.rootFields;
  assert.throws(() => documentedRootFieldMap(missing), /demo\.rootFields/);

  const duplicate = structuredClone(schemaContract());
  duplicate.outputs.demo.rootFields.push(duplicate.outputs.demo.rootFields[0]);
  assert.throws(() => documentedRootFieldMap(duplicate), /contains duplicates/);
});
