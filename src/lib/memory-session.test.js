import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("规则与变式均自评后才能换站，换站清除提示但保留本轮结果", () => {
  const first = createMemorySession("focus-company", [2, 0], "random");
  assert.equal(advanceMemorySession(first), first);
  const ruleOnly = { ...first, quality: "exact" };
  assert.equal(advanceMemorySession(ruleOnly), ruleOnly);
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
    advanceMemorySession({
      ...next,
      quality: "exact",
      transferQuality: "partial",
    }).phase,
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

test("每个现有记忆位置都有动作、条件、近景和变式，不遗漏或串站", () => {
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
  const scenes = JSON.parse(
    readFileSync(
      new URL("../features/focus/memory/scene-art.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    Object.keys(scenes).sort(),
    data.palaces.map((p) => p.id).sort(),
  );
  assert.equal(
    new Set(Object.values(scenes).map((s) => s.file)).size,
    data.palaces.length,
  );
  const closeups = JSON.parse(
    readFileSync(
      new URL("../features/focus/memory/station-art.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    Object.keys(closeups).sort(),
    data.palaces.map((p) => p.id).sort(),
    "每条路线都必须有近景图集，不能遗漏或保留无对应路线的数据",
  );
  const hasText = (value) =>
    typeof value === "string" && value.trim().length > 0;
  const linkedUnits = new Set(data.palaces.flatMap((p) => p.unitIds));
  for (const unit of data.units.filter((u) =>
    ["focus-theory-supplement-1", "focus-criminal-supplement-2"].includes(
      u.paperId,
    ),
  ))
    assert.ok(linkedUnits.has(unit.id), `${unit.id} 补充考点缺少场景入口`);
  for (const palace of data.palaces) {
    const guide = guides[palace.id];
    const scene = scenes[palace.id];
    const closeup = closeups[palace.id];
    assert.ok(hasText(closeup.file), `${palace.id} 缺少近景图集文件名`);
    assert.ok(
      existsSync(
        new URL(
          `../../public/memory-stations/${closeup.file}`,
          import.meta.url,
        ),
      ),
      `${palace.id} 的近景图集文件不存在`,
    );
    assert.equal(closeup.columns, 2);
    assert.ok(
      [closeup.rows, closeup.width, closeup.height].every(
        (value) => Number.isInteger(value) && value > 0,
      ),
      `${palace.id} 的近景图集行数与尺寸必须为正整数`,
    );
    assert.deepEqual(
      Object.keys(closeup.stations).sort(),
      palace.stations.map((s) => s.id).sort(),
      `${palace.id} 的近景必须与现有站点一一对应`,
    );
    assert.ok(
      palace.stations.some((s) => s.id === closeup.contrast.stationId),
      `${palace.id} 的近景对照须指向现有站点`,
    );
    for (const field of [
      "before",
      "after",
      "question",
      "explanation",
      "beforeLabel",
      "afterLabel",
    ])
      assert.ok(
        hasText(closeup.contrast[field]),
        `${palace.id} 的近景对照缺少 ${field}`,
      );
    const frames = [
      ...Object.values(closeup.stations).map((s) => s.frame),
      closeup.contrast.frame,
    ];
    assert.ok(
      frames.every(
        (frame) =>
          Number.isInteger(frame) &&
          frame >= 0 &&
          frame < closeup.columns * closeup.rows,
      ),
      `${palace.id} 的近景帧索引必须为图集范围内的整数`,
    );
    assert.equal(
      new Set(frames).size,
      frames.length,
      `${palace.id} 的站点与对照不能共用同一帧`,
    );
    for (const frame of frames) {
      const [x, y, width, height] = closeup.frames[frame];
      assert.ok(
        [x, y, width, height].every(Number.isInteger) &&
          x >= 0 &&
          y >= 0 &&
          width > 0 &&
          height > 0 &&
          x + width <= closeup.width &&
          y + height <= closeup.height,
        `${palace.id} 第 ${frame + 1} 帧必须落在实际图像内`,
      );
    }
    assert.ok(
      existsSync(
        new URL(`../../public/memory-scenes/${scene.file}`, import.meta.url),
      ),
    );
    assert.equal(scene.points.length, palace.stations.length);
    assert.equal(scene.landmarks.length, palace.stations.length);
    assert.ok(
      scene.points.every(
        (point) =>
          point.length === 2 &&
          point.every(
            (value) => Number.isFinite(value) && value > 0 && value < 100,
          ),
      ),
    );
    assert.deepEqual(
      Object.keys(guide.stations).sort(),
      palace.stations.map((s) => s.id).sort(),
    );
    if (palace.stations.some((s) => s.unitIds)) {
      assert.deepEqual(
        [...new Set(palace.stations.flatMap((s) => s.unitIds))].sort(),
        [...palace.unitIds].sort(),
        `${palace.id} 的考点入口必须有对应位置`,
      );
      for (const station of palace.stations)
        assert.ok(
          station.unitIds.length &&
            station.unitIds.every((id) => palace.unitIds.includes(id)),
        );
    }
    for (const station of palace.stations) {
      const detail = guide.stations[station.id];
      const shot = closeup.stations[station.id];
      assert.ok(
        hasText(shot.object) && hasText(shot.viewpoint),
        `${palace.id}/${station.id} 缺少近景物件或站位说明`,
      );
      assert.ok(detail.cue && detail.action && detail.trap);
      assert.ok(detail.checks.length > 0 && detail.checks.length <= 4);
      assert.ok(
        detail.checks.every((c) => typeof c === "string" && c.length > 0),
      );
      assert.ok(detail.transfer.prompt && detail.transfer.answer);
    }
  }
});
