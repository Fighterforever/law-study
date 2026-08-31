import { dayFocus } from "../data/subjects.js";

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
  };
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
    typeof s.familiarity !== "object" ||
    s.familiarity === null ||
    Object.values(s.familiarity).some((v) => ![0, 1, 2].includes(v))
  )
    throw new Error("学习设置格式不正确。");
  if (
    !Array.isArray(value.attempts) ||
    value.attempts.length > 100000 ||
    !value.records ||
    Array.isArray(value.records) ||
    typeof value.records !== "object"
  )
    throw new Error("学习记录格式不正确。");
  for (const a of value.attempts) {
    if (
      !a ||
      typeof a.lessonId !== "string" ||
      typeof a.questionId !== "string" ||
      !validDate(a.date) ||
      !["recall", "application", "variation"].includes(a.kind) ||
      ![a.correct, a.reasonCorrect, a.hint, a.guessed].every(
        (v) => typeof v === "boolean",
      ) ||
      !Number.isFinite(a.seconds) ||
      a.seconds < 0 ||
      !Number.isFinite(Date.parse(a.at))
    )
      throw new Error("作答记录不完整，未导入任何内容。");
  }
  for (const [id, r] of Object.entries(value.records)) {
    if (
      !/^[a-z0-9-]+$/.test(id) ||
      !r ||
      !Array.isArray(r.successDays) ||
      !r.successDays.every(validDate) ||
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
      r.unresolved &&
      (!Array.isArray(r.unresolved) ||
        r.unresolved.some((id) => typeof id !== "string"))
    )
      throw new Error("待复核题目格式不正确。");
  }
  if (
    value.cursor &&
    (typeof value.cursor.id !== "string" ||
      !Number.isInteger(value.cursor.step) ||
      value.cursor.step < 0 ||
      value.cursor.step > 3)
  )
    throw new Error("课堂位置格式不正确。");
  if (
    value.reviewDays &&
    (typeof value.reviewDays !== "object" ||
      Array.isArray(value.reviewDays) ||
      Object.entries(value.reviewDays).some(
        ([date, ids]) =>
          !validDate(date) ||
          !Array.isArray(ids) ||
          ids.some((id) => typeof id !== "string"),
      ))
  )
    throw new Error("复习日期格式不正确。");
  if (
    value.sessions &&
    (!Array.isArray(value.sessions) ||
      value.sessions.some(
        (s) =>
          !validDate(s.date) ||
          typeof s.lessonId !== "string" ||
          !["lesson", "diagnostic", "review"].includes(s.mode) ||
          !Number.isFinite(s.minutes) ||
          s.minutes < 0,
      ))
  )
    throw new Error("学习时段记录格式不正确。");
  return {
    ...value,
    sessions: value.sessions || [],
    reviewDays: value.reviewDays || {},
  };
}
export const encodeState = (s) => JSON.stringify(s, null, 2);
export function decodeState(text) {
  if (text.length > 15_000_000) throw new Error("备份超过15MB，请确认文件。");
  return validateState(JSON.parse(text));
}
export const passed = (a) =>
  a.correct && a.reasonCorrect && !a.hint && !a.guessed;
