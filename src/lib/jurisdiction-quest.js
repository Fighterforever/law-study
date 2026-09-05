export const JURISDICTION_PATH = "#/focus/memory/jurisdiction-case";
export const jurisdictionSource =
  "https://www.szgm.gov.cn/gmsfj/gkmlpt/content/11/11422/post_11422196.html";

// 两条程序使用各自的案卷，避免把中止的例外混入非方便法院的五项条件。
export const jurisdictionFacts = {
  dismiss: [
    {
      id: "objection",
      title: "被告的程序动作",
      yes: "被告提出管辖异议",
      no: "被告未提出管辖异议",
      base: true,
    },
    {
      id: "abroad",
      title: "基本事实发生地",
      yes: "争议基本事实发生在境外",
      no: "争议基本事实发生在中国境内",
      base: true,
    },
    {
      id: "trialHard",
      title: "法院审理",
      yes: "中国法院审理明显不方便",
      no: "中国法院审理并无明显不便",
      base: true,
    },
    {
      id: "partyHard",
      title: "当事人参加诉讼",
      yes: "当事人参加中国诉讼明显不方便",
      no: "当事人参加中国诉讼并无明显不便",
      base: true,
    },
    {
      id: "chinaAgreement",
      title: "管辖协议",
      yes: "双方协议选择中国法院",
      no: "双方没有管辖协议",
      base: false,
    },
    {
      id: "exclusive",
      title: "专属管辖",
      yes: "本案属于中国法院专属管辖",
      no: "本案不属中国法院专属管辖",
      base: false,
    },
    {
      id: "publicInterest",
      title: "公共利益",
      yes: "本案涉及中国主权、安全或社会公共利益",
      no: "本案不涉及中国主权、安全或社会公共利益",
      base: false,
    },
    {
      id: "foreignEasier",
      title: "外国法院审理",
      yes: "外国法院审理更为方便",
      no: "外国法院审理并不更方便",
      base: true,
    },
  ],
  stay: [
    {
      id: "foreignFirst",
      title: "两地受理顺序",
      yes: "外国法院先受理同一纠纷",
      no: "中国法院先受理同一纠纷",
      base: true,
    },
    {
      id: "written",
      title: "当事人的申请",
      yes: "当事人书面申请中止",
      no: "当事人仅口头申请中止",
      base: true,
    },
    {
      id: "chinaAgreement",
      title: "管辖协议",
      yes: "双方协议选择中国法院",
      no: "双方没有管辖协议",
      base: false,
    },
    {
      id: "exclusive",
      title: "专属管辖",
      yes: "本案属于中国法院专属管辖",
      no: "本案不属中国法院专属管辖",
      base: false,
    },
    {
      id: "chinaEasier",
      title: "中国法院审理",
      yes: "由中国法院审理明显更为方便",
      no: "中国法院审理并非明显更方便",
      base: false,
    },
  ],
};
export const jurisdictionBase = (mode) =>
  Object.fromEntries(jurisdictionFacts[mode].map((f) => [f.id, f.base]));
export const jurisdictionActions = {
  dismiss: "可以裁定驳回起诉",
  stay: "可以裁定中止诉讼",
  unavailable: "本案不符合所申请程序的条件",
};

