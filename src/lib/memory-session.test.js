import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMemorySession,
  advanceMemorySession,
  validMemorySession,
} from "./memory-session.js";
import { initialState, encodeState, decodeState } from "./study.js";

test("刷新备份保留乱序、草稿和提示，旧记录无练习草稿仍能载入", () => {
  const state = initialState("2026-09-05");
  state.focus.memorySession = {
    ...createMemorySession("focus-company", [2, 0, 1], "random"),
    notes: "先核查出资，再催缴。",
    hintLevel: 2,
    phase: "check",
    checks: [1, 0],
  };
  assert.deepEqual(decodeState(encodeState(state)), state);
  delete state.focus.memorySession;
  assert.equal(decodeState(encodeState(state)).focus.memorySession, null);
  assert.ok(validMemorySession(undefined));
});

test("未自评不能换站，换站清除提示和勾选但保留本轮结果", () => {
  const first = createMemorySession("focus-company", [2, 0], "random");
  assert.equal(advanceMemorySession(first), first);
  const graded = {
    ...first,
    notes: "本题草稿",
    hintLevel: 2,
    checks: [0],
    phase: "check",
    quality: "partial",
    transferOpen: true,
    transferRevealed: true,
    transferQuality: "exact",
    results: [
      {
        stationId: "desk",
        quality: "partial",
        assisted: true,
        transferQuality: "exact",
      },
    ],
  };
  const next = advanceMemorySession(graded);
  assert.equal(next.index, 1);
  assert.equal(next.notes, "");
  assert.equal(next.hintLevel, 0);
  assert.deepEqual(next.checks, []);
  assert.equal(next.transferOpen, false);
  assert.equal(next.transferQuality, "");
  assert.deepEqual(next.results, graded.results);
  assert.equal(
    advanceMemorySession({ ...next, quality: "exact" }).phase,
    "summary",
  );
  assert.equal(createMemorySession("focus-company", [0], "cued").hintLevel, 1);
});

test("导入拒绝重复或越界队列和错误评分，避免损坏续练", () => {
  const valid = createMemorySession("focus-company", [0, 1], "random");
  assert.ok(validMemorySession(valid));
  for (const patch of [
    { order: [0, 0] },
    { order: [-1] },
    { index: 2 },
    { hintLevel: 3 },
    { checks: [0, 0] },
    { quality: "mastered" },
  ]) {
    const state = initialState("2026-09-05");
    state.focus.memorySession = { ...valid, ...patch };
    assert.throws(() => decodeState(encodeState(state)));
  }
});

test("每个现有记忆位置都有对应动作、条件清单和变式，不遗漏或串站", () => {
  const data = JSON.parse(
    readFileSync(new URL("../data/focus.json", import.meta.url), "utf8"),
  );
  const guides = JSON.parse(
    readFileSync(
      new URL("../data/memory-guides.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    Object.keys(guides).sort(),
    data.palaces.map((p) => p.id).sort(),
  );
  for (const palace of data.palaces) {
    const guide = guides[palace.id];
    assert.deepEqual(
      Object.keys(guide.stations).sort(),
      palace.stations.map((s) => s.id).sort(),
    );
    for (const station of palace.stations) {
      const detail = guide.stations[station.id];
      assert.ok(detail.cue && detail.action && detail.trap);
      assert.ok(detail.checks.length > 0 && detail.checks.length <= 3);
      assert.ok(
        detail.checks.every((c) => typeof c === "string" && c.length > 0),
      );
      assert.ok(detail.transfer.prompt && detail.transfer.answer);
    }
  }
});
