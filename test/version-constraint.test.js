import test from "node:test";
import assert from "node:assert/strict";
import { versionConstraintsOverlap, versionMatchesConstraint } from "../src/version-constraint.js";

test("version constraints cover common Node and Python declaration forms", () => {
  assert.equal(versionMatchesConstraint("22", "22.12.0"), true);
  assert.equal(versionMatchesConstraint(">=20 <23", "22.12.0"), true);
  assert.equal(versionMatchesConstraint(">=23", "22.12.0"), false);
  assert.equal(versionMatchesConstraint("^22.1.0", "22.12.0"), true);
  assert.equal(versionMatchesConstraint("^22.1.0", "23.0.0"), false);
  assert.equal(versionMatchesConstraint("~=3.12", "3.12.4"), true);
  assert.equal(versionMatchesConstraint("~=3.12", "3.99.0"), true);
  assert.equal(versionMatchesConstraint("~=3.12.0", "3.13.0"), false);
  assert.equal(versionMatchesConstraint("~3", "3.9.0"), true);
  assert.equal(versionMatchesConstraint("^0", "0.9.0"), true);
  assert.equal(versionMatchesConstraint(">=3.13", "3.12.4"), false);
  assert.equal(versionMatchesConstraint("20 || 22", "22.12.0"), true);
});

test("version range overlap distinguishes compatible, conflicting, and unsupported declarations", () => {
  assert.equal(versionConstraintsOverlap(">=22 <23", "<20"), false);
  assert.equal(versionConstraintsOverlap(">=22 <23", "^22.4.0"), true);
  assert.equal(versionConstraintsOverlap("20 || 22", ">=21 <23"), true);
  assert.equal(versionConstraintsOverlap("workspace:*", ">=22"), null);
  assert.equal(versionConstraintsOverlap("~=3.12", "3.99"), true);
  assert.equal(versionConstraintsOverlap("~=3.12.0", "3.13"), false);
  assert.equal(versionConstraintsOverlap("~3", "3.9"), true);
  assert.equal(versionConstraintsOverlap("^0", "0.9"), true);
});

test("unsupported constraints fail open instead of inventing drift", () => {
  assert.equal(versionMatchesConstraint("workspace-managed", "22.12.0"), true);
  assert.equal(versionMatchesConstraint("", "22.12.0"), true);
});
