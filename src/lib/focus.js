import { addDays, distance, isWeekend, localDate } from "./study.js";
import { emptyFocusState } from "./focus-state.js";

export const sameAnswers = (selected, answers) =>
  selected.length === answers.length &&
  new Set(selected).size === selected.length &&
  answers.every((i) => selected.includes(i));
export const focusStudyMinutes = (unit, state) =>
  (unit.familiarSubjectId || unit.subjectId) === "civil-procedure" &&
  state.settings.familiarity[unit.familiarSubjectId || unit.subjectId] === 2
    ? Math.min(unit.estimatedMinutes, 8)
    : unit.estimatedMinutes;
export const focusExamDate = (data, state) =>
  state.settings.examDate || data.campaign.examDate;
export const focusStartDate = (data, state) =>
  [data.campaign.startDate, state.settings.startDate].sort().at(-1);

export function focusProgress(unit, state, date = localDate(), examDate = "") {
  const f = state.focus || emptyFocusState();
  const sessions = f.sessions.filter((s) => s.unitId === unit.id);
  const last = sessions.at(-1);
  const failedDates = new Set([
    ...sessions.filter((s) => !s.passed).map((s) => s.date),
    ...f.attempts
      .filter((a) => a.unitId === unit.id && (!a.correct || a.hint))
      .map((a) => a.date),
  ]);
  const lastFailure = [...failedDates].sort().at(-1);
  const successful = [
    ...new Set(
      sessions
        .filter((s) => s.passed && (!lastFailure || s.date > lastFailure))
        .map((s) => s.date),
    ),
  ].sort();
  const latest = new Map(
    f.attempts.filter((a) => a.unitId === unit.id).map((a) => [a.itemId, a]),
  );
  const wrong = unit.questions.filter((q) => {
    const a = latest.get(q.id);
    return a && (!a.correct || a.hint);
  });
  const learned = Boolean(f.learned[unit.id]);
  const lastIndependent = last?.passed && !failedDates.has(last.date);
  let due = last
    ? addDays(
        last.date,
        last.passed ? [1, 2, 3][Math.min(2, successful.length - 1)] || 1 : 1,
      )
    : f.learned[unit.id];
  if (lastFailure && (!last || lastFailure >= last.date))
    due = addDays(lastFailure, 1);
  if (due && examDate) due = due < examDate ? due : addDays(examDate, -1);
  const stable =
    learned &&
    lastIndependent &&
    successful.length >= 2 &&
    !wrong.length &&
    unit.questions.every((q) => latest.has(q.id));
  return {
    learned,
    due,
    wrong,
    successful,
    stable,
    needsRepair: Boolean(
      wrong.length ||
      (last && !lastIndependent) ||
      (lastFailure && (!last || lastFailure >= last.date)),
    ),
    lastDate: last?.date,
    dueNow: learned && due <= date && last?.date !== date,
    label:
      wrong.length || (last && !lastIndependent)
        ? "待订正"
        : stable
          ? "隔日复测通过"
          : learned
            ? "已学·待复测"
            : "待学",
  };
}

export function recordFocusAnswer(
  state,
  unit,
  question,
  selected,
  hint,
  date = localDate(),
) {
  const f = state.focus || emptyFocusState();
  const answer = {
    unitId: unit.id,
    itemId: question.id,
    selected: [...selected],
    correct: sameAnswers(selected, question.answers),
    hint: Boolean(hint),
    date,
    at: new Date().toISOString(),
  };
  return { ...state, focus: { ...f, attempts: [...f.attempts, answer] } };
}

export function finishFocusSession(
  state,
  unit,
  results,
  recallQuality,
  hint,
  mode,
  date = localDate(),
) {
  const f = state.focus || emptyFocusState();
  const complete = unit.questions.every((q) =>
    results.some((a) => a.itemId === q.id),
  );
  if (!complete || !["exact", "partial", "forgot"].includes(recallQuality))
    return state;
  const passed =
    recallQuality === "exact" &&
    !hint &&
    unit.questions.every((q) =>
      results.some((a) => a.itemId === q.id && a.correct && !a.hint),
    );
  return {
    ...state,
    focus: {
      ...f,
      learned: { ...f.learned, [unit.id]: f.learned[unit.id] || date },
      sessions: [
        ...f.sessions,
        {
          unitId: unit.id,
          mode,
          date,
          passed,
          recallQuality,
          minutes: mode === "learn" ? focusStudyMinutes(unit, state) : 5,
        },
      ],
      draft: null,
    },
  };
}

