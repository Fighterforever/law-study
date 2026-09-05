import { validMemorySession } from "./memory-session.js";
import { validCompanyQuest } from "./company-quest.js";
import { validInsuranceQuest } from "./insurance-quest.js";
import { validInsuranceClocks } from "./insurance-clocks.js";
import { validJurisdictionQuest } from "./jurisdiction-quest.js";

export const emptyFocusState = () => ({
  enabled: true,
  learned: {},
  attempts: [],
  sessions: [],
  bookmarks: [],
  draft: null,
  palace: {},
  memorySession: null,
  companyQuest: null,
  insuranceQuest: null,
  insuranceClocks: null,
  jurisdictionQuest: null,
});

export function validateFocusState(value, validDate) {
  if (value === undefined) return emptyFocusState();
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const id = (v) => typeof v === "string" && /^[a-z0-9-]{1,160}$/.test(v);
  const list = (v, max, check) =>
    Array.isArray(v) && v.length <= max && v.every(check);
  const indices = (v) =>
    list(v, 20, (n) => Number.isInteger(n) && n >= 0 && n < 20) &&
    new Set(v).size === v.length;
  const quality = (v) => ["exact", "partial", "forgot"].includes(v);
  const result = (a) =>
    obj(a) &&
    id(a.itemId) &&
    typeof a.correct === "boolean" &&
    typeof a.hint === "boolean" &&
    indices(a.selected);
  if (
    !obj(value) ||
    typeof value.enabled !== "boolean" ||
    !obj(value.learned) ||
    Object.keys(value.learned).length > 2000 ||
    !Object.entries(value.learned).every(([k, v]) => id(k) && validDate(v)) ||
    !list(value.bookmarks, 2000, id) ||
    !list(
      value.attempts,
      100000,
      (a) =>
        result(a) &&
        id(a.unitId) &&
        validDate(a.date) &&
        typeof a.at === "string" &&
        Number.isFinite(Date.parse(a.at)),
    ) ||
    !list(
      value.sessions,
      20000,
      (s) =>
        obj(s) &&
        id(s.unitId) &&
        validDate(s.date) &&
        ["learn", "review"].includes(s.mode) &&
        typeof s.passed === "boolean" &&
        Number.isFinite(s.minutes) &&
        s.minutes >= 0 &&
        s.minutes <= 600 &&
        quality(s.recallQuality),
    ) ||
    !obj(value.palace) ||
    Object.keys(value.palace).length > 3000 ||
    !Object.entries(value.palace).every(
      ([k, v]) =>
        id(k) &&
        obj(v) &&
        validDate(v.date) &&
        quality(v.quality) &&
        typeof v.assisted === "boolean",
    )
  ) {
    throw new Error("考前聚焦记录格式不正确，未导入。请使用本站导出的备份。");
  }
  const d = value.draft;
  if (
    d !== null &&
    (!obj(d) ||
      !id(d.unitId) ||
      !["learn", "review"].includes(d.mode) ||
      !["read", "recall", "quiz", "done"].includes(d.phase) ||
      !Number.isInteger(d.questionIndex) ||
      d.questionIndex < 0 ||
      d.questionIndex > 100 ||
      !indices(d.selected) ||
      !indices(d.optionOrder) ||
      !d.optionOrder.length ||
      !d.optionOrder.every((n) => n < d.optionOrder.length) ||
      !list(d.results, 100, result) ||
      !["", "exact", "partial", "forgot"].includes(d.recallQuality) ||
      typeof d.hint !== "boolean" ||
      typeof d.revealed !== "boolean" ||
      typeof d.recallText !== "string" ||
      d.recallText.length > 10000 ||
      !["", "sure", "uncertain"].includes(d.confidence))
  ) {
    throw new Error("考前聚焦的答题草稿不完整，未导入。");
  }
  if (!validMemorySession(value.memorySession)) {
    throw new Error("记忆宫殿的练习记录不完整，未导入。请使用本站导出的备份。");
  }
  if (!validCompanyQuest(value.companyQuest, validDate)) {
    throw new Error("案件任务的学习记录不完整，未导入。请使用本站导出的备份。");
  }
  if (!validInsuranceQuest(value.insuranceQuest, validDate)) {
    throw new Error(
      "保险对照任务的学习记录不完整，未导入。请使用本站导出的备份。",
    );
  }
  if (!validInsuranceClocks(value.insuranceClocks, validDate)) {
    throw new Error(
      "保险时间线的学习记录不完整，未导入。请使用本站导出的备份。",
    );
  }
  if (!validJurisdictionQuest(value.jurisdictionQuest, validDate)) {
    throw new Error("涉外案件任务的记录不完整，未导入。请使用本站导出的备份。");
  }
  return {
    ...value,
    memorySession: value.memorySession ?? null,
    companyQuest: value.companyQuest ?? null,
    insuranceQuest: value.insuranceQuest ?? null,
    insuranceClocks: value.insuranceClocks ?? null,
    jurisdictionQuest: value.jurisdictionQuest ?? null,
  };
}
