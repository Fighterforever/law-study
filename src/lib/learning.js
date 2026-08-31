import { localDate, passed } from "./study.js";

// Question IDs change when a rule being tested changes. Keep history, but ask the new question.
export function reconcileCurriculum(lessons, state, today = localDate()) {
  const records = { ...state.records };
  for (const lesson of lessons) {
    const old = records[lesson.id];
    if (!old?.completedDate) continue;
    const sessions = state.sessions.filter((s) => s.lessonId === lesson.id);
    const diagnosticOnly =
      sessions.some((s) => s.mode === "diagnostic") &&
      !sessions.some((s) => s.mode === "lesson");
    const answered = new Set(
      state.attempts
        .filter((a) => a.lessonId === lesson.id)
        .map((a) => a.questionId),
    );
    const missing = lesson.questions.filter((q) => !answered.has(q.id));
    if (!diagnosticOnly && !missing.length) continue;
    records[lesson.id] = {
      ...old,
      lastPassed: false,
      stage: 0,
      due: today,
      completedDate: diagnosticOnly ? null : old.completedDate,
      unresolved: [
        ...new Set([...(old.unresolved || []), ...missing.map((q) => q.id)]),
      ],
      diagnosticSections: (old.diagnosticSections || []).filter(
        (i) => !missing.some((q) => q.sectionIndexes?.includes(i)),
      ),
    };
  }
  return { ...state, records };
}

export const mistakeKinds = [
  ["concept", "概念还没弄清"],
  ["condition", "把条件混在一起了"],
  ["exception", "漏掉了例外"],
  ["subject", "记错主体或时间"],
  ["legacy", "和以前记的规则冲突"],
  ["reading", "读题时漏了信息"],
];

export function latestAnswers(lesson, state) {
  const ids = new Set(lesson.questions.map((q) => q.id));
  const latest = new Map();
  for (const a of state.attempts)
    if (a.lessonId === lesson.id && ids.has(a.questionId))
      latest.set(a.questionId, a);
  return latest;
}

export function learningEvidence(lesson, state) {
  const answers = latestAnswers(lesson, state);
  const checked = lesson.questions.filter((q) =>
    passed(answers.get(q.id) || {}),
  );
  return {
    checked: checked.length,
    total: lesson.questions.length,
    untested: lesson.questions.filter((q) => !answers.has(q.id)),
    unresolved: lesson.questions.filter(
      (q) => answers.has(q.id) && !passed(answers.get(q.id)),
    ),
  };
}

export function selectReviewQuestion(lesson, state) {
  const answers = latestAnswers(lesson, state);
  const unresolved = lesson.questions.filter((q) =>
    (state.records[lesson.id]?.unresolved || []).includes(q.id),
  );
  if (unresolved.length)
    return unresolved.sort((a, b) => {
      const aa = answers.get(a.id),
        bb = answers.get(b.id);
      return (
        Number(bb?.confidence === "sure") - Number(aa?.confidence === "sure") ||
        (aa?.date || "").localeCompare(bb?.date || "")
      );
    })[0];
  const unseen = lesson.questions.find((q) => !answers.has(q.id));
  if (unseen) return unseen;
  return [...lesson.questions].sort((a, b) =>
    (answers.get(a.id)?.at || "").localeCompare(answers.get(b.id)?.at || ""),
  )[0];
}

export function repairAdvice(lesson, state, kind) {
  const last = state.attempts
    .filter((a) => a.lessonId === lesson.id && !passed(a))
    .at(-1);
  const key = kind || last?.errorType || "concept";
  return (
    lesson.repairHints?.[key] ||
    lesson.repairHints?.concept || {
      message:
        "先回到这课的基本关系，跟着示范说一遍谁向谁主张什么，再试一道题。",
      sectionIndexes: [0],
    }
  );
}
