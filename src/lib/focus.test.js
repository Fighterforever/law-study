import test from "node:test";
import assert from "node:assert/strict";
import { initialState, makeDay, encodeState, decodeState } from "./study.js";
import { emptyFocusState } from "./focus-state.js";
import {
  sameAnswers,
  recordFocusAnswer,
  finishFocusSession,
  focusProgress,
  makeFocusDay,
  projectFocusPlan,
} from "./focus.js";
const unit = {
  id: "focus-civil-procedure-fixture",
  subjectId: "civil-procedure",
  estimatedMinutes: 15,
  priority: "core",
  questions: [
    { id: "fixture-one", answers: [0, 2] },
    { id: "fixture-two", answers: [1] },
  ],
};
const data = {
  units: [
    unit,
    ...Array.from({ length: 45 }, (_, i) => ({
      ...unit,
      id: `focus-fixture-${i}`,
    })),
  ],
  campaign: { startDate: "2026-09-05", examDate: "2026-09-12", days: [] },
};
const fresh = () => {
  const s = initialState("2026-09-05");
  s.settings.examDate = "2026-09-12";
  return s;
};
function study(
  s,
  date,
  { hint = false, wrong = false, quality = "exact" } = {},
) {
  const results = unit.questions.map((q, i) => ({
    itemId: q.id,
    selected: wrong && i === 0 ? [0] : q.answers,
    correct: !(wrong && i === 0),
    hint,
  }));
  for (const [i, q] of unit.questions.entries())
    s = recordFocusAnswer(s, unit, q, results[i].selected, hint, date);
  return finishFocusSession(s, unit, results, quality, hint, "learn", date);
}
test("多选必须完整选中：顺序无关，漏选、多选、重复均不通过", () => {
  assert.equal(sameAnswers([2, 0], [0, 2]), true);
  for (const a of [[0], [0, 1, 2], [0, 0], []])
    assert.equal(sameAnswers(a, [0, 2]), false);
});
test("同日重做不能生成隔日成功；提示、漏项和错题回到次日", () => {
  let s = study(fresh(), "2026-09-05");
  s = study(s, "2026-09-05");
  assert.equal(focusProgress(unit, s, "2026-09-05").stable, false);
  assert.deepEqual(focusProgress(unit, s).successful, ["2026-09-05"]);
  s = study(s, "2026-09-06");
  assert.equal(focusProgress(unit, s).stable, true);
  s = study(s, "2026-09-07", { wrong: true });
  s = study(s, "2026-09-07");
  assert.equal(focusProgress(unit, s).stable, false);
  assert.equal(focusProgress(unit, s).due, "2026-09-08");
  for (const extra of [
    { hint: true },
    { quality: "partial" },
    { wrong: true },
  ]) {
    const p = focusProgress(unit, study(fresh(), "2026-09-05", extra));
    assert.equal(p.stable, false);
    assert.equal(p.due, "2026-09-06");
  }
});
test("未完成客观题不能结课，复测不得排到考试当天", () => {
  const s = fresh();
  assert.equal(finishFocusSession(s, unit, [], "exact", false, "learn"), s);
  const done = study(study(s, "2026-09-08"), "2026-09-10");
  assert.equal(
    focusProgress(unit, done, "2026-09-10", "2026-09-12").due,
    "2026-09-11",
  );
});
test("两栏共用总预算，已做课时扣除，最后两天不新增", () => {
  for (const date of ["2026-09-05", "2026-09-07", "2026-09-10", "2026-09-11"])
    for (const budget of [120, 150, 300]) {
      const s = fresh();
      s.settings.weekday = budget;
      s.settings.weekend = budget;
      s.sessions = [
        { date, lessonId: "base-course", mode: "lesson", minutes: 35 },
      ];
      const spent = makeDay([], s, date).spentTime;
      const f = makeFocusDay(data, s, date, spent);
      const extra = Math.max(
        0,
        f.breakMinutes - (["2026-09-05"].includes(date) ? 30 : 15),
      );
      const day = makeDay([], s, date, f.reserved + extra);
      assert.ok(day.total <= budget, `${date} ${budget} => ${day.total}`);
      assert.ok(
        f.reserved +
          f.baseMinutes +
          f.breakMinutes +
          (f.reflectionMinutes || 0) +
          spent <=
          budget,
      );
      if (date >= "2026-09-10") assert.equal(f.learn.length, 0);
    }
  assert.equal(makeFocusDay(data, fresh(), "2026-09-12").paused, true);
  const paused = fresh();
  paused.focus.enabled = false;
  assert.equal(makeFocusDay(data, paused).reserved, 0);
});
test("七日表只预测未来，不改写原始进度；首轮后排隔日复测", () => {
  const s = fresh();
  const before = structuredClone(s);
  const days = projectFocusPlan(data, s, "2026-09-05");
  assert.equal(days.length, 7);
  assert.deepEqual(s, before);
  assert.ok(days[0].learn.length > 0);
  assert.ok(days[1].review.length > 0);
  assert.equal(days.at(-1).learn.length, 0);
});
test("当日重点之后补回漏学重点，不被未来重点挤到队尾", () => {
  const [future, missed, current] = ["future", "missed", "current"].map(
    (id) => ({ ...unit, id }),
  );
  const scheduled = {
    ...data,
    units: [future, missed, current],
    campaign: {
      ...data.campaign,
      days: [
        { date: "2026-09-06", unitIds: [missed.id] },
        { date: "2026-09-07", unitIds: [current.id] },
        { date: "2026-09-08", unitIds: [future.id] },
      ],
    },
  };
  const s = fresh();
  s.settings.weekday = 80;
  const before = structuredClone(s);
  assert.deepEqual(
    makeFocusDay(scheduled, s, "2026-09-07").learn.map((u) => u.id),
    [current.id, missed.id],
  );
  assert.deepEqual(s, before);
  s.focus.learned[missed.id] = "2026-09-06";
  const after = makeFocusDay(scheduled, s, "2026-09-07");
  assert.ok(!after.learn.some((u) => u.id === missed.id));
  assert.ok(after.review.some((u) => u.id === missed.id));
});
test("旧备份继续可用，新答题草稿、乱序选项与宫殿记录往返完整", () => {
  const legacy = fresh();
  delete legacy.focus;
  assert.deepEqual(decodeState(encodeState(legacy)).focus, emptyFocusState());
  const s = study(fresh(), "2026-09-05");
  s.focus.bookmarks = [unit.id];
  s.focus.palace["focus-palace-door"] = {
    date: "2026-09-05",
    quality: "partial",
    assisted: true,
  };
  s.focus.draft = {
    unitId: unit.id,
    mode: "review",
    phase: "quiz",
    questionIndex: 0,
    optionOrder: [2, 0, 1],
    selected: [2],
    results: [],
    recallQuality: "exact",
    hint: false,
    revealed: true,
    recallText: "已复述",
    confidence: "sure",
  };
  assert.deepEqual(decodeState(encodeState(s)).focus, s.focus);
  const bad = structuredClone(s);
  bad.focus.draft.optionOrder = [2, 2, 0];
  assert.throws(() => decodeState(encodeState(bad)));
});

