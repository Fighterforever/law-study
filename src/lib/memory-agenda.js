import { distance } from "./study.js";
import {
  newCompanyQuest,
  questReviewDue,
  immediateQuestions,
  delayedQuestions,
} from "./company-quest.js";
import {
  newInsuranceQuest,
  startInsuranceQuiz,
  insuranceQuestionsFor,
  insuranceReviewDue,
} from "./insurance-quest.js";
import {
  newInsuranceClocks,
  startClocksQuiz,
  clocksReviewDue,
  clockQuestions,
} from "./insurance-clocks.js";
import {
  newJurisdictionQuest,
  startJurisdictionQuiz,
  jurisdictionReviewDue,
  jurisdictionQuestions,
} from "./jurisdiction-quest.js";

export const memoryTasks = [
  {
    id: "company",
    key: "companyQuest",
    path: "#/focus/memory/company-case",
    place: "商事事务所",
    title: "这封失权通知，今天能发吗？",
    short: "催缴与失权",
    summary: "审查催缴，圈出失权范围，再处理两条后续线。",
    art: "commercial-study.png",
    minutes: 12,
  },
  {
    id: "insurance",
    key: "insuranceQuest",
    path: "#/focus/memory/insurance-case",
    place: "保险档案室 · 对照台",
    title: "只变一个事实，保险后果如何变化？",
    short: "告知与解除",
    summary: "把解除、拒赔和退费分别判断。",
    art: "insurance-archive.png",
    minutes: 8,
  },
  {
    id: "clocks",
    key: "insuranceClocks",
    path: "#/focus/memory/insurance-clocks",
    place: "保险档案室 · 时间线",
    title: "同样是两年，究竟看哪只钟？",
    short: "两年与现金价值",
    summary: "用交费账本与复效时间轴拆开相同数字。",
    art: "insurance-archive.png",
    minutes: 8,
  },
  {
    id: "jurisdiction",
    key: "jurisdictionQuest",
    path: "#/focus/memory/jurisdiction-case",
    place: "港城书院",
    title: "同一纠纷，两条程序。",
    short: "中止与驳回",
    summary: "逐项找出条件缺口，分清返回中国法院的路径。",
    art: "jurisdiction-harbor.png",
    minutes: 8,
  },
];

function taskRecord(task, state, today) {
  const q = state.focus?.[task.key];
  const phase = q?.phase || q?.view;
  const history = q?.history || [];
  const last = history.at(-1);
  const firstToday = history.find((r) => r.date === today);
  const delayedToday = history.find(
    (r) => r.date === today && (r.mode === "delayed" || r.kind === "delayed"),
  );
  const due =
    task.id === "company"
      ? questReviewDue(q, today)
      : task.id === "clocks"
        ? clocksReviewDue(q, today)
        : task.id === "jurisdiction"
          ? jurisdictionReviewDue(q, today)
          : insuranceReviewDue(q, today);
  const results = task.id === "company" ? q?.quizResults : q?.results;
  const kind =
    q?.mode === "delayed" || q?.quizKind === "delayed"
      ? "delayed"
      : "immediate";
  const bank =
    task.id === "company"
      ? kind === "delayed"
        ? delayedQuestions
        : immediateQuestions
      : task.id === "insurance"
        ? insuranceQuestionsFor(q || { quizKind: "immediate" })
        : task.id === "clocks"
          ? clockQuestions[kind]
          : jurisdictionQuestions[kind];
  const errors = (results || []).flatMap((r, i) =>
    r.correct ? [] : [bank[i].label],
  );
  let status, action, reason, rank;
  if (phase === "quiz") {
    status = "闭卷题尚未完成";
    action = "resume";
    rank = 0;
    reason = `继续第 ${q.quizIndex + 1}/3 题，保留已提交的答案。`;
  } else if (due) {
    status = "隔日变式";
    action = "review";
    rank = 1;
    reason = "先离开场景做另一组变式，再决定哪里需要补讲。";
  } else if (last?.date === today && last.correct < 3) {
    status = "先补本轮错点";
    action = "repair";
    rank = 2;
    reason = errors.length
      ? errors.join("；")
      : "打开本轮复盘，核对没有分清的条件。";
  } else if (q && phase !== "summary") {
    status = "场景任务待续";
    action = "resume";
    rank = 3;
    reason = "从保存的案情继续，也可以直接进入闭卷题。";
  } else if (!q) {
    status = "尚未开始";
    action = "learn";
    rank = 4;
    reason =
      task.id === "jurisdiction"
        ? "你有民诉基础，可以先用三题查漏。"
        : task.summary;
  } else {
    status = "今天已复习";
    action = "summary";
    rank = 5;
    reason = "本轮完成，换一个主题练习。";
  }
  return {
    ...task,
    q,
    status,
    action,
    reason,
    rank,
    errors,
    firstToday: firstToday?.correct,
    delayedToday: delayedToday?.correct,
    last,
    due,
  };
}

export function memoryAgenda(state, today, examDate) {
  const daysLeft = distance(today, examDate);
  const finalReview = daysLeft > 0 && daysLeft <= 2;
  const examReached = daysLeft <= 0;
  const tasks = memoryTasks.map((task) => taskRecord(task, state, today));
  const ordered = [...tasks].sort((a, b) => a.rank - b.rank);
  // 最后两天不推荐新的长场景；已存在的任务和所有资料仍可自由进入。
  const next = examReached
    ? null
    : ordered.find((t) => t.rank < 5 && !(finalReview && t.action === "learn"));
  return {
    tasks,
    next,
    finalReview,
    examReached,
    daysLeft,
    due: tasks.filter((t) => t.due).length,
    completedToday: tasks.filter((t) => t.firstToday !== undefined).length,
  };
}

// 此入口只衔接各任务现有的闭卷流程，不建立第二份进度。
export function agendaQuiz(task, q, review = false) {
  if ((q?.phase || q?.view) === "quiz") return q;
  if (task.id === "company") {
    if (review) return newCompanyQuest("delayed", q?.history || []);
    if (q && q.phase !== "summary")
      return { ...q, phase: "quiz", feedback: null };
    return newCompanyQuest("quiz", q?.history || []);
  }
  if (task.id === "insurance")
    return startInsuranceQuiz(
      q || newInsuranceQuest(),
      Math.random,
      review ? "delayed" : "immediate",
    );
  if (task.id === "clocks")
    return startClocksQuiz(
      q || newInsuranceClocks(),
      review ? "delayed" : "immediate",
    );
  return startJurisdictionQuiz(
    q || newJurisdictionQuest(),
    review ? "delayed" : "immediate",
  );
}
