import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  RotateCcw,
  Search,
  Star,
} from "lucide-react";
import oldLessons from "../../data/lessons.json";
import { subjectById } from "../../data/subjects.js";
import { emptyFocusState } from "../../lib/focus-state.js";
import {
  focusExamDate,
  focusStudyMinutes,
  focusProgress,
  projectFocusPlan,
  recordFocusAnswer,
  finishFocusSession,
  sameAnswers,
} from "../../lib/focus.js";
import "./focus.css";

const MemoryPalaces = lazy(() => import("./memory/MemoryPalaces.jsx"));

const link = (id, review = false) =>
  `#/focus/unit/${id}${review ? "?review" : ""}`;
const focusSubjects = (data) => [
  ...new Set(data.units.map((u) => u.subjectId)),
];
const unitSource = (unit, data) => {
  const paper = data.papers.find((p) => p.id === unit.paperId);
  return `${paper.shortTitle || paper.title} · PDF 第${unit.pages.join("、")}页`;
};
const tabs = [
  ["today", "今日冲刺"],
  ["library", "全部考点"],
  ["overlap", "重合重点"],
  ["memory", "记忆宫殿"],
  ["plan", "七日计划"],
];
const dateName = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
const shuffled = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const changeFocus = (update, fn) =>
  update((s) => ({ ...s, focus: fn(s.focus || emptyFocusState()) }));

function UnitRow({ unit, data, state, today, review = false }) {
  const progress = focusProgress(unit, state, today);
  return (
    <a className="focus-unit-row" href={link(unit.id, review)}>
      <span
        className="focus-subject"
        style={{ "--subject": subjectById[unit.subjectId].color }}
      >
        {subjectById[unit.subjectId].short}
      </span>
      <div>
        <small>
          {unitSource(unit, data)}
          {unit.overlap.level === "confirmed" ? " · 与背诵卷重合" : ""}
        </small>
        <h3>{unit.title}</h3>
        <span>{progress.label}</span>
      </div>
      <span className="focus-unit-time">
        {review ? 5 : focusStudyMinutes(unit, state)}分钟
        <ArrowRight size={17} />
      </span>
    </a>
  );
}

export function FocusHomeCard({ data, focusDay, state, today }) {
  const done = data.units.filter(
    (u) => focusProgress(u, state, today).learned,
  ).length;
  return (
    <section className="focus-home-card">
      <div>
        <span className="eyebrow">新 · 考前聚焦</span>
        <h2>重合考点，先背会、再做对。</h2>
        <p>
          {focusSubjects(data)
            .map((id) => subjectById[id].name)
            .join("、")}{" "}
          · {data.papers.reduce((n, p) => n + p.pageCount, 0)}页讲义已整理为
          {data.units.length}个考点单元
        </p>
        <small>
          {done}个已完成首轮
          {focusDay.paused
            ? " · 考点库随时可查"
            : ` · 今日安排新学${focusDay.learn.length}个、复测${focusDay.review.length}个，合计${focusDay.newMinutes + focusDay.reviewMinutes}分钟`}
        </small>
      </div>
      <a className="button" href="#/focus">
        进入考前聚焦
        <ArrowRight size={18} />
      </a>
    </section>
  );
}

export default function FocusHub({
  data,
  route,
  state,
  update,
  today,
  focusDay,
  day,
}) {
  const current = route.split("/")[1]?.split("?")[0] || "today";
  const unitId = route.split("/")[2]?.split("?")[0];
  const unit = data.units.find((u) => u.id === unitId);
  if (current === "unit" && !unit)
    return (
      <div className="focus-empty">
        <h2>没有找到这个考点</h2>
        <p>已有记录仍保留，可以从全部考点重新进入。</p>
        <a href="#/focus/library">返回考点库 →</a>
      </div>
    );
  if (current === "unit" && unit)
    return <FocusUnit key={route} {...{ unit, data, state, update, today }} />;
  return (
    <div className="focus-hub">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">法考客观题 · 最后一周</p>
          <h1>考前聚焦</h1>
          <p>抓住重合考点，记清条件和例外，把每个选项判断到位。</p>
        </div>
        <span className="focus-exam">
          <CalendarDays size={19} />
          {dateName(focusExamDate(data, state))}考试
        </span>
      </div>
      <nav className="focus-tabs" aria-label="考前聚焦栏目">
        {tabs.map(([id, name]) => (
          <a
            key={id}
            href={`#/focus/${id}`}
            className={current === id ? "active" : ""}
            aria-current={current === id ? "page" : undefined}
          >
            {name}
          </a>
        ))}
      </nav>
      {current === "memory" ? (
        <Suspense
          fallback={<p className="memory-loading">正在打开记忆宫殿……</p>}
        >
          <MemoryPalaces {...{ data, state, update, today, route }} />
        </Suspense>
      ) : current === "plan" ? (
        <FocusPlan {...{ data, state, today }} baseSpent={day.spentTime} />
      ) : current === "library" || current === "overlap" ? (
        <FocusLibrary
          key={route}
          {...{ data, state, update, today, route }}
          overlap={current === "overlap"}
        />
      ) : (
        <FocusToday {...{ data, state, update, today, focusDay, day }} />
      )}
    </div>
  );
}