export function recordAttempt(state, lessonId, q, result, date = localDate()) {
  const attempt = {
    lessonId,
    questionId: q.id,
    kind: q.kind,
    date,
    at: new Date().toISOString(),
    ...result,
  };
  let records = state.records;
  if (!passed(attempt)) {
    const old = records[lessonId] || { successDays: [], stage: 0 };
    records = {
      ...records,
      [lessonId]: {
        ...old,
        lastPassed: false,
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
) {
  const old = state.records[lesson.id] || { successDays: [], stage: 0 };
  const active = attempts.filter((a) =>
    lesson.questions.some((q) => q.id === a.questionId),
  );
  // Credit the answer date, not a later click on “finish”.
  const answerDates = active.map((a) => a.date).filter(validDate);
  if (answerDates.length) date = [...answerDates].sort().at(-1);
  const oneDay = answerDates.every((d) => d === date);
  const ok = active.length > 0 && active.every(passed) && oneDay;
  const variation = active.some((a) => a.kind === "variation" && passed(a));
  // A repeat on the same calendar day is practice, never another spaced success.
  const fresh = ok && !old.successDays.includes(date);
  const successDays = fresh ? [...old.successDays, date] : old.successDays;
  const stage = ok ? Math.min(3, (old.stage || 0) + (fresh ? 1 : 0)) : 0;
  const due =
    ok && !fresh && old.due
      ? old.due
      : addDays(date, ok ? [1, 1, 3, 7][stage] : 1);
  const unresolved = new Set(
    (old.unresolved || []).filter((id) =>
      lesson.questions.some((q) => q.id === id),
    ),
  );
  for (const a of active) {
    if (passed(a)) unresolved.delete(a.questionId);
    else unresolved.add(a.questionId);
  }
  const r = {
    ...old,
    successDays,
    stage,
    due: unresolved.size ? addDays(date, 1) : due,
    unresolved: [...unresolved],
    lastDate: date,
    completedDate:
      old.completedDate ||
      (mode === "lesson" || (mode === "diagnostic" && ok) ? date : null),
    variation: old.variation || variation,
    lastPassed: ok,
    failures: (old.failures || 0) + (ok ? 0 : 1),
  };
  const minutes =
    mode === "lesson"
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
    record.lastPassed &&
    !record.unresolved?.length &&
    new Set(record.successDays).size >= 2 &&
    record.variation
  )
    return "初步稳固";
  return record.completedDate ? "待复习" : "学习中";
}
export function dueLessons(lessons, state, date = localDate()) {
  return lessons
    .filter(
      (l) =>
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
export function makeDay(lessons, state, date = localDate()) {
  const day = distance(state.settings.startDate, date) + 1;
  const weekend = isWeekend(date),
    budget = weekend ? state.settings.weekend : state.settings.weekday;
  if (day < 1 || (state.settings.examDate && date > state.settings.examDate))
    return {
      day,
      budget,
      review: [],
      tasks: [],
      reviewTime: 0,
      breakTime: 0,
      reflection: 0,
      total: 0,
      paused: true,
    };
  const cap = weekend ? 40 : 20;
  const doneReview = (state.reviewDays[date] || [])
    .map((id) => lessons.find((l) => l.id === id))
    .filter(Boolean);
  let reviewTime = doneReview.reduce(
    (t, l) => t + reviewMinutes(state, l.id),
    0,
  );
  const review = [...doneReview];
  for (const l of dueLessons(lessons, state, date)) {
    const m = reviewMinutes(state, l.id);
    if (reviewTime + m <= cap) {
      review.push(l);
      reviewTime += m;
    }
  }
  const completedToday = lessons.filter(
    (l) => state.records[l.id]?.completedDate === date,
  );
  const completedTime = completedToday.reduce((t, l) => t + l.minutes, 0);
  const sessionTime = (state.sessions || [])
    .filter((s) => s.date === date && s.mode !== "review")
    .reduce((t, s) => t + s.minutes, 0);
  const spentTime = Math.max(completedTime, sessionTime);
  const extraTime = Math.max(0, spentTime - completedTime);
  const breakTime = weekend ? 30 : 10,
    reflection = 20;
  let available = budget - reviewTime - breakTime - reflection - spentTime;
  const tasks = [...completedToday];
  const maxNew = day >= 14 ? 0 : day >= 12 ? 2 : weekend ? 6 : 4;
  const focus = dayFocus[Math.min(13, day - 1)];
  const seen = new Set(
    Object.entries(state.records)
      .filter(([, r]) => r.completedDate)
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
    .filter((l) => !seen.has(l.id))
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
  return {
    day,
    budget,
    review,
    tasks,
    reviewTime,
    breakTime,
    reflection,
    extraTime,
    total:
      reviewTime +
      breakTime +
      reflection +
      extraTime +
      tasks.reduce((t, l) => t + l.minutes, 0),
    paused: false,
  };
}
export function projectPlan(lessons, state) {
  let projected = structuredClone(state);
  const today = localDate();
  return Array.from({ length: 14 }, (_, i) => {
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
  });
}
