import fs from "node:fs/promises";
import { schemaContract } from "../src/contract.js";
import { verifyContractFreeze } from "../src/contract-freeze.js";

const baselineUrl = new URL("../contracts/ai-json-root-fields.v1.json", import.meta.url);
const baseline = JSON.parse(await fs.readFile(baselineUrl, "utf8"));
const result = verifyContractFreeze(schemaContract(), baseline);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
