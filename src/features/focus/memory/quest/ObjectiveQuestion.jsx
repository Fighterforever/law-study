import { ArrowRight, Check } from "lucide-react";

export default function ObjectiveQuestion({
  item,
  order,
  selected,
  result,
  onSelect,
  onSubmit,
  onNext,
  nextLabel,
  caption,
  index,
  total,
}) {
  return (
    <div className="cq-quiz">
      <div className="cq-quiz-meta">
        <span>{caption} · 多项选择</span>
        <strong>
          {index + 1} / {total}
        </strong>
      </div>
      <h3>{item.stem}</h3>
      <p className="cq-quiz-instruction">
        请选择所有正确选项。先独立提交，再看逐项解析。
      </p>
      <fieldset className="cq-exam-options" disabled={!!result}>
        <legend className="mp-sr-only">本题选项</legend>
        {order.map((id, position) => (
          <label
            className={`cq-exam-option ${selected.includes(id) ? "selected" : ""} ${result && item.answers.includes(id) ? "correct" : ""}`}
            key={id}
          >
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => onSelect(id)}
            />
            <b>{String.fromCharCode(65 + position)}</b>
            <span>{item.options[id]}</span>
            {result && item.answers.includes(id) && <Check size={18} />}
          </label>
        ))}
      </fieldset>
      {result && (
        <div
          className={`cq-explanation ${result.correct ? "is-correct" : "needs-work"}`}
          role="status"
        >
          <strong>
            {result.correct ? "本题答对" : "本题待复习"} · {item.label}
          </strong>
          <p>
            正确选项：
            {order
              .map((id, position) =>
                item.answers.includes(id)
                  ? String.fromCharCode(65 + position)
                  : "",
              )
              .filter(Boolean)
              .join("、")}
          </p>
          {order.map((id, position) => (
            <p key={id}>
              <b>{String.fromCharCode(65 + position)}.</b>{" "}
              {item.explanations[id]}
            </p>
          ))}
        </div>
      )}
      <div className="cq-actions">
        {!result ? (
          <button disabled={!selected.length} onClick={onSubmit}>
            提交本题
          </button>
        ) : (
          <button onClick={onNext}>
            {nextLabel}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
