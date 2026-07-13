import test from "node:test";
import assert from "node:assert/strict";
import { hasAgentPointer, markerBegin, markerEnd } from "../src/agent-pointer.js";

test("agent pointer detection requires one complete ordered marker block", () => {
  assert.equal(hasAgentPointer(`${markerBegin}\nUse aienvmap.\n${markerEnd}`), true);
  assert.equal(hasAgentPointer("Do not use aienvmap in this workspace."), false);
  assert.equal(hasAgentPointer(`${markerBegin}\nmissing end`), false);
  assert.equal(hasAgentPointer(`${markerEnd}\nreversed\n${markerBegin}`), false);
  assert.equal(hasAgentPointer(`${markerBegin}\none\n${markerEnd}\n${markerBegin}\ntwo\n${markerEnd}`), false);
});
