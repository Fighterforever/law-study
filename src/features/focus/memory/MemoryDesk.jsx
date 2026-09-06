import { ArrowRight } from "lucide-react";
import "./memory-desk.css";

const actionLabel = (task) =>
  ({
    resume: "继续学习",
    review: "做隔日变式",
    repair: "回看错点",
    learn: task.id === "jurisdiction" ? "先做三题" : "开始学习",
    summary: "查看复盘",
  })[task.action];

export function TaskAction({ task, onStartQuiz, className, children }) {
  const content = children || (
    <>
      {actionLabel(task)}
      <ArrowRight size={16} />
    </>
  );
  return task.action === "review" ||
    (task.action === "learn" && task.id === "jurisdiction") ? (
    <button
      className={className}
      onClick={() => onStartQuiz(task, task.action === "review")}
    >
      {content}
    </button>
  ) : (
    <a className={className} href={task.path}>
      {content}
    </a>
  );
}

export default function MemoryDesk({ agenda, shortReview, onStartQuiz }) {
  const next = agenda.next;
  const shortFirst =
    !agenda.examReached &&
    shortReview &&
    (!next || shortReview.rank <= next.rank);
  if (!next && !shortFirst)
    return (
      <p className="md-next-note">
        {agenda.examReached
          ? "考试日不再安排新任务，下方资料仍可查阅。"
          : agenda.finalReview
            ? "最后两天，集中复习旧错点。下方主题仍可自由查阅。"
            : "今天的已学任务已复习，可以回到今日冲刺做客观题。"}
      </p>
    );
  return (
    <aside className="md-next" aria-label="今日推荐">
      <div className="md-next-copy">
        <span>
          {shortFirst || next.action === "resume" ? "接着学" : "今天先学"}
        </span>
        <h3>{shortFirst ? shortReview.title : next.title}</h3>
        <p>{shortFirst ? shortReview.reason : next.reason}</p>
      </div>
      {shortFirst ? (
        shortReview.onStart ? (
          <button className="md-next-action" onClick={shortReview.onStart}>
            {shortReview.actionLabel}
            <ArrowRight size={16} />
          </button>
        ) : (
          <a className="md-next-action" href={shortReview.href}>
            {shortReview.actionLabel}
            <ArrowRight size={16} />
          </a>
        )
      ) : (
        <TaskAction
          task={next}
          onStartQuiz={onStartQuiz}
          className="md-next-action"
        />
      )}
    </aside>
  );
}
