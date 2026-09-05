import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initialState,
  addDays,
  localDate,
  validDate,
  distance,
  studyPhase,
  prerequisiteReady,
  finishSession,
  statusOf,
  makeDay,
  projectPlan,
  encodeState,
  decodeState,
  dueLessons,
  recordAttempt,
} from "./study.js";
import { subjects, subjectById } from "../data/subjects.js";
const lessons = JSON.parse(
  fs.readFileSync(new URL("../data/lessons.json", import.meta.url), "utf8"),
);
const checkpoints = JSON.parse(
  fs.readFileSync(new URL("../data/checkpoints.json", import.meta.url), "utf8"),
);
const lesson = lessons[0];
const answer = (date, kind = "variation", extra = {}) => ({
  questionId: lesson.questions.find((q) => q.kind === kind).id,
  kind,
  date,
  correct: true,
  reasonCorrect: true,
  hint: false,
  guessed: false,
  seconds: 40,
  ...extra,
});
const answers = (date, overrides = {}) =>
  lesson.questions.map((q) => answer(date, q.kind, overrides[q.kind]));
const teach = (s, date, overrides = {}, minutes) =>
  finishSession(s, lesson, answers(date, overrides), date, "lesson", minutes);
const full = (date, extra = {}) => ({
  lessonId: lesson.id,
  at: `${date}T12:00:00.000Z`,
  ...answer(date),
  ...extra,
});
const record = (date, extra = {}) => ({
  stage: 1,
  successDays: [date],
  completedDate: date,
  due: addDays(date, 1),
  lastPassed: true,
  ...extra,
});

