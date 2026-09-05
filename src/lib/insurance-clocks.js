export const CLOCKS_PATH = "#/focus/memory/insurance-clocks";
export const clockAnchors = {
  premium: "已交足保险费的年限",
  foundation: "合同成立之日",
  restore: "合同效力恢复之日",
  capacity: "先适用无民事行为能力例外",
};
export const clockClaims = {
  deny: "保险人不承担保险金给付责任",
  "not-exempt": "不能依据本条自杀规则免责",
};
export const clockRefunds = {
  return: "按合同约定退还保单现金价值",
  "not-met": "未达到第43条的现金价值返还条件",
  "not-triggered": "本案不适用第44条免责后的现金价值返还规则",
};
export function clockDecision(f) {
  if (f.mode === "premium")
    return {
      anchor: "premium",
      claim: "deny",
      refund: f.paidYears >= 2 ? "return" : "not-met",
      title:
        f.paidYears >= 2
          ? "不赔保险金，现金价值退给其他权利人"
          : "不赔保险金；尚未达到法定返还条件",
      reason:
        f.paidYears >= 2
          ? "投保人故意致死，保险金始终不给付。已交足二年以上保险费，才触发第43条向其他权利人退还现金价值的规则。"
          : "这里的二年看已交足保费的年限。交足一年未达到第43条规定的返还条件，合同成立多久不能替代交费事实。",
    };
  const anchor = f.incapable
    ? "capacity"
    : f.restored
      ? "restore"
      : "foundation";
  if (f.incapable)
    return {
      anchor,
      claim: "not-exempt",
      refund: "not-triggered",
      title: "先识别能力例外，不能适用自杀免责",
      reason:
        "被保险人自杀时为无民事行为能力人，即使仍处于成立或复效后二年内，也属于第44条免责的例外。",
    };
  if (f.elapsedYears > 2)
    return {
      anchor,
      claim: "not-exempt",
      refund: "not-triggered",
      title: "已超过二年，不能再援引本条自杀免责",
      reason: `本案应从${f.restored ? "复效" : "成立"}起看期间，至事故已满三年，已经越过第44条的二年范围。是否给付仍按合同与其他适用规则判断。`,
    };
  return {
    anchor,
    claim: "deny",
    refund: "return",
    title: "二年内适用自杀免责，同时退还现金价值",
    reason: `本案从${f.restored ? "效力恢复" : "合同成立"}至事故只有一年，被保险人自杀时具有完全民事行为能力。依第44条不承担给付责任，但须按合同约定退还现金价值。`,
  };
}
export function newInsuranceClocks(history = []) {
  return {
    view: "learn",
    mode: "premium",
    paidYears: 1,
    restored: true,
    elapsedYears: 1,
    incapable: false,
    anchor: "",
    claim: "",
    refund: "",
    revealed: false,
    attempts: [],
    quizKind: "immediate",
    quizIndex: 0,
    selected: [],
    results: [],
    order: [0, 1, 2, 3],
    history,
  };
}
export function editInsuranceClocks(q, patch) {
  return { ...q, ...patch, anchor: "", claim: "", refund: "", revealed: false };
}
export function revealInsuranceClocks(q, date) {
  if (q.revealed || !q.anchor || !q.claim || !q.refund) return q;
  const d = clockDecision(q);
  const correct =
    q.anchor === d.anchor && q.claim === d.claim && q.refund === d.refund;
  return {
    ...q,
    revealed: true,
    attempts: [
      ...q.attempts,
      {
        mode: q.mode,
        paidYears: q.paidYears,
        restored: q.restored,
        elapsedYears: q.elapsedYears,
        incapable: q.incapable,
        anchor: q.anchor,
        claim: q.claim,
        refund: q.refund,
        correct,
        date,
      },
    ].slice(-100),
  };
}
export const clockQuestions = {
  immediate: [
    {
      label: "保费年限控制现金价值",
      stem: "投保人甲已交足三年以上保险费，故意造成被保险人乙死亡。关于保险法第四十三条的后果，下列哪些说法正确？",
      options: [
        "因已交足二年以上保费，保险人应给付死亡保险金",
        "保险人不承担保险金给付责任",
        "保险人应按合同约定向其他权利人退还保单现金价值",
        "判断是否返还现金价值，只看合同成立是否超过二年",
      ],
      answers: [1, 2],
      explanations: [
        "交费年限不使故意致死转为保险金可赔。",
        "投保人故意造成被保险人死亡，适用第43条不给付规则。",
        "已交足二年以上保险费，向其他权利人返还现金价值。",
        "第43条看已交足保费的年限。",
      ],
    },
    {
      label: "复效重新起算",
      stem: "死亡保险合同最初成立已四年，中途曾依法中止并于一年前恢复效力。被保险人在复效一年后自杀，自杀时具有完全民事行为能力。下列哪些说法正确？",
      options: [
        "原合同成立已超过二年，保险人当然不能适用自杀免责",
        "本案二年期间应从合同效力恢复之日起算",
        "保险人不承担给付责任，但应依约退还现金价值",
        "只有已交足二年以上保费，才可依第44条返还现金价值",
      ],
      answers: [1, 2],
      explanations: [
        "曾经复效，应看恢复效力后的期间。",
        "复效后重新起算二年。",
        "复效一年在二年内，适用免责并退现金价值。",
        "第44条的返还不附加第43条的交费年限条件。",
      ],
    },
    {
      label: "能力例外与给付判断",
      stem: "下列关于死亡保险的说法，哪些正确？",
      options: [
        "被保险人自杀时为无民事行为能力人，即使成立未满二年，也不适用第44条自杀免责",
        "被保险人自杀发生在复效三年后，不能再援引该条二年内自杀免责",
        "超过二年就应无条件给付保险金，无须审查其他规则",
        "退还现金价值就是退还已经缴纳的全部保险费",
      ],
      answers: [0, 1],
      explanations: [
        "自杀时无民事行为能力属于法定例外。",
        "复效三年已超出第44条的二年范围。",
        "不适用这一免责，并不免去合同与其他适用规则的判断。",
        "现金价值与已缴保险费是不同概念。",
      ],
    },
  ],
  delayed: [
    {
      label: "两个二年不能移用",
      stem: "某死亡保险合同依法复效后一年，被保险人丙自杀，丙自杀时具有完全民事行为能力。关于本案，下列哪些判断正确？",
      options: [
        "本案应先查已交足保费是否达到二年，再判断能否适用自杀免责",
        "本案落在第44条复效后二年内",
        "依该条不承担给付责任时，应依约退还保单现金价值",
        "复效不会影响自杀条款期间，始终只从最初成立起算",
      ],
      answers: [1, 2],
      explanations: [
        "第43条交费年限条件不能移到第44条。",
        "复效后一年仍在二年内。",
        "免责与返还现金价值在第44条同时规定。",
        "复效会重新起算该条二年期间。",
      ],
    },
    {
      label: "跨过交费门槛仍不赔保险金",
      stem: "投保人丁故意造成被保险人戊死亡。关于保险法第四十三条，下列哪些说法正确？",
      options: [
        "即使丁已交足三年保险费，保险人仍不承担保险金给付责任",
        "已交足三年保险费的，现金价值应依约退给其他权利人",
        "返还现金价值意味着丁可领取原定保险金",
        "未达到交足二年以上保险费的条件，也可以仅凭合同成立较早要求适用该条返还规则",
      ],
      answers: [0, 1],
      explanations: [
        "交费达到门槛，改变的是现金价值返还，不改变故意致死不给付。",
        "法定返还对象为其他权利人。",
        "现金价值与保险金不同；本条返还对象为其他权利人。",
        "合同年限不能替代该条交费年限。",
      ],
    },
    {
      label: "先找例外，再看期间",
      stem: "死亡保险合同复效后尚未满二年，被保险人己自杀，自杀时为无民事行为能力人。下列哪些说法正确？",
      options: [
        "因复效未满二年，保险人必然可以适用自杀免责",
        "应先识别无民事行为能力这一法定例外",
        "保险人不能依据第44条的一般自杀免责规则拒绝给付",
        "先把保费补足二年，才能主张能力例外",
      ],
      answers: [1, 2],
      explanations: [
        "能力例外使一般自杀免责不能适用。",
        "考点在自杀时的行为能力。",
        "本案不适用该条一般免责。",
        "能力例外没有附加补缴二年保费的条件。",
      ],
    },
  ],
};
export function startClocksQuiz(q, kind = "immediate", random = Math.random) {
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
export function submitClocksQuiz(q) {
  if (q.results[q.quizIndex]) return q;
  const answers = clockQuestions[q.quizKind][q.quizIndex].answers;
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
export function nextClocksQuiz(q, date) {
  if (!q.results[q.quizIndex]) return q;
  if (q.quizIndex < 2)
    return { ...q, quizIndex: q.quizIndex + 1, selected: [] };
  if (q.view === "summary") return q;
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
export const clocksReviewDue = (q, today) =>
  !!q?.history.some((r) => r.date < today) &&
  !q.history.some((r) => r.date === today && r.kind === "delayed");
export function validInsuranceClocks(q, validDate) {
  if (q == null) return true;
  const obj = (x) => x !== null && typeof x === "object" && !Array.isArray(x),
    idx = (x, max) => Number.isInteger(x) && x >= 0 && x <= max;
  const list = (x, max, fn) =>
    Array.isArray(x) && x.length <= max && x.every(fn);
  const indices = (x) =>
    list(x, 4, (n) => idx(n, 3)) && new Set(x).size === x.length;
  const facts = (x) =>
    obj(x) &&
    ["premium", "suicide"].includes(x.mode) &&
    [1, 2, 3].includes(x.paidYears) &&
    [1, 3].includes(x.elapsedYears) &&
    typeof x.restored === "boolean" &&
    typeof x.incapable === "boolean";
  const answer = (x, blank) =>
    [...(blank ? [""] : []), ...Object.keys(clockAnchors)].includes(x.anchor) &&
    [...(blank ? [""] : []), ...Object.keys(clockClaims)].includes(x.claim) &&
    [...(blank ? [""] : []), ...Object.keys(clockRefunds)].includes(x.refund);
  return (
    facts(q) &&
    ["learn", "quiz", "summary"].includes(q.view) &&
    answer(q, !q.revealed) &&
    typeof q.revealed === "boolean" &&
    list(
      q.attempts,
      100,
      (a) =>
        facts(a) &&
        answer(a, false) &&
        typeof a.correct === "boolean" &&
        validDate(a.date),
    ) &&
    (!q.revealed || q.attempts.length > 0) &&
    ["immediate", "delayed"].includes(q.quizKind) &&
    idx(q.quizIndex, 2) &&
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
        idx(r.correct, 3),
    ) &&
    (q.view !== "summary" || (q.history.length > 0 && q.results.length === 3))
  );
}