function FocusToday({ data, state, update, today, focusDay: p, day }) {
  const f = state.focus || emptyFocusState();
  const resume = data.units.find((u) => u.id === f.draft?.unitId);
  const target = resume || p.review[0] || p.learn[0];
  const wrong = data.units.filter(
    (u) => focusProgress(u, state, today).needsRepair,
  );
  return (
    <>
      {!state.settings.configured && (
        <div className="plain-note">
          <strong>先选复习起点，七日表会随之调整。</strong>
          <p>民诉比较熟悉时，每组先用约8分钟闭卷查漏；其他科目先看讲解。</p>
          <div className="inline-actions">
            <button
              onClick={() =>
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    configured: true,
                    familiarity: {
                      ...s.settings.familiarity,
                      "civil-procedure": 2,
                      administrative: 1,
                      "criminal-procedure": 1,
                    },
                  },
                }))
              }
            >
              程序法有基础，按此安排
            </button>
            <button
              className="secondary"
              onClick={() =>
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    configured: true,
                    familiarity: {},
                  },
                }))
              }
            >
              各科都从讲解开始
            </button>
          </div>
        </div>
      )}
      <section className="focus-daily-hero">
        <div>
          <span className="eyebrow">
            {dateName(today)} ·{" "}
            {p.remaining <= 2 ? "复测与纠错" : "理解 → 复述 → 辨析"}
          </span>
          <h2>
            {p.paused
              ? "按需查考点，继续巩固。"
              : target
                ? target.title
                : "本日重点已完成。"}
          </h2>
          <p>
            {p.paused
              ? "全部考点、记忆路线和个人错题仍可打开。"
              : target?.lead ||
                "可以复盘有把握却做错的题，再回顾其他科目的薄弱点。"}
          </p>
          <a
            className="button cream"
            href={
              target
                ? link(
                    target.id,
                    resume ? f.draft.mode === "review" : Boolean(p.review[0]),
                  )
                : "#/focus/library"
            }
          >
            {resume
              ? "继续上次进度"
              : p.review.length
                ? "先做到期复测"
                : target
                  ? "开始今日冲刺"
                  : "查看全部考点"}
            <ArrowRight size={18} />
          </a>
        </div>
        <div className="focus-clock">
          <strong>{p.budget}</strong>
          <span>分钟 · 今日总预算</span>
          <small>已含旧课复习与休息</small>
        </div>
      </section>
      <div className="focus-metrics">
        <div>
          <strong>
            {
              data.units.filter((u) => focusProgress(u, state, today).learned)
                .length
            }
            <small> / {data.units.length}</small>
          </strong>
          <span>首轮已完成</span>
        </div>
        <div>
          <strong>{wrong.length}</strong>
          <span>有待订正的考点</span>
        </div>
        <div>
          <strong>
            {
              data.units.filter((u) => focusProgress(u, state, today).stable)
                .length
            }
          </strong>
          <span>隔日复测通过</span>
        </div>
      </div>
      {!f.enabled && (
        <div className="plain-note">
          <p>开启后，考前聚焦与原课程共用每天的时间预算。</p>
          <button
            onClick={() =>
              changeFocus(update, (x) => ({ ...x, enabled: true }))
            }
          >
            开启本周冲刺
          </button>
        </div>
      )}
      <div className="focus-daily-grid">
        <div>
          {p.review.length > 0 && (
            <section className="focus-block">
              <div className="section-heading">
                <h2>先复测到期考点</h2>
                <span>{p.reviewMinutes}分钟</span>
              </div>
              {p.review.map((u) => (
                <UnitRow
                  key={u.id}
                  unit={u}
                  {...{ data, state, today }}
                  review
                />
              ))}
            </section>
          )}
          {p.learn.length > 0 && (
            <section className="focus-block">
              <div className="section-heading">
                <h2>今天的新考点</h2>
                <span>{p.newMinutes}分钟</span>
              </div>
              {p.learn.map((u) => (
                <UnitRow key={u.id} unit={u} {...{ data, state, today }} />
              ))}
            </section>
          )}
          {!p.review.length && !p.learn.length && (
            <div className="focus-empty">
              <Check size={28} />
              <h3>今天可以先收一收。</h3>
              <p>下面是你的错题和已学考点，按需要复盘。</p>
              {wrong.slice(0, 5).map((u) => (
                <UnitRow
                  key={u.id}
                  unit={u}
                  {...{ data, state, today }}
                  review
                />
              ))}
            </div>
          )}
          {p.deferred > 0 && (
            <p className="muted">
              另有{p.deferred}个到期考点，先完成本日清单，再从全部考点中查漏。
            </p>
          )}
        </div>
        <aside className="focus-guide">
          <h3>每个考点这样过一遍</h3>
          <ol>
            <li>先说清它解决什么问题。</li>
            <li>合上讲解，复述主体、条件、期间和例外。</li>
            <li>逐项判断选择题，写出错项错在哪里。</li>
            <li>第二天撤掉提示，再答一次。</li>
          </ol>
          <hr />
          <h3>其他科目保持手感</h3>
          <p>
            今日总预算同时给八科旧课留出空间，优先复习民刑和程序法中的个人错点。
          </p>
          {[...(day.review || []), ...(day.repairs || []), ...(day.tasks || [])]
            .slice(0, 3)
            .map((u) => (
              <a
                className="focus-base-link"
                key={u.id}
                href={`#/course/${u.id}`}
              >
                {u.title}
                <ArrowRight size={15} />
              </a>
            ))}
          <a href="#/today">查看统一学习清单 →</a>
          <hr />
          <p className="small-text">
            周末和工作日时长可在“学习设置”调整。错题增加时减少新学，10日、11日主要复测。
          </p>
          <a href="#/settings">调整时间与备份 →</a>
        </aside>
      </div>
    </>
  );
}

