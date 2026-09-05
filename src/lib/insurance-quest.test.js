import test from "node:test";
import assert from "node:assert/strict";
import {
  insuranceBase,
  insuranceDecision,
  insuranceComparisons,
  insuranceFields,
  newInsuranceQuest,
  changeInsuranceFacts,
  revealInsurance,
  startInsuranceQuiz,
  submitInsuranceQuiz,
  nextInsuranceQuiz,
  insuranceQuestions,
  insuranceQuestionsFor,
  insuranceDelayedQuestions,
  insuranceReviewDue,
  validInsuranceQuest,
} from "./insurance-quest.js";
import { initialState, validDate, encodeState, decodeState } from "./study.js";

test("故意与重大过失控制退费；重大过失另需事故严重影响，解除与拒赔不能合并", () => {
  assert.equal(insuranceDecision(insuranceBase).code, "deny-keep");
  assert.equal(
    insuranceDecision({ ...insuranceBase, serious: false }).code,
    "deny-keep",
  );
  assert.equal(
    insuranceDecision({ ...insuranceBase, fault: "gross" }).code,
    "deny-refund",
  );
  assert.equal(
    insuranceDecision({ ...insuranceBase, fault: "gross", serious: false })
      .code,
    "terminate-pay",
  );
});
test("解除权的前提与两个期间各自可以挡住拒赔路径", () => {
  for (const patch of [
    { material: false },
    { knownAtStart: true },
    { knownDays: 31 },
    { months: 25 },
  ])
    for (const fault of ["intentional", "gross"])
      assert.equal(
        insuranceDecision({ ...insuranceBase, ...patch, fault }).code,
        "keep-pay",
      );
  assert.equal(
    insuranceDecision({ ...insuranceBase, knownDays: 30, months: 24 }).code,
    "deny-keep",
  );
  assert.equal(
    insuranceDecision({ ...insuranceBase, knownDays: 31, months: 25 }).reasons
      .length,
    2,
  );
});
test("预设对照每组仅改变一个事实；自定义变化撤去答案且保留此前尝试", () => {
  for (const pair of insuranceComparisons)
    assert.equal(
      insuranceFields.filter(({ key }) => pair.before[key] !== pair.after[key])
        .length,
      1,
    );
  let q = newInsuranceQuest();
  q.prediction = "deny-keep";
  q = revealInsurance(q);
  assert.equal(q.attempts[0].correct, false);
  assert.equal(revealInsurance(q).attempts.length, 1);
  q = changeInsuranceFacts(q, { fault: "intentional" });
  assert.equal(q.revealed, false);
  assert.equal(q.prediction, "");
  assert.equal(q.attempts.length, 1);
});
test("闭卷多选漏项不通过、重复提交不改首次结果；完成后历史仅记一次", () => {
  let q = startInsuranceQuiz(newInsuranceQuest(), () => 0.3);
  q = submitInsuranceQuiz({ ...q, selected: [0] });
  assert.equal(q.results[0].correct, false);
  assert.deepEqual(
    submitInsuranceQuiz({ ...q, selected: [0, 2] }).results,
    q.results,
  );
  for (let i = 1; i < 3; i++) {
    q = nextInsuranceQuiz(q, "2026-09-05");
    q = submitInsuranceQuiz({ ...q, selected: insuranceQuestions[i].answers });
  }
  q = nextInsuranceQuiz(q, "2026-09-05");
  assert.equal(q.history[0].correct, 2);
  assert.equal(q.phase, "summary");
  assert.equal(nextInsuranceQuiz(q, "2026-09-05").history.length, 1);
  assert.equal(validInsuranceQuest(q, validDate), true);
  const state = initialState("2026-09-05");
  state.focus.insuranceQuest = q;
  assert.deepEqual(decodeState(encodeState(state)).focus.insuranceQuest, q);
  assert.equal(validInsuranceQuest({ ...q, history: [] }, validDate), false);
});
test("旧备份补齐保险草稿，新边界拒绝重复选项、非法事实或残缺总结", () => {
  const s = initialState("2026-09-05");
  delete s.focus.insuranceQuest;
  assert.equal(decodeState(encodeState(s)).focus.insuranceQuest, null);
  const q = newInsuranceQuest();
  assert.equal(validInsuranceQuest(q, validDate), true);
  for (const bad of [
    { ...q, order: [0, 0, 1, 2] },
    { ...q, facts: { ...q.facts, knownDays: "31" } },
    { ...q, phase: "summary" },
    { ...q, revealed: true },
    { ...q, quizKind: "unknown" },
  ])
    assert.equal(validInsuranceQuest(bad, validDate), false);
});

test("隔日使用独立题组评分，原题成绩不能清除当日变式任务", () => {
  let q = newInsuranceQuest([
    { date: "2026-09-05", kind: "immediate", correct: 3 },
  ]);
  assert.equal(insuranceReviewDue(q, "2026-09-05"), false);
  assert.equal(insuranceReviewDue(q, "2026-09-06"), true);
  q.history.push({ date: "2026-09-06", kind: "immediate", correct: 3 });
  assert.equal(insuranceReviewDue(q, "2026-09-06"), true);
  q = startInsuranceQuiz(q, () => 0.4, "delayed");
  assert.equal(insuranceQuestionsFor(q), insuranceDelayedQuestions);
  assert.ok(
    insuranceDelayedQuestions.every(
      (x) => !insuranceQuestions.some((y) => x.stem === y.stem),
    ),
  );
  for (let i = 0; i < 3; i++) {
    q = submitInsuranceQuiz({
      ...q,
      selected: insuranceDelayedQuestions[i].answers,
    });
    q = nextInsuranceQuiz(q, "2026-09-06");
  }
  assert.equal(q.history.at(-1).kind, "delayed");
  assert.equal(q.history.at(-1).correct, 3);
  assert.equal(insuranceReviewDue(q, "2026-09-06"), false);
  const state = initialState("2026-09-06");
  state.focus.insuranceQuest = q;
  assert.deepEqual(decodeState(encodeState(state)).focus.insuranceQuest, q);
});

test("旧版正在作答的原题与历史在读取边界归一化，保留选项和分数", () => {
  const state = initialState("2026-09-06");
  const q = startInsuranceQuiz(newInsuranceQuest());
  delete q.quizKind;
  q.selected = [0, 2];
  q.history = [{ date: "2026-09-05", correct: 1 }];
  state.focus.insuranceQuest = q;
  const restored = decodeState(encodeState(state)).focus.insuranceQuest;
  assert.equal(restored.quizKind, "immediate");
  assert.deepEqual(restored.selected, [0, 2]);
  assert.deepEqual(restored.history, [
    { date: "2026-09-05", kind: "immediate", correct: 1 },
  ]);
  assert.equal(insuranceQuestionsFor(restored), insuranceQuestions);
});
