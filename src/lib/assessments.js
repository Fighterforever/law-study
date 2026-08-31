import { addDays, localDate, passed } from "./study.js";

// Keep assessment answers separate: these questions are not daily-course repetitions.
export function assessmentAnswer(item, result) {
  return {
    ...result,
    lessonId: item.lessonId,
    questionId: item.question.id,
    kind: item.question.kind,
    date: localDate(),
    at: new Date().toISOString(),
  };
}

export function chooseCheckup(pool, state, maxItems = 16) {
  const taught = pool.filter(
    (item) => state.records[item.lessonId]?.completedDate,
  );
  const used = new Set(state.checkups.flatMap((run) => run.itemIds));
  const pending = taught.filter((item) =>
    state.records[item.lessonId]?.checkpointUnresolved?.includes(
      item.question.id,
    ),
  );
  const fresh = taught.filter((item) => !used.has(item.question.id));
  // New material stays unseen. Repeats are explicitly described as practice in the UI.
  const selected =
    pending.length || fresh.length ? [...pending, ...fresh] : taught;
  return [...new Map(selected.map((i) => [i.question.id, i])).values()].slice(
    0,
    Math.max(0, maxItems),
  );
}

export function startCheckup(items) {
  return {
    date: localDate(),
    itemIds: items.map((i) => i.question.id),
    attempts: [],
    cursor: 0,
    completed: false,
    startedAt: new Date().toISOString(),
  };
}

export function appendAssessmentAnswer(run, answer) {
  if (run.attempts.some((a) => a.questionId === answer.questionId)) return run;
  return { ...run, attempts: [...run.attempts, answer] };
}

export function diagnosticNeedsTeaching(run) {
  return (
    run.attempts.slice(run.roundStart || 0).filter((a) => a.noIdea).length >= 2
  );
}

export function recordCheckupAnswer(state, item, result) {
  const runs = [...state.checkups];
  const run = runs.at(-1);
  if (run.attempts.some((a) => a.questionId === item.question.id)) return state;
  const answer = assessmentAnswer(item, result);
  runs[runs.length - 1] = appendAssessmentAnswer(run, answer);
  const old = state.records[item.lessonId];
  const unresolved = new Set(old.checkpointUnresolved || []);
  const sameDayFailure = state.checkups.some((r) =>
    r.attempts.some(
      (a) =>
        a.questionId === item.question.id &&
        a.date === answer.date &&
        !passed(a),
    ),
  );
  if (!passed(answer)) unresolved.add(item.question.id);
  else if (!sameDayFailure) unresolved.delete(item.question.id);
  const record = { ...old, checkpointUnresolved: [...unresolved] };
  if (unresolved.size) {
    record.lastPassed = false;
    record.due = addDays(answer.date, 1);
  }
  return {
    ...state,
    checkups: runs,
    records: { ...state.records, [item.lessonId]: record },
  };
}

export function assessmentReport(items, attempts) {
  const answers = new Map(attempts.map((a) => [a.questionId, a]));
  const answered = items.filter((i) => answers.has(i.question.id));
  return {
    total: items.length,
    answered: answered.length,
    clear: answered.filter((i) => passed(answers.get(i.question.id))),
    repair: answered.filter((i) => !passed(answers.get(i.question.id))),
    untouched: items.filter((i) => !answers.has(i.question.id)),
  };
}
