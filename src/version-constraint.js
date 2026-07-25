export function versionMatchesConstraint(constraint, actual) {
  const version = parseVersion(actual);
  if (!version) return true;
  const alternatives = String(constraint || "").split("||").map((item) => item.trim()).filter(Boolean);
  if (!alternatives.length) return true;
  let supported = false;
  for (const alternative of alternatives) {
    const result = matchesAll(alternative, version);
    supported ||= result.supported;
    if (result.supported && result.matches) return true;
  }
  return supported ? false : true;
}

export function versionConstraintsOverlap(left, right) {
  const leftRanges = constraintRanges(left);
  const rightRanges = constraintRanges(right);
  if (!leftRanges || !rightRanges) return null;
  return leftRanges.some((leftRange) => rightRanges.some((rightRange) => rangesOverlap(leftRange, rightRange)));
}

function constraintRanges(value) {
  const alternatives = String(value || "").split("||").map((item) => item.trim()).filter(Boolean);
  if (!alternatives.length) return null;
  const ranges = [];
  for (const alternative of alternatives) {
    const range = rangeForAlternative(alternative);
    if (!range) return null;
    if (!range.empty) ranges.push(range);
  }
  return ranges;
}

function rangeForAlternative(value) {
  const normalized = value.replace(/,/g, " ").trim();
  if (["*", "x", "X", "latest", "system"].includes(normalized)) return unboundedRange();
  const hyphen = normalized.match(/^(\d+(?:\.\d+){0,2})\s+-\s+(\d+(?:\.\d+){0,2})$/);
  if (hyphen) return { lower: parseVersion(hyphen[1]), lowerInclusive: true, upper: parseVersion(hyphen[2]), upperInclusive: true, empty: false };
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (!terms.length) return null;
  let range = unboundedRange();
  for (const term of terms) {
    const termRange = rangeForTerm(term);
    if (!termRange) return null;
    range = intersectRanges(range, termRange);
  }
  return range;
}

