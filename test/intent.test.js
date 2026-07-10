import test from "node:test";
import assert from "node:assert/strict";
import { intentID, newIntentID, openIntents, pendingFollowUps } from "../src/timeline.js";

test("openIntents folds resolved intents out of the active queue", () => {
  const first = {
    at: "2026-07-07T00:00:00.000Z",
    type: "intent",
    actor: "agent:codex",
    action: "install pnpm",
    target: "pnpm",
    status: "open"
  };
  first.id = intentID(first);
  const second = {
    at: "2026-07-07T00:01:00.000Z",
    type: "intent",
    actor: "agent:claude",
    action: "check docker",
    target: "docker",
    status: "open"
  };
  second.id = intentID(second);

  const open = openIntents([
    first,
    second,
    {
      at: "2026-07-07T00:02:00.000Z",
      type: "intent-resolved",
      actor: "human:you",
      ref: first.id,
      status: "resolved"
    }
  ]);

  assert.deepEqual(open.map((intent) => intent.id), [second.id]);
});

test("newIntentID returns a short intent id", () => {
  const id = newIntentID(new Date("2026-07-07T00:00:00.000Z"));
  assert.match(id, /^int_[a-z0-9]+_[a-z0-9]{6}$/);
});

test("pendingFollowUps returns records that still need sync or handoff", () => {
  const followUps = pendingFollowUps([{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    summary: "dependency-change",
    target: "dependency",
    followUp: {
      required: true,
      target: "dependency",
      reason: "refresh",
      commands: ["aienvmap sync", "aienvmap handoff --record --actor agent:id"]
    }
  }]);

  assert.equal(followUps.length, 1);
  assert.equal(followUps[0].target, "dependency");
  assert.deepEqual(followUps[0].commands.slice(0, 1), ["aienvmap sync"]);
});

test("pendingFollowUps ignores records followed by sync and handoff", () => {
  const followUps = pendingFollowUps([{
    at: "2026-07-08T00:00:00.000Z",
    actor: "agent:codex",
    type: "agent-record",
    summary: "dependency-change",
    followUp: { required: true, target: "dependency", commands: ["aienvmap sync"] }
  }, {
    at: "2026-07-08T00:01:00.000Z",
    type: "sync"
  }, {
    at: "2026-07-08T00:02:00.000Z",
    type: "agent-handoff"
  }]);

  assert.equal(followUps.length, 0);
});
