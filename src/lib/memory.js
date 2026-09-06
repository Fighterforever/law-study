import { addDays, localDate } from "./study.js";
import { emptyFocusState } from "./focus-state.js";

export const memoryKey = (palace, station) => `${palace.id}-${station.id}`;

export function memoryLinksForUnits(data, unitIds) {
  return data.palaces.flatMap((palace) => {
    const matched = palace.unitIds.filter((id) => unitIds.includes(id));
    if (!matched.length) return [];
    const stations = palace.stations.filter((s) =>
      s.unitIds?.some((id) => matched.includes(id)),
    );
    return [{ palace, stations: stations.length ? stations : palace.stations }];
  });
}

// 场景是当天考点的记忆方法，入口沿用考点排课，不另加一份学习预算。
export function memoryStudySuggestion(data, state, today, examDate, focusDay) {
  if (today >= examDate) return null;
  const session = state.focus?.memorySession;
  const resume = data.palaces.find((p) => p.id === session?.palaceId);
  if (resume && session.phase !== "summary")
    return {
      palace: resume,
      kind: "resume",
      rank: 0,
      reason: `第 ${session.index + 1}/${session.order.length} 站，接着上次的草稿回忆。`,
    };
  const reviews = data.palaces
    .map((palace) => ({
      palace,
      progress: palaceProgress(palace, state, today, examDate),
    }))
    .filter(({ progress }) => progress.repair || progress.due)
    .sort(
      (a, b) =>
        Number(Boolean(b.progress.due)) - Number(Boolean(a.progress.due)) ||
        b.progress.repair - a.progress.repair,
    );
  if (reviews.length) {
    const { palace, progress } = reviews[0];
    return {
      palace,
      kind: "review",
      rank: progress.due ? 1 : 2,
      order: palace.stations.flatMap((station, index) => {
        const record = state.focus?.palace[memoryKey(palace, station)];
        const status = stationProgress(record, today, examDate).status;
        return record && ["repair", "due"].includes(status) ? [index] : [];
      }),
      reason: progress.due
        ? `${progress.due} 处今天到期，先关图回忆，再核对漏项。`
        : `${progress.repair} 处还没说全，先把缺少的条件补上。`,
    };
  }
  if (!focusDay || focusDay.paused) return null;
  for (const unit of [...focusDay.review, ...focusDay.learn]) {
    const [linked] = memoryLinksForUnits(data, [unit.id]);
    if (!linked) continue;
    const station = linked.stations.find(
      (s) =>
        stationProgress(
          state.focus?.palace[memoryKey(linked.palace, s)],
          today,
          examDate,
        ).status !== "ready",
    );
    if (!station) continue;
    // 最后两天只推荐已经练过的位置；新场景仍可自行查阅。
    if (
      focusDay.remaining <= 2 &&
      !state.focus?.palace[memoryKey(linked.palace, station)]
    )
      continue;
    return {
      palace: linked.palace,
      station,
      kind: "learn",
      rank: 4,
      reason: `配合今日「${unit.title}」，从这一站记住判断顺序；用完回到考点做题。`,
    };
  }
  return null;
}

export function stationProgress(record, today = localDate(), examDate = "") {
  if (!record) return { status: "new", label: "还没练", due: null };

  let due = addDays(record.date, 1);
  if (examDate && due >= examDate) due = addDays(examDate, -1);

  if (record.quality !== "exact" || record.assisted) {
    return {
      status: "repair",
      label: record.assisted
        ? "用过提示，再闭卷试一次"
        : record.quality === "partial"
          ? "漏了条件，补全再练"
          : "还没想起，重新串联",
      due,
    };
  }

  return record.date !== today && due <= today
    ? { status: "due", label: "今天复测", due }
    : { status: "ready", label: "本次闭卷通过", due };
}

export function palaceProgress(
  palace,
  state,
  today = localDate(),
  examDate = "",
) {
  const records = palace.stations.map(
    (station) => state.focus?.palace[memoryKey(palace, station)],
  );
  const statuses = records.map((record) =>
    stationProgress(record, today, examDate),
  );
  const total = palace.stations.length;
  const independent = records.filter(
    (record) => record?.quality === "exact" && !record.assisted,
  ).length;

  return {
    total,
    practiced: records.filter(Boolean).length,
    independent,
    repair: statuses.filter((item) => item.status === "repair").length,
    due: statuses.filter(
      (item, index) =>
        item.due && item.due <= today && records[index].date !== today,
    ).length,
    progress: total ? Math.round((independent / total) * 100) : 0,
  };
}

export function makeMemoryQueue(
  palace,
  state,
  today = localDate(),
  examDate = "",
  mode = "sequence",
  rng = Math.random,
) {
  const indices = palace.stations.map((_, index) => index);
  if (mode === "weak") {
    const statuses = palace.stations.map(
      (station) =>
        stationProgress(
          state.focus?.palace[memoryKey(palace, station)],
          today,
          examDate,
        ).status,
    );
    const priority = { repair: 0, due: 1, new: 2 };
    return indices
      .filter((index) => statuses[index] !== "ready")
      .sort((a, b) => priority[statuses[a]] - priority[statuses[b]]);
  }
  if (mode === "random") {
    for (let index = indices.length - 1; index > 0; index--) {
      const swap = Math.floor(rng() * (index + 1));
      [indices[index], indices[swap]] = [indices[swap], indices[index]];
    }
  }
  return indices;
}

export function saveMemoryRating(
  state,
  palace,
  station,
  { quality, assisted },
  today = localDate(),
) {
  const focus = state.focus || emptyFocusState();
  return {
    ...state,
    focus: {
      ...focus,
      palace: {
        ...focus.palace,
        [memoryKey(palace, station)]: { date: today, quality, assisted },
      },
    },
  };
}
