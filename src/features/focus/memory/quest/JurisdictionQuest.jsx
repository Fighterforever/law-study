import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  EyeOff,
  GitBranch,
  Landmark,
  RotateCcw,
  X,
} from "lucide-react";
import { emptyFocusState } from "../../../../lib/focus-state.js";
import {
  JURISDICTION_PATH,
  jurisdictionSource,
  jurisdictionFacts,
  jurisdictionGates,
  jurisdictionDecision,
  jurisdictionActions,
  newJurisdictionQuest,
  editJurisdiction,
  switchJurisdiction,
  revealJurisdiction,
  jurisdictionQuestions,
  startJurisdictionQuiz,
  submitJurisdictionQuiz,
  nextJurisdictionQuiz,
  jurisdictionReviewDue,
} from "../../../../lib/jurisdiction-quest.js";
import ObjectiveQuestion from "./ObjectiveQuestion.jsx";
import "./company-quest.css";
import "./jurisdiction-quest.css";

const art = `${import.meta.env.BASE_URL}quests/jurisdiction-harbor.png`;
export function JurisdictionEntry({ state, today }) {
  return (
    <a
      className="jq-entry"
      href={JURISDICTION_PATH}
      style={{ "--jq-art": `url("${art}")` }}
    >
      <div>
        <span>港城书院 · 涉外程序</span>
        <h3>同一纠纷，两条程序。</h3>
        <p>
          {jurisdictionReviewDue(state.focus?.jurisdictionQuest, today)
            ? "隔日变式已到期，先离开场景独立判断。"
            : "把必要条件接起来，分清中止与驳回。"}
        </p>
      </div>
      <ArrowRight size={24} />
    </a>
  );
}