export function jurisdictionGates(mode, f) {
  if (mode === "dismiss")
    return [
      {
        id: "launch",
        label: "启动：被告提出管辖异议",
        pass: f.objection,
        reason: "非方便法院须由被告提出管辖异议，法院不能依职权启动。",
      },
      {
        id: "location",
        label: "① 境外基本事实 + 审理、参诉均明显不便",
        pass: f.abroad && f.trialHard && f.partyHard,
        reason:
          "第一项内的三个要求也要同时具备：基本事实在境外，法院审理和当事人参加诉讼均明显不便。",
      },
      {
        id: "agreement",
        label: "② 没有选择中国法院的协议",
        pass: !f.chinaAgreement,
        reason: "双方协议选择中国法院，即不满足第二项。",
      },
      {
        id: "exclusive",
        label: "③ 不属中国法院专属管辖",
        pass: !f.exclusive,
        reason: "中国法院专属管辖不能因外国审理更方便而排除。",
      },
      {
        id: "public",
        label: "④ 不涉及中国主权、安全或社会公共利益",
        pass: !f.publicInterest,
        reason: "涉及上述利益，即不满足第四项。",
      },
      {
        id: "convenient",
        label: "⑤ 外国法院审理更方便",
        pass: f.foreignEasier,
        reason: "外国法院更方便须单独成立，不能只证明中国审理不便。",
      },
    ];
  return [
    {
      id: "first",
      label: "外国法院先受理同一纠纷",
      pass: f.foreignFirst,
      reason: "第281条以外国法院在先受理为前提。",
    },
    {
      id: "written",
      label: "当事人书面申请中止",
      pass: f.written,
      reason: "须有当事人的书面申请，仅口头申请不能满足该启动条件。",
    },
    {
      id: "agreement",
      label: "没有选择中国法院的协议",
      pass: !f.chinaAgreement,
      reason: "协议选择中国法院属于该条不得中止的例外。",
    },
    {
      id: "exclusive",
      label: "不属中国法院专属管辖",
      pass: !f.exclusive,
      reason: "中国法院专属管辖属于该条不得中止的例外。",
    },
    {
      id: "convenient",
      label: "中国法院审理并非明显更方便",
      pass: !f.chinaEasier,
      reason: "中国审理明显更方便时，不能据此中止。",
    },
  ];
}
export function jurisdictionDecision(mode, facts) {
  return jurisdictionGates(mode, facts).every((g) => g.pass)
    ? mode
    : "unavailable";
}
export function newJurisdictionQuest() {
  return {
    view: "learn",
    mode: "dismiss",
    facts: jurisdictionBase("dismiss"),
    choice: "",
    revealed: false,
    attempts: [],
    quizKind: "immediate",
    quizIndex: 0,
    selected: [],
    results: [],
    order: [0, 1, 2, 3],
    history: [],
  };
}
export function editJurisdiction(q, id, value) {
  return {
    ...q,
    facts: { ...q.facts, [id]: value },
    choice: "",
    revealed: false,
  };
}
export function switchJurisdiction(q, mode) {
  return {
    ...q,
    view: "learn",
    mode,
    facts: jurisdictionBase(mode),
    choice: "",
    revealed: false,
  };
}
export function revealJurisdiction(q, date) {
  if (!q.choice || q.revealed) return q;
  return {
    ...q,
    revealed: true,
    attempts: [
      ...q.attempts,
      {
        mode: q.mode,
        facts: { ...q.facts },
        choice: q.choice,
        correct: q.choice === jurisdictionDecision(q.mode, q.facts),
        date,
      },
    ].slice(-100),
  };
}
export const jurisdictionQuestions = {
  immediate: [
    {
      label: "第一项内部也须同时满足",
      stem: "中国法院已受理某涉外纠纷，被告提出非方便法院异议。基本事实均发生在境外，中国法院审理明显不便，但当事人参加诉讼并无明显不便。其余四项法定条件均具备。下列哪些说法正确？",
      options: [
        "可以用其余四项全部成立弥补参诉不便条件的欠缺",
        "第一项中的法院审理和当事人参诉须均明显不便",
        "不能依第282条裁定驳回起诉",
        "外国法院更方便即足以排除中国法院管辖",
      ],
      answers: [1, 2],
      explanations: [
        "必要条件之间不能相互补偿。",
        "第一项要求两方面均明显不便，同时还要求基本事实不在中国境内。",
        "参诉明显不便未成立，五项未全部满足。",
        "更方便只是五项中的一项。",
      ],
    },
    {
      label: "外国在先与书面申请",
      stem: "同一纠纷的外国诉讼已先受理，中国法院依法具有管辖权并已受理。当事人书面申请中止；不存在选择中国法院的协议、中国专属管辖或中国审理明显更方便的情形。下列哪些说法正确？",
      options: [
        "外国先受理本身不阻止中国法院依法受理",
        "人民法院可以裁定中止诉讼",
        "人民法院必须以非方便法院为由驳回起诉",
        "中止后外国法院未在合理期限审结，经当事人书面申请，应恢复诉讼",
      ],
      answers: [0, 1, 3],
      explanations: [
        "第280条允许有管辖权的中国法院受理普通平行诉讼。",
        "书面申请及相关条件满足，适用第281条。",
        "中止与非方便法院驳回的条件、后果不同；本条也不规定必须驳回。",
        "原诉讼中止后按第281条恢复，无须另行起诉。",
      ],
    },
    {
      label: "裁量与回到中国法院的路径",
      stem: "关于非方便法院和外国先受理后的中止，下列哪些说法正确？",
      options: [
        "非方便法院条件全部成立，法院必须驳回起诉",
        "非方便法院驳回后，外国法院拒绝管辖，当事人再次向中国法院起诉的，应当受理",
        "双方选择中国法院的协议会阻却这两条程序的适用",
        "中止后外国迟迟未审结，中国法院当然依职权恢复诉讼",
      ],
      answers: [1, 2],
      explanations: [
        "法条规定可以裁定驳回，不是必须驳回。",
        "第282条规定再次起诉后的受理路径。",
        "两条均要求审查该协议，只是分别列为必要条件和中止例外。",
        "第281条的恢复须依当事人书面申请。",
      ],
    },
  ],
  delayed: [
    {
      label: "启动主体与五项条件",
      stem: "海岚公司与外国企业的纠纷已由中国法院受理。经查，第282条的五项条件全部具备，但被告没有提出管辖异议。下列哪些说法正确？",
      options: [
        "法院不能依职权以非方便法院为由驳回",
        "五项实体审查条件齐备，仍须被告提出管辖异议",
        "由原告提出相同意见即可替代被告异议",
        "法院可以用中止裁定自动替代非方便法院驳回",
      ],
      answers: [0, 1],
      explanations: [
        "启动条件没有具备。",
        "被告异议与五项情形需要一并审查。",
        "法条明确规定被告提出管辖异议。",
        "中止有独立的法定条件，不能自动替代。",
      ],
    },
    {
      label: "选择中国法院的共同影响",
      stem: "同一涉外纠纷的外国法院先受理，当事人书面申请中国法院中止诉讼。双方存在选择中国法院管辖的有效协议。下列哪些说法正确？",
      options: [
        "外国先受理足以使该协议失效",
        "不能依第281条外国先受理规则中止",
        "该协议同时使第282条第二项条件不成立",
        "只要外国法院更方便，就可忽略协议裁定驳回",
      ],
      answers: [1, 2],
      explanations: [
        "在先受理并不使该协议当然失效。",
        "存在法定中止例外。",
        "第二项要求不存在选择中国法院的协议。",
        "外国更方便不能补偿协议条件的欠缺。",
      ],
    },
    {
      label: "恢复诉讼与重新受理",
      stem: "甲案因外国在先受理而中止；乙案因非方便法院被裁定驳回起诉。其后，两案的外国法院均未在合理期限内审结。下列哪些处理正确？",
      options: [
        "甲案经当事人书面申请，应恢复诉讼",
        "乙案当事人再次向中国法院起诉的，应当受理",
        "甲案必须撤诉后重新起诉",
        "乙案无需任何程序动作，原被驳回的诉讼自动恢复",
      ],
      answers: [0, 1],
      explanations: [
        "甲案仍是原案，按第281条恢复。",
        "乙案原起诉已被驳回，按第282条重新起诉并受理。",
        "中止保留原诉讼，无须撤诉。",
        "须再次起诉，不能把驳回当作中止。",
      ],
    },
  ],
};
export function startJurisdictionQuiz(
  q,
  kind = "immediate",
  random = Math.random,
) {
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    view: "quiz",
    quizKind: kind,
    quizIndex: 0,
    selected: [],
    results: [],
    order,
  };
}
export function submitJurisdictionQuiz(q) {
  if (q.results[q.quizIndex]) return q;
  const answers = jurisdictionQuestions[q.quizKind][q.quizIndex].answers;
  return {
    ...q,
    results: [
      ...q.results,
      {
        selected: [...q.selected],
        correct:
          answers.length === q.selected.length &&
          answers.every((i) => q.selected.includes(i)),
      },
    ],
  };
}
export function nextJurisdictionQuiz(q, date) {
  if (!q.results[q.quizIndex] || q.view === "summary") return q;
  if (q.quizIndex < 2)
    return { ...q, quizIndex: q.quizIndex + 1, selected: [] };
  return {
    ...q,
    view: "summary",
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
export const jurisdictionReviewDue = (q, date) =>
  !!q?.history.some((r) => r.date < date) &&
  !q.history.some((r) => r.date === date && r.kind === "delayed");
export function validJurisdictionQuest(q, validDate) {
  if (q == null) return true;
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const list = (v, max, fn) =>
    Array.isArray(v) && v.length <= max && v.every(fn);
  const indices = (v) =>
    list(v, 4, (n) => Number.isInteger(n) && n >= 0 && n < 4) &&
    new Set(v).size === v.length;
  const facts = (mode, f) =>
    ["dismiss", "stay"].includes(mode) &&
    obj(f) &&
    jurisdictionFacts[mode].every(({ id }) => typeof f[id] === "boolean");
  const choice = (v) => Object.hasOwn(jurisdictionActions, v);
  return (
    obj(q) &&
    facts(q.mode, q.facts) &&
    ["learn", "quiz", "summary"].includes(q.view) &&
    (q.choice === "" || choice(q.choice)) &&
    typeof q.revealed === "boolean" &&
    list(
      q.attempts,
      100,
      (a) =>
        obj(a) &&
        facts(a.mode, a.facts) &&
        choice(a.choice) &&
        typeof a.correct === "boolean" &&
        validDate(a.date),
    ) &&
    (!q.revealed || (choice(q.choice) && q.attempts.length > 0)) &&
    ["immediate", "delayed"].includes(q.quizKind) &&
    Number.isInteger(q.quizIndex) &&
    q.quizIndex >= 0 &&
    q.quizIndex < 3 &&
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
        ["immediate", "delayed"].includes(r.kind) &&
        Number.isInteger(r.correct) &&
        r.correct >= 0 &&
        r.correct <= 3,
    ) &&
    (q.view !== "summary" || (q.results.length === 3 && q.history.length > 0))
  );
}