test("七日表的今天与首页共同扣除旧课时间", () => {
  const s = fresh();
  const today = "2026-09-07";
  const planned = projectFocusPlan(data, s, today, 120).find(
    (p) => p.date === today,
  );
  assert.equal(
    planned.newMinutes,
    makeFocusDay(data, s, today, 120).newMinutes,
  );
  assert.equal(planned.newMinutes, 0);
});
test("失败后重新积累不同日期的成功，不沿用旧成功记录拉长间隔", () => {
  let s = study(study(fresh(), "2026-09-05"), "2026-09-06");
  s = study(s, "2026-09-07", { wrong: true });
  s = study(s, "2026-09-08");
  assert.equal(focusProgress(unit, s).stable, false);
  assert.deepEqual(focusProgress(unit, s).successful, ["2026-09-08"]);
  assert.equal(focusProgress(unit, s).due, "2026-09-09");
});
test("同一场次跨午夜答完，只按完成日记录一次结果", () => {
  let s = fresh();
  s = recordFocusAnswer(
    s,
    unit,
    unit.questions[0],
    [0, 2],
    false,
    "2026-09-05",
  );
  s = recordFocusAnswer(s, unit, unit.questions[1], [1], false, "2026-09-06");
  const results = unit.questions.map((q) => ({
    itemId: q.id,
    selected: q.answers,
    correct: true,
    hint: false,
  }));
  s = finishFocusSession(
    s,
    unit,
    results,
    "exact",
    false,
    "learn",
    "2026-09-06",
  );
  assert.equal(s.focus.sessions[0].passed, true);
  assert.deepEqual(focusProgress(unit, s).successful, ["2026-09-06"]);
  assert.equal(focusProgress(unit, s).stable, false);
});

