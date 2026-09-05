import { addDays, localDate } from "./study.js";
import { emptyFocusState } from "./focus-state.js";

export const memoryKey = (palace, station) => `${palace.id}-${station.id}`;

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
