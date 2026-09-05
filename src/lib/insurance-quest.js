export const INSURANCE_PATH = "#/focus/memory/insurance-case";
export const insuranceBase = {
  fault: "intentional",
  serious: true,
  material: true,
  knownAtStart: false,
  knownDays: 10,
  months: 12,
};
export const insuranceFields = [
  {
    key: "fault",
    label: "未告知的主观状态",
    options: [
      ["intentional", "故意"],
      ["gross", "重大过失"],
    ],
  },
  {
    key: "serious",
    label: "未告知对事故发生",
    options: [
      [true, "有严重影响"],
      [false, "无严重影响"],
    ],
  },
  {
    key: "material",
    label: "未告知对承保或费率",
    options: [
      [true, "足以影响"],
      [false, "不足以影响"],
    ],
  },
  {
    key: "knownAtStart",
    label: "保险人订约时",
    options: [
      [false, "不知道未告知情况"],
      [true, "已知道未告知情况"],
    ],
  },
  {
    key: "knownDays",
    label: "知道解除事由后未行使",
    options: [
      [10, "10 日"],
      [31, "31 日"],
    ],
  },
  {
    key: "months",
    label: "合同成立至今",
    options: [
      [12, "12 个月"],
      [25, "25 个月"],
    ],
  },
];
export const insuranceOutcomes = {
  "deny-keep": {
    title: "可解除；拒赔且不退保险费",
    short: "不赔 · 不退保费",
    explanation:
      "故意未告知，且足以影响承保或费率；解除权仍存在时，保险人依法解除，对解除前事故不赔，也不退还保险费。",
  },
  "deny-refund": {
    title: "可解除；拒赔但退还保险费",
    short: "不赔 · 退保费",
    explanation:
      "重大过失未告知，既影响承保，又对事故发生有严重影响。依法解除后，对解除前事故不赔，但应退还保险费。",
  },
  "terminate-pay": {
    title: "可解除；仍须承担本次保险责任",
    short: "可解除 · 这次仍赔",
    explanation:
      "重大过失未告知已足以影响承保或费率，可产生解除权；对本次事故没有严重影响，就不能据此拒赔解除前的这次事故。",
  },
  "keep-pay": {
    title: "不得据此解除；承担本次保险责任",
    short: "不能解除 · 这次应赔",
    explanation:
      "先判断解除权是否成立、是否仍存在。没有这一前提，不能直接套用故意或重大过失的拒赔规则。",
  },
};
export function insuranceDecision(f) {
  const reasons = [];
  if (!f.material)
    reasons.push("未告知不足以影响承保决定或费率，欠缺产生解除权的条件。");
  if (f.knownAtStart)
    reasons.push("订约时保险人已经知道该情况，不能事后再以此解除。");
  if (f.knownDays > 30)
    reasons.push("知道解除事由后超过三十日未行使，解除权已经消灭。");
  if (f.months > 24)
    reasons.push("合同成立已超过二年，保险人不得再依这一未告知事由解除。");
  if (reasons.length) return { code: "keep-pay", reasons };
  const code =
    f.fault === "intentional"
      ? "deny-keep"
      : f.serious
        ? "deny-refund"
        : "terminate-pay";
  return { code, reasons: [insuranceOutcomes[code].explanation] };
}
const pair = (id, title, prompt, before, patch) => ({
  id,
  title,
  prompt,
  before,
  after: { ...before, ...patch },
});
export const insuranceComparisons = [
  pair(
    "fault",
    "故意 → 重大过失",
    "只改变主观状态，赔付和退费会怎样变化？",
    insuranceBase,
    { fault: "gross" },
  ),
  pair(
    "causation",
    "事故影响改变",
    "保持重大过失，只把对事故的严重影响拿掉。还能拒赔吗？",
    { ...insuranceBase, fault: "gross" },
    { serious: false },
  ),
  pair(
    "days",
    "知道后已过 31 日",
    "其余都保留，只改变保险人知道解除事由后的时间。",
    insuranceBase,
    { knownDays: 31 },
  ),
  pair(
    "years",
    "合同成立超过两年",
    "知道解除事由才 10 日，但合同已经成立 25 个月。",
    insuranceBase,
    { months: 25 },
  ),
  pair(
    "known",
    "订约时已经知道",
    "仍是故意未告知，但保险人在订约时已经知道。",
    insuranceBase,
    { knownAtStart: true },
  ),
  pair(
    "material",
    "不影响承保或费率",
    "故意未告知，也要看该事实是否足以影响承保或费率。",
    insuranceBase,
    { material: false },
  ),
];
export const sameInsuranceFacts = (a, b) =>
  insuranceFields.every(({ key }) => a[key] === b[key]);
