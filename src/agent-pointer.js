export const markerBegin = "<!-- aienvmap:begin -->";
export const markerEnd = "<!-- aienvmap:end -->";

export function hasAgentPointer(value = "") {
  const text = String(value);
  const start = text.indexOf(markerBegin);
  const end = text.indexOf(markerEnd);
  return start >= 0
    && end > start
    && text.indexOf(markerBegin, start + markerBegin.length) < 0
    && text.indexOf(markerEnd, end + markerEnd.length) < 0;
}
