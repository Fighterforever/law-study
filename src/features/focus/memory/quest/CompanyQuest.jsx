import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  Lightbulb,
  Mail,
  Scale,
  ShieldCheck,
  RotateCcw,
  EyeOff,
} from "lucide-react";
import { emptyFocusState } from "../../../../lib/focus-state.js";
import {
  QUEST_PATH,
  QUEST_UNIT,
  newCompanyQuest,
  checkQuestStep,
  editQuestForm,
  questionsFor,
  submitQuestQuiz,
  finishQuest,
  questReviewDue,
} from "../../../../lib/company-quest.js";
import "./company-quest.css";
import ObjectiveQuestion from "./ObjectiveQuestion.jsx";

const art = `${import.meta.env.BASE_URL}quests/commercial-study.png`;
const stageNames = {
  draft: "起草催缴书",
  decision: "审查失权条件",
  scope: "确定失权范围",
  branches: "处理两条后续线",
  variation: "改变一个事实",
  quiz: "离开场景做题",
  summary: "本案复盘",
};
const flow = ["draft", "decision", "scope", "branches", "variation", "quiz"];
const hints = {
  draft:
    "先看书面形式，再看宽限期。把催缴书放进发信箱时，宽限期开始；60 日是下限，可以给得更长。",
  decision:
    "像审查程序要件一样逐项看：本案实际宽限期是否届满？还欠缴吗？有没有董事会决议？几项必须同时成立。",
  scope:
    "账册把甲的出资分成已缴与未缴两部分。只撤下未缴的那部分；通知从发信箱寄出时，发生失权效果。",
  company:
    "公司桌上有两个可用方案：依法转让，或相应减资注销。六个月仍未完成，其他股东按出资比例补缴。",
  shareholder:
    "沿收信箱这条线想：股东接到通知后，三十日内可以起诉。无需先等公司完成股权处置。",
  variation:
    "每次只改一处：59 日碰到最低期间；补缴改变失权前提；接到日改变异议起诉的起点。",
};

export function QuestEntry({ state, today, compact = false }) {
  const q = state.focus?.companyQuest;
  const due = questReviewDue(q, today);
  const active = q && q.phase !== "summary";
  return (
    <a
      className={`cq-entry ${compact ? "cq-entry--compact" : ""}`}
      href={QUEST_PATH}
      style={{ "--cq-art": `url("${art}")` }}
    >
      <div className="cq-entry-copy">
        <span className="cq-eyebrow">
          <span className="cq-diamond" /> 案件记忆 · 商事事务所
        </span>
        <h2>
          这封失权通知，
          <br />
          今天能发吗？
        </h2>
        <p>
          接手一宗出资案件。用文书推进程序，用份额看清失权，再把案情改一处。
        </p>
        <span className="cq-entry-cta">
          {active
            ? `继续 · ${stageNames[q.phase]}`
            : due
              ? "今日可复测 · 换一宗新案"
              : "接手案件"}
          <ArrowRight size={19} />
        </span>
        <span className="cq-entry-meta">
          新旧讲义重合重点 · 约 10–12 分钟 · 随时续做
        </span>
      </div>
      {!compact && (
        <div className="cq-entry-seal" aria-hidden="true">
          <Scale size={29} />
          <span>
            一封文书
            <br />
            两条后续线
          </span>
        </div>
      )}
    </a>
  );
}

