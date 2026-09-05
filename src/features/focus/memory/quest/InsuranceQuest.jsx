import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  EyeOff,
  Files,
  Lightbulb,
  RotateCcw,
  Scale,
} from "lucide-react";
import { emptyFocusState } from "../../../../lib/focus-state.js";
import {
  INSURANCE_PATH,
  insuranceFields,
  insuranceOutcomes,
  insuranceComparisons,
  insuranceDecision,
  sameInsuranceFacts,
  newInsuranceQuest,
  changeInsuranceFacts,
  selectInsurancePair,
  revealInsurance,
  insuranceQuestions,
  startInsuranceQuiz,
  submitInsuranceQuiz,
  nextInsuranceQuiz,
} from "../../../../lib/insurance-quest.js";
import ObjectiveQuestion from "./ObjectiveQuestion.jsx";
import "./company-quest.css";
import "./insurance-quest.css";

const art = `${import.meta.env.BASE_URL}quests/insurance-archive.png`;
export function InsuranceEntry({ state }) {
  const q = state.focus?.insuranceQuest;
  return (
    <a
      className="iq-entry"
      href={INSURANCE_PATH}
      style={{ "--iq-art": `url("${art}")` }}
    >
      <div>
        <span className="cq-eyebrow">保险档案室 · 对照辨析</span>
        <h2>
          只改一个事实，
          <br />
          还赔不赔？
        </h2>
        <p>故意与重大过失 · 两道解除期限 · 解除与拒赔</p>
        <span className="cq-entry-cta">
          {q && q.phase !== "summary" ? "继续对照任务" : "打开两份案卷"}
          <ArrowRight size={18} />
        </span>
        <small>约 8–10 分钟 · 新旧讲义重合重点</small>
      </div>
      <Files size={32} className="iq-entry-symbol" aria-hidden="true" />
    </a>
  );
}

function Outcome({ facts }) {
  const decision = insuranceDecision(facts);
  return (
    <div className={`iq-outcome iq-outcome--${decision.code}`}>
      <span>处理结论</span>
      <h3>{insuranceOutcomes[decision.code].short}</h3>
      {decision.reasons.map((r) => (
        <p key={r}>{r}</p>
      ))}
    </div>
  );
}

