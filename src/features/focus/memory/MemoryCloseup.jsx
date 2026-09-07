import { useState } from "react";
import { ArrowLeftRight, Eye } from "lucide-react";
import "./memory-closeup.css";

export function MemoryCloseup({ atlas, frame, alt }) {
  const [x, y, width, height] = atlas.frames[frame];
  return (
    <div
      className="memory-closeup"
      style={{
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}memory-stations/${atlas.file}`}
        alt={alt}
        decoding="async"
        width={atlas.width}
        height={atlas.height}
        style={{
          width: `${(atlas.width / width) * 100}%`,
          height: `${(atlas.height / height) * 100}%`,
          left: `${(-x / width) * 100}%`,
          top: `${(-y / height) * 100}%`,
        }}
      />
    </div>
  );
}

export function MemoryComparison({ atlas }) {
  const [changed, setChanged] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const c = atlas.contrast;
  const originalFrame = atlas.stations[c.stationId].frame;
  const comparisonHeight = Math.max(
    ...[originalFrame, c.frame].map(
      (i) => atlas.frames[i][3] / atlas.frames[i][2],
    ),
  );
  const select = (next) => {
    setChanged(next);
    setRevealed(false);
  };
  return (
    <div className="memory-comparison">
      <div
        className="memory-comparison-switch"
        role="group"
        aria-label="比较两个情境"
      >
        <button
          type="button"
          aria-pressed={!changed}
          onClick={() => select(false)}
        >
          <span>原情境</span>
          {c.beforeLabel}
        </button>
        <ArrowLeftRight size={18} aria-hidden="true" />
        <button
          type="button"
          aria-pressed={changed}
          onClick={() => select(true)}
        >
          <span>只改这一点</span>
          {c.afterLabel}
        </button>
      </div>
      <div
        className="memory-comparison-visual"
        style={{ aspectRatio: 1 / comparisonHeight }}
      >
        <MemoryCloseup
          atlas={atlas}
          frame={changed ? c.frame : originalFrame}
          alt={changed ? c.after : c.before}
        />
      </div>
      <div className="memory-comparison-question" aria-live="polite">
        <p className="memory-comparison-fact">
          <span>{changed ? "改变的事实" : "原来的事实"}</span>
          {changed ? c.after : c.before}
        </p>
        <h4>{c.question}</h4>
        {revealed ? (
          <div className="memory-comparison-explanation">
            <strong>核对判断依据</strong>
            <p>{c.explanation}</p>
          </div>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => setRevealed(true)}
          >
            <Eye size={16} />
            我已判断，核对理由
          </button>
        )}
        <small>对照用来分清条件。完成后，关图做本站变式。</small>
      </div>
    </div>
  );
}