function Choices({ title, name, value, options, onChange, disabled = false }) {
  return (
    <fieldset className="cq-field" disabled={disabled}>
      <legend>{title}</legend>
      <div className="cq-choices">
        {options.map(([id, label, detail]) => (
          <label
            className={`cq-choice ${value === id ? "is-selected" : ""}`}
            key={id}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span>
              <strong>{label}</strong>
              {detail && <small>{detail}</small>}
            </span>
            {value === id && <Check size={16} aria-hidden="true" />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Feedback({ q, checkKey, success }) {
  if (q.feedback?.key !== checkKey) return null;
  const errors = q.feedback.errors;
  return (
    <div
      className={`cq-feedback ${errors.length ? "needs-work" : "is-correct"}`}
      role="status"
    >
      <strong>
        {errors.length
          ? "先修正这里，再推进案件"
          : q.checks[checkKey].first
            ? "判断成立"
            : "订正完成"}
      </strong>
      {errors.length ? (
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : (
        <p>{success}</p>
      )}
    </div>
  );
}

function Hint({ q, checkKey, save }) {
  const open = q.hints.includes(checkKey);
  return (
    <div className="cq-hint">
      <button
        className="cq-link-button"
        onClick={() =>
          !open && save((old) => ({ ...old, hints: [...old.hints, checkKey] }))
        }
        aria-expanded={open}
      >
        <Lightbulb size={16} />
        {open ? "已查看提示" : "卡住了？给我一条线索"}
      </button>
      {open && <p>{hints[checkKey]}</p>}
    </div>
  );
}

export default function CompanyQuest({ state, update, today, data }) {
  const q = state.focus?.companyQuest ?? null;
  const panel = useRef(null);
  const unit = data.units.find((u) => u.id === QUEST_UNIT);
  const save = (fn) =>
    update((s) => ({
      ...s,
      focus: {
        ...(s.focus || emptyFocusState()),
        companyQuest: typeof fn === "function" ? fn(s.focus?.companyQuest) : fn,
      },
    }));
  const start = (mode) => save(newCompanyQuest(mode, q?.history || []));
  const form = (patch) => save((old) => editQuestForm(old, patch));
  const grade = (key) => save((old) => checkQuestStep(old, key));
  const next = (phase) => save((old) => ({ ...old, phase, feedback: null }));
  useEffect(() => {
    if (!q) return;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [q?.phase, q?.quizIndex]);
  const closed = q && ["quiz", "summary"].includes(q.phase);
  return (
    <div
      className={`cq ${closed ? "cq--closed" : ""}`}
      style={{ "--cq-art": `url("${art}")` }}
    >
      <nav className="cq-nav">
        <a href="#/focus/memory">
          <ArrowLeft size={16} />
          记忆宫殿
        </a>
        <span>{q ? "当前进度自动保存在本机" : "原创学习案件 · 不限时"}</span>
        {q && !closed && (
          <button className="cq-link-button" onClick={() => next("quiz")}>
            <EyeOff size={15} />
            直接闭卷
          </button>
        )}
      </nav>
      {!q ? (
        <>
          <section className="cq-welcome">
            <div className="cq-welcome-copy">
              <span className="cq-eyebrow">商事事务所 · 出资与失权</span>
              <h2>
                这封失权通知，
                <br />
                今天能发吗？
              </h2>
              <p>
                经理想取消欠缴股东的全部股权。
                <br />
                请你接手案卷，决定哪些程序能推进，哪些必须停下。
              </p>
              <div className="cq-welcome-actions">
                <button onClick={() => start("guided")}>
                  <BookOpen size={18} />
                  先看示范，再接手
                </button>
                <button
                  className="cq-glass"
                  onClick={() => start("independent")}
                >
                  直接接手
                  <ArrowRight size={17} />
                </button>
              </div>
              <small>
                约 10–12 分钟 · 随时退出续做 · 结尾有 3 道无提示多选题
              </small>
            </div>
          </section>
          <div className="cq-intro-grid">
            <article>
              <Mail />
              <h3>让文书承担含义</h3>
              <p>
                催缴书与失权通知各管一段程序；发信箱与收信箱各绑定不同起点。
              </p>
            </article>
            <article>
              <GitBranch />
              <h3>让后果随事实变化</h3>
              <p>
                期限更长、补缴完成、通知晚到，都要重新判断；合法的不同处理路径都能推进。
              </p>
            </article>
            <article>
              <EyeOff />
              <h3>最后把画面收起来</h3>
              <p>
                做普通法考题，再隔日换新案。场景中的订正与无提示作答分别记录。
              </p>
            </article>
          </div>
          <button className="cq-link-button" onClick={() => start("quiz")}>
            已有基础，直接做本案闭卷题
            <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <>
          {!closed && (
            <ol className="cq-progress" aria-label="案件进度">
              {flow.map((key, index) => (
                <li
                  className={
                    key === q.phase
                      ? "current"
                      : flow.indexOf(q.phase) > index
                        ? "complete"
                        : ""
                  }
                  key={key}
                  aria-current={key === q.phase ? "step" : undefined}
                >
                  <span>
                    {flow.indexOf(q.phase) > index ? (
                      <Check size={13} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <b>{stageNames[key]}</b>
                </li>
              ))}
            </ol>
          )}
          <div className={closed ? "cq-exam-layout" : "cq-workspace"}>
            {!closed && (
              <aside className="cq-case-scene" aria-label="本案事实">
                <div className="cq-scene-heading">
                  <span className="cq-eyebrow">青禾公司 · 出资案卷</span>
                  <h2>
                    {q.phase === "branches" ? (
                      <>
                        通知已发出，
                        <br />
                        后续分两线。
                      </>
                    ) : q.phase === "variation" ? (
                      <>
                        只改一处，
                        <br />
                        还会一样吗？
                      </>
                    ) : (
                      <>
                        看清条件，
                        <br />
                        再落下一步。
                      </>
                    )}
                  </h2>
                </div>
                <div className="cq-ledger">
                  <span className="cq-paper-caption">
                    董事会已核查的出资情况
                  </span>
                  <div className="cq-ledger-sum">
                    <span>股东甲 · 认缴出资</span>
                    <strong>
                      100<small>万元</small>
                    </strong>
                  </div>
                  <div className="cq-balance">
                    <span>
                      <i />
                      已缴 60 万
                    </span>
                    <span>
                      <i />
                      未缴 40 万
                    </span>
                  </div>
                  <div className="cq-money-bar" aria-hidden="true">
                    <i />
                    <i />
                  </div>
                  <p>章程规定的出资期限已届满。甲尚未补缴剩余出资。</p>
                  {q.checks.draft?.correct && (
                    <div className="cq-file-receipt">
                      <Mail size={17} />
                      <span>
                        书面催缴已发出
                        <br />
                        <b>本案宽限期：{q.form.grace} 日</b>
                      </span>
                    </div>
                  )}
                  {q.checks.scope?.correct && (
                    <div className="cq-file-receipt">
                      <ShieldCheck size={17} />
                      <span>
                        书面失权通知已发出
                        <br />
                        <b>仅未缴的 40 万元对应股权丧失</b>
                      </span>
                    </div>
                  )}
                </div>
                <p className="cq-scene-note">把文书、份额与起点联系起来。</p>
              </aside>
            )}
            <section
              className="cq-panel"
              ref={panel}
              tabIndex={-1}
              aria-label={stageNames[q.phase]}
            >
              <div className="cq-panel-heading">
                <span className="cq-eyebrow">
                  {closed
                    ? "普通客观题 · 场景与提示已收起"
                    : `当前任务 · ${q.mode === "guided" ? "示范后练习" : "自主处理"}`}
                </span>
                <h2>{stageNames[q.phase]}</h2>
              </div>
              {q.phase === "draft" && (
                <>
                  {q.mode === "guided" && (
                    <div className="cq-demonstration">
                      <BookOpen size={21} />
                      <div>
                        <strong>先看一次示范</strong>
                        <p>
                          董事会负责核查出资，公司负责发出书面催缴书。把宽限期从“发出”接起，给股东至少
                          60
                          日补缴。宽限期届满后还要查有没有补缴，再决定能否进入失权程序。
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="cq-task">
                    经理的电话已经打过了。现在请起草一份能够继续推进本案的催缴方案。
                  </p>
                  <Choices
                    title="用什么形式催缴？"
                    name="document"
                    value={q.form.document}
                    options={[
                      ["phone", "电话催缴", "只再打一次电话"],
                      ["written", "书面催缴书", "由公司发出"],
                    ]}
                    onChange={(document) => form({ document })}
                  />
                  <Choices
                    title="给多长宽限期？"
                    name="grace"
                    value={q.form.grace}
                    options={[
                      [45, "45 日"],
                      [60, "60 日"],
                      [90, "90 日"],
                    ]}
                    onChange={(grace) => form({ grace })}
                  />
                  <Choices
                    title="将期间起点放在哪个事件上？"
                    name="start"
                    value={q.form.start}
                    options={[
                      ["sent", "催缴书发出", "发信箱"],
                      ["received", "催缴书接到", "收信箱"],
                    ]}
                    onChange={(start) => form({ start })}
                  />
                  <Hint {...{ q, save }} checkKey="draft" />
                  {q.form.document && q.form.grace > 0 && q.form.start && (
                    <div
                      className="cq-draft-letter"
                      aria-label="你的催缴方案预览"
                    >
                      <span>按你的选择形成 · 待审核</span>
                      <h3>
                        {q.form.document === "written"
                          ? "书面催缴书"
                          : "电话催缴记录"}
                      </h3>
                      <p>
                        股东甲：你认缴的出资尚有 <b>40 万元</b>{" "}
                        未缴纳，请自本次催缴
                        {q.form.start === "sent" ? "发出" : "接到"}之日起{" "}
                        <b>{q.form.grace} 日</b> 内履行出资义务。
                      </p>
                      <small>青禾有限责任公司</small>
                    </div>
                  )}
                  <Feedback
                    q={q}
                    checkKey="draft"
                    success={`公司已发出书面催缴书。本案选择 ${q.form.grace} 日，后面就按 ${q.form.grace} 日处理。`}
                  />
                  <div className="cq-actions">
                    {q.feedback?.key === "draft" && q.checks.draft?.correct ? (
                      <button
                        onClick={() => {
                          save((old) => ({
                            ...old,
                            phase: "decision",
                            feedback: null,
                            form: { ...old.form, elapsed: old.form.grace - 1 },
                          }));
                        }}
                      >
                        将催缴书归入案卷
                        <ArrowRight size={17} />
                      </button>
                    ) : (
                      <button
                        disabled={
                          !q.form.document || !q.form.grace || !q.form.start
                        }
                        onClick={() => grade("draft")}
                      >
                        审核并发出催缴书
                        <Mail size={17} />
                      </button>
                    )}
                  </div>
                </>
              )}
              {q.phase === "decision" && (
                <>
                  <p className="cq-task">
                    甲仍未补缴。请调整程序节点，判断现在是否具备发出失权通知的条件。
                  </p>
                  <div className="cq-timeboard">
                    <div>
                      <Clock3 size={19} />
                      <strong>
                        {q.form.elapsed < q.form.grace
                          ? `距离本案宽限期届满还有 ${q.form.grace - q.form.elapsed} 日`
                          : `本案 ${q.form.grace} 日宽限期已经届满`}
                      </strong>
                    </div>
                    <div className="cq-time-track">
                      <span>催缴书发出</span>
                      <i
                        style={{
                          "--cq-time": `${(q.form.elapsed / q.form.grace) * 100}%`,
                        }}
                      />
                      <span>{q.form.grace} 日</span>
                    </div>
                    <button
                      className="cq-outline"
                      disabled={q.form.elapsed === q.form.grace}
                      onClick={() => form({ elapsed: q.form.grace })}
                    >
                      推进至本案宽限期届满
                      <ArrowRight size={16} />
                    </button>
                    <small>时间推进后，财务核查：剩余 40 万元仍未缴纳。</small>
                  </div>
                  <Choices
                    title="谁来作出失权决定？"
                    name="authority"
                    value={q.form.authority}
                    options={[
                      ["manager", "经理签字"],
                      ["board", "董事会决议"],
                      ["shareholders", "股东会表决"],
                    ]}
                    onChange={(authority) => form({ authority })}
                  />
                  <Hint {...{ q, save }} checkKey="decision" />
                  <Feedback
                    q={q}
                    checkKey="decision"
                    success="实际宽限期届满、仍未补缴、董事会决议都已齐备。接下来审核书面失权通知的范围与生效事件。"
                  />
                  <div className="cq-actions">
                    {q.feedback?.key === "decision" &&
                    q.checks.decision?.correct ? (
                      <button onClick={() => next("scope")}>
                        起草书面失权通知
                        <FileText size={17} />
                      </button>
                    ) : (
                      <button
                        disabled={!q.form.authority}
                        onClick={() => grade("decision")}
                      >
                        现在可以进入失权程序吗？
                      </button>
                    )}
                  </div>
                </>
              )}
              {q.phase === "scope" && (
                <>
                  <p className="cq-task">
                    经理拟取消甲的全部股权。请在下列十格中，圈出本次失权应涉及的部分。
                  </p>
                  <fieldset className="cq-share-field">
                    <legend>
                      十格合计表示甲认缴 100 万元所对应股权，每格对应 10 万元
                    </legend>
                    <div className="cq-shares">
                      {Array.from({ length: 10 }, (_, i) => (
                        <button
                          key={i}
                          className={`${i < 6 ? "paid" : "unpaid"} ${q.form.shares.includes(i) ? "selected" : ""} ${q.checks.scope?.correct && q.feedback?.key === "scope" && i >= 6 ? "lost" : ""}`}
                          aria-pressed={q.form.shares.includes(i)}
                          aria-label={`第 ${i + 1} 格，${i < 6 ? "已缴" : "未缴"} 10 万元`}
                          onClick={() =>
                            form({
                              shares: q.form.shares.includes(i)
                                ? q.form.shares.filter((n) => n !== i)
                                : [...q.form.shares, i],
                            })
                          }
                        >
                          <span>
                            {q.form.shares.includes(i) ? (
                              <Check size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                          </span>
                          <b>10 万</b>
                          <small>
                            {i < 6
                              ? "已缴"
                              : q.checks.scope?.correct &&
                                  q.feedback?.key === "scope"
                                ? "已失权"
                                : "未缴"}
                          </small>
                        </button>
                      ))}
                    </div>
                    <p>
                      已选：{q.form.shares.length * 10}{" "}
                      万元对应股权。未选部分保留。
                    </p>
                  </fieldset>
                  <Choices
                    title="这份书面通知到哪一步产生失权效果？"
                    name="effect"
                    value={q.form.effect}
                    options={[
                      ["sent", "公司发出通知"],
                      ["received", "股东接到通知"],
                    ]}
                    onChange={(effect) => form({ effect })}
                  />
                  <Hint {...{ q, save }} checkKey="scope" />
                  <Feedback
                    q={q}
                    checkKey="scope"
                    success="通知已发出，四格未缴部分退出；六格已缴部分保留。接着分别处理公司与股东的后续事项。"
                  />
                  <div className="cq-actions">
                    {q.feedback?.key === "scope" && q.checks.scope?.correct ? (
                      <button onClick={() => next("branches")}>
                        展开两条后续线
                        <GitBranch size={17} />
                      </button>
                    ) : (
                      <button
                        disabled={!q.form.shares.length || !q.form.effect}
                        onClick={() => grade("scope")}
                      >
                        审核并执行失权通知
                        <Mail size={17} />
                      </button>
                    )}
                  </div>
                </>
              )}
              {q.phase === "branches" && (
                <>
                  <p className="cq-task">
                    书面失权通知已发出，甲于数日后接到。两边都要处理，先做哪边均可。
                  </p>
                  <div className="cq-branch-origin">
                    <Mail size={18} />
                    <span>失权通知发出</span>
                    <GitBranch size={22} />
                  </div>
                  <div className="cq-branches">
                    <article
                      className={q.checks.company?.correct ? "branch-done" : ""}
                    >
                      <header>
                        <span>公司线</span>
                        <h3>这部分股权怎么办？</h3>
                        {q.checks.company?.correct && (
                          <CheckCircle2 size={19} />
                        )}
                      </header>
                      <Choices
                        title="选一条合法处置路径"
                        name="disposal"
                        value={q.form.disposal}
                        options={[
                          ["transfer", "依法转让"],
                          ["reduce", "相应减资并注销"],
                          ["hold", "永久搁置"],
                        ]}
                        onChange={(disposal) => form({ disposal })}
                      />
                      <Choices
                        title="处置期间"
                        name="months"
                        value={q.form.months}
                        options={[
                          [3, "3 个月"],
                          [6, "6 个月"],
                          [12, "12 个月"],
                        ]}
                        onChange={(months) => form({ months })}
                      />
                      <Choices
                        title="届时仍未转让或注销，由谁补缴？"
                        name="fallback"
                        value={q.form.fallback}
                        options={[
                          ["equal", "其他股东平均分担"],
                          ["proportion", "其他股东按出资比例缴纳"],
                          ["none", "无人需要补缴"],
                        ]}
                        onChange={(fallback) => form({ fallback })}
                      />
                      <Hint {...{ q, save }} checkKey="company" />
                      <Feedback
                        q={q}
                        checkKey="company"
                        success="这条公司线处理完成。转让与相应减资注销都可行；逾六个月未完成，由其他股东按出资比例补缴。"
                      />
                      <button
                        className="cq-outline"
                        disabled={
                          !q.form.disposal || !q.form.months || !q.form.fallback
                        }
                        onClick={() => grade("company")}
                      >
                        核对公司线
                      </button>
                    </article>
                    <article
                      className={
                        q.checks.shareholder?.correct ? "branch-done" : ""
                      }
                    >
                      <header>
                        <span>股东线</span>
                        <h3>不服失权，何时起诉？</h3>
                        {q.checks.shareholder?.correct && (
                          <CheckCircle2 size={19} />
                        )}
                      </header>
                      <div className="cq-received">
                        <Mail size={24} />
                        <p>甲接到通知，准备向人民法院提出异议。</p>
                      </div>
                      <Choices
                        title="起诉期间从哪里接起？"
                        name="appealStart"
                        value={q.form.appealStart}
                        options={[
                          ["sent", "通知发出"],
                          ["received", "接到通知"],
                          ["disposed", "公司处置完股权"],
                        ]}
                        onChange={(appealStart) => form({ appealStart })}
                      />
                      <Choices
                        title="多长时间内提起诉讼？"
                        name="appealDays"
                        value={q.form.appealDays}
                        options={[
                          [30, "30 日"],
                          [60, "60 日"],
                        ]}
                        onChange={(appealDays) => form({ appealDays })}
                      />
                      <Hint {...{ q, save }} checkKey="shareholder" />
                      <Feedback
                        q={q}
                        checkKey="shareholder"
                        success="从接到通知接起三十日起诉期间，无须等待公司线完成。"
                      />
                      <button
                        className="cq-outline"
                        disabled={!q.form.appealStart || !q.form.appealDays}
                        onClick={() => grade("shareholder")}
                      >
                        核对股东线
                      </button>
                    </article>
                  </div>
                  {q.checks.company?.correct &&
                    q.checks.shareholder?.correct && (
                      <div className="cq-actions">
                        <button onClick={() => next("variation")}>
                          两条线已理清，换个事实试试
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    )}
                </>
              )}
              {q.phase === "variation" && (
                <>
                  <p className="cq-task">
                    以下是三个彼此独立的变式。每次只改标出的事实，其余条件与原案相同。
                  </p>
                  {[
                    [
                      "宽限期改为 59 日",
                      "公司从催缴书发出起只给 59 日，其余程序照旧。",
                      [
                        ["invalid", "不能按这份方案推进失权"],
                        ["valid", "其余程序齐全，仍可推进"],
                      ],
                    ],
                    [
                      "届满前足额补缴",
                      "甲在本案宽限期届满前缴清剩余 40 万元。",
                      [
                        ["continue", "曾经欠缴，仍可失权"],
                        ["stop", "失权前提已不成立，停止推进"],
                      ],
                    ],
                    [
                      "通知晚几天接到",
                      "公司发出失权通知的日期不变，甲接到的日期延后。",
                      [
                        ["both", "失权生效和起诉起点都后移"],
                        ["appeal", "起诉期间起点后移，失权生效日不变"],
                      ],
                    ],
                  ].map(([title, description, options], i) => (
                    <div className="cq-variation" key={title}>
                      <span className="cq-variation-number">0{i + 1}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{description}</p>
                        <Choices
                          title="你的判断"
                          name={`variation-${i}`}
                          value={q.form.variation[i]}
                          options={options}
                          onChange={(v) =>
                            form({
                              variation: q.form.variation.map((old, n) =>
                                n === i ? v : old,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <Hint {...{ q, save }} checkKey="variation" />
                  <Feedback
                    q={q}
                    checkKey="variation"
                    success="你已经分清：最低期间、欠缴事实和接到日期，分别改变不同的法律判断。接下来撤掉全部场景线索。"
                  />
                  <div className="cq-actions">
                    {q.feedback?.key === "variation" &&
                    q.checks.variation?.correct ? (
                      <button onClick={() => next("quiz")}>
                        收起案卷，进入闭卷题
                        <EyeOff size={17} />
                      </button>
                    ) : (
                      <button
                        disabled={q.form.variation.some((v) => !v)}
                        onClick={() => grade("variation")}
                      >
                        核对三个变式
                        <Check size={17} />
                      </button>
                    )}
                  </div>
                </>
              )}
              {q.phase === "quiz" && <Quiz {...{ q, save, today }} />}
              {q.phase === "summary" && (
                <QuestSummary {...{ q, today, start }} />
              )}
            </section>
          </div>
        </>
      )}
      <footer className="cq-source">
        <span>
          本任务专练催缴与失权；本单元的其他出资规则，继续按讲义要点复习。
        </span>
        <span>
          对应考点：{unit.title} · 考前聚焦 PDF 第 {unit.pages.join("、")} 页 ·
          旧背诵卷 PDF 第 {unit.overlap.pdfPages[0]}–
          {unit.overlap.pdfPages.at(-1)} 页
        </span>
        <a href={`#/focus/unit/${QUEST_UNIT}`}>
          回看讲义要点
          <BookOpen size={14} />
        </a>
        <a
          href="https://www.samr.gov.cn/djzcj/zcfg/fl/art/2026/art_9b4263a169cf43c2aba950cfc9ac1af2.html"
          target="_blank"
          rel="noreferrer"
        >
          公司法第 51、52 条 ↗
        </a>
      </footer>
    </div>
  );
}

function Quiz({ q, save, today }) {
  return (
    <ObjectiveQuestion
      item={questionsFor(q)[q.quizIndex]}
      order={q.quizOrder[q.quizIndex]}
      selected={q.quizSelected}
      result={q.quizResults[q.quizIndex]}
      caption={q.mode === "delayed" ? "隔日变式" : "即时闭卷"}
      index={q.quizIndex}
      total={3}
      nextLabel={q.quizIndex === 2 ? "查看本案复盘" : "下一题"}
      onSelect={(index) =>
        save((old) => ({
          ...old,
          quizSelected: old.quizSelected.includes(index)
            ? old.quizSelected.filter((i) => i !== index)
            : [...old.quizSelected, index],
        }))
      }
      onSubmit={() => save(submitQuestQuiz)}
      onNext={() =>
        save((old) =>
          old.quizIndex === 2
            ? finishQuest(old, today)
            : { ...old, quizIndex: old.quizIndex + 1, quizSelected: [] },
        )
      }
    />
  );
}

function QuestSummary({ q, today, start }) {
  const last = q.history.at(-1);
  const wrong = questionsFor(q).filter((_, i) => !q.quizResults[i].correct);
  const due = questReviewDue(q, today);
  const delayedSeen = q.history.some((r) => r.mode === "delayed");
  const repairs = Object.keys(q.checks).filter((k) => !q.checks[k].first);
  const names = {
    ...stageNames,
    company: "股权处置与补缴",
    shareholder: "异议起诉起点",
  };
  return (
    <div className="cq-summary">
      <div className="cq-summary-score">
        <span>{last.mode === "delayed" ? "隔日变式" : "即时闭卷"}</span>
        <strong>
          {last.correct}
          <small> / 3</small>
        </strong>
        <p>
          {last.correct === 3
            ? "这一轮无提示客观题全部答对。"
            : "把错点落到具体条件，下一轮就有方向。"}
        </p>
      </div>
      <div className="cq-report-row">
        <span>场景任务</span>
        <strong>
          {last.total
            ? `${last.hinted ? "用过示范或提示" : "自主处理"} · 已判断 ${last.total}/6 项，其中 ${last.first} 项首次正确`
            : "本轮直接做题"}
        </strong>
      </div>
      <div className="cq-report-row">
        <span>闭卷作答</span>
        <strong>{last.correct}/3 题 · 提交后核对，订正不覆盖首次结果</strong>
      </div>
      {(wrong.length > 0 || repairs.length > 0) && (
        <div className="cq-repair">
          <h3>下次先看这几处</h3>
          {wrong.map((item) => (
            <p key={item.label}>
              <span>闭卷错点</span>
              {item.label}
            </p>
          ))}
          {repairs.map((key) => (
            <p key={key}>
              <span>场景订正</span>
              {names[key]}
            </p>
          ))}
        </div>
      )}
      <div className="cq-next-day">
        <Clock3 size={23} />
        <div>
          <h3>
            {due
              ? delayedSeen
                ? "今天再做一次隔日复测"
                : "今天可以换一宗新案"
              : q.mode === "delayed"
                ? "本次隔日复测已记录"
                : delayedSeen
                  ? "明天，再独立复测"
                  : "明天，再换一宗新案"}
          </h3>
          <p>
            {delayedSeen
              ? "隔日变式题已做过。再次作答时先合上规则，再与此前的错点比较。"
              : due
                ? "先不看规则，直接检验昨天记住的条件能否用于新题。"
                : "同一天重做留作复习。隔日再用新题检查，能看出离开画面后还记得多少。"}
          </p>
          {due && (
            <button onClick={() => start("delayed")}>
              {delayedSeen ? "开始隔日复测" : "开始隔日新案"}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <details className="cq-recap">
        <summary>把本案压缩成三个记忆位置</summary>
        <div>
          <article>
            <Mail size={20} />
            <h3>发信箱 · 启动与生效</h3>
            <p>
              催缴书发出：接起至少 60 日的宽限期。
              <br />
              失权通知发出：未缴部分对应股权丧失。
            </p>
          </article>
          <article>
            <FileText size={20} />
            <h3>账册 · 范围与处置</h3>
            <p>
              已缴部分保留，未缴部分失权。
              <br />
              依法转让或相应减资注销；六个月内未完成，其他股东按出资比例补缴。
            </p>
          </article>
          <article>
            <Scale size={20} />
            <h3>收信箱 · 股东救济</h3>
            <p>
              股东接到失权通知：接起三十日起诉期间。
              <br />
              这条线无须等待公司处置完成。
            </p>
          </article>
        </div>
      </details>
      <details className="cq-history">
        <summary>查看本案学习记录（{q.history.length} 轮）</summary>
        {q.history
          .slice()
          .reverse()
          .map((r, i) => (
            <p key={i}>
              {r.date} · {r.mode === "delayed" ? "隔日变式" : "即时闭卷"} ·{" "}
              {r.correct}/3 题
            </p>
          ))}
      </details>
      <div className="cq-summary-actions">
        <a className="button" href="#/focus/memory">
          返回记忆宫殿
          <ArrowRight size={16} />
        </a>
        <button className="cq-outline" onClick={() => start("independent")}>
          <RotateCcw size={16} />
          重新处理案件
        </button>
        <button className="cq-link-button" onClick={() => start("quiz")}>
          再练即时闭卷题
        </button>
        <button className="cq-link-button" onClick={() => start("guided")}>
          回到示范，重新学一遍
        </button>
      </div>
    </div>
  );
}
