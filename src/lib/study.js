import { dayFocus } from "../data/subjects.js";
import checkpoints from "../data/checkpoints.json" with { type: "json" };
import { emptyFocusState, validateFocusState } from "./focus-state.js";

export const STATE_VERSION = 1;
export const STORAGE_KEY = "fa-xi-study";
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00`);
  return Number.isFinite(d.getTime()) && localDate(d) === s;
}
export function addDays(s, n) {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function distance(a, b) {
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000,
  );
}
export const isWeekend = (s) =>
  [0, 6].includes(new Date(`${s}T12:00:00`).getDay());
export function studyPhase(settings, date = localDate()) {
  const elapsed = distance(settings.startDate, date) + 1;
  const available = settings.examDate
    ? Math.max(0, distance(settings.startDate, settings.examDate))
    : 14;
  const remaining = Math.max(0, available - elapsed + 1);
  return {
    elapsed,
    available,
    remaining,
    consolidation: remaining <= (settings.examDate ? 2 : 3),
    final: remaining <= 1,
  };
}
export const prerequisiteReady = (record) =>
  Boolean(
    record?.completedDate &&
    record.lastPassed !== false &&
    !record.unresolved?.length &&
    !record.checkpointUnresolved?.length,
  );
export function initialState(today = localDate()) {
  return {
    version: STATE_VERSION,
    settings: {
      startDate: today,
      examDate: "",
      weekday: 150,
      weekend: 300,
      familiarity: {},
      configured: false,
    },
    records: {},
    attempts: [],
    sessions: [],
    cursor: null,
    reviewDays: {},
    checkups: [],
    diagnostic: { attempts: [], cursor: 0 },
    focus: emptyFocusState(),
  };
}
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const validId = (value) =>
  typeof value === "string" && /^[a-z0-9-]{1,160}$/.test(value);
const optionalBoolean = (value) =>
  value === undefined || typeof value === "boolean";
const boundedInteger = (value, max) =>
  Number.isInteger(value) && value >= 0 && value <= max;
const boundedArray = (value, max, predicate) =>
  Array.isArray(value) && value.length <= max && value.every(predicate);
const uniqueArray = (value, max, predicate) =>
  boundedArray(value, max, predicate) && new Set(value).size === value.length;
const validTimestamp = (value) =>
  typeof value === "string" &&
  value.length <= 40 &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));
const validOrder = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  uniqueArray(value, 20, (i) => boundedInteger(i, value.length - 1));
const validDraft = (d) =>
  isObject(d) &&
  validId(d.questionId) &&
  ["answer", "reason"].includes(d.phase) &&
  (d.choice === null || boundedInteger(d.choice, 19)) &&
  (d.reason === null || boundedInteger(d.reason, 19)) &&
  ["", "sure", "uncertain", "guess"].includes(d.confidence) &&
  typeof d.hint === "boolean" &&
  validOrder(d.optionOrder) &&
  validOrder(d.reasonOrder);
function validAttempt(a, partial = false) {
  return (
    isObject(a) &&
    validId(a.questionId) &&
    (partial
      ? a.lessonId === undefined || validId(a.lessonId)
      : validId(a.lessonId)) &&
    (partial ? a.date === undefined || validDate(a.date) : validDate(a.date)) &&
    (partial
      ? a.at === undefined || validTimestamp(a.at)
      : validTimestamp(a.at)) &&
    ["recall", "application", "variation"].includes(a.kind) &&
    [a.correct, a.reasonCorrect, a.hint, a.guessed].every(
      (v) => typeof v === "boolean",
    ) &&
    Number.isFinite(a.seconds) &&
    a.seconds >= 0 &&
    optionalBoolean(a.noIdea) &&
    (!a.noIdea || (!a.correct && !a.reasonCorrect)) &&
    (a.choice === undefined || boundedInteger(a.choice, 19)) &&
    (a.reason === undefined || boundedInteger(a.reason, 19)) &&
    (a.confidence === undefined ||
      ["sure", "uncertain", "guess"].includes(a.confidence)) &&
    (a.errorType === undefined ||
      (typeof a.errorType === "string" && a.errorType.length <= 200)) &&
    [a.optionOrder, a.reasonOrder].every(
      (v) => v === undefined || validOrder(v),
    )
  );
}
export function validateState(value) {
  if (!value || value.version !== STATE_VERSION)
    throw new Error("备份版本不受支持，请使用本网站导出的记录。");
  const s = value.settings;
  if (
    !s ||
    !validDate(s.startDate) ||
    (s.examDate && !validDate(s.examDate)) ||
    ![120, 150, 180].includes(s.weekday) ||
    ![180, 240, 300, 360].includes(s.weekend) ||
    !isObject(s.familiarity) ||
    Object.keys(s.familiarity).length > 100 ||
    !Object.keys(s.familiarity).every(validId) ||
    !optionalBoolean(s.configured) ||
    (s.examDate && s.examDate < s.startDate) ||
    Object.values(s.familiarity).some((v) => ![0, 1, 2].includes(v))
  )
    throw new Error("学习设置格式不正确。");
  if (
    !Array.isArray(value.attempts) ||
    value.attempts.length > 100000 ||
    !isObject(value.records) ||
    Object.keys(value.records).length > 10000
  )
    throw new Error("学习记录格式不正确。");
  for (const a of value.attempts) {
    if (!validAttempt(a)) throw new Error("作答记录不完整，未导入任何内容。");
  }
  for (const [id, r] of Object.entries(value.records)) {
    if (
      !validId(id) ||
      !isObject(r) ||
      !boundedArray(r.successDays, 10000, validDate) ||
      (r.due && !validDate(r.due)) ||
      (r.completedDate && !validDate(r.completedDate)) ||
      !Number.isInteger(r.stage) ||
      r.stage < 0 ||
      r.stage > 3
    )
      throw new Error("单元记录格式不正确。");
    if (
      new Set(r.successDays).size !== r.successDays.length ||
      ["variation", "lastPassed"].some(
        (k) => r[k] !== undefined && typeof r[k] !== "boolean",
      )
    )
      throw new Error("通过日期重复或掌握状态格式不正确。");
    if (
      [r.unresolved, r.checkpointUnresolved].some(
        (v) => v !== undefined && !uniqueArray(v, 1000, validId),
      )
    )
      throw new Error("待复核题目格式不正确。");
    if (
      (r.diagnosticSections !== undefined &&
        !uniqueArray(r.diagnosticSections, 1000, (n) =>
          boundedInteger(n, 999),
        )) ||
      (r.retryDays !== undefined &&
        !uniqueArray(r.retryDays, 10000, validDate)) ||
      (r.lastDate !== undefined && !validDate(r.lastDate)) ||
      (r.failures !== undefined && !boundedInteger(r.failures, 100000))
    )
      throw new Error("诊断段落或复习日期格式不正确。");
  }
  if (
    value.cursor &&
    (!isObject(value.cursor) ||
      !validId(value.cursor.id) ||
      !Number.isInteger(value.cursor.step) ||
      value.cursor.step < 0 ||
      value.cursor.step > 3)
  )
    throw new Error("课堂位置格式不正确。");
  if (value.cursor) {
    const c = value.cursor;
    if (
      (c.qIndex !== undefined && !boundedInteger(c.qIndex, 999)) ||
      (c.session !== undefined &&
        !boundedArray(c.session, 1000, (a) => validAttempt(a, true))) ||
      ![c.diagnostic, c.checkDone, c.done, c.assisted].every(optionalBoolean) ||
      (c.draft != null && !validDraft(c.draft)) ||
      (c.mode !== undefined && !["lesson", "review"].includes(c.mode)) ||
      (c.questionId !== undefined && !validId(c.questionId)) ||
      (c.result != null && !validAttempt(c.result, true)) ||
      (c.mode === "review" &&
        (!validId(c.questionId) ||
          (c.result && c.result.questionId !== c.questionId)))
    )
      throw new Error("保存的题目位置或答案格式不正确。");
  }
  if (
    value.reviewDays &&
    (!isObject(value.reviewDays) ||
      Object.keys(value.reviewDays).length > 10000 ||
      Object.entries(value.reviewDays).some(
        ([date, ids]) => !validDate(date) || !uniqueArray(ids, 10000, validId),
      ))
  )
    throw new Error("复习日期格式不正确。");
  if (
    value.sessions &&
    (!Array.isArray(value.sessions) ||
      value.sessions.length > 100000 ||
      value.sessions.some(
        (s) =>
          !isObject(s) ||
          !validDate(s.date) ||
          !validId(s.lessonId) ||
          !["lesson", "diagnostic", "review"].includes(s.mode) ||
          !Number.isFinite(s.minutes) ||
          s.minutes < 0 ||
          s.minutes > 1440,
      ))
  )
    throw new Error("学习时段记录格式不正确。");
  if (value.diagnostic !== undefined) {
    const d = value.diagnostic;
    if (
      !isObject(d) ||
      !boundedArray(d.attempts, 1000, (a) => validAttempt(a)) ||
      !boundedInteger(d.cursor, 999) ||
      !optionalBoolean(d.completed) ||
      !optionalBoolean(d.stopped) ||
      (d.roundStart !== undefined &&
        !boundedInteger(d.roundStart, d.attempts.length)) ||
      (d.draft != null && !validDraft(d.draft))
    )
      throw new Error("综合诊断记录格式不正确。");
  }
  if (
    value.checkups !== undefined &&
    !boundedArray(
      value.checkups,
      1000,
      (r) =>
        isObject(r) &&
        validDate(r.date) &&
        uniqueArray(r.itemIds, 1000, validId) &&
        boundedArray(
          r.attempts,
          1000,
          (a) => validAttempt(a) && r.itemIds.includes(a.questionId),
        ) &&
        new Set(r.attempts.map((a) => a.questionId)).size ===
          r.attempts.length &&
        boundedInteger(r.cursor, Math.max(0, r.itemIds.length - 1)) &&
        typeof r.completed === "boolean" &&
        validTimestamp(r.startedAt) &&
        (r.finishedAt === undefined || validTimestamp(r.finishedAt)) &&
        (r.draft == null || validDraft(r.draft)),
    )
  )
    throw new Error("保留题复核记录格式不正确。");
  return {
    ...value,
    sessions: value.sessions || [],
    reviewDays: value.reviewDays || {},
    checkups: value.checkups || [],
    diagnostic: value.diagnostic || { attempts: [], cursor: 0 },
    focus: validateFocusState(value.focus, validDate),
  };
}
export const encodeState = (s) => JSON.stringify(s, null, 2);
export function decodeState(text) {
  if (text.length > 15_000_000) throw new Error("备份超过15MB，请确认文件。");
  return validateState(JSON.parse(text));
}
export const passed = (a) =>
  Boolean(a?.correct && a.reasonCorrect && !a.hint && !a.guessed && !a.noIdea);
export function recordAttempt(state, lessonId, q, result, date = localDate()) {
  date = validDate(result.date) ? result.date : date;
  const attempt = {
    ...result,
    lessonId,
    questionId: q.id,
    kind: q.kind,
    date,
    at: new Date().toISOString(),
  };
  let records = state.records;
  if (!passed(attempt)) {
    const old = records[lessonId] || { successDays: [], stage: 0 };
    records = {
      ...records,
      [lessonId]: {
        ...old,
        lastPassed: false,
        stage: 0,
        successDays: old.successDays.filter((d) => d !== date),
        retryDays: [...new Set([...(old.retryDays || []), date])],
        diagnosticSections: (old.diagnosticSections || []).filter(
          (i) => !q.sectionIndexes?.includes(i),
        ),
        due: addDays(attempt.date, 1),
        unresolved: [...new Set([...(old.unresolved || []), q.id])],
      },
    };
  }
  return { ...state, records, attempts: [...state.attempts, attempt] };
}
export function finishSession(
  state,
  lesson,
  attempts,
  date = localDate(),
  mode = "lesson",
  minutesOverride,
) {
  const old = state.records[lesson.id] || { successDays: [], stage: 0 };
  const active = attempts.filter(
    (a) =>
      a &&
      lesson.questions.some((q) => q.id === a.questionId && q.kind === a.kind),
  );
  // Credit the answer date, not a later click on “finish”.
  const answerDates = active.map((a) => a.date).filter(validDate);
  if (answerDates.length) date = [...answerDates].sort().at(-1);
  const oneDay = answerDates.every((d) => d === date);
  const answersCorrect = active.length > 0 && active.every(passed) && oneDay;
  const seenToday = state.attempts.filter(
    (a) => a.lessonId === lesson.id && a.date === date,
  );
  const failedToday = new Set(
    seenToday.filter((a) => !passed(a)).map((a) => a.questionId),
  );
  const exposedToday = new Set(
    (state.diagnostic?.attempts || [])
      .filter((a) => a.lessonId === lesson.id && a.date === date)
      .map((a) => a.questionId),
  );
  for (const a of seenToday) {
    if (seenToday.filter((b) => b.questionId === a.questionId).length > 1)
      exposedToday.add(a.questionId);
  }
  for (const a of active) if (!passed(a)) failedToday.add(a.questionId);
  const retryDays = new Set(old.retryDays || []);
  for (const a of active)
    if (!passed(a)) retryDays.add(validDate(a.date) ? a.date : date);
  if (
    failedToday.size ||
    (!old.successDays.includes(date) &&
      active.some((a) => exposedToday.has(a.questionId)))
  )
    retryDays.add(date);
  const unresolved = new Set(
    (old.unresolved || []).filter((id) =>
      lesson.questions.some((q) => q.id === id),
    ),
  );
  for (const a of active) {
    if (
      passed(a) &&
      !failedToday.has(a.questionId) &&
      !(
        (old.unresolved || []).includes(a.questionId) &&
        (old.retryDays || []).includes(date)
      )
    )
      unresolved.delete(a.questionId);
    else unresolved.add(a.questionId);
  }
  const completedDate =
    old.completedDate ||
    (mode === "lesson" &&
    lesson.questions.every((q) => active.some((a) => a.questionId === q.id))
      ? date
      : null);
  // Only taught content can earn a retention day. Feedback-assisted repeats remain practice.
  const ok =
    mode !== "diagnostic" &&
    Boolean(completedDate) &&
    answersCorrect &&
    !unresolved.size &&
    !old.checkpointUnresolved?.length &&
    !retryDays.has(date);
  const previousDays = old.successDays.filter((d) => !retryDays.has(d));
  const fresh = ok && !previousDays.includes(date);
  const successDays = fresh ? [...previousDays, date] : previousDays;
  const stage =
    mode === "diagnostic"
      ? old.stage || 0
      : ok
        ? Math.min(3, (old.stage || 0) + (fresh ? 1 : 0))
        : 0;
  const due =
    ok && !fresh && old.due
      ? old.due
      : addDays(date, ok ? [1, 1, 3, 7][stage] : 1);
  const diagnosticSections = new Set(old.diagnosticSections || []);
  for (const q of lesson.questions) {
    if (active.some((a) => a.questionId === q.id && !passed(a)))
      for (const i of q.sectionIndexes || []) diagnosticSections.delete(i);
  }
  if (mode === "diagnostic") {
    for (let i = 0; i < (lesson.sections?.length || 0); i++) {
      const related = lesson.questions.filter((q) =>
        q.sectionIndexes?.includes(i),
      );
      if (
        related.length &&
        related.every(
          (q) =>
            active.some((a) => a.questionId === q.id && passed(a)) &&
            !failedToday.has(q.id) &&
            !exposedToday.has(q.id),
        )
      )
        diagnosticSections.add(i);
    }
  }
  const r = {
    ...old,
    successDays,
    stage,
    due: unresolved.size ? addDays(date, 1) : due,
    unresolved: [...unresolved],
    retryDays: [...retryDays],
    diagnosticSections: [...diagnosticSections].sort((a, b) => a - b),
    lastDate: date,
    completedDate,
    variation: Boolean(
      old.variation || (ok && active.some((a) => a.kind === "variation")),
    ),
    lastPassed:
      mode === "diagnostic"
        ? Boolean(old.lastPassed && answersCorrect && !unresolved.size)
        : ok,
    failures: (old.failures || 0) + (active.some((a) => !passed(a)) ? 1 : 0),
  };
  const minutes =
    minutesOverride !== undefined
      ? minutesOverride
      : mode === "lesson"
        ? lesson.minutes
        : Math.min(
            lesson.minutes,
            Math.max(
              2,
              Math.ceil(active.reduce((t, a) => t + (a.seconds || 0), 0) / 60) +
                1,
            ),
          );
  return {
    ...state,
    sessions: [
      ...(state.sessions || []),
      { lessonId: lesson.id, date, mode, minutes },
    ],
    records: { ...state.records, [lesson.id]: r },
    reviewDays:
      mode === "review"
        ? {
            ...state.reviewDays,
            [date]: [
              ...new Set([...(state.reviewDays[date] || []), lesson.id]),
            ],
          }
        : state.reviewDays,
    cursor: mode === "review" ? state.cursor : null,
  };
}
export function statusOf(record) {
  if (!record) return "未学";
  if (
    record.completedDate &&
    record.lastPassed &&
    !record.unresolved?.length &&
    !record.checkpointUnresolved?.length &&
    new Set(record.successDays).size >= 2 &&
    record.variation
  )
    return "初步稳固";
  return record.completedDate ? "待复习" : "学习中";
}
export function dueLessons(lessons, state, date = localDate()) {
  const due = lessons
    .filter(
      (l) =>
        state.records[l.id]?.completedDate &&
        state.records[l.id]?.due <= date &&
        !(state.reviewDays[date] || []).includes(l.id),
    )
    .sort((a, b) => {
      const ar = state.records[a.id],
        br = state.records[b.id];
      return (
        ar.due.localeCompare(br.due) || (br.failures || 0) - (ar.failures || 0)
      );
    });
  const risk = (l) => {
    const recent = state.attempts.filter((a) => a.lessonId === l.id).slice(-3);
    return (
      (lessons.some((x) => x.prerequisites.includes(l.id)) &&
      !prerequisiteReady(state.records[l.id])
        ? 6
        : 0) +
      (recent.some((a) => !passed(a) && a.confidence === "sure") ? 4 : 0) +
      (recent.filter((a) => !passed(a)).length >= 2 ? 3 : 0)
    );
  };
  // Reserve a place for the oldest ordinary item; difficult rules cannot monopolize the queue.
  const ranked = [...due].sort(
    (a, b) =>
      risk(b) - risk(a) ||
      state.records[a.id].due.localeCompare(state.records[b.id].due),
  );
  if (due.length > 2) {
    const oldest = due[0];
    const i = ranked.indexOf(oldest);
    ranked.splice(i, 1);
    ranked.splice(Math.min(2, ranked.length), 0, oldest);
  }
  return ranked;
}
export function reviewMinutes(state, lessonId) {
  const items = state.attempts.filter((a) => a.lessonId === lessonId).slice(-6);
  return items.length
    ? Math.max(
        3,
        Math.min(
          7,
          Math.ceil(
            items.reduce((t, a) => t + a.seconds, 0) / items.length / 60,
          ) + 2,
        ),
      )
    : 4;
}
export function makeDay(
  lessons,
  state,
  date = localDate(),
  reservedMinutes = 0,
) {
  const day = distance(state.settings.startDate, date) + 1;
  const weekend = isWeekend(date),
    budget = weekend ? state.settings.weekend : state.settings.weekday;
  if (day < 1 || (state.settings.examDate && date >= state.settings.examDate))
    return {
      day,
      budget,
      review: [],
      tasks: [],
      reviewTime: 0,
      breakTime: 0,
      reflection: 0,
      extraTime: 0,
      repairs: [],
      repairTime: 0,
      checkpointTime: 0,
      spentTime: 0,
      reasons: {},
      total: 0,
      paused: true,
    };
  const sessions = (state.sessions || []).filter((s) => s.date === date);
  const completedToday = lessons.filter(
    (l) => state.records[l.id]?.completedDate === date,
  );
  const nonReview = sessions.filter((s) => s.mode !== "review");
  // Old version-1 records may have completion dates but no session ledger.
  const legacyCompletionTime = completedToday
    .filter((l) => !nonReview.some((s) => s.lessonId === l.id))
    .reduce((t, l) => t + l.minutes, 0);
  const courseTime =
    nonReview.reduce((t, s) => t + s.minutes, 0) + legacyCompletionTime;
  const globalDiagnosticTime = Math.ceil(
    (state.diagnostic?.attempts || [])
      .filter((a) => a.date === date)
      .reduce((t, a) => t + a.seconds, 0) / 60,
  );
  const doneReviewIds = new Set([
    ...(state.reviewDays[date] || []),
    ...sessions.filter((s) => s.mode === "review").map((s) => s.lessonId),
  ]);
  const doneReview = lessons.filter((l) => doneReviewIds.has(l.id));
  const reviewSpent =
    sessions
      .filter((s) => s.mode === "review")
      .reduce((t, s) => t + s.minutes, 0) +
    doneReview
      .filter(
        (l) =>
          !sessions.some((s) => s.mode === "review" && s.lessonId === l.id),
      )
      .reduce((t, l) => t + reviewMinutes(state, l.id), 0);
  const completedCheckups = (state.checkups || []).filter(
    (r) => r.completed && r.date === date,
  );
  const checkpointSpent = completedCheckups.reduce(
    (t, r) =>
      t +
      Math.min(
        30,
        Math.ceil(r.attempts.reduce((n, a) => n + a.seconds, 0) / 60),
      ),
    0,
  );
  const spentTime =
    courseTime + globalDiagnosticTime + reviewSpent + checkpointSpent;
  let available = Math.max(0, budget - spentTime - reservedMinutes);
  const breakTime = Math.min(weekend ? 30 : 15, available);
  available -= breakTime;
  const reflection = Math.min(weekend ? 20 : 10, available);
  available -= reflection;

  const repairs = [];
  for (const l of lessons.filter(
    (l) =>
      state.records[l.id]?.completedDate &&
      !prerequisiteReady(state.records[l.id]),
  )) {
    if (repairs.length >= (weekend ? 2 : 1) || available < 10) break;
    if (doneReviewIds.has(l.id) || nonReview.some((s) => s.lessonId === l.id))
      continue;
    repairs.push(l);
    available -= 10;
  }
  const repairTime = repairs.length * 10;
  const review = [...doneReview];
  let reviewTime = reviewSpent;
  const cap = weekend ? 40 : budget === 120 ? 15 : 20;
  for (const l of dueLessons(lessons, state, date)) {
    if (doneReviewIds.has(l.id) || repairs.some((r) => r.id === l.id)) continue;
    const minutes = reviewMinutes(state, l.id);
    if (reviewTime + minutes <= cap && minutes <= available) {
      review.push(l);
      reviewTime += minutes;
      available -= minutes;
    }
  }
  const phase = studyPhase(state.settings, date);
  const taught = checkpoints.some(
    (item) =>
      lessons.some((l) => l.id === item.lessonId) &&
      state.records[item.lessonId]?.completedDate,
  );
  const checkpointDue =
    taught &&
    (phase.consolidation || day === 7) &&
    completedCheckups.length === 0;
  const checkpointTime = checkpointDue ? Math.min(30, available) : 0;
  available -= checkpointTime;
  const tasks = [...completedToday];
  const maxNew =
    phase.final || (state.settings.examDate && phase.consolidation)
      ? 0
      : phase.consolidation
        ? 2
        : weekend
          ? 6
          : 4;
  const focus = dayFocus[Math.min(13, day - 1)];
  const seen = new Set(
    Object.entries(state.records)
      .filter(([, r]) => prerequisiteReady(r))
      .map(([id]) => id),
  );
  const unstartedSubject = new Set(
    lessons
      .filter(
        (l) =>
          !lessons.some((x) => x.subjectId === l.subjectId && seen.has(x.id)),
      )
      .map((l) => l.subjectId),
  );
  const candidates = lessons
    .filter((l) => !state.records[l.id]?.completedDate)
    .sort((a, b) => {
      const rank = (l) =>
        (day >= 5 && unstartedSubject.has(l.subjectId) ? -10 : 0) +
        (focus.includes(l.subjectId) ? focus.indexOf(l.subjectId) : 10) +
        (l.id === "civil-procedure-entry" ? -0.5 : 0);
      return rank(a) - rank(b);
    });
  let moved = true;
  while (moved && tasks.length < maxNew) {
    moved = false;
    for (const l of candidates) {
      if (tasks.length >= maxNew) break;
      const subjectCap =
        l.subjectId === "civil-procedure" &&
        state.settings.familiarity[l.subjectId] > 0
          ? 1
          : 2;
      if (
        seen.has(l.id) ||
        l.minutes > available ||
        tasks.filter((x) => x.subjectId === l.subjectId).length >= subjectCap ||
        !l.prerequisites.every((id) => seen.has(id))
      )
        continue;
      tasks.push(l);
      seen.add(l.id);
      available -= l.minutes;
      moved = true;
    }
  }
  const completedTime = completedToday.reduce(
    (t, l) =>
      t +
      (nonReview.some((s) => s.lessonId === l.id)
        ? nonReview
            .filter((s) => s.lessonId === l.id)
            .reduce((n, s) => n + s.minutes, 0)
        : l.minutes),
    0,
  );
  const extraTime = Math.max(
    0,
    courseTime + globalDiagnosticTime - completedTime,
  );
  return {
    day,
    budget,
    review,
    tasks,
    reviewTime,
    breakTime,
    reflection,
    extraTime,
    repairs,
    repairTime,
    checkpointTime,
    spentTime,
    reasons: Object.fromEntries(
      tasks.map((l) => [
        l.id,
        l.prerequisites.some((id) => tasks.some((t) => t.id === id))
          ? "先学好前一课，再接着处理这个问题。"
          : unstartedSubject.has(l.subjectId)
            ? "这科还没有建立学习入口，先把基本关系理清。"
            : focus.includes(l.subjectId)
              ? "衔接前几天的内容，今天继续这一小组规则。"
              : "主要任务之外，补一个还没接触过的规则。",
      ]),
    ),
    total:
      spentTime +
      reservedMinutes +
      (reviewTime - reviewSpent) +
      breakTime +
      reflection +
      repairTime +
      checkpointTime +
      tasks
        .filter((l) => !state.records[l.id]?.completedDate)
        .reduce((t, l) => t + l.minutes, 0),
    paused: false,
  };
}
export function projectPlan(lessons, state) {
  let projected = structuredClone(state);
  const today = localDate();
  return Array.from(
    { length: studyPhase(state.settings, state.settings.startDate).available },
    (_, i) => {
      const date = addDays(state.settings.startDate, i);
      if (date < today)
        return {
          date,
          past: true,
          ...makeDay([], state, date),
          tasks: lessons.filter(
            (l) => state.records[l.id]?.completedDate === date,
          ),
        };
      const plan = makeDay(lessons, projected, date);
      for (const l of plan.tasks)
        if (!projected.records[l.id]?.completedDate)
          projected.records[l.id] = {
            successDays: [date],
            stage: 1,
            completedDate: date,
            due: addDays(date, 1),
            lastPassed: true,
          };
      for (const l of plan.review) {
        if ((projected.reviewDays[date] || []).includes(l.id)) continue;
        const old = projected.records[l.id],
          stage = Math.min(3, (old.stage || 0) + 1);
        projected.records[l.id] = {
          ...old,
          stage,
          due: addDays(date, [1, 1, 3, 7][stage]),
        };
      }
      return { date, ...plan };
    },
  );
}
