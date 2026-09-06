export function createMemorySession(palaceId, order, mode) {
  return {
    palaceId,
    order: [...order],
    mode,
    index: 0,
    results: [],
    ...stationDraft(mode),
  };
}
function stationDraft(mode) {
  return {
    phase: "recall",
    notes: "",
    hintLevel: mode === "cued" ? 1 : 0,
    checks: [],
    quality: "",
    transferOpen: false,
    transferRevealed: false,
    transferQuality: "",
  };
}
export function advanceMemorySession(session) {
  if (!session.quality || !session.transferQuality) return session;
  return session.index + 1 === session.order.length
    ? { ...session, phase: "summary" }
    : { ...session, index: session.index + 1, ...stationDraft(session.mode) };
}
export function validMemorySession(s) {
  if (s === undefined || s === null) return true;
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const id = (v) => typeof v === "string" && /^[a-z0-9-]{1,160}$/.test(v);
  const quality = (v) => ["exact", "partial", "forgot"].includes(v);
  const indices = (a) =>
    Array.isArray(a) &&
    a.length <= 20 &&
    a.every((i) => Number.isInteger(i) && i >= 0 && i < 20) &&
    new Set(a).size === a.length;
  return (
    obj(s) &&
    id(s.palaceId) &&
    ["cued", "sequence", "random", "weak"].includes(s.mode) &&
    indices(s.order) &&
    s.order.length > 0 &&
    Number.isInteger(s.index) &&
    s.index >= 0 &&
    s.index < s.order.length &&
    ["recall", "check", "summary"].includes(s.phase) &&
    typeof s.notes === "string" &&
    s.notes.length <= 10000 &&
    [0, 1, 2].includes(s.hintLevel) &&
    indices(s.checks) &&
    (s.quality === "" || quality(s.quality)) &&
    typeof s.transferOpen === "boolean" &&
    typeof s.transferRevealed === "boolean" &&
    ["", "exact", "partial"].includes(s.transferQuality) &&
    Array.isArray(s.results) &&
    s.results.length <= 20 &&
    s.results.every(
      (r) =>
        obj(r) &&
        id(r.stationId) &&
        quality(r.quality) &&
        typeof r.assisted === "boolean" &&
        ["", "exact", "partial"].includes(r.transferQuality),
    ) &&
    new Set(s.results.map((r) => r.stationId)).size === s.results.length
  );
}