test("聚焦内容的页码、原课程链接与客观题评分契约完整", async () => {
  const fs = await import("node:fs");
  const live = JSON.parse(
    fs.readFileSync(new URL("../data/focus.json", import.meta.url), "utf8"),
  );
  const old = JSON.parse(
    fs.readFileSync(new URL("../data/lessons.json", import.meta.url), "utf8"),
  );
  const oldIds = new Set(old.map((l) => l.id)),
    ids = new Set(live.units.map((u) => u.id)),
    questions = new Set();
  assert.equal(ids.size, live.units.length);
  assert.equal(new Set(live.papers.map((p) => p.id)).size, live.papers.length);
  for (const paper of live.papers) {
    assert.deepEqual(
      paper.readPages,
      Array.from({ length: paper.pageCount }, (_, i) => i + 1),
    );
    const covered = new Set(
      live.units.filter((u) => u.paperId === paper.id).flatMap((u) => u.pages),
    );
    for (let page = 2; page <= paper.pageCount; page++)
      assert.ok(covered.has(page), `${paper.id} 第${page}页缺少入口`);
  }
  for (const u of live.units) {
    const paper = live.papers.find((p) => p.id === u.paperId);
    assert.ok(paper);
    assert.ok(
      u.pages.length > 0 &&
        u.pages.every(
          (p) => Number.isInteger(p) && p >= 1 && p <= paper.pageCount,
        ),
    );
    assert.ok(
      u.overlap.lessonIds.every((id) => oldIds.has(id)),
      `${u.id} 旧课链接`,
    );
    if (u.priority === "core") assert.ok(u.questions.length >= 2);
    assert.ok(u.questions.length > 0);
    assert.ok(u.rules.length > 0 && u.recall.answer.length > 0);
    assert.ok(Number.isInteger(u.estimatedMinutes) && u.estimatedMinutes > 0);
    if (u.overlap.level === "confirmed") {
      assert.ok(u.overlap.pdfPages.length > 0, `${u.id} 重合出处`);
      assert.equal(u.overlap.pdfPages.length, u.overlap.printedPages.length);
    }
    for (const q of u.questions) {
      assert.ok(!questions.has(q.id));
      questions.add(q.id);
      assert.equal(q.options.length, q.explanations.length);
      assert.ok(q.options.length >= 2);
      assert.ok(
        q.answers.length > 0 &&
          q.answers.every(
            (a) => Number.isInteger(a) && a >= 0 && a < q.options.length,
          ),
      );
      assert.equal(new Set(q.answers).size, q.answers.length);
      assert.ok(["single", "multiple"].includes(q.type));
      if (q.type === "single") assert.equal(q.answers.length, 1);
    }
  }
  for (const p of live.palaces) {
    assert.ok(p.stations.length >= 4 && p.stations.length <= 8);
    assert.ok(p.unitIds.every((id) => ids.has(id)));
    for (const s of p.stations)
      assert.ok(s.scene && s.decode && s.prompt && s.answer);
  }
  for (const d of live.campaign.days)
    assert.ok(d.unitIds.every((id) => ids.has(id)));
});

test("完成任务后只保留当日剩余复测预算，旧课已用时间抵扣预留", () => {
  const s = fresh();
  for (const u of data.units) {
    s.focus.learned[u.id] = "2026-09-06";
    s.focus.sessions.push({
      unitId: u.id,
      mode: "learn",
      date: "2026-09-06",
      passed: true,
      minutes: 0,
      recallQuality: "exact",
    });
  }
  const before = makeFocusDay(data, s, "2026-09-07");
  assert.equal(before.reviewMinutes, 35);
  s.focus.sessions.push({
    unitId: before.review[0].id,
    mode: "review",
    date: "2026-09-07",
    passed: true,
    minutes: 5,
    recallQuality: "exact",
  });
  const after = makeFocusDay(data, s, "2026-09-07", 20);
  assert.equal(after.reviewMinutes, 30);
  assert.equal(after.baseMinutes, 0);
});

test("复述漏项先订正，尚未隔日通过的考点先于已经巩固的考点", () => {
  const s = fresh();
  const [firm, fragile, repair] = data.units;
  for (const u of [firm, fragile, repair]) {
    s.focus.learned[u.id] = "2026-09-05";
    for (const q of u.questions)
      s.focus.attempts.push({
        unitId: u.id,
        itemId: q.id,
        correct: true,
        hint: false,
        date: "2026-09-06",
      });
  }
  for (const date of ["2026-09-05", "2026-09-06"])
    s.focus.sessions.push({
      unitId: firm.id,
      mode: "review",
      date,
      passed: true,
      minutes: 5,
      recallQuality: "exact",
    });
  s.focus.sessions.push({
    unitId: fragile.id,
    mode: "learn",
    date: "2026-09-09",
    passed: true,
    minutes: 15,
    recallQuality: "exact",
  });
  s.focus.sessions.push({
    unitId: repair.id,
    mode: "learn",
    date: "2026-09-09",
    passed: false,
    minutes: 15,
    recallQuality: "partial",
  });
  assert.deepEqual(
    makeFocusDay(
      { ...data, units: [firm, fragile, repair] },
      s,
      "2026-09-10",
    ).review.map((u) => u.id),
    [repair.id, fragile.id, firm.id],
  );
});
