export const QUEST_PATH = "#/focus/memory/company-case";
export const QUEST_UNIT = "focus-commercial-contribution-loss";
export const QUEST_STAGES = [
  "draft",
  "decision",
  "scope",
  "branches",
  "variation",
  "quiz",
  "summary",
];

export function newCompanyQuest(mode, history = [], random = Math.random) {
  const order = () => {
    const items = [0, 1, 2, 3];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  return {
    phase: mode === "delayed" || mode === "quiz" ? "quiz" : "draft",
    mode,
    form: {
      document: "",
      grace: 0,
      start: "",
      elapsed: 0,
      authority: "",
      shares: [],
      effect: "",
      disposal: "",
      months: 0,
      fallback: "",
      appealStart: "",
      appealDays: 0,
      variation: ["", "", ""],
    },
    checks: {},
    hints: [],
    feedback: null,
    quizIndex: 0,
    quizOrder: [order(), order(), order()],
    quizSelected: [],
    quizResults: [],
    history,
  };
}

export function gradeDraft({ document, grace, start }) {
  const errors = [];
  if (document !== "written")
    errors.push("公司应发出书面催缴书，电话催款不能代替这份法定文书。");
  if (grace < 60)
    errors.push(
      "宽限期不得少于 60 日。60 日和 90 日都可以；最低期间不等于固定期间。",
    );
  if (start !== "sent")
    errors.push("宽限期自催缴书发出之日起计算。请把起点放回‘发出’。");
  return errors;
}

export function issueConditions({ grace, elapsed, paid, authority }) {
  const errors = [];
  if (elapsed < grace)
    errors.push(
      `本案给予 ${grace} 日宽限期，目前尚未届满。先等本案实际宽限期届满。`,
    );
  if (paid)
    errors.push(
      "股东已足额补缴，不再符合‘宽限期届满仍未履行出资义务’这一条件。",
    );
  if (authority !== "board")
    errors.push(
      "决定失权须经董事会决议，经理签字和股东会表决都不能替代这一法定环节。",
    );
  return errors;
}

export function gradeQuestStep(key, f) {
  if (key === "draft") return gradeDraft(f);
  if (key === "decision") return issueConditions({ ...f, paid: false });
  if (key === "scope") {
    const errors = [];
    if (
      f.shares.length !== 4 ||
      ![6, 7, 8, 9].every((i) => f.shares.includes(i))
    )
      errors.push(
        "失权范围是未缴的 40 万元所对应股权。甲已缴的 60 万元对应股权保留；请只选四格未缴部分。",
      );
    if (f.effect !== "sent")
      errors.push(
        "书面失权通知一经发出，就发生相应股权丧失的效果；收到通知另与起诉期间有关。",
      );
    return errors;
  }
  if (key === "company") {
    const errors = [];
    if (!["transfer", "reduce"].includes(f.disposal))
      errors.push(
        "依法转让，或相应减少注册资本并注销该股权，都是法定处置路径；不能只把股权永久搁置。",
      );
    if (f.months !== 6)
      errors.push("失权股权的处置期间为六个月。不要与股东起诉的三十日混淆。");
    if (f.fallback !== "proportion")
      errors.push(
        "六个月内未转让或者注销的，由其他股东按照各自出资比例足额缴纳相应出资。",
      );
    return errors;
  }
  if (key === "shareholder") {
    const errors = [];
    if (f.appealStart !== "received")
      errors.push(
        "股东异议起诉从接到失权通知起算；发出产生失权效果，接到启动起诉期间。",
      );
    if (f.appealDays !== 30)
      errors.push("股东应自接到失权通知之日起三十日内向人民法院起诉。");
    return errors;
  }
  if (key === "variation") {
    const errors = [];
    if (f.variation[0] !== "invalid")
      errors.push("改成 59 日：低于法定最低宽限期，不能按这份方案推进失权。");
    if (f.variation[1] !== "stop")
      errors.push("届满前已经足额补缴：失权的前提不再成立，停止这条失权流程。");
    if (f.variation[2] !== "appeal")
      errors.push(
        "失权通知晚几天接到：异议起诉期间的起点随接到日后移；失权生效仍看发出日。",
      );
    return errors;
  }
  return [];
}

export function checkQuestStep(q, key) {
  const errors = gradeQuestStep(key, q.form);
  const previous = q.checks[key];
  return {
    ...q,
    checks: {
      ...q.checks,
      [key]: {
        first: previous?.first ?? errors.length === 0,
        correct: errors.length === 0,
        tries: (previous?.tries || 0) + 1,
      },
    },
    feedback: { key, errors },
  };
}

export function editQuestForm(q, patch) {
  const fields = {
    draft: ["document", "grace", "start"],
    decision: ["elapsed", "authority"],
    scope: ["shares", "effect"],
    company: ["disposal", "months", "fallback"],
    shareholder: ["appealStart", "appealDays"],
    variation: ["variation"],
  };
  const checks = { ...q.checks };
  for (const [key, names] of Object.entries(fields)) {
    if (checks[key] && names.some((name) => Object.hasOwn(patch, name)))
      checks[key] = { ...checks[key], correct: false };
  }
  return { ...q, form: { ...q.form, ...patch }, checks, feedback: null };
}

export const immediateQuestions = [
  {
    stem: "青禾有限责任公司股东甲认缴 200 万元，已缴 120 万元，出资期限已届满。公司发出书面催缴书并给予 90 日宽限期。该宽限期届满时甲仍未补缴。关于公司失权处理，下列哪些说法正确？",
    options: [
      "宽限期超过 60 日，不符合公司法规定",
      "经董事会决议，公司可以向甲发出书面失权通知",
      "甲丧失的股权范围为未缴 80 万元所对应的股权",
      "甲的全部股权自宽限期届满时自动丧失",
    ],
    answers: [1, 2],
    explanations: [
      "60 日是最低宽限期，给予 90 日合法。",
      "届满仍未履行，经董事会决议，才能发出书面失权通知。",
      "未缴多少，就对应该部分股权；已缴部分保留。",
      "届满本身不产生失权效果，仍须董事会决议及书面失权通知。",
    ],
    label: "前置条件与失权范围",
  },
  {
    stem: "公司依法于 8 月 1 日向乙发出书面失权通知，乙于 8 月 5 日接到。下列哪些说法正确？",
    options: [
      "相应股权自 8 月 1 日起丧失",
      "股东异议起诉期间自 8 月 1 日起算",
      "乙应自 8 月 5 日接到通知之日起 30 日内起诉",
      "异议起诉须等公司完成失权股权处置后才能提出",
    ],
    answers: [0, 2],
    explanations: [
      "失权效果自书面通知发出之日起发生。",
      "起诉期间从接到通知起算。",
      "接到通知是三十日起诉期间的起点。",
      "股东救济与公司的股权处置是两条后续线，不以处置完成为起诉前提。",
    ],
    label: "发出与接到",
  },
  {
    stem: "丙依法丧失未缴出资对应股权后，关于该股权的后续处理，下列哪些说法正确？",
    options: [
      "公司只能转让，不得依法相应减资并注销",
      "公司可以依法转让该股权",
      "公司可以相应减少注册资本并注销该股权",
      "六个月内未转让或者注销的，其他股东应按各自出资比例足额缴纳相应出资",
    ],
    answers: [1, 2, 3],
    explanations: [
      "依法转让和相应减资注销都是法定路径。",
      "依法转让可行。",
      "相应减资注销同样可行。",
      "六个月内未完成处置，其他股东按出资比例补缴。",
    ],
    label: "处置路径与补缴",
  },
];

export const delayedQuestions = [
  {
    stem: "远山有限责任公司股东丁认缴 100 万元，已缴 70 万元，剩余出资已到期。公司发出书面催缴书，给予 90 日宽限期。至第 60 日丁仍未补缴，董事会即决议向丁发出书面失权通知。下列哪些说法正确？",
    options: [
      "满足最低 60 日要求，今天即可按本案程序失权",
      "应等本案载明的 90 日宽限期届满，再核查履行情况",
      "如之后依法完成失权程序，丧失范围为未缴 30 万元对应股权",
      "一旦失权，已缴 70 万元对应股权也一并丧失",
    ],
    answers: [1, 2],
    explanations: [
      "最低期间不能取代实际给予的更长宽限期。",
      "本案选择了 90 日，须等该宽限期届满。",
      "失权只及于未缴部分。",
      "已缴部分不在本案失权范围内。",
    ],
    label: "实际宽限期与范围",
  },
  {
    stem: "戊此前到期欠缴出资，公司依法书面催缴，并给予 60 日宽限期。戊在该宽限期届满前已经足额补缴。关于后续处理，下列哪些说法正确？",
    options: [
      "不能仅凭此前逾期未缴，继续依本次催缴进入失权程序",
      "董事会可以决定将全部股权作为违约处罚予以取消",
      "‘宽限期届满仍未履行’这一条件已不成立",
      "无论是否补缴，书面催缴书发出满 60 日都会自动失权",
    ],
    answers: [0, 2],
    explanations: [
      "已经足额补缴，不能继续依该欠缴情形失权。",
      "董事会决议不能补足缺失的失权前提，也不能任意扩大范围。",
      "须核查届满时仍未履行，而不能只看此前逾期。",
      "没有自动失权规则，补缴情况还会改变案件走向。",
    ],
    label: "足额补缴后的条件变化",
  },
  {
    stem: "己依法收到失权通知，该通知发出日为 9 月 2 日，接到日为 9 月 8 日。公司拟相应减资并注销该股权。下列哪些说法正确？",
    options: [
      "相应减资并注销是可选择的法定路径",
      "异议起诉期间从 9 月 8 日接到通知起算，为 30 日",
      "须待己接到通知才发生失权效果",
      "六个月内未转让或者注销的，由其他股东按出资比例足额缴纳相应出资",
    ],
    answers: [0, 1, 3],
    explanations: [
      "转让与相应减资注销均可。",
      "起诉期间以接到通知为起点。",
      "失权效果自发出之日起发生，即本题 9 月 2 日。",
      "处置未完成时，适用其他股东按比例补缴规则。",
    ],
    label: "两条后续线",
  },
];

export const questionsFor = (q) =>
  q.mode === "delayed" ? delayedQuestions : immediateQuestions;

export function submitQuestQuiz(q) {
  if (q.quizResults[q.quizIndex]) return q;
  const item = questionsFor(q)[q.quizIndex];
  const selected = [...q.quizSelected];
  const correct =
    selected.length === item.answers.length &&
    item.answers.every((i) => selected.includes(i));
  return { ...q, quizResults: [...q.quizResults, { selected, correct }] };
}

export function finishQuest(q, date) {
  if (q.phase === "summary" || q.quizResults.length !== 3) return q;
  return {
    ...q,
    phase: "summary",
    history: [
      ...q.history,
      {
        date,
        mode: q.mode,
        correct: q.quizResults.filter((r) => r.correct).length,
        first: Object.values(q.checks).filter((r) => r.first).length,
        total: Object.keys(q.checks).length,
        hinted: q.hints.length > 0 || q.mode === "guided",
      },
    ].slice(-100),
  };
}

export function questReviewDue(q, today) {
  return (
    !!q?.history.some((r) => r.date < today) &&
    !q.history.some((r) => r.date === today && r.mode === "delayed")
  );
}

export function validCompanyQuest(q, validDate) {
  if (q == null) return true;
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const int = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  const list = (v, max, check) =>
    Array.isArray(v) && v.length <= max && v.every(check);
  const selection = (v, max) =>
    list(v, max, (n) => int(n, max - 1)) && new Set(v).size === v.length;
  const modes = ["guided", "independent", "quiz", "delayed"];
  const keys = [
    "draft",
    "decision",
    "scope",
    "company",
    "shareholder",
    "variation",
  ];
  if (
    !obj(q) ||
    !QUEST_STAGES.includes(q.phase) ||
    !modes.includes(q.mode) ||
    !obj(q.form) ||
    !obj(q.checks)
  )
    return false;
  const f = q.form;
  return (
    ["", "written", "phone"].includes(f.document) &&
    [0, 45, 60, 90].includes(f.grace) &&
    ["", "sent", "received"].includes(f.start) &&
    int(f.elapsed, 90) &&
    ["", "board", "manager", "shareholders"].includes(f.authority) &&
    selection(f.shares, 10) &&
    ["", "sent", "received"].includes(f.effect) &&
    ["", "transfer", "reduce", "hold"].includes(f.disposal) &&
    [0, 3, 6, 12].includes(f.months) &&
    ["", "proportion", "equal", "none"].includes(f.fallback) &&
    ["", "sent", "received", "disposed"].includes(f.appealStart) &&
    [0, 30, 60].includes(f.appealDays) &&
    list(f.variation, 3, (v) =>
      ["", "invalid", "valid", "stop", "continue", "appeal", "both"].includes(
        v,
      ),
    ) &&
    f.variation.length === 3 &&
    Object.entries(q.checks).every(
      ([k, r]) =>
        keys.includes(k) &&
        obj(r) &&
        typeof r.first === "boolean" &&
        typeof r.correct === "boolean" &&
        Number.isSafeInteger(r.tries) &&
        r.tries > 0,
    ) &&
    list(q.hints, 6, (k) => keys.includes(k)) &&
    (q.feedback === null ||
      (obj(q.feedback) &&
        keys.includes(q.feedback.key) &&
        Object.hasOwn(q.checks, q.feedback.key) &&
        list(
          q.feedback.errors,
          4,
          (s) => typeof s === "string" && s.length < 500,
        ))) &&
    int(q.quizIndex, 2) &&
    list(q.quizOrder, 3, (v) => selection(v, 4) && v.length === 4) &&
    q.quizOrder.length === 3 &&
    selection(q.quizSelected, 4) &&
    list(
      q.quizResults,
      3,
      (r) =>
        obj(r) && selection(r.selected, 4) && typeof r.correct === "boolean",
    ) &&
    q.quizResults.length >= q.quizIndex &&
    q.quizResults.length <= q.quizIndex + 1 &&
    (q.phase !== "summary" || q.quizResults.length === 3) &&
    list(
      q.history,
      100,
      (r) =>
        obj(r) &&
        validDate(r.date) &&
        modes.includes(r.mode) &&
        int(r.correct, 3) &&
        int(r.total, 6) &&
        int(r.first, r.total) &&
        typeof r.hinted === "boolean",
    ) &&
    (q.phase !== "summary" || q.history.length > 0)
  );
}
