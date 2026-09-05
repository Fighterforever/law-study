import test from "node:test";
import assert from "node:assert/strict";
import {
  jurisdictionBase,
  jurisdictionDecision,
  jurisdictionGates,
  newJurisdictionQuest,
  editJurisdiction,
  switchJurisdiction,
  revealJurisdiction,
  jurisdictionQuestions,
  startJurisdictionQuiz,
  submitJurisdictionQuiz,
  nextJurisdictionQuiz,
  jurisdictionReviewDue,
  validJurisdictionQuest,
} from "./jurisdiction-quest.js";
import { initialState, validDate, encodeState, decodeState } from "./study.js";

test("非方便法院：启动及每个必要条件均不能由其余条件补偿", () => {
  const f = jurisdictionBase("dismiss");
  assert.equal(jurisdictionDecision("dismiss", f), "dismiss");
  for (const key of [
    "objection",
    "abroad",
    "trialHard",
    "partyHard",
    "chinaAgreement",
    "exclusive",
    "publicInterest",
    "foreignEasier",
  ])
    assert.equal(
      jurisdictionDecision("dismiss", { ...f, [key]: !f[key] }),
      "unavailable",
      key,
    );
  const missing = jurisdictionGates("dismiss", {
    ...f,
    partyHard: false,
    chinaAgreement: true,
  }).filter((g) => !g.pass);
  assert.deepEqual(
    missing.map((g) => g.id),
    ["location", "agreement"],
  );
  assert.equal(
    jurisdictionDecision("dismiss", {
      ...f,
      partyHard: true,
      chinaAgreement: true,
    }),
    "unavailable",
  );
});
test("外国在先中止：书面申请、三类例外分别审查，不要求五项非方便条件", () => {
  const f = jurisdictionBase("stay");
  assert.equal(jurisdictionDecision("stay", f), "stay");
  for (const key of [
    "foreignFirst",
    "written",
    "chinaAgreement",
    "exclusive",
    "chinaEasier",
  ])
    assert.equal(
      jurisdictionDecision("stay", { ...f, [key]: !f[key] }),
      "unavailable",
      key,
    );
  assert.equal(
    jurisdictionDecision("stay", {
      ...f,
      objection: false,
      abroad: false,
      trialHard: false,
      partyHard: false,
    }),
    "stay",
  );
});
test("改变一项事实撤去答案；两条程序使用独立案卷且保留原错误", () => {
  let q = revealJurisdiction(
    { ...newJurisdictionQuest(), choice: "stay" },
    "2026-09-05",
  );
  assert.equal(q.attempts[0].correct, false);
  assert.equal(revealJurisdiction(q, "2026-09-05").attempts.length, 1);
  const changed = editJurisdiction(q, "chinaAgreement", true);
  assert.equal(changed.choice, "");
  assert.equal(changed.revealed, false);
  assert.equal(changed.attempts[0].facts.chinaAgreement, false);
  assert.deepEqual(
    Object.keys(changed.facts).filter((k) => changed.facts[k] !== q.facts[k]),
    ["chinaAgreement"],
  );
  q = switchJurisdiction(changed, "stay");
  assert.deepEqual(q.facts, jurisdictionBase("stay"));
  assert.equal(q.attempts.length, 1);
});
function complete(kind, date, q = newJurisdictionQuest()) {
  q = startJurisdictionQuiz(q, kind, () => 0.4);
  for (const item of jurisdictionQuestions[kind]) {
    q = submitJurisdictionQuiz({ ...q, selected: item.answers });
    q = nextJurisdictionQuiz(q, date);
  }
  return q;
}
test("闭卷漏选不通过，首次结果不能被订正覆盖；次日与同日重做分开", () => {
  let q = startJurisdictionQuiz(newJurisdictionQuest());
  q = submitJurisdictionQuiz({ ...q, selected: [1] });
  assert.equal(q.results[0].correct, false);
  assert.equal(
    submitJurisdictionQuiz({ ...q, selected: [1, 2] }).results[0].correct,
    false,
  );
  const a = complete("immediate", "2026-09-05");
  assert.equal(jurisdictionReviewDue(a, "2026-09-05"), false);
  assert.equal(jurisdictionReviewDue(a, "2026-09-06"), true);
  const b = complete("delayed", "2026-09-06", a);
  assert.equal(jurisdictionReviewDue(b, "2026-09-06"), false);
  assert.equal(nextJurisdictionQuiz(b, "2026-09-06").history.length, 2);
  assert.ok(
    jurisdictionQuestions.delayed.every(
      (x) => !jurisdictionQuestions.immediate.some((y) => x.stem === y.stem),
    ),
  );
});
test("旧备份兼容，案卷和闭卷可恢复；损坏事实与残缺揭晓不导入", () => {
  const s = initialState("2026-09-05");
  delete s.focus.jurisdictionQuest;
  assert.equal(decodeState(encodeState(s)).focus.jurisdictionQuest, null);
  s.focus.jurisdictionQuest = complete("immediate", "2026-09-05");
  assert.deepEqual(
    decodeState(encodeState(s)).focus.jurisdictionQuest,
    s.focus.jurisdictionQuest,
  );
  const q = newJurisdictionQuest();
  assert.ok(validJurisdictionQuest(q, validDate));
  for (const bad of [
    { ...q, facts: {} },
    { ...q, order: [0, 1, 1, 3] },
    { ...q, revealed: true, choice: "dismiss" },
    { ...q, view: "summary" },
  ])
    assert.equal(validJurisdictionQuest(bad, validDate), false);
});
