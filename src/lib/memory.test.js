import test from "node:test";
import assert from "node:assert/strict";
import { initialState, encodeState, decodeState } from "./study.js";
import {
  memoryKey,
  stationProgress,
  palaceProgress,
  makeMemoryQueue,
  saveMemoryRating,
  memoryLinksForUnits,
  memoryStudySuggestion,
} from "./memory.js";

const today = "2026-09-06";
const examDate = "2026-09-12";
const palace = {
  id: "memory-company",
  stations: ["door", "desk", "stairs", "window"].map((id) => ({ id })),
};
const rating = (date, quality = "exact", assisted = false) => ({
  date,
  quality,
  assisted,
});

test("宫殿入口定位关联站点；推荐跟随今日考点，优先续练与隔日复测", () => {
  const data = {
    palaces: [
      { id: "old", unitIds: ["old-unit"], stations: [{ id: "door" }] },
      {
        id: "new",
        unitIds: ["a", "b"],
        stations: [
          { id: "a-stop", unitIds: ["a"] },
          { id: "b-stop", unitIds: ["b"] },
        ],
      },
    ],
  };
  const state = initialState(today);
  const day = { paused: false, remaining: 6, review: [], learn: [{ id: "b" }] };
  assert.deepEqual(
    memoryLinksForUnits(data, ["b"])[0].stations.map((s) => s.id),
    ["b-stop"],
  );
  assert.equal(memoryLinksForUnits(data, ["missing"]).length, 0);
  assert.equal(
    memoryLinksForUnits(data, ["old-unit"])[0].stations[0].id,
    "door",
  );
  const next = memoryStudySuggestion(data, state, today, examDate, day);
  assert.equal(next.palace.id, "new");
  assert.equal(next.station.id, "b-stop");
  assert.equal(
    memoryStudySuggestion(data, state, today, examDate, {
      ...day,
      remaining: 2,
    }),
    null,
  );
  state.focus.palace["old-door"] = rating("2026-09-05");
  assert.equal(
    memoryStudySuggestion(data, state, today, examDate, day).kind,
    "review",
  );
  delete state.focus.palace["old-door"];
  state.focus.palace["new-a-stop"] = rating("2026-09-05");
  assert.deepEqual(
    memoryStudySuggestion(data, state, today, examDate, {
      ...day,
      remaining: 2,
    }).order,
    [0],
    "到期推荐只抽已学位置，不能顺带追加同场景的全新站",
  );
  state.focus.memorySession = {
    palaceId: "new",
    phase: "recall",
    index: 0,
    order: [1],
  };
  assert.equal(
    memoryStudySuggestion(data, state, today, examDate, day).kind,
    "resume",
  );
  assert.equal(
    memoryStudySuggestion(data, state, examDate, examDate, day),
    null,
  );
});

test("闭卷通过只说明本次表现，次日复测；提示和漏项保持待修补", () => {
  assert.deepEqual(stationProgress(undefined, today, examDate), {
    status: "new",
    label: "还没练",
    due: null,
  });
  assert.deepEqual(stationProgress(rating(today), today, examDate), {
    status: "ready",
    label: "本次闭卷通过",
    due: "2026-09-07",
  });
  assert.equal(
    stationProgress(rating(today), "2026-09-07", examDate).status,
    "due",
  );
  for (const record of [
    rating(today, "partial"),
    rating(today, "forgot"),
    rating(today, "exact", true),
  ]) {
    assert.equal(stationProgress(record, today, examDate).status, "repair");
    assert.equal(stationProgress(record, today, examDate).due, "2026-09-07");
    assert.equal(
      stationProgress(record, "2026-09-07", examDate).status,
      "repair",
    );
  }
  const lastDay = stationProgress(rating("2026-09-11"), "2026-09-11", examDate);
  assert.equal(lastDay.due, "2026-09-11");
  assert.equal(lastDay.status, "ready");
});

test("进度区分练过、最近闭卷通过和到期，不把提示完成算作独立回忆", () => {
  let state = initialState(today);
  state.focus.palace[memoryKey(palace, palace.stations[0])] = rating(today);
  state.focus.palace[memoryKey(palace, palace.stations[1])] = rating(
    "2026-09-05",
    "exact",
    true,
  );
  state.focus.palace[memoryKey(palace, palace.stations[2])] =
    rating("2026-09-05");
  assert.deepEqual(palaceProgress(palace, state, today, examDate), {
    total: 4,
    practiced: 3,
    independent: 2,
    repair: 1,
    due: 2,
    progress: 50,
  });
  state = saveMemoryRating(
    state,
    palace,
    palace.stations[1],
    { quality: "exact", assisted: false },
    today,
  );
  assert.equal(palaceProgress(palace, state, today, examDate).due, 1);
  assert.equal(palaceProgress(palace, state, today, examDate).repair, 0);
  assert.equal(palaceProgress({ stations: [] }, state, today).progress, 0);
});

test("顺序遍历全部位置，乱序不漏不重，弱项优先修补并跳过当天闭卷通过", () => {
  const state = initialState(today);
  state.focus.palace[memoryKey(palace, palace.stations[0])] = rating(today);
  state.focus.palace[memoryKey(palace, palace.stations[2])] =
    rating("2026-09-05");
  state.focus.palace[memoryKey(palace, palace.stations[3])] = rating(
    today,
    "partial",
  );
  const original = structuredClone(palace);
  assert.deepEqual(
    makeMemoryQueue(palace, state, today, examDate),
    [0, 1, 2, 3],
  );
  assert.deepEqual(
    makeMemoryQueue(palace, state, today, examDate, "weak"),
    [3, 2, 1],
  );
  const random = makeMemoryQueue(
    palace,
    state,
    today,
    examDate,
    "random",
    () => 0,
  );
  assert.deepEqual(random, [1, 2, 3, 0]);
  assert.deepEqual([...random].sort(), [0, 1, 2, 3]);
  assert.deepEqual(palace, original);
  const empty = initialState(today);
  assert.deepEqual(
    makeMemoryQueue(palace, empty, today, examDate, "weak"),
    [0, 1, 2, 3],
  );
});

test("新评分覆盖同一位置的最近记录，保留旧宫殿及其他学习数据并兼容导入", () => {
  const old = initialState(today);
  delete old.focus;
  let state = saveMemoryRating(
    old,
    palace,
    palace.stations[0],
    { quality: "partial", assisted: true },
    today,
  );
  assert.equal(old.focus, undefined);
  state.focus.palace["legacy-guarantee-1"] = rating("2026-09-05");
  state.focus.bookmarks = ["focus-company-personality"];
  const before = structuredClone(state);
  const saved = saveMemoryRating(
    state,
    palace,
    palace.stations[0],
    { quality: "exact", assisted: false },
    "2026-09-07",
  );
  assert.deepEqual(state, before);
  assert.deepEqual(saved.focus.palace[memoryKey(palace, palace.stations[0])], {
    date: "2026-09-07",
    quality: "exact",
    assisted: false,
  });
  assert.deepEqual(
    saved.focus.palace["legacy-guarantee-1"],
    rating("2026-09-05"),
  );
  assert.deepEqual(saved.focus.bookmarks, before.focus.bookmarks);
  assert.equal(saved.settings, state.settings);
  assert.deepEqual(decodeState(encodeState(saved)), saved);
});
