import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseCheckup,
  appendAssessmentAnswer,
  diagnosticNeedsTeaching,
  assessmentReport,
} from "./assessments.js";
import { selectReviewQuestion } from "./learning.js";
import { initialState } from "./study.js";

const pool = [
  { lessonId: "a", question: { id: "a-check" } },
  { lessonId: "b", question: { id: "b-check" } },
];
test("综合复核不抽未教学的课，新保留题先于已见过的题", () => {
  const s = initialState();
  s.records.a = { completedDate: "2026-09-01" };
  assert.deepEqual(chooseCheckup(pool, s), [pool[0]]);
  s.records.b = { completedDate: "2026-09-01" };
  s.checkups = [{ itemIds: ["a-check"] }];
  assert.deepEqual(chooseCheckup(pool, s), [pool[1]]);
});
test("刷新后的重复提交不重复记分，两次没有思路结束诊断", () => {
  let run = { attempts: [], cursor: 0 };
  run = appendAssessmentAnswer(run, { questionId: "a", noIdea: true });
  run = appendAssessmentAnswer(run, { questionId: "a", noIdea: true });
  assert.equal(run.attempts.length, 1);
  assert.equal(diagnosticNeedsTeaching(run), false);
  run = appendAssessmentAnswer(run, { questionId: "b", noIdea: true });
  assert.equal(diagnosticNeedsTeaching(run), true);
});
test("检查报告区分独立答对、借助提示和未测", () => {
  const report = assessmentReport(
    [...pool, { lessonId: "c", question: { id: "c-check" } }],
    [
      {
        questionId: "a-check",
        correct: true,
        reasonCorrect: true,
        hint: false,
        guessed: false,
      },
      {
        questionId: "b-check",
        correct: true,
        reasonCorrect: true,
        hint: true,
        guessed: false,
      },
    ],
  );
  assert.equal(report.clear.length, 1);
  assert.equal(report.repair.length, 1);
  assert.equal(report.untouched.length, 1);
});
test("复习先解决已知错误，再检查尚未作答题型", () => {
  const l = {
    id: "a",
    questions: [{ id: "a-recall" }, { id: "a-apply" }, { id: "a-var" }],
  };
  const s = initialState();
  s.records.a = { unresolved: ["a-apply"] };
  s.attempts = [{ lessonId: "a", questionId: "a-recall", at: "2026-09-01" }];
  assert.equal(selectReviewQuestion(l, s).id, "a-apply");
  s.records.a.unresolved = [];
  assert.equal(selectReviewQuestion(l, s).id, "a-apply");
});

test("保留题失败进入独立待复测证据，同日看反馈再答不能消除", async () => {
  const { recordCheckupAnswer, startCheckup } =
    await import("./assessments.js");
  const { localDate, addDays } = await import("./study.js");
  let s = initialState();
  s.records.a = {
    completedDate: localDate(),
    successDays: [],
    stage: 1,
    lastPassed: true,
  };
  s.checkups = [startCheckup([pool[0]])];
  const bad = {
    correct: false,
    reasonCorrect: true,
    hint: false,
    guessed: false,
    seconds: 30,
  };
  s = recordCheckupAnswer(s, pool[0], bad);
  assert.deepEqual(s.records.a.checkpointUnresolved, ["a-check"]);
  assert.equal(s.records.a.lastPassed, false);
  s.checkups.push(startCheckup([pool[0]]));
  s = recordCheckupAnswer(s, pool[0], { ...bad, correct: true });
  assert.deepEqual(s.records.a.checkpointUnresolved, ["a-check"]);
  s.checkups[0].attempts[0].date = addDays(localDate(), -1);
  s.checkups.push(startCheckup([pool[0]]));
  s = recordCheckupAnswer(s, pool[0], { ...bad, correct: true });
  assert.deepEqual(s.records.a.checkpointUnresolved, []);
});

test("课程改换检测规则后保留旧历史，新增题和旧版仅诊断课重新进入学习", async () => {
  const { reconcileCurriculum } = await import("./learning.js");
  const s = initialState();
  s.records.a = {
    completedDate: "2026-08-30",
    successDays: ["2026-08-30"],
    stage: 1,
    lastPassed: true,
  };
  s.attempts = [{ lessonId: "a", questionId: "retired-question" }];
  s.sessions = [
    { lessonId: "a", mode: "diagnostic", date: "2026-08-30", minutes: 3 },
  ];
  const revised = reconcileCurriculum(
    [{ id: "a", questions: [{ id: "new-question", sectionIndexes: [0] }] }],
    s,
    "2026-09-01",
  );
  assert.deepEqual(revised.attempts, s.attempts);
  assert.equal(revised.records.a.completedDate, null);
  assert.deepEqual(revised.records.a.unresolved, ["new-question"]);
  assert.equal(revised.records.a.due, "2026-09-01");
  assert.equal(s.records.a.lastPassed, true);
});