function FocusLibrary({ data, state, update, today, overlap, route }) {
  const subjects = focusSubjects(data);
  const params = new URLSearchParams(route.split("?")[1] || "");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(() => {
    const requested = params.get("subject");
    return subjects.includes(requested) ? requested : "all";
  });
  const [paper, setPaper] = useState(() => {
    const requested = params.get("paper");
    return data.papers.some((p) => p.id === requested) ? requested : "all";
  });
  const [filter, setFilter] = useState("all");
  const f = state.focus || emptyFocusState();
  const selectedPaper = data.papers.find((p) => p.id === paper);
  const indexPapers = data.papers.filter(
    (p) =>
      (paper === "all" || p.id === paper) &&
      (subject === "all" ||
        data.units.some((u) => u.paperId === p.id && u.subjectId === subject)),
  );
  const list = data.units.filter(
    (u) =>
      (!overlap || u.overlap.level === "confirmed") &&
      (subject === "all" || u.subjectId === subject) &&
      (paper === "all" || u.paperId === paper) &&
      (filter !== "wrong" || focusProgress(u, state, today).needsRepair) &&
      (filter !== "saved" || f.bookmarks.includes(u.id)) &&
      (filter !== "new" || !f.learned[u.id]) &&
      [u.title, u.lead, ...u.rules.map((r) => r.text), ...u.traps]
        .join(" ")
        .includes(query.trim()),
  );
  return (
    <>
      <div className="focus-library-intro">
        <h2>
          {overlap
            ? "两份资料都出现，优先背到会用。"
            : "全部考点，按规则查找。"}
        </h2>
        <p>
          {overlap
            ? "每个重合点都列出考前聚焦与旧背诵卷页码。重复内容合并学习，换个案情再判断。"
            : "完整讲解、对比表、闭卷问题和逐项解析放在同一单元。先做本日重点，其余按需要查漏。"}
        </p>
      </div>
      {overlap && (
        <div className="focus-cross-groups">
          {(data.crossGroups || []).map((group) => (
            <section key={group.id}>
              <span className="eyebrow">不同聚焦讲义中的同一规则</span>
              <h3>{group.title}</h3>
              <p>{group.rule}</p>
              <small>同一规则先理解一遍，再换案情闭卷做题。</small>
              {group.unitIds.map((id) => {
                const u = data.units.find((x) => x.id === id);
                return u ? (
                  <a
                    className="focus-base-link"
                    href={link(id, Boolean(state.focus?.learned[id]))}
                    key={id}
                  >
                    {subjectById[u.subjectId].name} · {u.title}
                    <ArrowRight size={14} />
                  </a>
                ) : null;
              })}
            </section>
          ))}
        </div>
      )}
      <div className="focus-search">
        <Search size={18} />
        <input
          aria-label="搜索考前聚焦"
          placeholder="搜考点、条件或关键词，例如：代位权、知情权、信用证"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="focus-filters">
        <select
          aria-label="筛选学科"
          value={subject}
          onChange={(e) => {
            const next = e.target.value;
            setSubject(next);
            if (
              next !== "all" &&
              paper !== "all" &&
              !data.units.some(
                (u) => u.subjectId === next && u.paperId === paper,
              )
            )
              setPaper("all");
          }}
        >
          <option value="all">全部学科</option>
          {subjects.map((id) => (
            <option key={id} value={id}>
              {subjectById[id].name}
            </option>
          ))}
        </select>
        <select
          aria-label="筛选讲义"
          value={paper}
          onChange={(e) => {
            const next = e.target.value;
            setPaper(next);
            if (
              next !== "all" &&
              subject !== "all" &&
              !data.units.some(
                (u) => u.paperId === next && u.subjectId === subject,
              )
            )
              setSubject("all");
          }}
        >
          <option value="all">全部讲义</option>
          {data.papers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.shortTitle || p.title}
            </option>
          ))}
        </select>
        <select
          aria-label="筛选学习状态"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="wrong">待订正</option>
          <option value="new">未完成首轮</option>
          <option value="saved">我的收藏</option>
        </select>
        <span>{list.length}个考点</span>
      </div>
      {selectedPaper && (
        <p className="focus-paper-summary">
          <strong>{selectedPaper.shortTitle || selectedPaper.title}</strong>
          {selectedPaper.summary}
        </p>
      )}
      <div className="focus-card-grid">
        {list.map((u) => (
          <article className="focus-topic-card" key={u.id}>
            <div>
              <span className="pill">
                {subjectById[u.subjectId].name} ·{" "}
                {u.priority === "core" ? "重点" : "查漏"}
              </span>
              <button
                className="icon-button"
                aria-label={`${f.bookmarks.includes(u.id) ? "取消收藏" : "收藏"}${u.title}`}
                onClick={() =>
                  changeFocus(update, (x) => ({
                    ...x,
                    bookmarks: x.bookmarks.includes(u.id)
                      ? x.bookmarks.filter((id) => id !== u.id)
                      : [...x.bookmarks, u.id],
                  }))
                }
              >
                <Star
                  size={18}
                  fill={f.bookmarks.includes(u.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <h3>
              <a href={link(u.id)}>{u.title}</a>
            </h3>
            <p>{u.lead}</p>
            {overlap && (
              <p className="focus-overlap-reason">{u.overlap.reason}</p>
            )}
            <div className="focus-card-foot">
              <span>
                {unitSource(u, data)} · {u.estimatedMinutes}分钟
              </span>
              <a href={link(u.id, f.learned[u.id])}>
                {f.learned[u.id] ? "再次复测" : "开始学习"}
                <ArrowRight size={15} />
              </a>
            </div>
            <small>{focusProgress(u, state, today).label}</small>
          </article>
        ))}
      </div>
      {!list.length && (
        <div className="focus-empty">
          没有找到匹配考点，可以缩短关键词或更换筛选。
        </div>
      )}
      <details className="focus-page-index">
        <summary>
          按原讲义页码查找 · 共
          {indexPapers.reduce((n, p) => n + p.pageCount, 0)}页
        </summary>
        {indexPapers.map((p) => (
          <section key={p.id}>
            <h3>{p.title}</h3>
            {Array.from({ length: p.pageCount }, (_, i) => i + 1).map(
              (page) => {
                const units = data.units.filter(
                  (u) => u.paperId === p.id && u.pages.includes(page),
                );
                return (
                  <div key={page}>
                    <strong>PDF {page}页</strong>
                    {units.length ? (
                      units.map((u) => (
                        <a key={u.id} href={link(u.id)}>
                          {u.title}
                        </a>
                      ))
                    ) : (
                      <span>
                        {page === 1 ? "封面" : "对应考点见相邻页的跨页单元"}
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </section>
        ))}
      </details>
    </>
  );
}

function FocusSource({ unit, data }) {
  const paper = data.papers.find((p) => p.id === unit.paperId);
  return (
    <details className="focus-source">
      <summary>
        <FileText size={15} />
        讲义出处与旧册重合点
      </summary>
      <p>
        {paper.title} · PDF 第{unit.pages.join("、")}页
        {unit.printedPages.length > 0 &&
          ` · 印刷第${unit.printedPages.join("、")}页`}
      </p>
      <p>
        {unit.overlap.book}
        {unit.overlap.pdfPages.length > 0 &&
          ` · PDF 第${unit.overlap.pdfPages.join("、")}页`}
        {unit.overlap.printedPages.length > 0 &&
          ` · 印刷第${unit.overlap.printedPages.join("、")}页`}
      </p>
      <p>{unit.overlap.reason}</p>
      {unit.overlap.lessonIds.map((id) => (
        <a className="focus-base-link" key={id} href={`#/course/${id}`}>
          {oldLessons.find((l) => l.id === id)?.title || "回看旧课对应讲解"}{" "}
          <ArrowRight size={14} />
        </a>
      ))}
      {(data.crossGroups || [])
        .filter((g) => g.unitIds.includes(unit.id))
        .map((g) => (
          <div key={g.id}>
            <strong>同一规则，换份讲义再练</strong>
            {g.unitIds
              .filter((id) => id !== unit.id)
              .map((id) => (
                <a className="focus-base-link" key={id} href={link(id, true)}>
                  {data.units.find((u) => u.id === id)?.title}
                  <ArrowRight size={14} />
                </a>
              ))}
          </div>
        ))}
      {(unit.officialSources || paper.officialSources || []).map((source) => (
        <p key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title} ↗
          </a>
        </p>
      ))}
    </details>
  );
}

function FocusUnit({ unit, data, state, update, today }) {
  const [mode] = useState(() =>
    state.focus?.learned[unit.id] ? "review" : "learn",
  );
  const existing = state.focus?.draft;
  const saved =
    existing?.unitId === unit.id &&
    existing.mode === mode &&
    existing.questionIndex < unit.questions.length &&
    existing.optionOrder?.length ===
      unit.questions[existing.questionIndex].options.length &&
    existing.results.every((a) => unit.questions.some((q) => q.id === a.itemId))
      ? existing
      : null;
  const [draft, setDraft] = useState(
    () =>
      saved || {
        unitId: unit.id,
        mode,
        phase:
          mode === "review" ||
          focusStudyMinutes(unit, state) < unit.estimatedMinutes
            ? "recall"
            : "read",
        questionIndex: 0,
        optionOrder: shuffled(unit.questions[0].options.map((_, i) => i)),
        selected: [],
        results: [],
        recallQuality: "",
        hint: false,
        revealed: false,
        recallText: "",
        confidence: "",
      },
  );
  const [error, setError] = useState("");
  const q = unit.questions[draft.questionIndex];
  const submitted = draft.results.find((a) => a.itemId === q?.id);
  const patch = (next) => setDraft((d) => ({ ...d, ...next }));
  useEffect(() => {
    if (draft.phase !== "done") changeFocus(update, (f) => ({ ...f, draft }));
  }, [draft]);
  function submit() {
    if (!draft.selected.length || !draft.confidence) {
      setError("请选择答案和把握程度。");
      return;
    }
    setError("");
    const hint = draft.hint || draft.confidence !== "sure";
    const result = {
      itemId: q.id,
      selected: [...draft.selected],
      correct: sameAnswers(draft.selected, q.answers),
      hint,
    };
    update((s) => recordFocusAnswer(s, unit, q, draft.selected, hint, today));
    patch({
      results: [...draft.results.filter((a) => a.itemId !== q.id), result],
    });
  }
  function finish() {
    update((s) =>
      finishFocusSession(
        s,
        unit,
        draft.results,
        draft.recallQuality,
        draft.hint,
        mode,
        today,
      ),
    );
    patch({ phase: "done" });
    window.scrollTo({ top: 0 });
  }
  const steps = [
    ["read", "规则梳理"],
    ["recall", "闭卷复述"],
    ["quiz", "选项辨析"],
    ["done", "复盘"],
  ];
  return (
    <div className="focus-unit">
      <a className="back-link" href="#/focus">
        <ArrowLeft size={16} />
        考前聚焦
      </a>
      <header className="focus-unit-heading">
        <p className="eyebrow">
          {unitSource(unit, data)} ·{" "}
          {mode === "review"
            ? "隔日复测"
            : `约${focusStudyMinutes(unit, state)}分钟`}
        </p>
        <h1>{unit.title}</h1>
        {draft.phase === "read" && <p>{unit.lead}</p>}
      </header>
      <div className="focus-progress-steps">
        {steps.map(([id, label], i) => (
          <span key={id} className={draft.phase === id ? "active" : ""}>
            <b>{i + 1}</b>
            {label}
          </span>
        ))}
      </div>
      {draft.phase === "read" && (
        <>
          <button
            className="text-button"
            onClick={() => patch({ phase: "recall", revealed: false })}
          >
            这部分熟悉，先闭卷自测 →
          </button>
          <article className="focus-rule-sheet">
            {unit.rules.map((r, i) => (
              <section key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{r.label}</h2>
                  <p>{r.text}</p>
                </div>
              </section>
            ))}
            {unit.contrast.length > 0 && (
              <div className="focus-contrast">
                <h2>相邻规则，分清这一处</h2>
                {unit.contrast.map((c, i) => (
                  <div key={i}>
                    <p>
                      <b>①</b> {c.left}
                    </p>
                    <p>
                      <b>②</b> {c.right}
                    </p>
                    <strong>{c.key}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="focus-traps">
              <h2>选项常在这里设错</h2>
              <ul>
                {unit.traps.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </article>
          <FocusSource {...{ unit, data }} />
          <div className="focus-actions">
            <span>先说清规则，再记限定词。</span>
            <button onClick={() => patch({ phase: "recall", revealed: false })}>
              合上讲解，开始复述
              <EyeOff size={17} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => patch({ phase: "recall", revealed: false })}
          >
            这部分熟悉，直接自测 →
          </button>
        </>
      )}
      {draft.phase === "recall" && (
        <section className="focus-recall">
          <p className="eyebrow">闭卷回答 · 先想，再核对</p>
          <h2>{unit.recall.prompt}</h2>
          <textarea
            aria-label="闭卷复述草稿"
            placeholder="可以口头回答，也可以在这里记下关键条件……"
            value={draft.recallText}
            onChange={(e) =>
              patch({ recallText: e.target.value.slice(0, 10000) })
            }
          />
          {!draft.revealed ? (
            <div className="focus-actions">
              <button
                className="secondary"
                onClick={() => patch({ phase: "read", hint: true })}
              >
                回看讲解
              </button>
              <button onClick={() => patch({ revealed: true })}>
                已作答，核对要点
                <Eye size={17} />
              </button>
            </div>
          ) : (
            <>
              <ol className="focus-answer-points">
                {unit.recall.answer.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
              <p className="small-text muted">
                用自己的话说清即可，重点核对主体、条件、期间和例外，不要求逐字背诵。
              </p>
              <fieldset className="focus-quality">
                <legend>对照要点，记录本次复述</legend>
                {[
                  ["exact", "条件说全了"],
                  ["partial", "漏了部分条件"],
                  ["forgot", "还没想起来"],
                ].map(([v, t]) => (
                  <label
                    key={v}
                    className={draft.recallQuality === v ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="recall-quality"
                      checked={draft.recallQuality === v}
                      onChange={() => patch({ recallQuality: v })}
                    />
                    {t}
                  </label>
                ))}
              </fieldset>
              <button
                className="full-button"
                disabled={!draft.recallQuality}
                onClick={() =>
                  patch({ phase: "quiz", selected: [], confidence: "" })
                }
              >
                进入客观题辨析
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </section>
      )}
      {draft.phase === "quiz" && q && (
        <section className="focus-question">
          <div className="focus-question-meta">
            <span className="pill">
              {q.type === "single" ? "单项选择题" : "多项／不定项选择题"}
            </span>
            <span>
              第{draft.questionIndex + 1} / {unit.questions.length}题
            </span>
          </div>
          <h2>{q.stem}</h2>
          <fieldset disabled={Boolean(submitted)}>
            <legend>
              {q.type === "single"
                ? "请选择一个正确选项"
                : "请逐项判断，选择所有正确选项"}
            </legend>
            {draft.optionOrder.map((i, position) => (
              <label
                className={`focus-option ${draft.selected.includes(i) ? "chosen" : ""} ${submitted && q.answers.includes(i) ? "correct" : ""} ${submitted && draft.selected.includes(i) && !q.answers.includes(i) ? "incorrect" : ""}`}
                key={i}
              >
                <input
                  type={q.type === "single" ? "radio" : "checkbox"}
                  name={q.id}
                  checked={draft.selected.includes(i)}
                  onChange={() =>
                    patch({
                      selected:
                        q.type === "single"
                          ? [i]
                          : draft.selected.includes(i)
                            ? draft.selected.filter((n) => n !== i)
                            : [...draft.selected, i],
                    })
                  }
                />
                <b>{String.fromCharCode(65 + position)}</b>
                <span>{q.options[i]}</span>
              </label>
            ))}
          </fieldset>
          {!submitted ? (
            <>
              <fieldset className="focus-quality">
                <legend>作答把握</legend>
                {[
                  ["sure", "有把握，能说明理由"],
                  ["uncertain", "不确定，需要复测"],
                ].map(([v, t]) => (
                  <label key={v}>
                    <input
                      type="radio"
                      name="confidence"
                      checked={draft.confidence === v}
                      onChange={() => patch({ confidence: v })}
                    />
                    {t}
                  </label>
                ))}
              </fieldset>
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <button className="full-button" onClick={submit}>
                提交答案，查看逐项解析
                <Check size={17} />
              </button>
            </>
          ) : (
            <div className="focus-feedback" role="status">
              <h3>
                {submitted.correct
                  ? "这题答对了。"
                  : "请核对漏选或误选的选项。"}
              </h3>
              <p>
                正确答案：
                <strong>
                  {draft.optionOrder
                    .flatMap((i, position) =>
                      q.answers.includes(i)
                        ? [String.fromCharCode(65 + position)]
                        : [],
                    )
                    .join("、")}
                </strong>
              </p>
              {draft.optionOrder.map((i, position) => (
                <p key={i}>
                  <b>
                    {String.fromCharCode(65 + position)}项
                    {q.answers.includes(i) ? "正确" : "错误"}：
                  </b>
                  {q.explanations[i]}
                </p>
              ))}
              <div className="focus-question-key">
                <strong>解题关键</strong>
                <p>{q.key}</p>
              </div>
              <button
                onClick={() => {
                  if (draft.questionIndex < unit.questions.length - 1) {
                    patch({
                      questionIndex: draft.questionIndex + 1,
                      optionOrder: shuffled(
                        unit.questions[draft.questionIndex + 1].options.map(
                          (_, i) => i,
                        ),
                      ),
                      selected: [],
                      confidence: "",
                    });
                    window.scrollTo({ top: 0 });
                  } else finish();
                }}
              >
                {draft.questionIndex < unit.questions.length - 1
                  ? "下一题"
                  : "完成本轮，安排复测"}
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </section>
      )}
      {draft.phase === "done" && (
        <section className="focus-finish">
          <Check size={32} />
          <h2>这一组考点，已记入复习安排。</h2>
          <p>
            {draft.results.filter((r) => r.correct).length} /{" "}
            {unit.questions.length}题选项全对；复述
            {draft.recallQuality === "exact"
              ? "完整"
              : draft.recallQuality === "partial"
                ? "有漏项"
                : "仍需巩固"}
            。
          </p>
          <p>
            下次复测：
            {focusProgress(unit, state, today, focusExamDate(data, state))
              .due || "明天"}
            。复测时先撤掉讲解，再判断选项。
          </p>
          <div className="focus-actions">
            <a className="button secondary" href="#/focus/overlap">
              查看重合重点
            </a>
            <a className="button" href="#/focus">
              继续今日任务
              <ArrowRight size={17} />
            </a>
          </div>
          <FocusSource {...{ unit, data }} />
        </section>
      )}
    </div>
  );
}

function FocusPlan({ data, state, today, baseSpent = 0 }) {
  const plans = useMemo(
    () => projectFocusPlan(data, state, today, baseSpent),
    [data, state, today, baseSpent],
  );
  const scheduled = new Set(plans.flatMap((p) => p.learn.map((u) => u.id)));
  const remaining = data.units.filter(
    (u) => !state.focus?.learned[u.id] && !scheduled.has(u.id),
  );
  return (
    <>
      <div className="focus-library-intro">
        <h2>前五天抓重点，最后两天反复测。</h2>
        <p>
          按每天可用时间安排，先复习到期错点，再增加新考点。表中是依据当前记录推算的任务，完成后会更新。
        </p>
        <button className="secondary" onClick={() => window.print()}>
          打印背诵计划
          <FileText size={16} />
        </button>
      </div>
      <div className="plain-note">
        <strong>
          首轮优先安排{scheduled.size}组，另有{remaining.length}组可按需查漏。
        </strong>
        <p>
          重点先占用本周时间；具体清单随错题和完成速度调整。民诉有基础时先做闭卷检查，错在哪里再补讲。
        </p>
        {remaining.length > 0 && (
          <details>
            <summary>查看未排入本周的新考点</summary>
            {remaining.map((u) => (
              <a className="focus-base-link" key={u.id} href={link(u.id)}>
                {u.priority === "core" ? "重点 · " : "查漏 · "}
                {u.title}
                <span>{focusStudyMinutes(u, state)}分钟</span>
              </a>
            ))}
          </details>
        )}
      </div>
      <div className="focus-plan-list">
        {plans.map((p) => (
          <section key={p.date} className={p.date === today ? "today" : ""}>
            <div className="focus-plan-date">
              <strong>{dateName(p.date)}</strong>
              <span>
                {p.date === today ? "今天 · " : ""}
                {p.budget}分钟
              </span>
              <small>
                {data.campaign.days.find((d) => d.date === p.date)?.title ||
                  (p.remaining <= 2 ? "复测与纠错" : "重点与查漏")}
              </small>
            </div>
            <div>
              <h3>
                {p.past
                  ? "当日记录"
                  : p.remaining <= 2
                    ? "闭卷复测，停止常规新增"
                    : "首轮背诵与查漏"}
              </h3>
              {p.past ? (
                <p>
                  {state.focus?.sessions.filter((s) => s.date === p.date)
                    .length || 0}
                  个学习时段已记录
                </p>
              ) : p.learn.length ? (
                <ul>
                  {p.learn.map((u) => (
                    <li key={u.id}>
                      <a href={link(u.id)}>{u.title}</a>
                      <span>{focusStudyMinutes(u, state)}分钟</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>先处理未清错项，再做重合考点混合复测。</p>
              )}
              {!p.past && (
                <>
                  <div className="focus-plan-review">
                    <RotateCcw size={16} />
                    <span>
                      预计复测{p.review.length}组 · {p.reviewMinutes}分钟
                    </span>
                  </div>
                  <details>
                    <summary>展开本日复测考点</summary>
                    {p.review.map((u) => (
                      <a
                        className="focus-base-link"
                        href={link(u.id, true)}
                        key={u.id}
                      >
                        {u.title}
                        <ArrowRight size={14} />
                      </a>
                    ))}
                  </details>
                  <p className="small-text muted">
                    新学{p.newMinutes}分钟 · 复测{p.reviewMinutes}分钟 ·
                    给旧课至少留{p.baseMinutes}分钟 · 复盘
                    {p.reflectionMinutes || 0}分钟 · 休息{p.breakMinutes}
                    分钟。空余时间可回顾错题。
                  </p>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="plain-note">
        <p>
          若今天只有两小时，先到设置调整。优先保留到期复测，未完成的新考点重新排序；最后两天不追加整章。
        </p>
        <a href="#/settings">调整每天时间 →</a>
      </div>
    </>
  );
}
