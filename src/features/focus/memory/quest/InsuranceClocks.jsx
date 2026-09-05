import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  EyeOff,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { emptyFocusState } from "../../../../lib/focus-state.js";
import {
  CLOCKS_PATH,
  clockAnchors,
  clockClaims,
  clockRefunds,
  clockDecision,
  newInsuranceClocks,
  editInsuranceClocks,
  revealInsuranceClocks,
  clockQuestions,
  startClocksQuiz,
  submitClocksQuiz,
  nextClocksQuiz,
  clocksReviewDue,
} from "../../../../lib/insurance-clocks.js";
import ObjectiveQuestion from "./ObjectiveQuestion.jsx";
import "./company-quest.css";
import "./insurance-quest.css";
import "./insurance-clocks.css";

const art = `${import.meta.env.BASE_URL}quests/insurance-archive.png`;
export function ClocksEntry({ state, today }) {
  const q = state.focus?.insuranceClocks;
  return (
    <a className="tc-entry" href={CLOCKS_PATH}>
      <span className="tc-entry-icon">
        <Clock3 size={25} />
      </span>
      <div>
        <small>保险时间线 · 约 6–8 分钟</small>
        <h3>同样是“两年”，到底看哪只钟？</h3>
        <p>
          {clocksReviewDue(q, today)
            ? "今天可以做隔日变式，先合上规则再判断。"
            : "交足保费的年限，与成立、复效后的期间，分别控制什么？"}
        </p>
      </div>
      <ArrowRight size={21} />
    </a>
  );
}

