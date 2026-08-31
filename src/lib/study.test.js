import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  initialState,
  addDays,
  localDate,
  validDate,
  distance,
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
const lesson = lessons[0];
const answer = (date, extra = {}) => ({
  questionId: lesson.questions[2].id,
  kind: "variation",
  date,
  correct: true,
  reasonCorrect: true,
  hint: false,
  guessed: false,
  seconds: 40,
  ...extra,
});
test("本地日期跨月、闰年、午夜不会被UTC切走", () => {
  assert.equal(localDate(new Date(2026, 8, 1, 0, 1)), "2026-09-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(distance("2026-09-01", "2026-09-14"), 13);
  assert.equal(validDate("2026-02-29"), false);
});
test("间隔按1、3、7天推进，同日重复不算第二个学习日", () => {
  let s = initialState("2026-09-01");
  s = finishSession(s, lesson, [answer("2026-09-01")], "2026-09-01");
  assert.equal(s.records[lesson.id].due, "2026-09-02");
  s = finishSession(s, lesson, [answer("2026-09-01")], "2026-09-01");
  assert.equal(s.records[lesson.id].successDays.length, 1);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  s = finishSession(s, lesson, [answer("2026-09-02")], "2026-09-02", "review");
  assert.equal(s.records[lesson.id].due, "2026-09-05");
  assert.equal(statusOf(s.records[lesson.id]), "初步稳固");
  s = finishSession(s, lesson, [answer("2026-09-05")], "2026-09-05", "review");
  assert.equal(s.records[lesson.id].due, "2026-09-12");
});
test("提示、猜测、仅结论正确都不能计为掌握，错误次日复现", () => {
  for (const partial of [
    { hint: true },
    { guessed: true },
    { reasonCorrect: false },
    { correct: false },
  ]) {
    let s = finishSession(
      initialState(),
      lesson,
      [answer("2026-09-01", partial)],
      "2026-09-01",
    );
    assert.equal(s.records[lesson.id].successDays.length, 0);
    assert.equal(s.records[lesson.id].due, "2026-09-02");
    assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  }
  const s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01", { kind: "recall" })],
    "2026-09-01",
  );
  const second = finishSession(
    s,
    lesson,
    [answer("2026-09-02", { kind: "recall" })],
    "2026-09-02",
    "review",
  );
  assert.notEqual(statusOf(second.records[lesson.id]), "初步稳固");
});
test("午夜后点完成不能给午夜前的答案多算一天", () => {
  let s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01")],
    "2026-09-01",
  );
  s = finishSession(s, lesson, [answer("2026-09-01")], "2026-09-02", "review");
  assert.deepEqual(s.records[lesson.id].successDays, ["2026-09-01"]);
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
});
test("其他题型通过不能绕过应用题错误，复核原错误后才可晋升", () => {
  const application = {
    ...answer("2026-09-01"),
    questionId: lesson.questions[1].id,
    kind: "application",
    correct: false,
  };
  let s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01"), application],
    "2026-09-01",
  );
  s = finishSession(s, lesson, [answer("2026-09-02")], "2026-09-02", "review");
  s = finishSession(s, lesson, [answer("2026-09-03")], "2026-09-03", "review");
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.deepEqual(s.records[lesson.id].unresolved, [application.questionId]);
  s = finishSession(
    s,
    lesson,
    [{ ...application, date: "2026-09-04", correct: true }],
    "2026-09-04",
    "review",
  );
  assert.equal(statusOf(s.records[lesson.id]), "初步稳固");
});
test("导入往返保留未知单元历史，拒绝损坏或伪重复状态", () => {
  const s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01")],
    "2026-09-01",
  );
  s.records["retired-lesson"] = {
    stage: 0,
    successDays: [],
    due: "2026-09-01",
  };
  assert.deepEqual(decodeState(encodeState(s)), s);
  assert.ok(
    !dueLessons(lessons, s, "2026-09-10").some(
      (l) => l.id === "retired-lesson",
    ),
  );
  const broken = structuredClone(s);
  broken.records[lesson.id].successDays.push("2026-09-01");
  assert.throws(() => decodeState(encodeState(broken)), /重复/);
  broken.records[lesson.id].successDays = ["2026-09-01"];
  broken.records[lesson.id].variation = "false";
  assert.throws(() => decodeState(encodeState(broken)), /格式/);
  assert.throws(() => decodeState("{broken"));
  assert.throws(
    () => decodeState(JSON.stringify({ ...s, version: 99 })),
    /版本/,
  );
});
test("工作日与周末按真实星期安排，复习有上限且新课满足前置", () => {
  for (const weekday of [120, 150, 180])
    for (const startDate of ["2026-09-01", "2026-09-04", "2026-09-06"]) {
      const s = initialState(startDate);
      s.settings.weekday = weekday;
      const seen = new Set();
      for (let i = 0; i < 14; i++) {
        const date = addDays(startDate, i);
        const p = makeDay(lessons, s, date);
        assert.ok(p.total <= p.budget, `${date}: ${p.total}>${p.budget}`);
        assert.ok(
          p.reviewTime <=
            ([0, 6].includes(new Date(`${date}T12:00:00`).getDay()) ? 40 : 20),
        );
        for (const l of p.tasks) {
          assert.ok(l.prerequisites.every((id) => seen.has(id)));
          seen.add(l.id);
          s.records[l.id] = {
            stage: 1,
            successDays: [date],
            completedDate: date,
            due: addDays(date, 1),
          };
        }
        if (i === 13) assert.equal(p.tasks.length, 0);
      }
    }
});
test("高积压保留复习上限，补学扣除新课预算，过考试日不排课", () => {
  const s = initialState("2026-09-01");
  for (const l of lessons.slice(0, 20))
    s.records[l.id] = {
      stage: 1,
      successDays: ["2026-08-30"],
      completedDate: "2026-08-30",
      due: "2026-08-31",
    };
  const p = makeDay(lessons, s, "2026-09-01");
  assert.ok(p.reviewTime <= 20);
  assert.ok(p.total <= 150);
  s.sessions = [
    { lessonId: lesson.id, date: "2026-09-01", mode: "lesson", minutes: 80 },
  ];
  const busy = makeDay(lessons, s, "2026-09-01");
  assert.ok(busy.tasks.length < p.tasks.length);
  assert.ok(busy.total <= 150);
  s.settings.examDate = "2026-09-10";
  assert.equal(makeDay(lessons, s, "2026-09-11").tasks.length, 0);
});
test("预测不改真实记录、不重排今日已完成的7天间隔", () => {
  const today = localDate(),
    s = initialState(today);
  s.records[lesson.id] = {
    stage: 3,
    successDays: [addDays(today, -4), today],
    completedDate: addDays(today, -4),
    due: addDays(today, 7),
    variation: true,
    lastPassed: true,
  };
  s.reviewDays[today] = [lesson.id];
  const before = encodeState(s);
  const plans = projectPlan(lessons, s);
  assert.equal(encodeState(s), before);
  assert.ok(
    plans.slice(1, 7).every((p) => !p.review.some((l) => l.id === lesson.id)),
  );
});
test("课程都有明确答案、双页码、三种题型与可解析无环前置", () => {
  assert.equal(lessons.length, 56);
  assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
  const qids = new Set(),
    all = new Map(lessons.map((l) => [l.id, l]));
  function visit(id, path = []) {
    assert.ok(!path.includes(id), `前置环 ${id}`);
    const l = all.get(id);
    assert.ok(l, `不存在的前置 ${id}`);
    for (const p of l.prerequisites) visit(p, [...path, id]);
  }
  for (const s of subjects)
    assert.ok(lessons.some((l) => l.subjectId === s.id));
  for (const l of lessons) {
    visit(l.id);
    assert.deepEqual([...l.questions.map((q) => q.kind)].sort(), [
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
    assert.equal(l.source.printedPages.length, l.source.pdfPages.length);
    for (const q of l.questions) {
      assert.ok(!qids.has(q.id));
      qids.add(q.id);
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
      assert.ok(q.reasonAnswer >= 0 && q.reasonAnswer < q.reasonOptions.length);
      assert.ok(q.explanation && q.decisiveFact);
    }
  }
});

test("答错后即使离开课堂，也必须留下待复核记录", () => {
  let s = finishSession(
    initialState(),
    lesson,
    [answer("2026-09-01")],
    "2026-09-01",
  );
  s = finishSession(s, lesson, [answer("2026-09-02")], "2026-09-02", "review");
  assert.equal(statusOf(s.records[lesson.id]), "初步稳固");
  s = recordAttempt(
    s,
    lesson.id,
    lesson.questions[1],
    answer("2026-09-03", { correct: false }),
    "2026-09-03",
  );
  assert.notEqual(statusOf(s.records[lesson.id]), "初步稳固");
  assert.ok(s.records[lesson.id].unresolved.includes(lesson.questions[1].id));
});