export function makeFocusDay(data, state, date = localDate(), baseSpent = 0) {
  const f = state.focus || emptyFocusState();
  const examDate = focusExamDate(data, state);
  const startDate = focusStartDate(data, state);
  const budget = isWeekend(date)
    ? state.settings.weekend
    : state.settings.weekday;
  const empty = {
    date,
    budget,
    examDate,
    learn: [],
    review: [],
    newMinutes: 0,
    reviewMinutes: 0,
    spent: 0,
    reserved: 0,
    baseMinutes: 0,
    breakMinutes: 0,
    deferred: 0,
    paused: true,
  };
  if (!f.enabled || date < startDate || date >= examDate) return empty;
  const remaining = distance(date, examDate);
  const final = remaining <= 2;
  const spent = f.sessions
    .filter((s) => s.date === date)
    .reduce((n, s) => n + s.minutes, 0);
  const breakMinutes = Math.min(
    isWeekend(date) ? 30 : remaining === 1 ? 30 : 15,
    Math.max(0, budget - baseSpent - spent),
  );
  const baseMinutes = Math.min(
    Math.max(0, (isWeekend(date) ? 30 : 20) - baseSpent),
    Math.max(0, budget - baseSpent - spent - breakMinutes),
  );
  const reflectionMinutes = Math.min(
    isWeekend(date) ? 20 : 10,
    Math.max(0, budget - baseSpent - spent - breakMinutes - baseMinutes),
  );
  let available = Math.max(
    0,
    budget - baseSpent - spent - breakMinutes - baseMinutes - reflectionMinutes,
  );
  const byId = new Map(data.units.map((u) => [u.id, u]));
  const allDue = data.units
    .filter((u) => {
      const p = focusProgress(u, state, date, examDate);
      return (
        p.dueNow ||
        (final &&
          p.learned &&
          p.lastDate !== date &&
          (!p.stable || u.priority === "core"))
      );
    })
    .sort((a, b) => {
      const x = focusProgress(a, state, date, examDate),
        y = focusProgress(b, state, date, examDate);
      return (
        Number(y.needsRepair) - Number(x.needsRepair) ||
        Number(x.stable) - Number(y.stable) ||
        Number(b.priority === "core") - Number(a.priority === "core") ||
        (x.due || "").localeCompare(y.due || "")
      );
    });
  const reviewedMinutes = f.sessions
    .filter((s) => s.date === date && s.mode === "review")
    .reduce((n, s) => n + s.minutes, 0);
  const reviewCap = final
    ? available
    : Math.min(
        available,
        Math.max(0, (isWeekend(date) ? 60 : 35) - reviewedMinutes),
      );
  const review = allDue.slice(0, Math.floor(reviewCap / 5));
  const reviewMinutes = review.length * 5;
  available -= reviewMinutes;
  const preferred =
    data.campaign.days.find((d) => d.date === date)?.unitIds || [];
  const preferredUnits = preferred.map((id) => byId.get(id)).filter(Boolean);
  const earlier = data.campaign.days
    .filter((d) => d.date < date)
    .flatMap((d) => d.unitIds);
  const earlierUnits = earlier.map((id) => byId.get(id)).filter(Boolean);
  const candidates = [
    ...new Set([
      ...preferredUnits.filter((u) => u.priority === "core").map((u) => u.id),
      ...earlierUnits.filter((u) => u.priority === "core").map((u) => u.id),
      ...data.units.filter((u) => u.priority === "core").map((u) => u.id),
      ...preferred,
      ...earlier,
      ...data.units.map((u) => u.id),
    ]),
  ]
    .map((id) => byId.get(id))
    .filter((u) => u && !f.learned[u.id]);
  const learn = [];
  if (!final)
    for (const unit of candidates) {
      if (focusStudyMinutes(unit, state) <= available) {
        learn.push(unit);
        available -= focusStudyMinutes(unit, state);
      }
    }
  const newMinutes = learn.reduce((n, u) => n + focusStudyMinutes(u, state), 0);
  return {
    ...empty,
    paused: false,
    learn,
    review,
    newMinutes,
    reviewMinutes,
    spent,
    baseMinutes,
    breakMinutes,
    reflectionMinutes,
    reserved: spent + newMinutes + reviewMinutes,
    deferred: allDue.length - review.length,
    remaining,
  };
}

export function projectFocusPlan(
  data,
  state,
  today = localDate(),
  baseSpent = 0,
) {
  const projected = structuredClone(state);
  projected.focus = projected.focus || emptyFocusState();
  const start = focusStartDate(data, state),
    exam = focusExamDate(data, state);
  const days = [];
  for (let date = start; date < exam; date = addDays(date, 1)) {
    if (days.length >= 60) break;
    const plan = makeFocusDay(
      data,
      projected,
      date,
      date === today ? baseSpent : 0,
    );
    days.push({ ...plan, past: date < today });
    if (date < today) continue;
    for (const u of [...plan.learn, ...plan.review]) {
      projected.focus.learned[u.id] = projected.focus.learned[u.id] || date;
      for (const q of u.questions)
        projected.focus.attempts.push({
          unitId: u.id,
          itemId: q.id,
          selected: q.answers,
          correct: true,
          hint: false,
          date,
          at: `${date}T12:00:00.000Z`,
        });
      projected.focus.sessions.push({
        unitId: u.id,
        date,
        mode: plan.learn.includes(u) ? "learn" : "review",
        passed: true,
        recallQuality: "exact",
        minutes: 0,
      });
    }
  }
  return days;
}
