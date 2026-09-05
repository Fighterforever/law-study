import { ArrowRight, BookOpen, Clock3, EyeOff, RotateCcw } from "lucide-react";
import { memoryAgenda, agendaQuiz } from "../../../lib/memory-agenda.js";
import { emptyFocusState } from "../../../lib/focus-state.js";
import "./memory-desk.css";

const art = (name) => `${import.meta.env.BASE_URL}quests/${name}`;
const actionLabel = (task) =>
  ({
    resume: "继续上次进度",
    review: task.id === "insurance" ? "开始原题复核" : "开始隔日变式",
    repair: "查看本轮错点",
    learn: task.id === "jurisdiction" ? "先用三题查漏" : "进入案件任务",
    summary: "查看学习复盘",
  })[task.action];

export default function MemoryDesk({
  state,
  update,
  today,
  examDate,
  shortReview,
}) {
  const agenda = memoryAgenda(state, today, examDate);
  const next = agenda.next;
  const shortFirst =
    !agenda.examReached && shortReview && (!next || next.rank > 1);
  const heroArt = art(
    shortFirst
      ? "commercial-study.png"
      : next?.art || "jurisdiction-harbor.png",
  );
  const startQuiz = (task, review = false) => {
    update((s) => ({
      ...s,
      focus: {
        ...(s.focus || emptyFocusState()),
        [task.key]: agendaQuiz(task, s.focus?.[task.key], review),
      },
    }));
    window.location.hash = task.path.slice(1);
  };
  const primary = (task, className) =>
    task.action === "review" ||
    (task.action === "learn" && task.id === "jurisdiction") ? (
      <button
        className={className}
        onClick={() => startQuiz(task, task.action === "review")}
      >
        {actionLabel(task)}
        <ArrowRight size={17} />
      </button>
    ) : (
      <a className={className} href={task.path}>
        {actionLabel(task)}
        <ArrowRight size={17} />
      </a>
    );
  const title = shortFirst
    ? shortReview.title
    : next?.title ||
      (agenda.examReached
        ? "带着清晰的判断，走进考场。"
        : "场景先放一放，回到普通题面。");
  const reason = shortFirst
    ? shortReview.reason
    : next?.reason ||
      (agenda.examReached
        ? "不再推送新任务。已学资料和学习记录仍保留在下方。"
        : agenda.finalReview
          ? "最后两天集中查漏，不再安排新的长场景。"
          : "今天的已学任务已复习。到今日冲刺完成客观题，再决定是否查阅其他主题。");
  return (
    <section className="md-desk" aria-label="记忆学习安排">
      <div className="md-heading">
        <div>
          <span>记忆宫殿 · 学习桌</span>
          <h2>把规则用在案情里。</h2>
        </div>
        <a href="#/focus/plan">
          查看考前安排
          <ArrowRight size={15} />
        </a>
      </div>
      <div className="md-hero" style={{ "--md-art": `url("${heroArt}")` }}>
        <div className="md-hero-copy">
          <span className="md-eyebrow">
            {shortFirst
              ? "先补短路线中的薄弱点"
              : next
                ? "今天先做这一件"
                : "今天的下一步"}
          </span>
          <h3>{title}</h3>
          <p>{reason}</p>
          <div className="md-hero-actions">
            {shortFirst ? (
              <a className="md-primary" href={shortReview.href}>
                进入短路线
                <ArrowRight size={17} />
              </a>
            ) : next ? (
              primary(next, "md-primary")
            ) : (
              <a className="md-primary" href="#/focus">
                回到今日冲刺
                <ArrowRight size={17} />
              </a>
            )}
            <a
              className="md-quiet"
              href="#memory-task-shelf"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("memory-task-shelf")
                  ?.scrollIntoView({ block: "start", behavior: "instant" });
              }}
            >
              自己选择任务
            </a>
          </div>
        </div>
        <div className="md-status">
          <span>学习记录</span>
          <div>
            <strong>
              {agenda.completedToday}
              <small> / 4</small>
            </strong>
            <p>今天做过闭卷的任务</p>
          </div>
          <div>
            <b>{agenda.due}</b>
            <p>项已到复测日</p>
          </div>
          <small>学习记录保存在本机；完成数量不代表掌握程度。</small>
        </div>
      </div>
      <div className="md-routine">
        <span>
          <b>01</b> 先续完题目
        </span>
        <ArrowRight size={14} />
        <span>
          <b>02</b> 隔日撤提示复测
        </span>
        <ArrowRight size={14} />
        <span>
          <b>03</b> 回到具体错点
        </span>
      </div>
      {!agenda.examReached && !shortFirst && shortReview && (
        <a className="md-short-review" href={shortReview.href}>
          <RotateCcw size={19} />
          <div>
            <strong>{shortReview.title}</strong>
            <span>{shortReview.reason}</span>
          </div>
          <ArrowRight size={17} />
        </a>
      )}
      <div className="md-shelf-heading" id="memory-task-shelf">
        <div>
          <span>三个地点 · 四个重点任务</span>
          <h3>选择这次要分清的规则</h3>
        </div>
        <p>熟悉的主题先做题；陌生的主题先看案情。</p>
      </div>
      <div className="md-task-grid">
        {agenda.tasks.map((task) => (
          <article className="md-task" key={task.id}>
            <a
              className="md-task-art"
              href={task.path}
              style={{ "--md-art": `url("${art(task.art)}")` }}
              aria-label={`进入${task.short}`}
            >
              <span>{task.place}</span>
              <BookOpen size={20} />
            </a>
            <div className="md-task-body">
              <div className="md-task-meta">
                <span>{task.status}</span>
                <span>
                  <Clock3 size={13} />约 {task.minutes} 分钟
                </span>
              </div>
              <h4>{task.short}</h4>
              <p>{task.summary}</p>
              <div className="md-task-record">
                {task.firstToday !== undefined ? (
                  <span>
                    今日首次闭卷 <b>{task.firstToday}/3</b>
                    {task.delayedToday !== undefined && (
                      <>
                        {" "}
                        · 隔日变式 <b>{task.delayedToday}/3</b>
                      </>
                    )}
                  </span>
                ) : task.last ? (
                  <span>
                    上次闭卷 {task.last.date} · <b>{task.last.correct}/3</b>
                  </span>
                ) : (
                  <span>可直接进入，无需解锁</span>
                )}
              </div>
              <div className="md-task-actions">
                {agenda.finalReview && task.action === "learn" ? (
                  <a className="md-task-primary" href={task.path}>
                    自由查阅
                    <ArrowRight size={15} />
                  </a>
                ) : (
                  primary(task, "md-task-primary")
                )}
                <button className="md-quiz" onClick={() => startQuiz(task)}>
                  <EyeOff size={15} />
                  {(task.q?.phase || task.q?.view) === "quiz"
                    ? "继续闭卷"
                    : "直接闭卷"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="md-time-note">
        场景任务每晚控制在约 30–40
        分钟，其余时间留给普通客观题和错因复盘。这里的分钟数仅供选任务时参考，不会当作你已用的学习时间。
      </p>
    </section>
  );
}