function rangeForTerm(term) {
  if (["*", "x", "X", "latest", "system"].includes(term)) return unboundedRange();
  const match = term.match(/^(>=|<=|~=|>|<|=|\^|~)?v?(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?(?:-[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  const operator = match[1] || "=";
  const rawParts = [match[2], match[3], match[4]];
  const specified = rawParts.filter((item) => item !== undefined && !["x", "X", "*"].includes(item)).length;
  const expected = rawParts.map((item) => Number(/^[0-9]+$/.test(String(item)) ? item : 0));
  if (operator === ">=") return lowerRange(expected, true);
  if (operator === ">") return lowerRange(expected, false);
  if (operator === "<=") return upperRange(expected, true);
  if (operator === "<") return upperRange(expected, false);
  if (operator === "^") return boundedRange(expected, true, caretUpper(expected, specified), false);
  if (["~", "~="].includes(operator)) return boundedRange(expected, true, compatibleUpper(operator, expected, specified), false);
  if (specified === 1) return boundedRange(expected, true, [expected[0] + 1, 0, 0], false);
  if (specified === 2) return boundedRange(expected, true, [expected[0], expected[1] + 1, 0], false);
  return boundedRange(expected, true, expected, true);
}

function unboundedRange() {
  return { lower: null, lowerInclusive: false, upper: null, upperInclusive: false, empty: false };
}

function lowerRange(lower, inclusive) {
  return { ...unboundedRange(), lower, lowerInclusive: inclusive };
}

function upperRange(upper, inclusive) {
  return { ...unboundedRange(), upper, upperInclusive: inclusive };
}

function boundedRange(lower, lowerInclusive, upper, upperInclusive) {
  return { lower, lowerInclusive, upper, upperInclusive, empty: false };
}

function intersectRanges(left, right) {
  const lower = tighterLower(left, right);
  const upper = tighterUpper(left, right);
  const order = lower.value && upper.value ? compare(lower.value, upper.value) : -1;
  const empty = order > 0 || (order === 0 && (!lower.inclusive || !upper.inclusive));
  return { lower: lower.value, lowerInclusive: lower.inclusive, upper: upper.value, upperInclusive: upper.inclusive, empty };
}

function tighterLower(left, right) {
  if (!left.lower) return { value: right.lower, inclusive: right.lowerInclusive };
  if (!right.lower) return { value: left.lower, inclusive: left.lowerInclusive };
  const order = compare(left.lower, right.lower);
  if (order > 0) return { value: left.lower, inclusive: left.lowerInclusive };
  if (order < 0) return { value: right.lower, inclusive: right.lowerInclusive };
  return { value: left.lower, inclusive: left.lowerInclusive && right.lowerInclusive };
}

function tighterUpper(left, right) {
  if (!left.upper) return { value: right.upper, inclusive: right.upperInclusive };
  if (!right.upper) return { value: left.upper, inclusive: left.upperInclusive };
  const order = compare(left.upper, right.upper);
  if (order < 0) return { value: left.upper, inclusive: left.upperInclusive };
  if (order > 0) return { value: right.upper, inclusive: right.upperInclusive };
  return { value: left.upper, inclusive: left.upperInclusive && right.upperInclusive };
}

function rangesOverlap(left, right) {
  return !intersectRanges(left, right).empty;
}

function matchesAll(value, actual) {
  const normalized = value.replace(/,/g, " ").trim();
  const hyphen = normalized.match(/^(\d+(?:\.\d+){0,2})\s+-\s+(\d+(?:\.\d+){0,2})$/);
  if (hyphen) return { supported: true, matches: compare(actual, parseVersion(hyphen[1])) >= 0 && compare(actual, parseVersion(hyphen[2])) <= 0 };
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (!terms.length) return { supported: false, matches: true };
  let supported = false;
  for (const term of terms) {
    const result = matchesTerm(term, actual);
    if (!result.supported) continue;
    supported = true;
    if (!result.matches) return { supported: true, matches: false };
  }
  return { supported, matches: true };
}

function matchesTerm(term, actual) {
  if (["*", "x", "X", "latest", "system"].includes(term)) return { supported: true, matches: true };
  const match = term.match(/^(>=|<=|~=|>|<|=|\^|~)?v?(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?.*$/);
  if (!match) return { supported: false, matches: true };
  const operator = match[1] || "=";
  const parts = [match[2], match[3], match[4]];
  const specified = parts.filter((item) => item !== undefined && !["x", "X", "*"].includes(item)).length;
  const expected = parts.map((item) => Number(/[0-9]+/.test(String(item)) ? item : 0));
  const order = compare(actual, expected);
  if (operator === ">=") return supported(order >= 0);
  if (operator === "<=") return supported(order <= 0);
  if (operator === ">") return supported(order > 0);
  if (operator === "<") return supported(order < 0);
  if (operator === "^") return supported(order >= 0 && compare(actual, caretUpper(expected, specified)) < 0);
  if (["~", "~="].includes(operator)) return supported(order >= 0 && compare(actual, compatibleUpper(operator, expected, specified)) < 0);
  return supported(actual.slice(0, Math.max(1, specified)).every((item, index) => item === expected[index]));
}

function parseVersion(value) {
  const match = String(value || "").match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : null;
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function supported(matches) {
  return { supported: true, matches };
}

function caretUpper(expected, specified) {
  if (specified === 1 || expected[0] > 0) return [expected[0] + 1, 0, 0];
  if (specified === 2 || expected[1] > 0) return [0, expected[1] + 1, 0];
  return [0, 0, expected[2] + 1];
}

function compatibleUpper(operator, expected, specified) {
  const majorCompatible = operator === "~=" ? specified <= 2 : specified === 1;
  return majorCompatible ? [expected[0] + 1, 0, 0] : [expected[0], expected[1] + 1, 0];
}
