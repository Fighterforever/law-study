import test from "node:test";
import assert from "node:assert/strict";
import { memoryAgenda, memoryTasks, agendaQuiz } from "./memory-agenda.js";
import { initialState, encodeState, decodeState } from "./study.js";
import { newCompanyQuest, finishQuest } from "./company-quest.js";
import { newInsuranceQuest, nextInsuranceQuiz } from "./insurance-quest.js";
import { newInsuranceClocks, nextClocksQuiz } from "./insurance-clocks.js";
import {
  newJurisdictionQuest,
  nextJurisdictionQuiz,
} from "./jurisdiction-quest.js";

const today = "2026-09-05",
  exam = "2026-09-12";
function summary(id, date, correct = 3) {
  const task = memoryTasks.find((t) => t.id === id);
  const base = {
    company: () => newCompanyQuest("quiz"),
    insurance: newInsuranceQuest,
    clocks: newInsuranceClocks,
    jurisdiction: newJurisdictionQuest,
  }[id]();
  let q = agendaQuiz(task, base);
  const results = [0, 1, 2].map((i) => ({
    selected: [1],
    correct: i < correct,
  }));
  q = {
    ...q,
    quizIndex: 2,
    [id === "company" ? "quizResults" : "results"]: results,
  };
  return {
    company: finishQuest,
    insurance: nextInsuranceQuiz,
    clocks: nextClocksQuiz,
    jurisdiction: nextJurisdictionQuiz,
  }[id](q, date);
}
test("未完成闭卷优先于到期复测，到期任务优先于尚未开始的任务", () => {
  const s = initialState(today);
  s.focus.insuranceClocks = summary("clocks", "2026-09-04");
  assert.equal(memoryAgenda(s, today, exam).next.id, "clocks");
  s.focus.jurisdictionQuest = agendaQuiz(
    memoryTasks[3],
    newJurisdictionQuest(),
  );
  const agenda = memoryAgenda(s, today, exam);
  assert.equal(agenda.next.id, "jurisdiction");
  assert.equal(agenda.next.action, "resume");
  assert.equal(agenda.due, 1);
});
test("原题复核与隔日变式分别标识，同日完成原题不重复推送", () => {
  const s = initialState(today);
  s.focus.insuranceQuest = summary("insurance", "2026-09-04");
  const task = memoryAgenda(s, today, exam).tasks[1];
  assert.equal(task.status, "原题复核");
  assert.match(task.reason, /原三题/);
  s.focus.insuranceQuest.history.push({ date: today, correct: 3 });
  assert.equal(memoryAgenda(s, today, exam).tasks[1].due, false);
});
test("保留今日首次成绩，不把同日重做覆盖为首次全对", () => {
  const s = initialState(today);
  s.focus.companyQuest = summary("company", today, 1);
  let t = memoryAgenda(s, today, exam).tasks[0];
  assert.equal(t.action, "repair");
  assert.equal(t.errors.length, 2);
  s.focus.companyQuest.history.push({
    ...s.focus.companyQuest.history[0],
    correct: 3,
  });
  t = memoryAgenda(s, today, exam).tasks[0];
  assert.equal(t.firstToday, 1);
  assert.equal(t.last.correct, 3);
  assert.equal(t.status, "今天已复习");
});
test("最后两天不推荐新场景，考试日停止推荐；原入口仍完整", () => {
  const s = initialState(today);
  assert.equal(memoryAgenda(s, today, exam).next.id, "company");
  const final = memoryAgenda(s, "2026-09-10", exam);
  assert.equal(final.next, undefined);
  assert.equal(final.finalReview, true);
  assert.equal(final.tasks.length, 4);
  s.focus.insuranceClocks = summary("clocks", "2026-09-09");
  assert.equal(memoryAgenda(s, "2026-09-10", exam).next.action, "review");
  assert.equal(memoryAgenda(s, exam, exam).next, null);
});
test("从入口续题不重置答案，直接闭卷保留公司当前案卷", () => {
  const task = memoryTasks[0];
  const q = newCompanyQuest("guided");
  q.form.grace = 90;
  const quiz = agendaQuiz(task, q);
  assert.equal(quiz.form.grace, 90);
  assert.equal(quiz.mode, "guided");
  quiz.quizSelected = [1, 2];
  assert.equal(agendaQuiz(task, quiz, true), quiz);
  assert.deepEqual(q.quizSelected, []);
});
test("四个入口复用各自测验流程，衔接后备份仍可恢复", () => {
  const s = initialState(today);
  for (const task of memoryTasks) {
    const q = summary(task.id, "2026-09-04");
    s.focus[task.key] = agendaQuiz(task, q, true);
    assert.equal(s.focus[task.key].history.length, 1);
  }
  const restored = decodeState(encodeState(s));
  assert.deepEqual(restored.focus, s.focus);
  assert.equal(restored.focus.companyQuest.mode, "delayed");
  assert.equal(restored.focus.insuranceClocks.quizKind, "delayed");
  assert.equal(restored.focus.jurisdictionQuest.quizKind, "delayed");
});