function AnswerChoices({ title, name, value, choices, onChange }) {
  return (
    <fieldset className="tc-answer">
      <legend>{title}</legend>
      <div>
        {Object.entries(choices).map(([id, label]) => (
          <label key={id} className={value === id ? "selected" : ""}>
            <input
              type="radio"
              name={name}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LifeTimeline({ q }) {
  const incident = q.elapsedYears + (q.restored ? 3 : 0);
  const shownAnchor = q.revealed ? clockDecision(q).anchor : q.anchor;
  const band =
    shownAnchor === "foundation"
      ? 0
      : shownAnchor === "restore" && q.restored
        ? 3
        : null;
  return (
    <div
      className="tc-calendar"
      aria-label={`合同成立于第0年，${q.restored ? "第3年复效，" : ""}事故发生于第${incident}年`}
    >
      <div className="tc-calendar-caption">
        <Clock3 size={17} />
        <strong>从案卷中标出起点</strong>
        <span>事故位置由下方控制</span>
      </div>
      <div className="tc-calendar-track">
        {band !== null && (
          <div
            className="tc-period"
            style={{ left: `${(band / 6) * 100}%`, width: `${(2 / 6) * 100}%` }}
          >
            <span>{q.revealed ? "法定二年期间" : "所选起点后二年"}</span>
          </div>
        )}
        <div
          className="tc-incident"
          style={{ left: `${(incident / 6) * 100}%` }}
        >
          <span className={incident === 6 ? "edge" : ""}>
            事故 · 第 {incident} 年
          </span>
          <i />
        </div>
        <div className="tc-ticks">
          {[0, 1, 2, 3, 4, 5, 6].map((year) => (
            <span key={year}>
              {year}
              <small>年</small>
            </span>
          ))}
        </div>
      </div>
      <div className="tc-calendar-events">
        <span>
          <b>第 0 年</b>合同成立
        </span>
        {q.restored && (
          <span>
            <b>第 3 年</b>效力恢复
          </span>
        )}
        <span>
          <b>第 {incident} 年</b>发生事故
        </span>
      </div>
      <p>
        {q.restored
          ? `最初成立至事故共 ${incident} 年；本次复效至事故为 ${q.elapsedYears} 年。`
          : `本案从未中止，成立至事故为 ${q.elapsedYears} 年。`}
      </p>
    </div>
  );
}

export default function InsuranceClocks({ state, update, today }) {
  const q = state.focus?.insuranceClocks ?? null;
  const save = (fn) =>
    update((s) => ({
      ...s,
      focus: {
        ...(s.focus || emptyFocusState()),
        insuranceClocks:
          typeof fn === "function" ? fn(s.focus?.insuranceClocks) : fn,
      },
    }));
  const edit = (patch) => save((old) => editInsuranceClocks(old, patch));
  const panel = useRef(null);
  useEffect(() => {
    if (q) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [q?.view, q?.mode, q?.quizIndex]);
  const closed = q && q.view !== "learn";
  const result = q ? clockDecision(q) : null;
  const last = q?.attempts.at(-1);
  const contrast =
    q &&
    (q.mode === "premium"
      ? {
          patch: { paidYears: q.paidYears === 1 ? 2 : 1 },
          label:
            q.paidYears === 1
              ? "只改为交足两年，哪项后果改变？"
              : "只改为交足一年，哪项后果改变？",
        }
      : q.incapable
        ? {
            patch: { incapable: false },
            label: "只改为完全民事行为能力，再判断",
          }
        : q.elapsedYears === 1
          ? { patch: { elapsedYears: 3 }, label: "只把事故移到三年后，再判断" }
          : {
              patch: { incapable: true },
              label: "只改为无民事行为能力，判断理由还相同吗？",
            });
  return (
    <div className="cq iq tc" style={{ "--iq-art": `url("${art}")` }}>
      <nav className="cq-nav">
        <a href="#/focus/memory">
          <ArrowLeft size={16} />
          记忆宫殿
        </a>
        <a href="#/focus/memory/insurance-case">告知与解除对照 →</a>
        {q && !closed && (
          <button
            className="cq-link-button"
            onClick={() => save((old) => startClocksQuiz(old))}
          >
            <EyeOff size={16} />
            直接闭卷
          </button>
        )}
      </nav>
      {!q ? (
        <>
          <section className="iq-welcome">
            <div>
              <span className="cq-eyebrow">保险档案室 · 两年与现金价值</span>
              <h2>
                数字相同，
                <br />
                先找它控制的后果。
              </h2>
              <p>
                交足二年保费，影响现金价值返还。
                <br />
                成立或复效后二年，影响自杀免责的适用。
              </p>
              <button onClick={() => save(newInsuranceClocks())}>
                打开账本与时间线
                <Clock3 size={18} />
              </button>
              <small>两个场景 · 三道闭卷题 · 隔日另有变式</small>
            </div>
          </section>
          <p className="tc-orientation">
            先判断发生了什么，再找对应的年限或期间；最后把保险金与现金价值分开判断。
          </p>
          <button
            className="cq-link-button"
            onClick={() => save(startClocksQuiz(newInsuranceClocks()))}
          >
            已有基础，直接做闭卷题
            <EyeOff size={16} />
          </button>
        </>
      ) : closed ? (
        <section className="cq-exam-layout">
          <div className="cq-panel" ref={panel} tabIndex={-1}>
            <div className="cq-panel-heading">
              <span className="cq-eyebrow">账本与时间线已收起</span>
              <h2>
                {q.view === "quiz" ? "独立判断两种规则" : "把数字还原成条件"}
              </h2>
            </div>
            {q.view === "quiz" ? (
              <ObjectiveQuestion
                item={clockQuestions[q.quizKind][q.quizIndex]}
                order={q.order}
                selected={q.selected}
                result={q.results[q.quizIndex]}
                caption={q.quizKind === "delayed" ? "隔日变式" : "即时闭卷"}
                index={q.quizIndex}
                total={3}
                nextLabel={q.quizIndex === 2 ? "查看时间线复盘" : "下一题"}
                onSelect={(i) =>
                  save((old) => ({
                    ...old,
                    selected: old.selected.includes(i)
                      ? old.selected.filter((n) => n !== i)
                      : [...old.selected, i],
                  }))
                }
                onSubmit={() => save(submitClocksQuiz)}
                onNext={() => save((old) => nextClocksQuiz(old, today))}
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
                  <p>分别检查起点、保险金和现金价值。</p>
                </div>
                {q.results.some((r) => !r.correct) && (
                  <div className="iq-repair">
                    <h3>先补这几处</h3>
                    {clockQuestions[q.quizKind].map(
                      (item, i) =>
                        !q.results[i].correct && (
                          <p key={item.label}>{item.label}</p>
                        ),
                    )}
                  </div>
                )}
                <div className="tc-recap">
                  <article>
                    <FileCheck2 size={22} />
                    <h3>第43条：看交费账本</h3>
                    <p>
                      故意致死不赔保险金。交足二年以上保费，向其他权利人退还现金价值。
                    </p>
                  </article>
                  <article>
                    <Clock3 size={22} />
                    <h3>第44条：看成立或复效</h3>
                    <p>
                      二年内自杀原则免责，但退现金价值；自杀时无民事行为能力的，适用例外。
                    </p>
                  </article>
                </div>
                <div className="cq-next-day">
                  <Clock3 size={22} />
                  <div>
                    <h3>
                      {clocksReviewDue(q, today)
                        ? "今天用另一组变式复测"
                        : "隔一天，再离开画面判断"}
                    </h3>
                    <p>
                      即时闭卷与隔日变式分开记录。再次复测仍使用同一组变式题。
                    </p>
                    {clocksReviewDue(q, today) && (
                      <button
                        onClick={() =>
                          save((old) => startClocksQuiz(old, "delayed"))
                        }
                      >
                        开始隔日变式
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="cq-summary-actions">
                  <a className="button" href="#/focus/memory">
                    回到记忆宫殿
                    <ArrowRight size={16} />
                  </a>
                  <button
                    className="cq-outline"
                    onClick={() => save((old) => ({ ...old, view: "learn" }))}
                  >
                    回到时间线
                  </button>
                  <button
                    className="cq-link-button"
                    onClick={() => save((old) => startClocksQuiz(old))}
                  >
                    重做即时闭卷题
                  </button>
                </div>
                <details className="cq-history">
                  <summary>查看记录（{q.history.length} 轮）</summary>
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
      ) : (
        <>
          <div className="tc-mode" role="group" aria-label="选择两年规则">
            <button
              className={q.mode === "premium" ? "active" : ""}
              aria-pressed={q.mode === "premium"}
              onClick={() => edit({ mode: "premium" })}
            >
              <FileCheck2 size={20} />
              <span>
                <b>投保人故意致死</b>
                <small>第43条 · 交费账本</small>
              </span>
            </button>
            <button
              className={q.mode === "suicide" ? "active" : ""}
              aria-pressed={q.mode === "suicide"}
              onClick={() => edit({ mode: "suicide" })}
            >
              <Clock3 size={20} />
              <span>
                <b>被保险人自杀</b>
                <small>第44条 · 成立与复效</small>
              </span>
            </button>
          </div>
          <section className="tc-workspace" ref={panel} tabIndex={-1}>
            <header className="iq-pair-prompt">
              <span>先选判断点，再分开看两种财产后果</span>
              <h3>
                {q.mode === "premium"
                  ? "交费跨过两年，哪些后果会变？"
                  : q.incapable
                    ? "出现能力例外，还需要用两年期间判断免责吗？"
                    : q.restored
                      ? "最初成立很久了，为什么还要看复效？"
                      : "从成立到事故，是否落在两年之内？"}
              </h3>
            </header>
            <div className="tc-case">
              <span>本案事实</span>
              <p>
                {q.mode === "premium"
                  ? `有效的人身保险合同中，投保人甲故意造成被保险人乙死亡。已查明甲交足了 ${q.paidYears} 年保险费。`
                  : `有效的死亡保险合同${q.restored ? "曾经中止，后依法恢复效力" : "从未中止"}，被保险人在${q.restored ? "复效" : "成立"} ${q.elapsedYears} 年后自杀，自杀时${q.incapable ? "为无民事行为能力人" : "具有完全民事行为能力"}。`}
              </p>
            </div>
            <div className="tc-desk">
              <div className="tc-controls">
                {q.mode === "premium" ? (
                  <div className="tc-ledger">
                    <span className="cq-eyebrow">已缴保险费凭证</span>
                    <h3>交足 {q.paidYears} 年</h3>
                    <div className="tc-receipts">
                      {[1, 2, 3].map((year) => (
                        <button
                          key={year}
                          className={year <= q.paidYears ? "paid" : ""}
                          aria-label={`交足 ${year} 年保险费`}
                          aria-pressed={year === q.paidYears}
                          onClick={() => edit({ paidYears: year })}
                        >
                          <FileCheck2 size={25} />
                          <strong>第 {year} 年</strong>
                          <small>
                            {year <= q.paidYears ? "已交足" : "未计入"}
                          </small>
                        </button>
                      ))}
                    </div>
                    <div className="tc-two-year">
                      <i style={{ width: `${(q.paidYears / 3) * 100}%` }} />
                      <span>二年门槛</span>
                    </div>
                    <p>点击一张凭证，改变已经交足的保费年限，再判断后果。</p>
                  </div>
                ) : (
                  <>
                    <LifeTimeline q={q} />
                    <div className="tc-fact-controls">
                      <label>
                        <input
                          type="checkbox"
                          checked={q.restored}
                          onChange={(e) => edit({ restored: e.target.checked })}
                        />
                        本案曾经中止，后已依法复效
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={q.incapable}
                          onChange={(e) =>
                            edit({ incapable: e.target.checked })
                          }
                        />
                        自杀时为无民事行为能力人
                      </label>
                      <label className="tc-slide">
                        <span>
                          移动事故位置：{q.restored ? "复效" : "成立"}{" "}
                          {q.elapsedYears} 年后
                        </span>
                        <input
                          aria-label="事故发生在所述起点后几年"
                          type="range"
                          min="0"
                          max="1"
                          step="1"
                          value={q.elapsedYears === 1 ? 0 : 1}
                          onChange={(e) =>
                            edit({
                              elapsedYears:
                                Number(e.target.value) === 0 ? 1 : 3,
                            })
                          }
                        />
                        <small>
                          <span>一年后</span>
                          <span>三年后</span>
                        </small>
                      </label>
                    </div>
                  </>
                )}
                <details className="tc-hint">
                  <summary>先看一遍判断方法</summary>
                  <p>
                    先分清行为主体。投保人故意致死，现金价值看已交足保费年限；被保险人自杀，先看自杀时行为能力，再看成立或复效后的期间。
                  </p>
                </details>
              </div>
              <div className="tc-decisions">
                <AnswerChoices
                  title="① 本次先核对哪个判断点？"
                  name="clock-anchor"
                  value={q.anchor}
                  choices={clockAnchors}
                  onChange={(anchor) =>
                    save((old) => ({ ...old, anchor, revealed: false }))
                  }
                />
                <AnswerChoices
                  title="② 保险金给付如何判断？"
                  name="clock-claim"
                  value={q.claim}
                  choices={clockClaims}
                  onChange={(claim) =>
                    save((old) => ({ ...old, claim, revealed: false }))
                  }
                />
                <AnswerChoices
                  title="③ 现金价值如何处理？"
                  name="clock-refund"
                  value={q.refund}
                  choices={clockRefunds}
                  onChange={(refund) =>
                    save((old) => ({ ...old, refund, revealed: false }))
                  }
                />
                <button
                  className="tc-submit"
                  disabled={!q.anchor || !q.claim || !q.refund || q.revealed}
                  onClick={() =>
                    save((old) => revealInsuranceClocks(old, today))
                  }
                >
                  核对起点与后果
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
            {q.revealed && (
              <div
                className={`tc-result ${last.correct ? "correct" : ""}`}
                role="status"
              >
                <ShieldCheck size={24} />
                <div>
                  <span>
                    {last.correct ? "三项判断均正确" : "沿着下面的顺序订正"}
                  </span>
                  <h3>{result.title}</h3>
                  <p>{result.reason}</p>
                  {!last.correct && (
                    <p className="tc-correction">
                      本次需要订正：
                      {[
                        last.anchor !== result.anchor && "判断点",
                        last.claim !== result.claim && "保险金给付",
                        last.refund !== result.refund && "现金价值处理",
                      ]
                        .filter(Boolean)
                        .join("、")}
                      。对照下面三项，找出是哪一步影响了结论。
                    </p>
                  )}
                  <dl>
                    <div>
                      <dt>判断点</dt>
                      <dd>{clockAnchors[result.anchor]}</dd>
                    </div>
                    <div>
                      <dt>保险金</dt>
                      <dd>{clockClaims[result.claim]}</dd>
                    </div>
                    <div>
                      <dt>现金价值</dt>
                      <dd>
                        {clockRefunds[result.refund]}
                        {q.mode === "premium" && result.refund === "return"
                          ? "，返还给其他权利人"
                          : ""}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="cq-outline tc-contrast"
                    onClick={() => edit(contrast.patch)}
                  >
                    {contrast.label}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
            <div className="tc-bottom">
              <p>改动案情后，结论会重新收起。先作预测，再核对。</p>
              <button onClick={() => save((old) => startClocksQuiz(old))}>
                收起时间线，进入闭卷
                <EyeOff size={16} />
              </button>
            </div>
          </section>
        </>
      )}
      <footer className="cq-source">
        <span>
          对应考前聚焦 PDF 第20页、旧背诵卷 PDF
          第107–114页。本任务分别使用保险法第43、44条；现金价值与保险金、已缴保险费分别判断。
        </span>
        <a href="#/focus/unit/focus-commercial-insurance-personal">
          回看保险考点 →
        </a>
        <a
          href="https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_4c715a53f3d4402c89f62ae77809f638.html"
          target="_blank"
          rel="noreferrer"
        >
          保险法第43、44条 ↗
        </a>
      </footer>
    </div>
  );
}