export function newInsuranceQuest(history = []) {
  return {
    phase: "compare",
    comparison: 0,
    facts: { ...insuranceComparisons[0].after },
    prediction: "",
    revealed: false,
    hint: false,
    attempts: [],
    quizKind: "immediate",
    quizIndex: 0,
    selected: [],
    results: [],
    order: [0, 1, 2, 3],
    history,
  };
}
export function changeInsuranceFacts(q, patch) {
  return {
    ...q,
    facts: { ...q.facts, ...patch },
    prediction: "",
    revealed: false,
    hint: false,
  };
}
export function selectInsurancePair(q, comparison) {
  return {
    ...q,
    comparison,
    facts: { ...insuranceComparisons[comparison].after },
    prediction: "",
    revealed: false,
    hint: false,
  };
}
export function revealInsurance(q) {
  if (q.revealed || !q.prediction) return q;
  return {
    ...q,
    revealed: true,
    attempts: [
      ...q.attempts,
      {
        comparison: q.comparison,
        facts: { ...q.facts },
        correct: q.prediction === insuranceDecision(q.facts).code,
        hint: q.hint,
      },
    ].slice(-200),
  };
}
export const insuranceQuestions = [
  {
    label: "解除与拒赔分别审查",
    stem: "甲因重大过失未如实告知保险人询问的重要事实，该事实足以影响承保，但对本次保险事故发生没有严重影响。保险人于法定期间内依法解除合同。事故发生在解除前且属于约定承保范围，无其他免责事由。下列哪些说法正确？",
    options: [
      "未告知足以影响承保，保险人可依法解除合同",
      "可解除合同，就必然可拒赔解除前的事故",
      "本次事故仍应由保险人承担保险责任",
      "只要是重大过失，保险人就不赔且不退保险费",
    ],
    answers: [0, 2],
    explanations: [
      "解除权看未告知是否足以影响承保或费率，以及是否处于法定期间内。",
      "重大过失要据此拒赔，还须对事故发生有严重影响。",
      "本案不满足重大过失拒赔的事故影响条件。",
      "重大过失符合拒赔条件时，也应退还保险费。",
    ],
  },
  {
    label: "两个解除期间",
    stem: "下列各案均涉及故意未履行如实告知义务，且足以影响承保决定。关于保险人据此解除合同，下列哪些说法正确？",
    options: [
      "知道解除事由后 31 日一直未行使，仍可解除",
      "合同成立已经超过二年，即使刚知道解除事由，也不得据此解除",
      "订约时已经知道未告知情况的，不能再以此解除",
      "三十日应自保险事故发生时起算",
    ],
    answers: [1, 2],
    explanations: [
      "超过三十日未行使，解除权消灭。",
      "合同成立超过二年的限制独立适用。",
      "订约时已知，依法不得据此解除。",
      "三十日从保险人知道有解除事由起算。",
    ],
  },
  {
    label: "退费与先行解除",
    stem: "关于未如实告知的法律后果，下列哪些说法正确？",
    options: [
      "故意未告知且影响承保，保险人依法解除后，对解除前事故不赔且不退保费",
      "重大过失影响承保且对事故有严重影响，依法解除后可不赔，但应退还保费",
      "保险人尚未行使解除权，也可直接援引保险法第十六条的未告知拒赔规则",
      "退还保险费与退还保单现金价值是同一概念",
    ],
    answers: [0, 1],
    explanations: [
      "故意不告知，依法解除后的对应后果是不赔、不退保费。",
      "重大过失的拒赔条件多一层事故影响，且应退保费。",
      "司法解释明确：未行使解除权，不能直接据第十六条第四、五款拒赔。",
      "二者不同；此处法定后果为退还保险费，不能偷换为现金价值。",
    ],
  },
];
export const insuranceDelayedQuestions = [
  {
    label: "同样不影响事故，主观状态改变后果",
    stem: "甲故意、乙因重大过失，分别未如实告知保险人询问的重要事实，均足以影响承保，均对后来事故的发生没有严重影响。两案保险人均在法定期间内依法解除合同，事故均发生在解除前且属于承保范围，无其他免责事由。下列哪些判断正确？",
    options: [
      "甲案保险人不承担保险责任，且不退还保险费",
      "乙案保险人仍应对本次事故承担保险责任",
      "两案均未严重影响事故发生，所以保险人均不能解除合同",
      "把乙改为故意未告知，仍应按重大过失的事故影响条件判断拒赔",
    ],
    answers: [0, 1],
    explanations: [
      "故意未告知的拒赔规则不附加‘对事故发生有严重影响’这一要求。",
      "重大过失据此拒赔，还须对事故发生有严重影响；本案欠缺该条件。",
      "能否解除看是否足以影响承保等条件，不能用重大过失拒赔的事故影响要求替代。",
      "主观状态改变，应切换到故意未告知的规则。",
    ],
  },
  {
    label: "任一期间限制都能挡住解除",
    stem: "丙案合同成立已两年三个月，保险人三日前才知道解除事由；丁案合同成立八个月，保险人知道解除事由后已三十一日未行使。两案均为故意未告知且足以影响承保，保险人订约时均不知情。关于第16条的解除权，下列哪些判断正确？",
    options: [
      "丙案刚发现事由，可以从发现日起重新获得完整三十日解除期间",
      "丙案合同成立已经超过二年，不能据此解除",
      "丁案虽未超过合同成立后二年，解除权仍因超过三十日未行使而消灭",
      "只有三十日与二年均已超过，才会失去解除权",
    ],
    answers: [1, 2],
    explanations: [
      "发现时间较晚不能绕过成立后二年的限制。",
      "成立后二年限制独立适用。",
      "知道解除事由后三十日的限制也独立适用。",
      "任何一个期间挡住解除，就不能再按本条行使解除权。",
    ],
  },
  {
    label: "先看解除前提，再区分返还对象",
    stem: "关于未履行如实告知义务，下列哪些说法正确？",
    options: [
      "保险人订约时已知未告知情况的，不能据此解除；发生承保范围内的事故，应承担保险责任",
      "只要投保人故意漏答，漏答事项是否影响承保或费率都不影响解除权成立",
      "重大过失未告知符合第16条拒赔条件、保险人依法解除的，应退还保险费",
      "上述应退还保险费，可以直接改写为只退保单现金价值",
    ],
    answers: [0, 2],
    explanations: [
      "订约时已知属于本条明确规定的解除限制。",
      "还须足以影响是否承保或者提高保险费率。",
      "重大过失的相应后果是不赔但退保险费。",
      "第16条规定的保险费返还不能替换成现金价值返还。",
    ],
  },
];
export const insuranceQuestionsFor = (q) =>
  q.quizKind === "delayed" ? insuranceDelayedQuestions : insuranceQuestions;
