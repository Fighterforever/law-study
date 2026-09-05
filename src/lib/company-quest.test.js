import test from "node:test";
import assert from "node:assert/strict";
import {
  newCompanyQuest,
  gradeDraft,
  issueConditions,
  checkQuestStep,
  editQuestForm,
  gradeQuestStep,
  submitQuestQuiz,
  finishQuest,
  questReviewDue,
  validCompanyQuest,
  questionsFor,
} from "./company-quest.js";
import { initialState, validDate, encodeState, decodeState } from "./study.js";

test("宽限期允许 60 日和 90 日，程序按实际给予期间而非最低值推进", () => {
  for (const grace of [60, 90]) {
    assert.deepEqual(
      gradeDraft({ document: "written", start: "sent", grace }),
      [],
    );
    assert.deepEqual(
      issueConditions({
        grace,
        elapsed: grace,
        paid: false,
        authority: "board",
      }),
      [],
    );
    assert.equal(
      issueConditions({
        grace,
        elapsed: grace - 1,
        paid: false,
        authority: "board",
      }).length,
      1,
    );
  }
  assert.equal(
    issueConditions({ grace: 90, elapsed: 60, paid: false, authority: "board" })
      .length,
    1,
  );
  assert.equal(
    gradeDraft({ document: "phone", start: "received", grace: 45 }).length,
    3,
  );
  assert.equal(
    gradeDraft({ document: "written", start: "sent", grace: 59 }).length,
    1,
  );
});

test("董事会决议不能代替届满和未履行，其他主体也不能代替董事会", () => {
  assert.equal(
    issueConditions({ grace: 60, elapsed: 60, paid: true, authority: "board" })
      .length,
    1,
  );
  for (const authority of ["manager", "shareholders", ""])
    assert.equal(
      issueConditions({ grace: 60, elapsed: 60, paid: false, authority })
        .length,
      1,
    );
  assert.equal(
    issueConditions({
      grace: 60,
      elapsed: 59,
      paid: true,
      authority: "manager",
    }).length,
    3,
  );
});

test("失权只及于未缴部分，发出与接到不能互换", () => {
  assert.deepEqual(
    gradeQuestStep("scope", { shares: [9, 8, 7, 6], effect: "sent" }),
    [],
  );
  assert.equal(
    gradeQuestStep("scope", {
      shares: Array.from({ length: 10 }, (_, i) => i),
      effect: "sent",
    }).length,
    1,
  );
  assert.equal(
    gradeQuestStep("scope", { shares: [6, 7, 8, 9], effect: "received" })
      .length,
    1,
  );
  assert.deepEqual(
    gradeQuestStep("shareholder", { appealStart: "received", appealDays: 30 }),
    [],
  );
  assert.equal(
    gradeQuestStep("shareholder", { appealStart: "sent", appealDays: 60 })
      .length,
    2,
  );
});

test("转让与减资注销均合法，两条后续线任意先后；修改后须重新核对", () => {
  for (const disposal of ["transfer", "reduce"]) {
    for (const order of [
      ["company", "shareholder"],
      ["shareholder", "company"],
    ]) {
      let q = newCompanyQuest("independent");
      q = editQuestForm(q, {
        disposal,
        months: 6,
        fallback: "proportion",
        appealStart: "received",
        appealDays: 30,
      });
      for (const key of order) q = checkQuestStep(q, key);
      assert.ok(q.checks.company.correct && q.checks.shareholder.correct);
      q = editQuestForm(q, { months: 12 });
      assert.equal(q.checks.company.correct, false);
      assert.equal(q.checks.shareholder.correct, true);
      assert.equal(checkQuestStep(q, "company").checks.company.correct, false);
    }
  }
});

test("订正保留首次错误，闭卷提交只能计一次，多选漏项不通过", () => {
  let q = newCompanyQuest("independent");
  q = checkQuestStep(q, "draft");
  q = editQuestForm(q, { document: "written", grace: 90, start: "sent" });
  q = checkQuestStep(q, "draft");
  assert.deepEqual(q.checks.draft, { first: false, correct: true, tries: 2 });
  q = { ...q, phase: "quiz", quizSelected: [1] };
  q = submitQuestQuiz(q);
  assert.equal(q.quizResults[0].correct, false);
  assert.deepEqual(
    submitQuestQuiz({ ...q, quizSelected: [1, 2] }).quizResults,
    q.quizResults,
  );
});

function completed(mode, date, history = []) {
  let q = newCompanyQuest(mode, history);
  q.phase = "quiz";
  for (let i = 0; i < 3; i++) {
    q = submitQuestQuiz({
      ...q,
      quizIndex: i,
      quizSelected: questionsFor(q)[i].answers,
    });
  }
  return finishQuest(q, date);
}

test("同日重做不算隔日新案，跨日才提供独立变式；重复完成不重复记轮次", () => {
  const q = completed("guided", "2026-09-05");
  assert.equal(q.history[0].hinted, true);
  assert.equal(questReviewDue(q, "2026-09-05"), false);
  assert.equal(questReviewDue(q, "2026-09-06"), true);
  const repeated = completed("quiz", "2026-09-06", q.history);
  assert.equal(questReviewDue(repeated, "2026-09-06"), true);
  const delayed = completed("delayed", "2026-09-06", repeated.history);
  assert.equal(questReviewDue(delayed, "2026-09-06"), false);
  assert.equal(finishQuest(delayed, "2026-09-06").history.length, 3);
  assert.notEqual(questionsFor(q)[0].stem, questionsFor(delayed)[0].stem);
});

test("旧备份兼容；新案卷、首次结果和选项顺序能导出恢复；损坏草稿拒绝导入", () => {
  const state = initialState("2026-09-05");
  delete state.focus.companyQuest;
  assert.equal(decodeState(encodeState(state)).focus.companyQuest, null);
  state.focus.companyQuest = completed("independent", "2026-09-05");
  assert.deepEqual(
    decodeState(encodeState(state)).focus.companyQuest,
    state.focus.companyQuest,
  );
  const q = newCompanyQuest("guided");
  assert.ok(validCompanyQuest(q, validDate));
  assert.equal(
    validCompanyQuest(
      {
        ...q,
        quizOrder: [
          [0, 0, 1, 2],
          [0, 1, 2, 3],
          [0, 1, 2, 3],
        ],
      },
      validDate,
    ),
    false,
  );
  assert.equal(
    validCompanyQuest({ ...q, form: { ...q.form, shares: [6, 6] } }, validDate),
    false,
  );
  assert.equal(validCompanyQuest({ ...q, phase: "summary" }, validDate), false);
  assert.equal(
    validCompanyQuest(
      { ...completed("quiz", "2026-09-05"), history: [] },
      validDate,
    ),
    false,
  );
  assert.equal(
    validCompanyQuest(
      { ...q, feedback: { key: "draft", errors: [] } },
      validDate,
    ),
    false,
  );
  assert.equal(
    validCompanyQuest({ ...q, history: [{ date: "2026-02-30" }] }, validDate),
    false,
  );
});
