import test from "node:test";
import assert from "node:assert/strict";
import {
  clockDecision,
  newInsuranceClocks,
  editInsuranceClocks,
  revealInsuranceClocks,
  clockQuestions,
  startClocksQuiz,
  submitClocksQuiz,
  nextClocksQuiz,
  clocksReviewDue,
  validInsuranceClocks,
} from "./insurance-clocks.js";
import { initialState, validDate, encodeState, decodeState } from "./study.js";

test("第43条：交足二年改变现金价值返还，保险金始终不给付", () => {
  const q = newInsuranceClocks();
  for (const paidYears of [1, 2, 3]) {
    const d = clockDecision({ ...q, paidYears });
    assert.equal(d.anchor, "premium");
    assert.equal(d.claim, "deny");
    assert.equal(d.refund, paidYears >= 2 ? "return" : "not-met");
  }
  assert.deepEqual(
    clockDecision({
      ...q,
      paidYears: 2,
      elapsedYears: 3,
      restored: false,
      incapable: true,
    }),
    clockDecision({ ...q, paidYears: 2 }),
  );
});
test("第44条：复效重新起算，返还现金价值不附加交费二年条件", () => {
  const base = { ...newInsuranceClocks(), mode: "suicide" };
  for (const restored of [true, false])
    for (const paidYears of [1, 3]) {
      const d = clockDecision({ ...base, restored, paidYears });
      assert.equal(d.anchor, restored ? "restore" : "foundation");
      assert.equal(d.claim, "deny");
      assert.equal(d.refund, "return");
      const after = clockDecision({
        ...base,
        restored,
        paidYears,
        elapsedYears: 3,
      });
      assert.equal(after.claim, "not-exempt");
      assert.equal(after.refund, "not-triggered");
    }
});
test("能力例外先于期间，未满二年也不能适用自杀免责", () => {
  for (const elapsedYears of [1, 3])
    for (const restored of [false, true]) {
      const d = clockDecision({
        ...newInsuranceClocks(),
        mode: "suicide",
        incapable: true,
        elapsedYears,
        restored,
      });
      assert.equal(d.anchor, "capacity");
      assert.equal(d.claim, "not-exempt");
      assert.equal(d.refund, "not-triggered");
    }
});
test("起点选错不能被其他后果答对抵消；改事实撤去答案，旧错误仍保留", () => {
  let q = {
    ...newInsuranceClocks(),
    anchor: "foundation",
    claim: "deny",
    refund: "not-met",
  };
  q = revealInsuranceClocks(q, "2026-09-05");
  assert.equal(q.attempts[0].correct, false);
  assert.equal(revealInsuranceClocks(q, "2026-09-05").attempts.length, 1);
  q = editInsuranceClocks(q, { paidYears: 3 });
  assert.equal(q.anchor, "");
  assert.equal(q.revealed, false);
  assert.equal(q.attempts.length, 1);
});
function completed(kind, date, history = []) {
  let q = startClocksQuiz(newInsuranceClocks(history), kind, () => 0.5);
  for (let i = 0; i < 3; i++) {
    q = submitClocksQuiz({ ...q, selected: clockQuestions[kind][i].answers });
    q = nextClocksQuiz(q, date);
  }
  return q;
}
test("多选漏项记错且不可覆盖，隔日题与即时题分别记录，同日不制造隔日完成", () => {
  let q = startClocksQuiz(newInsuranceClocks());
  q = submitClocksQuiz({ ...q, selected: [1] });
  assert.equal(q.results[0].correct, false);
  assert.equal(
    submitClocksQuiz({ ...q, selected: [1, 2] }).results[0].correct,
    false,
  );
  const a = completed("immediate", "2026-09-05");
  assert.equal(clocksReviewDue(a, "2026-09-05"), false);
  assert.equal(clocksReviewDue(a, "2026-09-06"), true);
  const b = completed("delayed", "2026-09-06", a.history);
  assert.equal(clocksReviewDue(b, "2026-09-06"), false);
  assert.equal(nextClocksQuiz(b, "2026-09-06").history.length, 2);
  assert.notEqual(
    clockQuestions.immediate[0].stem,
    clockQuestions.delayed[0].stem,
  );
});
test("旧备份兼容；时间线状态与隔日成绩恢复，残缺揭晓或总结拒绝导入", () => {
  const s = initialState("2026-09-05");
  delete s.focus.insuranceClocks;
  assert.equal(decodeState(encodeState(s)).focus.insuranceClocks, null);
  s.focus.insuranceClocks = completed("delayed", "2026-09-06");
  assert.deepEqual(
    decodeState(encodeState(s)).focus.insuranceClocks,
    s.focus.insuranceClocks,
  );
  const q = newInsuranceClocks();
  assert.ok(validInsuranceClocks(q, validDate));
  for (const bad of [
    {
      ...q,
      revealed: true,
      anchor: "premium",
      claim: "deny",
      refund: "not-met",
    },
    { ...q, order: [0, 1, 2, 2] },
    { ...q, paidYears: 4 },
    { ...q, view: "summary" },
  ])
    assert.equal(validInsuranceClocks(bad, validDate), false);
});