export default function InsuranceQuest({ state, update, today }) {
  const q = state.focus?.insuranceQuest ?? null;
  const save = (fn) =>
    update((s) => ({
      ...s,
      focus: {
        ...(s.focus || emptyFocusState()),
        insuranceQuest:
          typeof fn === "function" ? fn(s.focus?.insuranceQuest) : fn,
      },
    }));
  const panel = useRef(null);
  useEffect(() => {
    if (q) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [q?.phase, q?.quizIndex, q?.comparison]);
  const pair = q ? insuranceComparisons[q.comparison] : null;
  const focusField = pair
    ? insuranceFields.find(
        (field) => pair.before[field.key] !== pair.after[field.key],
      )
    : null;
  const changed = q
    ? insuranceFields.filter(
        (field) => q.facts[field.key] !== pair.before[field.key],
      ).length
    : 0;
  const closed = q && q.phase !== "compare";
  const decision = q ? insuranceDecision(q.facts) : null;
  const practiced = q
    ? insuranceComparisons.filter((pair, i) =>
        q.attempts.some(
          (a) => a.comparison === i && sameInsuranceFacts(a.facts, pair.after),
        ),
      ).length
    : 0;
  return (
    <div className="cq iq" style={{ "--iq-art": `url("${art}")` }}>
      <nav className="cq-nav">
        <a href="#/focus/memory">
          <ArrowLeft size={16} />
          记忆宫殿
        </a>
        <span>{q ? "进度自动保存在本机" : "先预测，再对照"}</span>
      </nav>
      {!q ? (
        <>
          <section className="iq-welcome">
            <div>
              <span className="cq-eyebrow">保险档案室 · 每次只改一处</span>
              <h2>
                同样没有如实告知，
                <br />
                为什么后果不同？
              </h2>
              <p>
                左边保留一份已经讲清的案卷。
                <br />
                右边只改变关键事实，由你重新作出判断。
              </p>
              <button onClick={() => save(newInsuranceQuest())}>
                打开对照案卷
                <Files size={18} />
              </button>
              <small>六组对照 · 三道闭卷多选题 · 约 8–10 分钟</small>
            </div>
          </section>
          <div className="iq-principle">
            <Scale size={23} />
            <p>
              <strong>先分清两个问题</strong>
              能否解除，看告知事实对承保的影响和解除权；能否拒赔，再看法律规定的事故责任条件。不要把两个判断合并成一个。
            </p>
            <button
              className="cq-link-button"
              onClick={() => save(startInsuranceQuiz(newInsuranceQuest()))}
            >
              已有基础，直接闭卷
              <EyeOff size={17} />
            </button>
          </div>
        </>
      ) : closed ? (
        <section className="cq-exam-layout">
          <div className="cq-panel" ref={panel} tabIndex={-1}>
            <div className="cq-panel-heading">
              <span className="cq-eyebrow">场景与对照结论已收起</span>
              <h2>
                {q.phase === "quiz"
                  ? "离开对照，独立作答"
                  : "把错点记在具体条件上"}
              </h2>
            </div>
            {q.phase === "quiz" ? (
              <ObjectiveQuestion
                item={insuranceQuestions[q.quizIndex]}
                order={q.order}
                selected={q.selected}
                result={q.results[q.quizIndex]}
                caption="保险辨析 · 闭卷作答"
                index={q.quizIndex}
                total={3}
                nextLabel={q.quizIndex === 2 ? "查看本轮复盘" : "下一题"}
                onSelect={(i) =>
                  save((old) => ({
                    ...old,
                    selected: old.selected.includes(i)
                      ? old.selected.filter((n) => n !== i)
                      : [...old.selected, i],
                  }))
                }
                onSubmit={() => save(submitInsuranceQuiz)}
                onNext={() => save((old) => nextInsuranceQuiz(old, today))}
              />
            ) : (
              <>
                <div className="cq-summary-score">
                  <span>本轮闭卷作答</span>
                  <strong>
                    {q.results.filter((r) => r.correct).length}
                    <small> / 3</small>
                  </strong>
                  <p>对照练习与闭卷结果分别保存。</p>
                </div>
                <div className="cq-report-row">
                  <span>对照练习</span>
                  <strong>
                    已核对 {practiced}/6 组，闭卷成绩单独记录。
                  </strong>
                </div>
                <div className="iq-repair">
                  <h3>下一轮复习顺序</h3>
                  {insuranceQuestions.map(
                    (item, i) =>
                      !q.results[i].correct && (
                        <p key={item.label}>
                          <b>闭卷错点</b>
                          {item.label}
                        </p>
                      ),
                  )}
                  {q.results.every((r) => r.correct) && (
                    <p>
                      本轮三题均答对。明天先合上规则，再把这几组条件复述一次。
                    </p>
                  )}
                </div>
                {q.attempts.some((a) => !a.correct) && (
                  <details className="cq-recap">
                    <summary>回看最近判断错的对照案</summary>
                    <div>
                      {q.attempts
                        .filter((a) => !a.correct)
                        .slice(-3)
                        .map((a, i) => (
                          <article key={i}>
                            <h3>
                              {insuranceComparisons[a.comparison].title}
                              {!sameInsuranceFacts(
                                a.facts,
                                insuranceComparisons[a.comparison].after,
                              ) && " · 自定义条件"}
                            </h3>
                            <p>
                              {insuranceFields
                                .map(
                                  (field) =>
                                    `${field.label}：${field.options.find(([v]) => v === a.facts[field.key])[1]}`,
                                )
                                .join("；")}
                            </p>
                            <button
                              className="cq-link-button"
                              onClick={() =>
                                save((old) => ({
                                  ...old,
                                  phase: "compare",
                                  comparison: a.comparison,
                                  facts: { ...a.facts },
                                  prediction: "",
                                  revealed: false,
                                  hint: false,
                                }))
                              }
                            >
                              带着这份案情再判断
                              <ArrowRight size={15} />
                            </button>
                          </article>
                        ))}
                    </div>
                  </details>
                )}
                <details className="cq-recap">
                  <summary>复习时只抓三句话</summary>
                  <div>
                    <p>
                      ① 先查解除权：影响承保、订约时不知情、两个期间都没挡住。
                    </p>
                    <p>② 故意不告知：依法解除后，不赔、不退保险费。</p>
                    <p>
                      ③ 重大过失：对事故有严重影响，才可不赔；不赔时仍退保险费。
                    </p>
                  </div>
                </details>
                <div className="cq-summary-actions">
                  <a href="#/focus/memory" className="button">
                    返回记忆宫殿
                    <ArrowRight size={16} />
                  </a>
                  <button
                    className="cq-outline"
                    onClick={() =>
                      save((old) => ({ ...old, phase: "compare" }))
                    }
                  >
                    <RotateCcw size={16} />
                    回到对照台
                  </button>
                  <button
                    className="cq-link-button"
                    onClick={() => save(startInsuranceQuiz)}
                  >
                    再做这组三题
                  </button>
                </div>
                <details className="cq-history">
                  <summary>闭卷记录（{q.history.length} 轮）</summary>
                  {q.history
                    .slice()
                    .reverse()
                    .map((r, i) => (
                      <p key={i}>
                        {r.date} · {r.correct}/3 题
                      </p>
                    ))}
                </details>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <header className="iq-task-header">
            <div>
              <span className="cq-eyebrow">保险档案室 · 条件对照台</span>
              <h2>改变事实，先预测后果。</h2>
            </div>
            <button
              className="cq-outline"
              onClick={() => save(startInsuranceQuiz)}
            >
              <EyeOff size={16} />
              收起场景，直接闭卷
            </button>
          </header>
          <div className="iq-case-assumptions">
            <strong>共同案情</strong>
            <p>
              投保人未如实回答保险人提出的询问。事故已发生，属于约定保险责任范围，无其他免责事由。如果具备解除条件，保险人将依法解除；本次事故发生在解除前。
            </p>
          </div>
          <nav className="iq-pairs" aria-label="选择对照组">
            {insuranceComparisons.map((item, i) => (
              <button
                key={item.id}
                aria-pressed={q.comparison === i}
                className={q.comparison === i ? "active" : ""}
                onClick={() => save((old) => selectInsurancePair(old, i))}
              >
                <span>
                  {q.attempts.some(
                    (a) =>
                      a.comparison === i &&
                      sameInsuranceFacts(a.facts, item.after),
                  ) ? (
                    <Check size={13} />
                  ) : (
                    i + 1
                  )}
                </span>
                {item.title}
              </button>
            ))}
          </nav>
          <div className="iq-workbench" ref={panel} tabIndex={-1}>
            <div className="iq-pair-prompt">
              <span>第 {q.comparison + 1} 组 / 6</span>
              <h3>{pair.prompt}</h3>
              <p>
                当前与参照案相比改变了 {changed}{" "}
                项事实。橙色标出变化；每次只改一处，更容易找到原因。
              </p>
              {!sameInsuranceFacts(q.facts, pair.after) && (
                <button
                  className="iq-restore"
                  onClick={() =>
                    save((old) => selectInsurancePair(old, old.comparison))
                  }
                >
                  还原本组的一处变化
                </button>
              )}
            </div>
            <div className="iq-cases">
              <article className="iq-case iq-case--reference">
                <header>
                  <span>参照案 · 已讲解</span>
                  <h3>
                    {
                      focusField.options.find(
                        ([v]) => v === pair.before[focusField.key],
                      )[1]
                    }
                  </h3>
                </header>
                <dl>
                  {insuranceFields.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {
                          field.options.find(
                            ([v]) => v === pair.before[field.key],
                          )[1]
                        }
                      </dd>
                    </div>
                  ))}
                </dl>
                <Outcome facts={pair.before} />
              </article>
              <article className="iq-case iq-case--active">
                <header>
                  <span>变式案 · 由你判断</span>
                  <h3>
                    {
                      focusField.options.find(
                        ([v]) => v === q.facts[focusField.key],
                      )[1]
                    }
                  </h3>
                </header>
                <div className="iq-facts">
                  {insuranceFields.map((field) => (
                    <label
                      key={field.key}
                      className={
                        q.facts[field.key] !== pair.before[field.key]
                          ? "changed"
                          : ""
                      }
                    >
                      <span>
                        {field.label}
                        {q.facts[field.key] !== pair.before[field.key] && (
                          <b>已改变</b>
                        )}
                      </span>
                      <select
                        aria-label={field.label}
                        value={String(q.facts[field.key])}
                        onChange={(e) =>
                          save((old) =>
                            changeInsuranceFacts(old, {
                              [field.key]: field.options.find(
                                ([v]) => String(v) === e.target.value,
                              )[0],
                            }),
                          )
                        }
                      >
                        {field.options.map(([value, label]) => (
                          <option value={String(value)} key={String(value)}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {q.revealed ? (
                  <>
                    <Outcome facts={q.facts} />
                    <div
                      className={`iq-verdict ${q.prediction === decision.code ? "correct" : ""}`}
                      role="status"
                    >
                      <strong>
                        {q.prediction === decision.code
                          ? "本次预测正确"
                          : "对照一下你的判断"}
                      </strong>
                      <p>你的选择：{insuranceOutcomes[q.prediction].title}</p>
                      <p>
                        {insuranceDecision(pair.before).code === decision.code
                          ? "事实变了，结论仍然相同。请看清这项变化为何没有越过决定性的条件。"
                          : "对照左案：变动的事实改变了处理结论，重点记住它控制的是哪一层判断。"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="iq-sealed">
                    <Scale size={24} />
                    <strong>先作预测，结论随后展开</strong>
                    <span>避免一边看答案，一边觉得自己已经会了。</span>
                  </div>
                )}
              </article>
            </div>
            {!q.revealed && (
              <section className="iq-prediction">
                <h3>这份变式案，应当怎样处理？</h3>
                <fieldset>
                  <legend className="mp-sr-only">选择本案处理结论</legend>
                  {Object.entries(insuranceOutcomes).map(([code, outcome]) => (
                    <label
                      key={code}
                      className={q.prediction === code ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="insurance-outcome"
                        checked={q.prediction === code}
                        onChange={() =>
                          save((old) => ({ ...old, prediction: code }))
                        }
                      />
                      <span>{outcome.title}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="iq-predict-actions">
                  <button
                    className="cq-link-button"
                    onClick={() => save((old) => ({ ...old, hint: true }))}
                  >
                    <Lightbulb size={16} />
                    给我判断顺序
                  </button>
                  <button
                    disabled={!q.prediction}
                    onClick={() => save(revealInsurance)}
                  >
                    提交预测，展开对照
                    <ArrowRight size={17} />
                  </button>
                </div>
                {q.hint && (
                  <p className="iq-hint">
                    先查有无解除权，再查两个期间；之后区分故意与重大过失。重大过失据此拒赔，还多一个“对事故发生有严重影响”。
                  </p>
                )}
              </section>
            )}
            {q.revealed && (
              <div className="iq-next">
                <span>已核对 {practiced}/6 组 · 可随时闭卷检验</span>
                <button
                  onClick={() =>
                    q.comparison < 5
                      ? save((old) =>
                          selectInsurancePair(old, old.comparison + 1),
                        )
                      : save(startInsuranceQuiz)
                  }
                >
                  {q.comparison < 5 ? "换下一组事实" : "收起对照，开始闭卷"}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <footer className="cq-source">
        <span>
          本任务专练不如实告知的解除、拒赔与退费。对应考前聚焦 PDF 第 20
          页、旧背诵卷 PDF 第 107–114 页；死亡保险、受益人等规则仍在原单元复习。
        </span>
        <a href="#/focus/unit/focus-commercial-insurance-personal">
          回看保险讲义要点 →
        </a>
        <a
          href="https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_4c715a53f3d4402c89f62ae77809f638.html"
          target="_blank"
          rel="noreferrer"
        >
          保险法第 16 条 ↗
        </a>
        <a
          href="https://cicc.court.gov.cn/html/1/380/385/12841.html"
          target="_blank"
          rel="noreferrer"
        >
          保险法解释（二）第 8 条 ↗
        </a>
      </footer>
    </div>
  );
}