test("本地日期、跨月、闰年", () => {
  assert.equal(localDate(new Date(2026, 8, 1, 0, 1)), "2026-09-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(distance("2026-09-01", "2026-09-14"), 13);
  assert.equal(validDate("2026-02-29"), false);
});
test("完整教学后按1/3/7日推进，同日重复与午夜后点完成不多算日期", () => {
  let s = teach(initialState("2026-09-01"), "2026-09-01");
  assert.equal(s.records[lesson.id].due, "2026-09-02");
  s = finishSession(s, lesson, [answer("2026-09-01")], "2026-09-02", "review");
  assert.deepEqual(s.records[lesson.id].successDays, ["2026-09-01"]);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  s = finishSession(s, lesson, [answer("2026-09-02")], "2026-09-02", "review");
  assert.equal(s.records[lesson.id].due, "2026-09-05");
  assert.equal(statusOf(s.records[lesson.id]), "初步稳固");
  s = finishSession(s, lesson, [answer("2026-09-05")], "2026-09-05", "review");
  assert.equal(s.records[lesson.id].due, "2026-09-12");
});
test("提示、猜测或理由错误不能产生独立成功日；部分课堂题不等于教学完成", () => {
  for (const flag of [
    { hint: true },
    { guessed: true },
    { reasonCorrect: false },
    { correct: false },
  ]) {
    const s = teach(initialState(), "2026-09-01", { variation: flag });
    assert.equal(s.records[lesson.id].successDays.length, 0);
    assert.equal(s.records[lesson.id].due, "2026-09-02");
    assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  }
  const s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01")],
    "2026-09-01",
  );
  assert.equal(s.records[lesson.id].completedDate, null);
});
test("应用题错误不能靠其他题型清除，原题跨日复核后才继续积累独立证据", () => {
  let s = teach(initialState(), "2026-09-01", {
    application: { correct: false },
  });
  for (const date of ["2026-09-02", "2026-09-03"])
    s = finishSession(s, lesson, [answer(date)], date, "review");
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.deepEqual(s.records[lesson.id].unresolved, [
    answer("2026-09-01", "application").questionId,
  ]);
  s = finishSession(
    s,
    lesson,
    [answer("2026-09-04", "application")],
    "2026-09-04",
    "review",
  );
  assert.deepEqual(s.records[lesson.id].unresolved, []);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  s = finishSession(s, lesson, [answer("2026-09-05")], "2026-09-05", "review");
  assert.equal(statusOf(s.records[lesson.id]), "初步稳固");
  const q = lesson.questions.find((q) => q.kind === "application");
  s = recordAttempt(
    s,
    lesson.id,
    q,
    answer("2026-09-06", "application", { correct: false }),
    "2026-09-06",
  );
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.ok(s.records[lesson.id].unresolved.includes(q.id));
  assert.equal(s.attempts.at(-1).questionId, q.id);
});
test("错误反馈后同日重答不能清错或制造成功日", () => {
  let s = teach(initialState(), "2026-09-01", {
    application: { correct: false },
  });
  s = finishSession(
    s,
    lesson,
    [answer("2026-09-01", "application")],
    "2026-09-01",
    "review",
  );
  assert.deepEqual(s.records[lesson.id].successDays, []);
  assert.equal(s.records[lesson.id].unresolved.length, 1);
  s = finishSession(
    s,
    lesson,
    [answer("2026-09-02", "application")],
    "2026-09-02",
    "review",
  );
  assert.equal(s.records[lesson.id].unresolved.length, 0);
  assert.deepEqual(s.records[lesson.id].successDays, ["2026-09-02"]);
});
test("未结束课堂的反馈与全局诊断暴露，都不能在同日重做后补造独立证据", () => {
  let s = initialState();
  const q = lesson.questions.find((q) => q.kind === "variation");
  s = recordAttempt(s, lesson.id, q, answer("2026-09-01"), "2026-09-01");
  s = recordAttempt(s, lesson.id, q, answer("2026-09-01"), "2026-09-01");
  s = teach(s, "2026-09-01");
  assert.deepEqual(s.records[lesson.id].successDays, []);
  const d = initialState();
  d.diagnostic.attempts = [full("2026-09-01")];
  const next = teach(d, "2026-09-01");
  assert.deepEqual(next.records[lesson.id].successDays, []);
  assert.equal(next.records[lesson.id].completedDate, "2026-09-01");
});
test("诊断要求段落所有关联题通过，未测段落不折叠，多日诊断不完成课程", () => {
  const scoped = {
    ...lesson,
    sections: [{ title: "甲" }, { title: "乙" }, { title: "未测" }],
    questions: lesson.questions.map((q, i) => ({
      ...q,
      sectionIndexes: i === 2 ? [1] : [0],
    })),
  };
  let s = finishSession(
    initialState(),
    scoped,
    [answer("2026-09-01", "recall"), answer("2026-09-01")],
    "2026-09-01",
    "diagnostic",
  );
  assert.deepEqual(s.records[lesson.id].diagnosticSections, [1]);
  assert.equal(s.records[lesson.id].completedDate, null);
  assert.equal(prerequisiteReady(s.records[lesson.id]), false);
  s = finishSession(
    s,
    scoped,
    answers("2026-09-02"),
    "2026-09-02",
    "diagnostic",
  );
  assert.deepEqual(s.records[lesson.id].diagnosticSections, [0, 1]);
  assert.deepEqual(s.records[lesson.id].successDays, []);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.equal(dueLessons([scoped], s, "2026-09-03").length, 0);
  s = finishSession(
    s,
    scoped,
    answers("2026-09-02"),
    "2026-09-02",
    "lesson",
    12,
  );
  assert.equal(s.records[lesson.id].completedDate, "2026-09-02");
  assert.equal(s.sessions.at(-1).minutes, 12);
});
test("保留题错误不能被普通课堂通过清除或恢复前置资格", () => {
  let s = teach(initialState(), "2026-09-01");
  s.records[lesson.id].checkpointUnresolved = ["held-out-rule"];
  s = finishSession(s, lesson, [answer("2026-09-02")], "2026-09-02", "review");
  assert.deepEqual(s.records[lesson.id].checkpointUnresolved, [
    "held-out-rule",
  ]);
  assert.equal(prerequisiteReady(s.records[lesson.id]), false);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.equal(s.records[lesson.id].due, "2026-09-03");
});
test("旧v1导入补齐容器并保留未知课程，拒绝重复日期与损坏状态", () => {
  const s = teach(initialState(), "2026-09-01");
  s.records["retired-lesson"] = {
    stage: 0,
    successDays: [],
    due: "2026-09-01",
  };
  delete s.sessions;
  delete s.checkups;
  delete s.diagnostic;
  s.cursor = { id: lesson.id, step: 1 };
  const restored = decodeState(encodeState(s));
  assert.deepEqual(restored.checkups, []);
  assert.deepEqual(restored.diagnostic, { attempts: [], cursor: 0 });
  assert.ok(restored.records["retired-lesson"]);
  assert.equal(restored.cursor.step, 1);
  assert.ok(
    !dueLessons(lessons, restored, "2026-09-10").some(
      (l) => l.id === "retired-lesson",
    ),
  );
  for (const mutate of [
    (v) => v.records[lesson.id].successDays.push("2026-09-01"),
    (v) => (v.records[lesson.id].variation = "false"),
    (v) => (v.records[lesson.id].checkpointUnresolved = [0]),
    (v) => (v.records[lesson.id].diagnosticSections = [-1]),
    (v) => (v.diagnostic.roundStart = 2),
  ]) {
    const v = structuredClone(restored);
    mutate(v);
    assert.throws(() => decodeState(encodeState(v)));
  }
  assert.throws(() => decodeState("{broken"));
  assert.throws(
    () => decodeState(encodeState({ ...restored, version: 99 })),
    /版本/,
  );
});
test("部分课堂答案、复核、诊断、提示草稿及随机顺序恢复，非法嵌套状态被拒绝", () => {
  const s = initialState(),
    draft = {
      questionId: answer("2026-09-01").questionId,
      phase: "reason",
      choice: 1,
      reason: null,
      confidence: "sure",
      hint: true,
      optionOrder: [2, 0, 1, 3],
      reasonOrder: [1, 2, 0],
    };
  const a = full("2026-09-01", {
    choice: 1,
    reason: 2,
    confidence: "sure",
    optionOrder: draft.optionOrder,
    reasonOrder: draft.reasonOrder,
  });
  s.cursor = {
    id: lesson.id,
    step: 2,
    mode: "lesson",
    diagnostic: false,
    session: [answer("2026-09-01")],
    qIndex: 2,
    checkDone: false,
    draft,
  };
  s.diagnostic = {
    attempts: [a],
    cursor: 1,
    roundStart: 1,
    stopped: false,
    draft,
  };
  s.checkups = [
    {
      date: "2026-09-01",
      itemIds: [a.questionId],
      attempts: [a],
      cursor: 0,
      completed: true,
      startedAt: a.at,
      finishedAt: a.at,
      draft,
    },
  ];
  assert.deepEqual(decodeState(encodeState(s)), s);
  s.cursor = {
    id: lesson.id,
    mode: "review",
    step: 2,
    questionId: a.questionId,
    result: answer("2026-09-01"),
    assisted: true,
    draft,
  };
  assert.deepEqual(decodeState(encodeState(s)), s);
  for (const mutate of [
    (v) => (v.cursor.draft.hint = "false"),
    (v) => (v.checkups[0].cursor = -1),
    (v) => (v.checkups[0].attempts[0].seconds = Infinity),
    (v) => (v.diagnostic.attempts[0].optionOrder = [0, 0, 1, 2]),
    (v) => (v.cursor.result.correct = "true"),
  ]) {
    const v = structuredClone(s);
    mutate(v);
    assert.throws(() => decodeState(encodeState(v)));
  }
});
test("9月12日考试：10日11日不新增，考试日暂停，预测止于11日", () => {
  const s = initialState("2026-09-01");
  s.settings.examDate = "2026-09-12";
  assert.equal(studyPhase(s.settings, "2026-09-01").available, 11);
  assert.equal(studyPhase(s.settings, "2026-09-09").consolidation, false);
  for (const date of ["2026-09-10", "2026-09-11"]) {
    assert.equal(studyPhase(s.settings, date).consolidation, true);
    assert.equal(makeDay(lessons, s, date).tasks.length, 0);
  }
  assert.equal(makeDay(lessons, s, "2026-09-12").paused, true);
  const p = projectPlan(lessons, s);
  assert.equal(p.length, 11);
  assert.equal(p.at(-1).date, "2026-09-11");
});
test("较早开始的复习计划仍按真实考试日进入冲刺", () => {
  const s = initialState("2026-08-15");
  s.settings.examDate = "2026-09-12";
  assert.equal(studyPhase(s.settings, "2026-09-05").remaining, 7);
  assert.equal(studyPhase(s.settings, "2026-09-05").consolidation, false);
  assert.equal(studyPhase(s.settings, "2026-09-10").consolidation, true);
});
test("预算扣实际诊断、重复补讲和复习，旧课不再按新课原时长扣款", () => {
  const s = initialState("2026-09-01");
  s.records[lesson.id] = record("2026-08-31");
  s.sessions = [
    { lessonId: lesson.id, date: "2026-09-01", mode: "lesson", minutes: 40 },
    { lessonId: lesson.id, date: "2026-09-01", mode: "lesson", minutes: 30 },
    { lessonId: lesson.id, date: "2026-09-01", mode: "review", minutes: 5 },
  ];
  s.reviewDays["2026-09-01"] = [lesson.id];
  s.diagnostic.attempts = [full("2026-09-01", { seconds: 300 })];
  const p = makeDay(lessons, s, "2026-09-01");
  assert.equal(p.spentTime, 80);
  assert.equal(p.extraTime, 75);
  assert.equal(p.reviewTime, 5);
  assert.ok(!p.tasks.some((l) => l.id === lesson.id));
  assert.ok(p.total <= 150);
  const today = teach(initialState("2026-09-01"), "2026-09-01", {}, 8);
  assert.equal(makeDay([lesson], today, "2026-09-01").spentTime, 8);
});
test("同一难课不同时占补讲与复习预算，已用超预算不隐瞒也不新增", () => {
  const s = initialState("2026-09-01");
  s.records[lesson.id] = record("2026-08-31", {
    lastPassed: false,
    unresolved: [lesson.questions[0].id],
  });
  const p = makeDay(lessons, s, "2026-09-01");
  assert.ok(p.repairs.some((l) => l.id === lesson.id));
  assert.ok(!p.review.some((l) => l.id === lesson.id));
  assert.ok(p.total <= p.budget);
  s.sessions = [
    { lessonId: lesson.id, date: "2026-09-01", mode: "lesson", minutes: 170 },
  ];
  const over = makeDay(lessons, s, "2026-09-01");
  assert.equal(over.tasks.length, 0);
  assert.equal(over.total, 170);
  assert.equal(over.spentTime, 170);
});
test("保留题需对应已教课程，完成后不再预留且按实耗扣除", () => {
  const s = initialState("2026-09-01");
  s.settings.examDate = "2026-09-12";
  const eligible = lessons.find((l) => l.id === checkpoints[0].lessonId),
    noCheckpoint = lessons.find(
      (l) => !checkpoints.some((i) => i.lessonId === l.id),
    );
  s.records[noCheckpoint.id] = record("2026-09-01", { due: "2026-10-01" });
  assert.equal(makeDay(lessons, s, "2026-09-10").checkpointTime, 0);
  s.records[eligible.id] = record("2026-09-01", { due: "2026-10-01" });
  assert.equal(makeDay(lessons, s, "2026-09-10").checkpointTime, 30);
  s.checkups = [
    {
      date: "2026-09-10",
      itemIds: [checkpoints[0].question.id],
      attempts: [
        full("2026-09-10", {
          seconds: 600,
          questionId: checkpoints[0].question.id,
          lessonId: eligible.id,
        }),
      ],
      cursor: 0,
      completed: true,
      startedAt: "2026-09-10T12:00:00Z",
    },
  ];
  const p = makeDay(lessons, s, "2026-09-10");
  assert.equal(p.checkpointTime, 0);
  assert.equal(p.spentTime, 10);
  assert.equal(p.total, 35);
});
test("各预算模式保持真实星期、前置约束和复习上限", () => {
  for (const weekday of [120, 150, 180])
    for (const startDate of ["2026-09-01", "2026-09-04", "2026-09-06"]) {
      const s = initialState(startDate);
      s.settings.weekday = weekday;
      const seen = new Set();
      for (let i = 0; i < 14; i++) {
        const date = addDays(startDate, i),
          p = makeDay(lessons, s, date);
        assert.ok(p.total <= p.budget, `${date}: ${p.total}>${p.budget}`);
        assert.ok(
          p.reviewTime <=
            ([0, 6].includes(new Date(`${date}T12:00:00`).getDay())
              ? 40
              : weekday === 120
                ? 15
                : 20),
        );
        for (const l of p.tasks) {
          assert.ok(l.prerequisites.every((id) => seen.has(id)));
          seen.add(l.id);
          s.records[l.id] = record(date);
        }
        if (i === 13) assert.equal(p.tasks.length, 0);
      }
    }
});
test("预测不修改真实记录，不提前重排今日已完成的七天间隔", () => {
  const today = localDate(),
    s = initialState(today);
  s.records[lesson.id] = record(addDays(today, -4), {
    stage: 3,
    successDays: [addDays(today, -4), today],
    due: addDays(today, 7),
    variation: true,
  });
  s.reviewDays[today] = [lesson.id];
  const before = encodeState(s),
    p = projectPlan(lessons, s);
  assert.equal(encodeState(s), before);
  assert.ok(
    p.slice(1, 7).every((d) => !d.review.some((l) => l.id === lesson.id)),
  );
});
test("教学内容的题型、来源与无环前置保持完整", () => {
  assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
  const all = new Map(lessons.map((l) => [l.id, l])),
    qids = new Set();
  function visit(id, path = []) {
    assert.ok(!path.includes(id));
    const l = all.get(id);
    assert.ok(l);
    for (const p of l.prerequisites) visit(p, [...path, id]);
  }
  for (const s of subjects)
    assert.ok(lessons.some((l) => l.subjectId === s.id));
  for (const l of lessons) {
    visit(l.id);
    assert.deepEqual(l.questions.map((q) => q.kind).sort(), [
      "application",
      "recall",
      "variation",
    ]);
    assert.ok(l.sections.reduce((n, s) => n + s.body.length, 0) >= 300);
    assert.ok(
      l.source.pdfPages.every(
        (p) => p >= 1 && p <= subjectById[l.subjectId].pages,
      ),
    );
    assert.equal(l.source.pdfPages.length, l.source.printedPages.length);
    for (const q of l.questions) {
      assert.ok(!qids.has(q.id));
      qids.add(q.id);
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
      assert.ok(q.reasonAnswer >= 0 && q.reasonAnswer < q.reasonOptions.length);
      assert.ok(q.explanation && q.decisiveFact);
    }
  }
});

test("界面初始空草稿及长期开页作答仍可往返导入", () => {
  const s = initialState("2026-09-01");
  s.cursor = {
    id: lesson.id,
    mode: "lesson",
    step: 0,
    session: [],
    qIndex: 0,
    draft: null,
  };
  s.diagnostic.draft = null;
  s.checkups = [
    {
      date: "2026-09-01",
      itemIds: [answer("2026-09-01").questionId],
      attempts: [],
      cursor: 0,
      completed: false,
      startedAt: "2026-09-01T12:00:00.000Z",
      draft: null,
    },
  ];
  s.attempts = [full("2026-09-01", { seconds: 172800 })];
  assert.deepEqual(decodeState(encodeState(s)), s);
  s.cursor = {
    id: lesson.id,
    mode: "review",
    step: 2,
    questionId: answer("2026-09-01").questionId,
    result: null,
    draft: null,
    assisted: false,
  };
  assert.deepEqual(decodeState(encodeState(s)), s);
});