export const insuranceReviewDue = (q, today) =>
  !!q?.history.some((r) => r.date < today) &&
  !q.history.some((r) => r.date === today && r.kind === "delayed");

export function startInsuranceQuiz(
  q,
  random = Math.random,
  kind = "immediate",
) {
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    phase: "quiz",
    quizKind: kind,
    quizIndex: 0,
    selected: [],
    results: [],
    order,
  };
}
export function submitInsuranceQuiz(q) {
  if (q.results[q.quizIndex]) return q;
  const answers = insuranceQuestionsFor(q)[q.quizIndex].answers;
  return {
    ...q,
    results: [
      ...q.results,
      {
        selected: [...q.selected],
        correct:
          q.selected.length === answers.length &&
          answers.every((i) => q.selected.includes(i)),
      },
    ],
  };
}
export function nextInsuranceQuiz(q, date) {
  if (!q.results[q.quizIndex]) return q;
  if (q.quizIndex < 2)
    return { ...q, quizIndex: q.quizIndex + 1, selected: [] };
  if (q.phase === "summary") return q;
  return {
    ...q,
    phase: "summary",
    history: [
      ...q.history,
      {
        date,
        kind: q.quizKind,
        correct: q.results.filter((r) => r.correct).length,
      },
    ].slice(-100),
  };
}
export function validInsuranceQuest(q, validDate) {
  if (q == null) return true;
  const obj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const list = (v, max, check) =>
    Array.isArray(v) && v.length <= max && v.every(check);
  const index = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  const indices = (v) =>
    list(v, 4, (n) => index(n, 3)) && new Set(v).size === v.length;
  const facts = (f) =>
    obj(f) &&
    insuranceFields.every((field) =>
      field.options.some(([value]) => value === f[field.key]),
    );
  return (
    obj(q) &&
    ["compare", "quiz", "summary"].includes(q.phase) &&
    (q.quizKind === undefined ||
      ["immediate", "delayed"].includes(q.quizKind)) &&
    index(q.comparison, 5) &&
    facts(q.facts) &&
    ["", ...Object.keys(insuranceOutcomes)].includes(q.prediction) &&
    typeof q.revealed === "boolean" &&
    (!q.revealed || q.prediction !== "") &&
    typeof q.hint === "boolean" &&
    list(
      q.attempts,
      200,
      (a) =>
        obj(a) &&
        index(a.comparison, 5) &&
        facts(a.facts) &&
        typeof a.correct === "boolean" &&
        typeof a.hint === "boolean",
    ) &&
    index(q.quizIndex, 2) &&
    indices(q.selected) &&
    indices(q.order) &&
    q.order.length === 4 &&
    list(
      q.results,
      3,
      (r) => obj(r) && indices(r.selected) && typeof r.correct === "boolean",
    ) &&
    q.results.length >= q.quizIndex &&
    q.results.length <= q.quizIndex + 1 &&
    list(
      q.history,
      100,
      (r) =>
        obj(r) &&
        validDate(r.date) &&
        index(r.correct, 3) &&
        (r.kind === undefined || ["immediate", "delayed"].includes(r.kind)),
    ) &&
    (q.phase !== "summary" || (q.results.length === 3 && q.history.length > 0))
  );
}

// v1 旧记录只有原题；在读取备份的边界明确归入即时题，保留原有答案与成绩。
export function normalizeInsuranceQuest(q) {
  return q == null
    ? null
    : {
        ...q,
        quizKind: q.quizKind ?? "immediate",
        history: q.history.map((r) => ({ ...r, kind: r.kind ?? "immediate" })),
      };
}