function ProcedureMap({ mode, facts, revealed }) {
  const gates = jurisdictionGates(mode, facts);
  const allowed = jurisdictionDecision(mode, facts) !== "unavailable";
  return (
    <div className="jq-map" aria-label="程序条件核对">
      <div className="jq-map-heading">
        <GitBranch size={21} />
        <div>
          <span>程序推演</span>
          <h3>
            {mode === "dismiss"
              ? "启动条件 + 五项同时成立"
              : "在先受理 + 书面申请 − 法定例外"}
          </h3>
        </div>
      </div>
      {!revealed && (
        <p className="jq-map-instruction">
          先根据案卷中的事实作出判断。提交后，这里会展开条件之间的关系。
        </p>
      )}
      {revealed ? (
        <>
          <ol className="jq-gates">
            {gates.map((g) => (
              <li key={g.id} className={g.pass ? "pass" : "blocked"}>
                <span className="jq-gate-icon">
                  {g.pass ? <Check size={16} /> : <X size={16} />}
                </span>
                <div>
                  <strong>{g.label}</strong>
                  {!g.pass && <p>{g.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className={`jq-destination ${allowed ? "allowed" : ""}`}>
            <Landmark size={23} />
            <strong>
              {jurisdictionActions[jurisdictionDecision(mode, facts)]}
            </strong>
          </div>
          <p className="jq-map-note">
            {allowed
              ? "“可以”表示法院可以依法作此裁定，不能改写成“必须”。"
              : "其他条件即使全部具备，也不能补足上面的缺项。"}
          </p>
        </>
      ) : (
        <div className="jq-map-sealed">
          <BookOpen size={42} />
          <strong>结论暂未展开</strong>
          <span>先预测，再看路径</span>
        </div>
      )}
    </div>
  );
}

export default function JurisdictionQuest({ state, update, today }) {
  const q = state.focus?.jurisdictionQuest;
  const save = (fn) =>
    update((s) => ({
      ...s,
      focus: {
        ...(s.focus || emptyFocusState()),
        jurisdictionQuest:
          typeof fn === "function" ? fn(s.focus?.jurisdictionQuest) : fn,
      },
    }));
  const panel = useRef(null);
  const agreementFact = useRef(null);
  const feedback = useRef(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [q?.view, q?.mode, q?.quizIndex]);
  useEffect(() => {
    if (q?.revealed)
      feedback.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [q?.revealed]);
  const start = (kind = "immediate") =>
    save((old) => startJurisdictionQuiz(old || newJurisdictionQuest(), kind));
  const wrong = q?.attempts.filter((a) => !a.correct) || [];
  const restore = (a) =>
    save((old) => ({
      ...old,
      view: "learn",
      mode: a.mode,
      facts: { ...a.facts },
      choice: "",
      revealed: false,
    }));
  const result = q && jurisdictionDecision(q.mode, q.facts);
  return (
    <div className="cq jq" style={{ "--jq-art": `url("${art}")` }}>
      <nav className="cq-nav">
        <a href="#/focus/memory">
          <ArrowLeft size={16} />
          记忆宫殿
        </a>
        <a href="#/focus/unit/focus-civil-procedure-foreign-jurisdiction">
          回看涉外管辖
        </a>
        {q?.view === "learn" && (
          <button className="cq-link-button" onClick={() => start()}>
            <EyeOff size={16} />
            直接闭卷
          </button>
        )}
      </nav>
      {!q ? (
        <>
          <section className="jq-welcome">
            <div>
              <span className="jq-eyebrow">港城书院 · 案件推演桌</span>
              <h2>
                外国法院更方便，
                <br />
                就能把案件交出去吗？
              </h2>
              <p>
                你收到两份不同的申请。先看谁提出、请求什么，再判断条件是否齐备。
              </p>
              <button onClick={() => save(newJurisdictionQuest())}>
                打开两份申请
                <ArrowRight size={18} />
              </button>
              <small>约 8 分钟 · 随时直接闭卷 · 隔日变式</small>
            </div>
          </section>
          <div className="jq-intro">
            <p>
              你熟悉民诉程序，可以先做三道闭卷题。混淆“中止”和“驳回”时，再回到案卷逐项推演。
            </p>
            <button className="cq-outline" onClick={() => start()}>
              先做闭卷题
              <EyeOff size={17} />
            </button>
          </div>
        </>
      ) : q.view === "learn" ? (
        <>
          <div className="jq-tabs" role="group" aria-label="选择申请类型">
            {[
              ["dismiss", "被告管辖异议", "非方便法院 · 第282条"],
              ["stay", "当事人中止申请", "外国在先受理 · 第281条"],
            ].map(([mode, title, small]) => (
              <button
                key={mode}
                aria-pressed={q.mode === mode}
                className={q.mode === mode ? "active" : ""}
                onClick={() => save((old) => switchJurisdiction(old, mode))}
              >
                <span>{title}</span>
                <small>{small}</small>
              </button>
            ))}
          </div>
          <section className="jq-workspace" ref={panel} tabIndex={-1}>
            <header className="jq-case-header">
              <span className="jq-eyebrow">待审申请</span>
              <h2>
                {q.mode === "dismiss"
                  ? "这份异议，能否支持驳回起诉？"
                  : q.facts.foreignFirst
                    ? "外国已先受理，中国诉讼要暂停吗？"
                    : "中国先受理，还能用这条规则中止吗？"}
              </h2>
              <p>
                中国法院依法具有管辖权，且已受理本涉外纠纷。本案没有排他选择外国法院的协议。
              </p>
            </header>
            <div className="jq-table">
              <div className="jq-case-file">
                <div className="jq-file-title">
                  <BookOpen size={22} />
                  <h3>已查明的案情</h3>
                  <span>点击一处，改变该事实</span>
                </div>
                <div className="jq-facts">
                  {jurisdictionFacts[q.mode].map((f, i) => (
                    <div className="jq-fact" key={f.id}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <small>{f.title}</small>
                        <button
                          ref={
                            f.id === "chinaAgreement"
                              ? agreementFact
                              : undefined
                          }
                          className={q.facts[f.id] !== f.base ? "changed" : ""}
                          onClick={() =>
                            save((old) =>
                              editJurisdiction(old, f.id, !old.facts[f.id]),
                            )
                          }
                          aria-label={`${q.facts[f.id] ? f.yes : f.no}，点击切换`}
                        >
                          <span>{q.facts[f.id] ? f.yes : f.no}</span>
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="jq-fact-note">
                  金色标出与初始案情不同的事实；不表示对错。你也可以叠加改变，再找出全部障碍。
                </p>
                <button
                  className="cq-link-button"
                  onClick={() =>
                    save((old) => switchJurisdiction(old, old.mode))
                  }
                >
                  <RotateCcw size={15} />
                  恢复初始案情
                </button>
                <fieldset className="jq-prediction" disabled={q.revealed}>
                  <legend>你会给出哪项审查意见？</legend>
                  {Object.entries(jurisdictionActions).map(([id, text]) => (
                    <label
                      key={id}
                      className={q.choice === id ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="jurisdiction-choice"
                        checked={q.choice === id}
                        onChange={() => save((old) => ({ ...old, choice: id }))}
                      />
                      <span>{text}</span>
                    </label>
                  ))}
                </fieldset>
                <button
                  className="jq-submit"
                  disabled={!q.choice || q.revealed}
                  onClick={() => save((old) => revealJurisdiction(old, today))}
                >
                  提交意见，展开条件
                  <ArrowRight size={17} />
                </button>
              </div>
              <div ref={feedback}>
                <ProcedureMap
                  mode={q.mode}
                  facts={q.facts}
                  revealed={q.revealed}
                />
                {q.revealed && (
                  <div className="jq-feedback" role="status">
                    <strong>
                      {q.attempts.at(-1).correct
                        ? "本次处理方向正确"
                        : `你的选择：${jurisdictionActions[q.choice]}`}
                    </strong>
                    <p>
                      {result === "unavailable"
                        ? "找出未成立的条件后，试着只改那项事实；若有多处欠缺，补一项仍不够。"
                        : "下一步只改变“管辖协议”：即使其他事实不变，案件走向也会变化。"}
                    </p>
                    {result !== "unavailable" && (
                      <button
                        className="cq-outline"
                        onClick={() => {
                          save((old) =>
                            editJurisdiction(old, "chinaAgreement", true),
                          );
                          agreementFact.current?.focus({ preventScroll: true });
                          agreementFact.current?.scrollIntoView({
                            block: "center",
                            behavior: "instant",
                          });
                        }}
                      >
                        只改为协议选择中国法院
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <details className="jq-method">
              <summary>先看一遍推演方法</summary>
              <p>
                非方便法院：先确认被告异议，再检查五项是否同时具备。第一项还包含三个并列要求。任何一项欠缺，都不能用其他条件补偿。
              </p>
              <p>
                外国先受理后的中止：先确认在先受理和书面申请，再排除协议选择中国法院、专属管辖、中国审理明显更方便这些例外。
              </p>
              <p>
                两条程序分别审查。本任务只判断当前申请，不据此推定另一条程序已满足条件。
              </p>
            </details>
            <div className="jq-return-path">
              <div>
                <span>若已依法作出相应裁定，再问一句</span>
                <h3>外国法院长期没有审结，怎么回来？</h3>
              </div>
              <p>
                {q.mode === "dismiss"
                  ? "已驳回起诉 → 当事人再次起诉 → 中国法院应当受理。外国拒绝管辖、未采取必要审理措施，也适用这一返回路径。"
                  : "原案中止 → 当事人书面申请 → 中国法院应当恢复诉讼。外国未采取必要审理措施，也可按此路径申请恢复。"}
              </p>
            </div>
            <div className="jq-intro">
              <p>把两份申请收起来，用普通题面检查是否真正分清。</p>
              <button onClick={() => start()}>
                离开场景，做三题
                <EyeOff size={17} />
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="cq-exam-layout">
          <div className="cq-panel" ref={panel} tabIndex={-1}>
            <div className="cq-panel-heading">
              <span className="cq-eyebrow">案卷与条件图已收起</span>
              <h2>
                {q.view === "quiz" ? "独立判断程序与条件" : "下次从混淆处开始"}
              </h2>
            </div>
            {q.view === "quiz" ? (
              <ObjectiveQuestion
                item={jurisdictionQuestions[q.quizKind][q.quizIndex]}
                order={q.order}
                selected={q.selected}
                result={q.results[q.quizIndex]}
                caption={q.quizKind === "delayed" ? "隔日变式" : "即时闭卷"}
                index={q.quizIndex}
                total={3}
                nextLabel={q.quizIndex === 2 ? "查看复盘" : "下一题"}
                onSelect={(i) =>
                  save((old) => ({
                    ...old,
                    selected: old.selected.includes(i)
                      ? old.selected.filter((n) => n !== i)
                      : [...old.selected, i],
                  }))
                }
                onSubmit={() => save(submitJurisdictionQuiz)}
                onNext={() => save((old) => nextJurisdictionQuiz(old, today))}
              />
            ) : (
              <>
                <div className="cq-summary-score">
                  <span>
                    {q.quizKind === "delayed" ? "隔日变式" : "即时闭卷"}
                  </span>
                  <strong>
                    {q.results.filter((r) => r.correct).length}
                    <small> / 3</small>
                  </strong>
                  <p>操作练习与闭卷成绩分别记录。</p>
                </div>
                {q.results.some((r) => !r.correct) && (
                  <div className="jq-repair">
                    <h3>本轮需要再辨清</h3>
                    {jurisdictionQuestions[q.quizKind].map(
                      (item, i) =>
                        !q.results[i].correct && <p key={i}>{item.label}</p>,
                    )}
                  </div>
                )}
                <div className="jq-recap">
                  <article>
                    <span>第282条</span>
                    <h3>异议 → 驳回 → 再起诉</h3>
                    <p>
                      被告提出异议，五项同时具备，可以驳回。外国未在合理期限审结等法定情形出现，当事人再起诉的，应当受理。
                    </p>
                  </article>
                  <article>
                    <span>第281条</span>
                    <h3>书面申请 → 中止 → 恢复</h3>
                    <p>
                      外国先受理，书面申请且无例外，可以中止。外国未在合理期限审结等法定情形出现，依书面申请恢复。
                    </p>
                  </article>
                </div>
                {wrong.length > 0 && (
                  <details className="jq-old-cases">
                    <summary>回到判断有误的案情（{wrong.length} 次）</summary>
                    {wrong
                      .slice(-5)
                      .reverse()
                      .map((a, i) => (
                        <button
                          key={i}
                          className="cq-outline"
                          onClick={() => restore(a)}
                        >
                          {a.date} ·{" "}
                          {a.mode === "dismiss" ? "非方便法院" : "中止申请"} ·
                          重新判断
                          <ArrowRight size={16} />
                        </button>
                      ))}
                  </details>
                )}
                <div className="cq-next-day">
                  <EyeOff size={22} />
                  <div>
                    <h3>
                      {jurisdictionReviewDue(q, today)
                        ? "今天先做隔日变式"
                        : "隔一天，再判断新的题面"}
                    </h3>
                    <p>次日提供另一组三题；再次复测仍使用该组变式。</p>
                    {jurisdictionReviewDue(q, today) && (
                      <button onClick={() => start("delayed")}>
                        开始隔日变式
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="cq-summary-actions">
                  <a className="button" href="#/focus/memory">
                    回到记忆宫殿
                  </a>
                  <button
                    className="cq-outline"
                    onClick={() => save((old) => ({ ...old, view: "learn" }))}
                  >
                    回到推演桌
                  </button>
                  <button className="cq-link-button" onClick={() => start()}>
                    重做即时题
                  </button>
                </div>
                <details className="cq-history">
                  <summary>查看闭卷记录（{q.history.length} 轮）</summary>
                  {q.history
                    .slice()
                    .reverse()
                    .map((r, i) => (
                      <p key={i}>
                        {r.date} ·{" "}
                        {r.kind === "delayed" ? "隔日变式" : "即时闭卷"} ·{" "}
                        {r.correct}/3
                      </p>
                    ))}
                </details>
              </>
            )}
          </div>
        </section>
      )}
      <footer className="cq-source">
        <span>
          民诉考前聚焦 PDF 第10–12页；旧民诉背诵卷 PDF
          第188–193页。本任务集中练习第281、282条，其他涉外管辖规则见原考点。
        </span>
        <a href={jurisdictionSource} target="_blank" rel="noreferrer">
          民事诉讼法原文 ↗
        </a>
      </footer>
    </div>
  );
}
