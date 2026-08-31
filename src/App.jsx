import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Layers3,
  ListChecks,
  Menu,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import lessons from "./data/lessons.json";
import diagnosticPool from "./data/diagnostic.json";
import checkpointPool from "./data/checkpoints.json";
import coverage from "./data/coverage.json";
import {
  assessmentAnswer,
  chooseCheckup,
  startCheckup,
  appendAssessmentAnswer,
  diagnosticNeedsTeaching,
  assessmentReport,
  recordCheckupAnswer,
} from "./lib/assessments.js";
import {
  mistakeKinds,
  repairAdvice,
  selectReviewQuestion,
  learningEvidence,
  reconcileCurriculum,
} from "./lib/learning.js";
import { subjects, subjectById, errors } from "./data/subjects.js";
import {
  addDays,
  decodeState,
  distance,
  dueLessons,
  encodeState,
  finishSession,
  prerequisiteReady,
  studyPhase,
  initialState,
  isWeekend,
  localDate,
  makeDay,
  passed,
  projectPlan,
  recordAttempt,
  reviewMinutes,
  statusOf,
  STORAGE_KEY,
} from "./lib/study.js";

const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));
const coverageById = Object.fromEntries(
  coverage.map((s) => [s.subjectId, s.domains]),
);
const nav = [
  ["today", "今日学习", BookOpen],
  ["library", "课程地图", Layers3],
  ["review", "间隔复习", RotateCcw],
  ["plan", "考前计划", CalendarDays],
  ["checkup", "综合复核", ListChecks],
  ["palace", "记忆宫殿", Sparkles],
];
const go = (path) => {
  window.location.hash = `#/${path}`;
};
const dateLabel = (s) =>
  new Date(`${s}T12:00:00`).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
const number = (n) => String(n).padStart(2, "0");
const shuffle = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function restoreChoiceOrder(labels, order) {
  // A backup may come from an older revision with a different number of options.
  const valid =
    Array.isArray(order) &&
    order.length === labels.length &&
    new Set(order).size === labels.length &&
    order.every((i) => Number.isInteger(i) && i >= 0 && i < labels.length);
  return valid
    ? order.map((i) => ({ i, v: labels[i] }))
    : shuffle(labels.map((v, i) => ({ v, i })));
}
function Source({ lesson }) {
  const s = subjectById[lesson.subjectId];
  return (
    <div className="source-note">
      <FileText size={15} />
      <div>
        <strong>
          来源索引 · 2026 众合背诵卷 · {s.author}
          {s.name}
        </strong>
        <p>
          印刷页 {lesson.source.printedPages.join("、")} · PDF页{" "}
          {lesson.source.pdfPages.join("、")}
        </p>
        <p>{lesson.source.reference} · 原创讲解与虚构练习</p>
        {lesson.source.officialSources?.map((source) => (
          <p key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
          </p>
        ))}
      </div>
    </div>
  );
}
function SubjectMark({ id, small = false }) {
  const s = subjectById[id];
  return (
    <span
      className={`subject-mark ${small ? "small" : ""}`}
      style={{ "--subject": s.color }}
    >
      {s.short}
    </span>
  );
}
function Pill({ children }) {
  return <span className="pill">{children}</span>;
}
function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Check size={26} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function PageTitle({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="lead">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [loadError, setLoadError] = useState("");
  const [state, setState] = useState(() => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value
        ? reconcileCurriculum(lessons, decodeState(value))
        : initialState();
    } catch {
      return initialState();
    }
  });
  const [saveBlocked, setSaveBlocked] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) decodeState(v);
      return false;
    } catch {
      return true;
    }
  });
  const [route, setRoute] = useState(window.location.hash.slice(2) || "today");
  const [menu, setMenu] = useState(false);
  const routeBase = route.split("?")[0];
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const f = () => {
      setRoute(window.location.hash.slice(2) || "today");
      setMenu(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    if (saveBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, encodeState(state));
      setLoadError("");
    } catch {
      setLoadError("浏览器无法保存记录。请导出备份，避免关闭页面后丢失。");
    }
  }, [state, saveBlocked]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const update = (fn) =>
    setState((s) => (typeof fn === "function" ? fn(s) : fn));
  const backup = () => {
    const b = new Blob([encodeState(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `法习-学习记录-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  useEffect(() => {
    const handle = (e) => {
      update((s) => {
        const i = s.attempts.findLastIndex(
          (a) => a.questionId === e.detail.questionId,
        );
        if (i < 0) return s;
        const attempts = [...s.attempts];
        attempts[i] = { ...attempts[i], errorType: e.detail.errorType };
        return { ...s, attempts };
      });
    };
    window.addEventListener("study-error", handle);
    return () => window.removeEventListener("study-error", handle);
  }, []);
  const today = localDate();
  const day = makeDay(lessons, state, today);
  const stable = lessons.filter(
    (l) => statusOf(state.records[l.id]) === "初步稳固",
  ).length;
  const ctx = {
    state,
    update,
    day,
    today,
    notice: setNotice,
    backup,
    saveBlocked,
    setSaveBlocked,
  };
  let page;
  if (route.startsWith("course/")) {
    const id = route.split("/")[1].split("?")[0];
    page = lessonById[id] ? (
      <Lesson key={route} lesson={lessonById[id]} {...ctx} />
    ) : (
      <Empty
        title="这个单元暂不可用"
        action={<button onClick={() => go("library")}>返回课程地图</button>}
      >
        已有历史记录仍然保留。
      </Empty>
    );
  } else if (route.startsWith("practice/")) {
    const id = route.split("/")[1].split("?")[0];
    page = lessonById[id] ? (
      <Practice key={route} lesson={lessonById[id]} {...ctx} />
    ) : (
      <Empty
        title="未找到这道复习任务"
        action={<button onClick={() => go("review")}>返回复习</button>}
      />
    );
  } else if (route.startsWith("library?"))
    page = <Library key={route} {...ctx} />;
  else
    page = {
      today: <Today {...ctx} />,
      library: <Library {...ctx} />,
      review: <Review {...ctx} />,
      diagnostic: <Diagnostic {...ctx} />,
      checkup: <Checkup {...ctx} />,
      plan: <Plan {...ctx} />,
      palace: <Palace {...ctx} />,
      settings: <Settings {...ctx} />,
      sources: <Sources />,
    }[route] || <Today {...ctx} />;
  return (
    <div className="app">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main").focus();
        }}
      >
        跳到主要内容
      </a>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#/today">
          <span className="brand-icon">
            <BookOpen size={24} />
          </span>
          <span>
            法习<small>把规则学明白</small>
          </span>
        </a>
        <div className="sidebar-label">你的学习空间</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#/${id}`}
              className={routeBase === id ? "active" : ""}
              aria-current={routeBase === id ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {id === "review" &&
                dueLessons(lessons, state, today).length > 0 && (
                  <span className="nav-count">
                    {dueLessons(lessons, state, today).length}
                  </span>
                )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span className="eyebrow">从理解，到调用</span>
            <p>
              先解释，再练习。
              <br />
              隔一天，试着想起来。
            </p>
            <div className="tiny-track">
              <i style={{ width: `${(stable / lessons.length) * 100}%` }} />
            </div>
            <small>
              {stable} / {lessons.length} 核心单元初步稳固
            </small>
          </div>
          <a href="#/sources">
            <FileText size={17} /> 内容与来源
          </a>
          <a href="#/settings">
            <Settings2 size={17} /> 学习设置与备份
          </a>
          <span className="local-label">
            <ShieldCheck size={13} /> 进度只存在当前浏览器
          </span>
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          onClick={() => setMenu(false)}
          aria-label="关闭导航"
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="打开导航"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            学习空间 <ChevronRight size={14} />{" "}
            <span>
              {nav.find((n) => n[0] === routeBase)?.[1] ||
                (route.startsWith("course/")
                  ? "分步课堂"
                  : route.startsWith("practice/")
                    ? "独立练习"
                    : route === "diagnostic"
                      ? "民诉诊断"
                      : route === "sources"
                        ? "内容与来源"
                        : "学习设置")}
            </span>
          </div>
          <div className="topbar-right">
            <span className="live-dot" />{" "}
            {saveBlocked || loadError ? "保存暂停" : "本地保存"}{" "}
            <span className="divider" />
            <span>{dateLabel(today)}</span>
          </div>
        </header>
        <main id="main" tabIndex="-1">
          {(saveBlocked || loadError) && (
            <div className="alert warning" role="alert">
              {saveBlocked
                ? "原有记录无法读取，为防止覆盖，自动保存已暂停。请到设置导出原始文件并处理。"
                : loadError}
              <button className="text-button" onClick={() => go("settings")}>
                查看设置 <ArrowRight size={15} />
              </button>
            </div>
          )}
          {page}
        </main>
        <footer>
          法习 · 考前核心复习工具
          <span>原创教学 · 教育用途 · 不替代现行法规核验</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Today({ state, update, day, today }) {
  const completed = lessons.filter(
    (l) => state.records[l.id]?.completedDate,
  ).length;
  const next = day.tasks.find((l) => !state.records[l.id]?.completedDate);
  const reviewNext = day.review.find(
    (l) => !(state.reviewDays[today] || []).includes(l.id),
  );
  const resume = state.cursor && lessonById[state.cursor.id];
  const repairNext = day.repairs?.[0];
  const phase = studyPhase(state.settings, today);
  const target = resume || reviewNext || repairNext || next;
  const targetPath = resume
    ? `${state.cursor.mode === "review" ? "practice" : "course"}/${resume.id}`
    : reviewNext
      ? `practice/${reviewNext.id}`
      : repairNext
        ? `course/${repairNext.id}?repair`
        : next
          ? `course/${next.id}`
          : day.checkpointTime
            ? "checkup"
            : "library";
  const [intro, setIntro] = useState(!state.settings.configured);
  function preset(kind) {
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        configured: true,
        familiarity:
          kind === "procedure"
            ? {
                "civil-procedure": 2,
                administrative: 1,
                "criminal-procedure": 1,
              }
            : {},
      },
    }));
    setIntro(false);
  }
  return (
    <>
      <PageTitle
        eyebrow={`今日学习 / ${today.replaceAll("-", ".")}`}
        title={
          day.day <= 0
            ? "为第一天，做好准备。"
            : day.day > 14
              ? "让学过的知识，留下来。"
              : phase.consolidation
                ? "先把会的，答得更稳。"
                : "今天，弄懂几个具体问题。"
        }
        action={
          <a className="button secondary" href="#/settings">
            <Settings2 size={16} /> 调整学习时间
          </a>
        }
      >
        {state.settings.examDate
          ? `考试日期 ${state.settings.examDate} · 距考试还有 ${Math.max(0, distance(today, state.settings.examDate))} 天。`
          : "每天完成一小组规则，再用新的事实检验它。"}
      </PageTitle>
      {intro && (
        <div className="onboarding">
          <div>
            <span className="eyebrow">第一次来</span>
            <h3>从你的真实基础开始</h3>
            <p>“熟悉”只决定是否先做短诊断，不会直接计为掌握。</p>
          </div>
          <div className="button-stack">
            <button onClick={() => preset("foundation")}>
              八科从基础讲起 <ArrowRight size={16} />
            </button>
            <button className="secondary" onClick={() => preset("procedure")}>
              程序法有基础，其他从头学
            </button>
            <a href="#/settings">逐科设置基础</a>
          </div>
        </div>
      )}
      {state.settings.familiarity["civil-procedure"] > 0 &&
        !state.diagnostic.completed &&
        !state.diagnostic.stopped && (
          <div className="diagnostic-banner">
            <div>
              <strong>民诉有基础，先用短诊断节省重读时间</strong>
              <p>最多16题，只反馈具体考点。遇到两处没有思路就转入补讲。</p>
            </div>
            <a className="button secondary" href="#/diagnostic">
              {state.diagnostic.attempts.length
                ? "继续民诉诊断"
                : "先做民诉诊断"}
              <ArrowRight size={15} />
            </a>
          </div>
        )}
      <div className="dashboard-grid">
        <section className="focus-card">
          <div className="focus-top">
            <span className="light-label">
              今日学习 · DAY {number(Math.max(1, Math.min(14, day.day)))}
            </span>
            <span className="focus-date">
              {isWeekend(today) ? "周末节奏" : "工作日节奏"}
            </span>
          </div>
          <h2>
            {day.paused
              ? "今天没有必修安排"
              : target
                ? target.title
                : "今天没有待学的新课"}
          </h2>
          <p>
            {day.paused
              ? "请检查开始日期或考试日期；课程地图始终可以自由访问。"
              : target
                ? target.summary
                : "可以先做综合复核，检查学过的规则是否能换一种问法回答。"}
          </p>
          <div className="focus-bottom">
            <a className="button cream" href={`#/${targetPath}`}>
              {resume
                ? "继续上次学习"
                : reviewNext
                  ? "开始到期复习"
                  : repairNext
                    ? "先补这一处难点"
                    : next
                      ? "开始今日学习"
                      : day.checkpointTime
                        ? "开始综合复核"
                        : "浏览课程地图"}
              <ArrowRight size={18} />
            </a>
            <span>
              <Clock3 size={16} />{" "}
              {target
                ? `${reviewNext && !resume ? `约${reviewMinutes(state, target.id)}` : target.minutes}分钟`
                : "按自己的节奏"}
              <small>
                {resume
                  ? "已保存课堂位置"
                  : reviewNext
                    ? "先唤回昨天的知识"
                    : "解释 → 示范 → 独立练习"}
              </small>
            </span>
          </div>
          <div className="focus-art" aria-hidden="true">
            <span>知</span>
            <i />
            <i />
            <i />
          </div>
        </section>
        <section className="budget-card">
          <div className="section-kicker">
            今天的时间预算 <Clock3 size={17} />
          </div>
          <div className="budget-number">
            {day.budget}
            <span>分钟</span>
          </div>
          <div className="segmented">
            {[120, 150, 180].map((n) => (
              <button
                key={n}
                className={state.settings.weekday === n ? "selected" : ""}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, weekday: n },
                  }))
                }
              >
                {n / 60}h
              </button>
            ))}
          </div>
          <p>
            {isWeekend(today)
              ? `今天采用周末 ${state.settings.weekend} 分钟；上方调整工作日。`
              : "保留复习与休息，按可用时间减少新课。"}
          </p>
          <div className="budget-line">
            <span>本日已排</span>
            <strong>
              {day.total} / {day.budget} min
            </strong>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <h2>
          今天的学习清单{" "}
          <span>
            {day.tasks.length +
              day.review.length +
              (day.repairs?.length || 0) +
              (day.checkpointTime ? 1 : 0)}{" "}
            项
          </span>
        </h2>
        <a href="#/plan">
          查看考前安排 <ArrowRight size={15} />
        </a>
      </div>
      <div className="daily-layout">
        <section className="task-list">
          {day.review.length > 0 && (
            <div className="task-group-heading">
              01 / 闭卷唤回 · 已安排 {day.reviewTime} 分钟
            </div>
          )}
          {day.review.map((l) => (
            <TaskRow
              key={l.id}
              lesson={l}
              type="review"
              done={(state.reviewDays[today] || []).includes(l.id)}
              state={state}
            />
          ))}
          {day.repairs?.length > 0 && (
            <>
              <div className="task-group-heading">
                把前面的难点补上 · {day.repairTime} 分钟
              </div>
              {day.repairs.map((l) => (
                <a
                  className="task-row"
                  href={`#/course/${l.id}?repair`}
                  key={`repair-${l.id}`}
                >
                  <RotateCcw size={22} />
                  <div>
                    <span className="task-meta">先补概念，再增加难度</span>
                    <h3>{l.title}</h3>
                    <p>{repairAdvice(l, state).message}</p>
                  </div>
                  <span className="task-time">
                    约10分钟
                    <ChevronRight size={18} />
                  </span>
                </a>
              ))}
            </>
          )}
          {day.checkpointTime > 0 && (
            <a className="task-row" href="#/checkup">
              <ListChecks size={24} />
              <div>
                <span className="task-meta">学过的规则，换一组题检查</span>
                <h3>综合复核与订正</h3>
                <p>先完成整组再看解释，把高把握答错的规则留下来补。</p>
              </div>
              <span className="task-time">
                {day.checkpointTime}分钟
                <ChevronRight size={18} />
              </span>
            </a>
          )}
          {day.tasks.length > 0 && (
            <div className="task-group-heading">
              {day.review.length ? "02" : "01"} / 理解与应用 ·{" "}
              {day.tasks.reduce((t, l) => t + l.minutes, 0)} 分钟
            </div>
          )}
          {day.tasks.map((l) => (
            <TaskRow
              key={l.id}
              lesson={l}
              done={!!state.records[l.id]?.completedDate}
              reason={day.reasons?.[l.id]}
              state={state}
            />
          ))}
          {day.tasks.length === 0 && day.review.length === 0 && (
            <Empty
              title={day.paused ? "还没到计划中的学习时间" : "今天没有待办任务"}
              action={
                <a className="button secondary" href="#/library">
                  自由选择一课
                </a>
              }
            >
              没有积压也可以停下来，不必为进度条重复刷题。
            </Empty>
          )}
          {!day.paused && (
            <div className="rest-row">
              {day.extraTime > 0 && (
                <p>
                  另计今天补学或诊断 {day.extraTime} 分钟，已从新增预算扣除。
                </p>
              )}
              <span>
                <CircleHelp size={17} /> 合书复述与休息
              </span>
              <span>{day.reflection + day.breakTime} min</span>
              <p>
                用自己的话说出今天最重要的一条规则，指出一个会改变结论的条件。余量作为缓冲，不自动塞入新课。
              </p>
            </div>
          )}
        </section>
        <aside className="learning-aside">
          <div className="section-kicker">你的学习足迹</div>
          <div className="stats-pair">
            <div>
              <strong>{completed}</strong>
              <span>完成教学单元</span>
            </div>
            <div>
              <strong>
                {
                  lessons.filter(
                    (l) => statusOf(state.records[l.id]) === "初步稳固",
                  ).length
                }
              </strong>
              <span>通过跨日验证</span>
            </div>
          </div>
          <p className="muted small-text">
            分母是本站 {lessons.length} 个核心单元，不代表八册全部内容。
          </p>
          <div className="rule-divider" />
          <span className="eyebrow">为什么要隔日再问</span>
          <h3>想起来，比再看一遍多一步。</h3>
          <p>
            先独立回答，再核对结论和理由。答错或使用提示的规则，次日再问；跨日通过后，间隔逐渐拉长。
          </p>
          <a href="#/sources">
            了解方法与边界 <ArrowRight size={15} />
          </a>
        </aside>
      </div>
      <div className="section-heading">
        <h2>八科，一张清楚的地图</h2>
        <a href="#/library">
          展开全部 <ArrowRight size={15} />
        </a>
      </div>
      <div className="subject-strip">
        {subjects.map((s) => (
          <a key={s.id} href={`#/library?${s.id}`}>
            <SubjectMark id={s.id} />
            <strong>{s.name}</strong>
            <span>
              {lessons.filter((l) => l.subjectId === s.id).length} 个单元
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
function TaskRow({ lesson: l, type = "lesson", done, state, reason }) {
  const familiar = state.settings.familiarity[l.subjectId] || 0;
  return (
    <a
      className={`task-row ${done ? "done" : ""}`}
      href={`#/${type === "review" ? "practice" : "course"}/${l.id}`}
    >
      <span className="task-check">
        {done ? <Check size={17} /> : <SubjectMark id={l.subjectId} small />}
      </span>
      <div>
        <span className="task-meta">
          {subjectById[l.subjectId].name} ·{" "}
          {type === "review"
            ? "隔日独立判断"
            : familiar
              ? "先确认会多少，再补缺口"
              : "基础讲解 + 示范"}
        </span>
        <h3>{l.title}</h3>
        <p>
          {type === "review"
            ? "先想出结论，再说清理由；卡住了就回到对应讲解。"
            : reason || l.summary}
        </p>
      </div>
      <span className="task-time">
        {type === "review" ? `约${reviewMinutes(state, l.id)}` : l.minutes} min
        <ChevronRight size={18} />
      </span>
    </a>
  );
}

function Coverage({ subjectId }) {
  const labels = {
    partial: "已做部分课程",
    pending: "计划内待补",
    extension: "后续扩展",
  };
  return (
    <div className="coverage-table">
      {coverageById[subjectId].map((d) => (
        <section className="coverage-domain" key={d.name}>
          <div>
            <strong>{d.name}</strong>
            <Pill>{labels[d.status]}</Pill>
          </div>
          <p>{d.note}</p>
          {d.lessonIds.map((id) => (
            <a href={`#/course/${id}`} key={id}>
              {lessonById[id]?.title}
            </a>
          ))}
        </section>
      ))}
    </div>
  );
}

function Library({ state }) {
  const rawFilter = window.location.hash.split("?")[1];
  const initial = subjectById[rawFilter] ? rawFilter : "all";
  const [filter, setFilter] = useState(initial),
    [query, setQuery] = useState("");
  const list = lessons.filter(
    (l) =>
      (filter === "all" || filter === l.subjectId) &&
      `${l.title} ${l.summary} ${l.tags.join(" ")}`.includes(query),
  );
  return (
    <>
      <PageTitle
        eyebrow="知道学了什么，也知道还缺什么"
        title="先看结构，再深入一条规则。"
      >
        {lessons.length} 个核心单元 ·{" "}
        {lessons.reduce((n, l) => n + l.questions.length, 0)} 道双重检查练习 ·
        八科均保留未覆盖范围
      </PageTitle>
      <div className="library-toolbar">
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            全部
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              className={filter === s.id ? "active" : ""}
              onClick={() => setFilter(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="找一个知识点"
            aria-label="搜索知识点"
          />
        </label>
      </div>
      {filter !== "all" && (
        <div className="coverage-banner">
          <div>
            <SubjectMark id={filter} />
            <div>
              <h3>{subjectById[filter].description}</h3>
              <p>未完整覆盖：{subjectById[filter].gaps}</p>
            </div>
          </div>
          <details>
            <summary>查看本科学习范围索引</summary>
            <Coverage subjectId={filter} />
            <p>
              这里区分已有课程、计划内待补和后续扩展。一个领域有课，仍然可能只讲了其中一条规则。
            </p>
          </details>
        </div>
      )}
      <div className="lesson-grid">
        {list.map((l, i) => (
          <a key={l.id} href={`#/course/${l.id}`} className="lesson-card">
            <div className="card-top">
              <SubjectMark id={l.subjectId} small />
              <span>{subjectById[l.subjectId].name}</span>
              <Pill>{statusOf(state.records[l.id])}</Pill>
            </div>
            <h3>{l.title}</h3>
            <p>{l.summary}</p>
            <div className="card-bottom">
              <span>
                <Clock3 size={14} />
                {l.minutes} 分钟 · 3次检查
              </span>
              <ArrowRight size={17} />
            </div>
          </a>
        ))}
      </div>
      {list.length === 0 && (
        <Empty title="没有找到这个知识点">
          换一个关键词，或查看原书的扩展范围。
        </Empty>
      )}
      <div className="plain-note">
        <FileText size={18} />
        <p>
          本工具只承诺所列单元的内容。全书共1666页，未逐页审校；不会将本站课程进度显示为“八科学完”。
          <a href="#/sources">查看全部来源与边界</a>
        </p>
      </div>
    </>
  );
}

function Contrast({ contrast }) {
  const [hidden, setHidden] = useState(false);
  if (!contrast) return null;
  return (
    <section className="contrast">
      <div className="section-heading">
        <h3>{contrast.title}</h3>
        <button className="text-button" onClick={() => setHidden(!hidden)}>
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}{" "}
          {hidden ? "显示关键列" : "遮住关键列"}
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>判断维度</th>
              {contrast.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contrast.rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i}>
                    {hidden ? (
                      <span className="occluded">试着用自己的话解释</span>
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function RepairBlock({ lesson, state, onReturn }) {
  const [kind, setKind] = useState(() => {
    const last = state.attempts
      .filter((a) => a.lessonId === lesson.id && !passed(a))
      .at(-1);
    return mistakeKinds.some(([id]) => id === last?.errorType)
      ? last.errorType
      : "concept";
  });
  const advice = repairAdvice(lesson, state, kind);
  return (
    <div className="repair-panel">
      <div className="section-heading">
        <h3>先把卡住的这一步弄清楚</h3>
        <Pill>约 5—10 分钟</Pill>
      </div>
      <label>
        这次最像哪种情况？
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {mistakeKinds.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>{advice.message}</p>
      {advice.sectionIndexes.map(
        (i) =>
          lesson.sections[i] && (
            <section key={i}>
              <h4>{lesson.sections[i].title}</h4>
              <p>{lesson.sections[i].body}</p>
            </section>
          ),
      )}
      {lesson.prerequisites.length > 0 && (
        <p className="small-text">
          如果这些词本身还陌生，先看
          {lesson.prerequisites.map((id) => (
            <a key={id} href={`#/course/${id}`}>
              《{lessonById[id]?.title}》
            </a>
          ))}
          。
        </p>
      )}
      <button onClick={onReturn}>
        回到例子，重新走一遍 <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Lesson({ lesson: l, state, update, notice }) {
  const saved =
    state.cursor?.id === l.id && state.cursor?.mode !== "review"
      ? state.cursor
      : null;
  const [step, setStep] = useState(saved?.step || 0);
  const [diagnostic, setDiagnostic] = useState(saved?.diagnostic || false);
  const [session, setSession] = useState(saved?.session || []);
  const [quizDraft, setQuizDraft] = useState(saved?.draft || null);
  const [qIndex, setQIndex] = useState(
    Math.min(saved?.qIndex || 0, l.questions.length - 1),
  );
  const [repair, setRepair] = useState(
    window.location.hash.endsWith("?repair"),
  );
  const [checkDone, setCheckDone] = useState(saved?.checkDone || false);
  const familiar = state.settings.familiarity[l.subjectId] || 0;
  const verified = new Set(state.records[l.id]?.diagnosticSections || []);
  const missing = l.prerequisites.filter(
    (id) => !prerequisiteReady(state.records[id]),
  );
  const questions = l.questions;
  const current = questions[qIndex];
  const lastAnswer = session.find((a) => a.questionId === current.id);
  useEffect(() => {
    if (step === 3) return;
    update((s) => ({
      ...s,
      cursor: {
        id: l.id,
        mode: "lesson",
        step,
        diagnostic,
        session,
        qIndex,
        checkDone,
        draft: quizDraft,
      },
    }));
  }, [step, diagnostic, session, qIndex, checkDone, quizDraft]);
  function changeStep(n) {
    setStep(n);
    setRepair(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function answered(q, result) {
    const attempt = { questionId: q.id, kind: q.kind, ...result };
    setSession((a) => [...a.filter((x) => x.questionId !== q.id), attempt]);
    update((s) => recordAttempt(s, l.id, q, result));
  }
  function finish() {
    if (diagnostic) {
      update((s) => finishSession(s, l, session, localDate(), "diagnostic"));
      setDiagnostic(false);
      setCheckDone(true);
      changeStep(0);
      notice("已把这次验证过的段落收起，未测和答得犹豫的部分仍然保留。");
      return;
    }
    update((s) =>
      finishSession(
        s,
        l,
        session,
        localDate(),
        "lesson",
        checkDone ? Math.max(5, l.minutes - verified.size * 4) : undefined,
      ),
    );
    setStep(3);
    update((s) => ({ ...s, cursor: null }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function nextQuestion() {
    if (
      session.slice(-2).length === 2 &&
      session.slice(-2).every((a) => !passed(a))
    ) {
      setRepair(true);
      return;
    }
    if (qIndex < questions.length - 1) setQIndex(qIndex + 1);
    else finish();
  }
  function startPractice() {
    if (checkDone && session.length === questions.length) {
      finish();
      return;
    }
    setDiagnostic(false);
    setQIndex(0);
    setSession([]);
    changeStep(2);
  }
  const titles = ["先弄懂", "看一遍怎么用", "自己试一试", "合上再想想"];
  return (
    <>
      <div className="lesson-top">
        <a href="#/library" className="back-link">
          <ArrowLeft size={16} />
          课程地图
        </a>
        <div>
          <Pill>{subjectById[l.subjectId].name}</Pill>
          <span>
            <Clock3 size={15} />
            预计 {l.minutes} 分钟
          </span>
        </div>
      </div>
      <div className="lesson-heading">
        <p className="eyebrow">这一课，只解决一个小问题</p>
        <h1>{l.title}</h1>
        <p>{l.orientation || l.summary}</p>
      </div>
      <div className="lesson-layout">
        <article className="lesson-body">
          <div className="lesson-steps">
            {titles.map((title, i) => (
              <button
                key={title}
                className={step === i ? "active" : step > i ? "complete" : ""}
                disabled={i > 1 && i !== step}
                onClick={() => changeStep(i)}
              >
                <span>{step > i ? <Check size={14} /> : i + 1}</span>
                {title}
              </button>
            ))}
          </div>
          {repair ? (
            <RepairBlock
              lesson={l}
              state={state}
              onReturn={() => {
                setRepair(false);
                setDiagnostic(false);
                setCheckDone(false);
                changeStep(1);
              }}
            />
          ) : (
            <>
              {step === 0 && (
                <>
                  {l.bridge && <p className="lesson-bridge">{l.bridge}</p>}
                  {missing.length > 0 && (
                    <div className="prerequisite-notice">
                      <strong>这课会用到前面的知识</strong>
                      <p>
                        如果下面的概念还没弄清，可以先花几分钟补上，后面的例子会轻松很多。
                      </p>
                      {missing.map((id) => (
                        <a key={id} href={`#/course/${id}`}>
                          {lessonById[id]?.title}
                          <ArrowRight size={15} />
                        </a>
                      ))}
                    </div>
                  )}
                  {l.warmup && (
                    <details className="warmup">
                      <summary>
                        <span>先想一想，不计分</span>
                        {l.warmup.prompt}
                      </summary>
                      <p>{l.warmup.answer}</p>
                    </details>
                  )}
                  <div className="goal-box">
                    <Target size={20} />
                    <div>
                      <strong>这一课要弄清</strong>
                      <ul>
                        {l.objectives.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {familiar > 0 &&
                    !checkDone &&
                    !state.records[l.id]?.completedDate && (
                      <div className="diagnostic-banner">
                        <div>
                          <strong>这部分你可能已经会了</strong>
                          <p>
                            先试 {questions.length}{" "}
                            个小问题。只收起实际验证过的段落，没测到的内容仍然要看。
                          </p>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => {
                            setDiagnostic(true);
                            setSession([]);
                            setQIndex(0);
                            changeStep(2);
                          }}
                        >
                          先看看我会多少
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  {checkDone && (
                    <div className="plain-note">
                      <Check size={18} />
                      <p>
                        本轮已验证 {verified.size} / {l.sections.length}{" "}
                        段。收起的部分仍可展开；下面保留的段落还需要你读一遍。
                      </p>
                    </div>
                  )}
                  {l.sections.map((section, i) =>
                    verified.has(i) ? (
                      <details className="verified-section" key={section.title}>
                        <summary>
                          <Check size={15} />
                          {section.title}
                          <span>已测到，可快速回看</span>
                        </summary>
                        <p>{section.body}</p>
                      </details>
                    ) : (
                      <section className="prose-section" key={section.title}>
                        <span className="section-number">{number(i + 1)}</span>
                        <div>
                          <h2>{section.title}</h2>
                          <p>{section.body}</p>
                        </div>
                      </section>
                    ),
                  )}
                  <div className="logic-box">
                    <span className="eyebrow">遇到题目，按这个顺序想</span>
                    <ol>
                      {l.logicSteps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <Contrast contrast={l.contrast} />
                  <div className="lesson-actions">
                    <span>不用逐字背，先说清它在解决什么问题。</span>
                    <button onClick={() => changeStep(1)}>
                      跟着例子走一遍
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="eyebrow">看看规则怎样落到事实里 · 虚构案例</p>
                  <div className="scenario">
                    <span className="quote-mark">“</span>
                    <p>{l.example.scenario}</p>
                  </div>
                  <div className="example-steps">
                    {l.example.steps.map((s, i) => (
                      <section key={s.title}>
                        <span>{number(i + 1)}</span>
                        <div>
                          <h3>{s.title}</h3>
                          <p>{s.body}</p>
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="conclusion">
                    <Check size={21} />
                    <div>
                      <strong>所以，这个例子的结论是</strong>
                      <p>{l.example.conclusion}</p>
                    </div>
                  </div>
                  <div className="lesson-actions">
                    <button className="secondary" onClick={() => changeStep(0)}>
                      <ArrowLeft size={16} />
                      再看一下规则
                    </button>
                    <button onClick={startPractice}>
                      {checkDone
                        ? "整理这课要记住的东西"
                        : "换个例子，我来判断"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="practice-heading">
                    <span className="eyebrow">
                      {diagnostic ? "先确认哪些已经会了" : "先自己想，再看解释"}
                    </span>
                    <span>
                      {qIndex + 1} / {questions.length}
                    </span>
                  </div>
                  <Quiz
                    key={`${diagnostic}-${current.id}`}
                    question={current}
                    lesson={l}
                    initialResult={lastAnswer}
                    initialDraft={quizDraft}
                    onDraft={setQuizDraft}
                    onAnswer={(result) => answered(current, result)}
                    onNext={nextQuestion}
                    onRepair={() => setRepair(true)}
                    last={qIndex === questions.length - 1}
                  />
                  <button
                    className="text-button no-idea"
                    onClick={() => setRepair(true)}
                  >
                    完全没有思路？先补讲，不用硬猜。
                  </button>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="finish-header">
                    <div className="finish-icon">
                      <Check size={30} />
                    </div>
                    <p className="eyebrow">最后，试着不看解释</p>
                    <h2>
                      {session.every(passed)
                        ? "这一轮，结论和理由都答对了。"
                        : "这课先学到这里，难点明天再检查。"}
                    </h2>
                    <p>
                      用自己的话回答下面的问题。说不完整，就展开核对少了哪一步。
                      当前 {learningEvidence(l, state).checked} /{" "}
                      {l.questions.length}{" "}
                      道课堂题最近一次答对且未点提示；同日复练不增加跨日验证。
                    </p>
                  </div>
                  <div className="recall-list">
                    {l.takeaways.map((t, i) => (
                      <details key={t}>
                        <summary>
                          {l.recallPrompts?.[i] ||
                            `第 ${i + 1} 条关键规则，你能说清吗？`}
                        </summary>
                        <p>{t}</p>
                      </details>
                    ))}
                  </div>
                  <div className="next-review">
                    <CalendarDays size={20} />
                    <div>
                      <strong>
                        下次再看：
                        {state.records[l.id]?.due
                          ? dateLabel(state.records[l.id].due)
                          : "完成练习后安排"}
                      </strong>
                      <p>
                        今天看懂是第一步。隔一天还能讲清楚、换个条件还能判断，才会逐渐记牢。
                      </p>
                    </div>
                  </div>
                  <div className="lesson-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setCheckDone(false);
                        setSession([]);
                        setQIndex(0);
                        changeStep(2);
                      }}
                    >
                      还想再练一遍
                    </button>
                    <button onClick={() => go("today")}>
                      回到今天的任务
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          <Source lesson={l} />
        </article>
        <aside className="lesson-aside" hidden={step === 2}>
          <span className="eyebrow">把这几步连起来</span>
          <ol>
            {l.logicSteps.map((s, i) => (
              <li key={s}>
                <span>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="rule-divider" />
          <p className="small-text muted">
            不用一次记住所有细节。先把关系讲明白，做题时再检查条件和例外。
          </p>
        </aside>
      </div>
    </>
  );
}

function Quiz({
  question: q,
  lesson,
  onAnswer,
  onNext,
  last = false,
  onRepair,
  initialResult,
  initialDraft,
  onDraft,
  deferFeedback = false,
  assisted = false,
}) {
  const draft = initialDraft?.questionId === q.id ? initialDraft : null;
  const [choice, setChoice] = useState(
    initialResult?.choice ?? draft?.choice ?? null,
  );
  const [reason, setReason] = useState(
    initialResult?.reason ?? draft?.reason ?? null,
  );
  const [confidence, setConfidence] = useState(
    initialResult?.confidence || draft?.confidence || "",
  );
  const [hint, setHint] = useState(initialResult?.hint || draft?.hint || false);
  const effectiveHint = hint || Boolean(initialResult?.hint) || assisted;
  const [submitted, setSubmitted] = useState(Boolean(initialResult));
  const [phase, setPhase] = useState(
    initialResult ? "feedback" : draft?.phase || "answer",
  );
  const [error, setError] = useState("");
  const started = useRef(Date.now());
  const options = useMemo(
    () =>
      restoreChoiceOrder(
        q.options,
        initialResult?.optionOrder || draft?.optionOrder,
      ),
    [q.id],
  );
  const reasons = useMemo(
    () =>
      restoreChoiceOrder(
        q.reasonOptions,
        initialResult?.reasonOrder || draft?.reasonOrder,
      ),
    [q.id],
  );
  const draftWriter = useRef(onDraft);
  draftWriter.current = onDraft;
  useEffect(() => {
    if (!submitted)
      draftWriter.current?.({
        questionId: q.id,
        phase,
        choice,
        reason,
        confidence,
        hint,
        optionOrder: options.map((o) => o.i),
        reasonOrder: reasons.map((o) => o.i),
      });
  }, [
    q.id,
    phase,
    choice,
    reason,
    confidence,
    hint,
    options,
    reasons,
    submitted,
  ]);
  const correct = initialResult?.correct ?? choice === q.answer;
  const reasonCorrect =
    initialResult?.reasonCorrect ?? reason === q.reasonAnswer;
  const [errorKind, setErrorKind] = useState(initialResult?.errorType || "");
  function lockAnswer() {
    if (choice === null || !confidence) {
      setError("先选一个判断，再告诉我你有多大把握。");
      return;
    }
    setError("");
    setPhase("reason");
  }
  function submit() {
    if (reason === null) {
      setError("再选一个最能说明你判断的理由。");
      return;
    }
    setError("");
    setSubmitted(true);
    setPhase("feedback");
    onAnswer({
      date: localDate(),
      choice,
      reason,
      correct,
      reasonCorrect,
      hint: effectiveHint,
      guessed: confidence === "guess",
      confidence,
      seconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
      errorType: errorKind,
      optionOrder: options.map((o) => o.i),
      reasonOrder: reasons.map((o) => o.i),
    });
  }
  const kind = {
    recall: "想起规则",
    application: "用到例子里",
    variation: "改变一个条件",
  }[q.kind];
  return (
    <div className="quiz">
      <Pill>{kind}</Pill>
      <h2>{q.prompt}</h2>
      <fieldset disabled={phase !== "answer"}>
        <legend>先判断：你会选哪一个？</legend>
        {options.map(({ v, i }, j) => (
          <label
            key={i}
            className={`answer-option ${choice === i ? "chosen" : ""} ${submitted && !deferFeedback && i === q.answer ? "right-answer" : ""}`}
          >
            <input
              type="radio"
              name={`answer-${q.id}`}
              checked={choice === i}
              onChange={() => setChoice(i)}
            />
            <span className="option-letter">{String.fromCharCode(65 + j)}</span>
            <span>{v}</span>
            {submitted && !deferFeedback && i === q.answer && (
              <Check size={18} />
            )}
          </label>
        ))}
      </fieldset>
      {phase === "answer" && (
        <>
          <fieldset className="confidence">
            <legend>这个判断，你有多大把握？</legend>
            {[
              ["sure", "能说清为什么"],
              ["uncertain", "还拿不太准"],
              ["guess", "主要靠猜"],
            ].map(([v, t]) => (
              <label key={v} className={confidence === v ? "selected" : ""}>
                <input
                  type="radio"
                  name={`confidence-${q.id}`}
                  checked={confidence === v}
                  onChange={() => setConfidence(v)}
                />
                {t}
              </label>
            ))}
          </fieldset>
          {!deferFeedback && (
            <button className="text-button" onClick={() => setHint(true)}>
              <CircleHelp size={16} />
              需要一个提示
            </button>
          )}
          {hint && (
            <div className="hint-box">
              先找出题目改变了哪个条件。可以对照本课的分析顺序：
              {lesson.logicSteps[0]}
              。用了提示也没关系，明天会再给你一次独立判断的机会。
            </div>
          )}
          <button className="full-button" onClick={lockAnswer}>
            确认这个判断，再说明理由
            <ArrowRight size={17} />
          </button>
        </>
      )}
      {phase === "reason" && (
        <p className="answer-locked">
          <Check size={16} />
          判断已记下。先在心里说一句“因为……”，再选最贴近的理由。
        </p>
      )}
      {phase !== "answer" && (
        <fieldset disabled={submitted}>
          <legend>为什么这样判断？</legend>
          {reasons.map(({ v, i }) => (
            <label
              key={i}
              className={`answer-option reason ${reason === i ? "chosen" : ""} ${submitted && !deferFeedback && i === q.reasonAnswer ? "right-answer" : ""}`}
            >
              <input
                type="radio"
                name={`reason-${q.id}`}
                checked={reason === i}
                onChange={() => setReason(i)}
              />
              <span>{v}</span>
              {submitted && !deferFeedback && i === q.reasonAnswer && (
                <Check size={18} />
              )}
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {phase === "reason" && (
        <button className="full-button" onClick={submit}>
          {deferFeedback ? "保存这道题的判断" : "看看我的推理对不对"}
          <ArrowRight size={17} />
        </button>
      )}
      {submitted && deferFeedback && (
        <div className="feedback">
          <p>判断和理由已保存，完成整组后一起核对。</p>
          <button onClick={onNext}>
            {last ? "完成这一组，查看结果" : "继续下一题"}
            <ArrowRight size={17} />
          </button>
        </div>
      )}
      {submitted && !deferFeedback && (
        <div
          className={`feedback ${correct && reasonCorrect ? "success" : "needs-work"}`}
          role="status"
        >
          <div className="feedback-title">
            {correct && reasonCorrect ? (
              <Check size={22} />
            ) : (
              <RotateCcw size={22} />
            )}
            <h3>
              {correct && reasonCorrect
                ? effectiveHint || confidence === "guess"
                  ? "这次选对了，明天再试着独立判断。"
                  : "判断对了，理由也说得通。"
                : correct
                  ? "结论选对了，理由里还少了一步。"
                  : "我们看看，哪一步影响了结论。"}
            </h3>
          </div>
          <p>{q.explanation}</p>
          <div className="decisive-fact">
            <strong>决定这道题的地方</strong>
            {q.decisiveFact}
          </div>
          {(!correct ||
            !reasonCorrect ||
            effectiveHint ||
            confidence === "guess") && (
            <>
              <label className="error-select">
                这次最像哪种情况？
                <select
                  value={errorKind}
                  onChange={(e) => {
                    setErrorKind(e.target.value);
                    window.dispatchEvent(
                      new CustomEvent("study-error", {
                        detail: { questionId: q.id, errorType: e.target.value },
                      }),
                    );
                  }}
                >
                  <option value="">可以先不选</option>
                  {mistakeKinds.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {errorKind && (
                <p className="repair-suggestion">
                  {lesson.repairHints?.[errorKind]?.message}
                </p>
              )}
              {onRepair && (
                <button className="secondary" onClick={onRepair}>
                  这一步还不明白，帮我拆开讲
                </button>
              )}
            </>
          )}
          <div className="feedback-actions">
            <button onClick={onNext}>
              {last ? "整理这一轮的结果" : "再试一个问题"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Practice({ lesson: l, state, update, notice }) {
  const saved =
    state.cursor?.mode === "review" && state.cursor.id === l.id
      ? state.cursor
      : null;
  const [done, setDone] = useState(false);
  const [repair, setRepair] = useState(false);
  const [assisted, setAssisted] = useState(saved?.assisted || false);
  const [quizDraft, setQuizDraft] = useState(saved?.draft || null);
  function showRepair() {
    setAssisted(true);
    setRepair(true);
  }
  const [attempt, setAttempt] = useState(saved?.result || null);
  const [q] = useState(
    () =>
      l.questions.find((q) => q.id === saved?.questionId) ||
      selectReviewQuestion(l, state),
  );
  useEffect(() => {
    if (!done)
      update((s) => ({
        ...s,
        cursor: {
          id: l.id,
          mode: "review",
          step: 2,
          questionId: q.id,
          result: attempt,
          assisted,
          draft: quizDraft,
        },
      }));
  }, [q.id, attempt, done, assisted, quizDraft]);
  return (
    <>
      <div className="lesson-top">
        <a href="#/review" className="back-link">
          <ArrowLeft size={16} />
          间隔复习
        </a>
        <Pill>{subjectById[l.subjectId].name}</Pill>
      </div>
      <PageTitle eyebrow="隔一段时间，再试一次" title={l.title}>
        先独立判断。有卡住的地方，可以随时展开补讲。
      </PageTitle>
      <div className="review-practice">
        {done ? (
          <Empty
            title="这次结果已经记下"
            action={
              <div className="inline-actions">
                <a
                  className="button secondary"
                  href={`#/course/${l.id}?repair`}
                >
                  补一下刚才的难点
                </a>
                <a className="button" href="#/review">
                  继续复习 <ArrowRight size={16} />
                </a>
              </div>
            }
          >
            下次日期：{state.records[l.id]?.due}
            。同一天重复作答属于练习，不会多算一次跨日验证。
          </Empty>
        ) : repair ? (
          <RepairBlock
            lesson={l}
            state={state}
            onReturn={() => go(`course/${l.id}?repair`)}
          />
        ) : (
          <Quiz
            key={q.id}
            lesson={l}
            question={q}
            last
            initialResult={attempt}
            assisted={assisted}
            initialDraft={quizDraft}
            onDraft={setQuizDraft}
            onRepair={showRepair}
            onAnswer={(rawResult) => {
              const result = { ...rawResult, hint: rawResult.hint || assisted };
              setAttempt({ questionId: q.id, kind: q.kind, ...result });
              update((s) => recordAttempt(s, l.id, q, result));
            }}
            onNext={() => {
              update((s) => ({
                ...finishSession(s, l, [attempt], localDate(), "review"),
                cursor: null,
              }));
              setDone(true);
              notice("已保存复习结果和下次日期。");
            }}
          />
        )}
        {!done && (
          <button
            className="text-button back-to-lesson"
            onClick={() => {
              if (repair) setRepair(false);
              else showRepair();
            }}
          >
            {repair ? "回到刚才的题目" : "找不到分析入口？先拆开讲"}
            <ArrowRight size={16} />
          </button>
        )}
        <Source lesson={l} />
      </div>
    </>
  );
}

function Review({ state, day, today }) {
  const due = dueLessons(lessons, state, today),
    queue = day.review.filter(
      (l) => !(state.reviewDays[today] || []).includes(l.id),
    );
  const learned = lessons.filter((l) => state.records[l.id]);
  const errorItems = state.attempts
    .filter((a) => !passed(a))
    .slice()
    .reverse();
  const unique = errorItems.filter(
    (a, i) =>
      errorItems.findIndex((b) => b.lessonId === a.lessonId) === i &&
      lessonById[a.lessonId],
  );
  return (
    <>
      <PageTitle
        eyebrow="隔日回想，比连续重看更有区分度"
        title="再想起来，记忆就往前一步。"
      >
        按本地日期安排。今天的复习上限{" "}
        {isWeekend(today) ? 40 : state.settings.weekday === 120 ? 15 : 20}{" "}
        分钟，多余任务顺延，减少新增。
      </PageTitle>
      <div className="review-stats">
        <div>
          <strong>{due.length}</strong>
          <span>已到期的规则组</span>
        </div>
        <div>
          <strong>{queue.length}</strong>
          <span>今天准备复习</span>
        </div>
        <div>
          <strong>
            {
              learned.filter(
                (l) => statusOf(state.records[l.id]) === "初步稳固",
              ).length
            }
          </strong>
          <span>已通过跨日与变式</span>
        </div>
        <div>
          <strong>{state.attempts.length}</strong>
          <span>真实作答记录</span>
        </div>
      </div>
      <div className="section-heading">
        <h2>今日复习队列</h2>
        <Pill>同一规则的错误合并处理</Pill>
      </div>
      <section className="task-list">
        {queue.map((l) => (
          <TaskRow key={l.id} lesson={l} state={state} type="review" />
        ))}
        {queue.length === 0 && (
          <Empty
            title={due.length ? "今天的复习预算已用完" : "当前没有到期任务"}
          >
            继续学习新课，或给记忆留一点间隔。剩余到期任务会在后续日期获得机会。
          </Empty>
        )}
      </section>
      {lessons.some(
        (l) => state.records[l.id]?.checkpointUnresolved?.length,
      ) && (
        <div className="checkup-intro">
          <div>
            <h3>综合复核里，还有需要补的规则</h3>
            <p>
              {lessons
                .filter(
                  (l) => state.records[l.id]?.checkpointUnresolved?.length,
                )
                .map((l) => l.title)
                .join("；")}
              。先回课堂弄懂，隔一天再用保留题检查。
            </p>
          </div>
          <a className="button secondary" href="#/checkup">
            复测这些问题
            <ArrowRight size={16} />
          </a>
        </div>
      )}
      <div className="section-heading">
        <h2>从错因，回到规则</h2>
        <span className="muted small-text">仅展示每个规则组最近一次困难</span>
      </div>
      <div className="error-list">
        {unique.slice(0, 12).map((a) => (
          <a href={`#/course/${a.lessonId}`} key={a.lessonId}>
            <RotateCcw size={18} />
            <div>
              <h3>{lessonById[a.lessonId].title}</h3>
              <p>
                {mistakeKinds.find(([id]) => id === a.errorType)?.[1] ||
                  a.errorType ||
                  (a.hint
                    ? "使用了提示"
                    : a.guessed
                      ? "主要依靠猜测"
                      : a.correct
                        ? "理由未通过"
                        : "结论未通过")}{" "}
                · {a.date}
              </p>
            </div>
            <ArrowRight size={18} />
          </a>
        ))}
        {!unique.length && (
          <p className="muted">
            还没有需要补讲的记录。遇到错误时，这里会保存回到课堂的入口。
          </p>
        )}
      </div>
      <details className="method-details">
        <summary>怎样才算“初步稳固”？</summary>
        <p>
          至少两个不同日期结论与理由都正确，未使用提示、未标记猜测，并至少通过一次关键事实变化题。第一次通过后次日检查，之后约隔3天、7天；答错或借助提示后回到次日。这是可解释的首版规则，不是经过法考验证的最优算法。
        </p>
      </details>
    </>
  );
}

function AssessmentResults({ items, run, diagnostic = false }) {
  const report = assessmentReport(items, run.attempts);
  return (
    <div className="assessment-results">
      <div className="stats-pair">
        <div>
          <strong>
            {report.clear.length} / {report.answered}
          </strong>
          <span>结论和理由都独立答对</span>
        </div>
        <div>
          <strong>{report.repair.length}</strong>
          <span>需要回到讲解的考点</span>
        </div>
      </div>
      <p className="muted">
        这里只说明本次抽到的规则。
        {report.untouched.length > 0
          ? `还有 ${report.untouched.length} 题未检查。`
          : ""}
        没有测到的知识仍需学习，不据此推算考试分数或通过率。
      </p>
      {report.repair.length > 0 && <h3>接下来，先补这些地方</h3>}
      {report.repair.map((item) => {
        const l = lessonById[item.lessonId];
        return (
          <div className="assessment-repair" key={item.question.id}>
            <strong>{item.topic}</strong>
            <p>{item.question.explanation}</p>
            <p className="small-text">
              重点看：
              {(item.sectionIndexes || item.question.sectionIndexes || [])
                .map((i) => l.sections[i]?.title)
                .filter(Boolean)
                .join("、") || l.title}
            </p>
            <a className="text-button" href={`#/course/${l.id}?repair`}>
              回到这一课 <ArrowRight size={15} />
            </a>
            <Source lesson={{ ...l, source: item.source }} />
          </div>
        );
      })}
      <details className="method-details">
        <summary>查看这次所有题目的解释与来源</summary>
        {items
          .filter((item) =>
            run.attempts.some((a) => a.questionId === item.question.id),
          )
          .map((item) => (
            <section className="assessment-repair" key={item.question.id}>
              <h3>{item.topic}</h3>
              <p>{item.question.prompt}</p>
              <p>
                <strong>结论：</strong>
                {item.question.options[item.question.answer]}
              </p>
              <p>
                <strong>理由：</strong>
                {item.question.reasonOptions[item.question.reasonAnswer]}
              </p>
              <p>{item.question.explanation}</p>
              <Source
                lesson={{ ...lessonById[item.lessonId], source: item.source }}
              />
            </section>
          ))}
      </details>
      {diagnostic && (
        <p className="plain-note">
          诊断只记录上面这些题。进入课堂后，仍会保留未验证的段落；不会把整门民诉标为已学。
        </p>
      )}
      <div className="inline-actions">
        <a className="button" href="#/today">
          回到今日学习 <ArrowRight size={16} />
        </a>
        <a className="button secondary" href="#/library">
          查看尚未学习的单元
        </a>
      </div>
    </div>
  );
}

function Diagnostic({ state, update }) {
  const run = state.diagnostic;
  const [started, setStarted] = useState(run.attempts.length > 0);
  const item = diagnosticPool[Math.min(run.cursor, diagnosticPool.length - 1)];
  const result = run.attempts.find((a) => a.questionId === item.question.id);
  const done = run.completed || run.stopped;
  function answer(result) {
    update((s) => ({
      ...s,
      diagnostic: appendAssessmentAnswer(
        s.diagnostic,
        assessmentAnswer(item, result),
      ),
    }));
  }
  function next() {
    update((s) => {
      const d = s.diagnostic;
      const stop = diagnosticNeedsTeaching(d);
      return {
        ...s,
        diagnostic: {
          ...d,
          cursor: Math.min(d.cursor + 1, diagnosticPool.length - 1),
          stopped: stop,
          completed: d.cursor === diagnosticPool.length - 1,
        },
      };
    });
  }
  function noIdea() {
    update((s) => {
      const d = appendAssessmentAnswer(
        s.diagnostic,
        assessmentAnswer(item, {
          correct: false,
          reasonCorrect: false,
          hint: false,
          guessed: false,
          seconds: 0,
          noIdea: true,
          confidence: "guess",
        }),
      );
      const stop = diagnosticNeedsTeaching(d);
      return {
        ...s,
        diagnostic: {
          ...d,
          cursor: Math.min(d.cursor + 1, diagnosticPool.length - 1),
          stopped: stop,
          completed: d.cursor === diagnosticPool.length - 1,
        },
      };
    });
  }
  return (
    <>
      <PageTitle eyebrow="先确认起点" title="民诉熟悉到哪里，具体试一试。">
        最多16题，约20—25分钟。按起诉、证明、程序、救济、执行、涉外与仲裁检查；两次没有思路，就停下来补讲。
      </PageTitle>
      {!started ? (
        <section className="checkup-intro">
          <h2>熟悉的规则，可以少花时间重读</h2>
          <p>
            先独立选结论，再选理由。这一轮结束后，给你具体补讲入口。答案解释在整轮结束后显示。
          </p>
          <p>
            可以随时退出，下次从已保存的题号继续。不会凭诊断结果直接完成整课。
          </p>
          <button onClick={() => setStarted(true)}>
            开始这次诊断 <ArrowRight size={16} />
          </button>
        </section>
      ) : done ? (
        <>
          <div className="plain-note">
            {run.stopped
              ? "有两处还没有分析思路，先补讲会更省时间。"
              : "本轮诊断已完成。接下来按具体困难补讲。"}
          </div>
          <AssessmentResults items={diagnosticPool} run={run} diagnostic />
          {run.stopped && !run.completed && (
            <button
              className="secondary"
              onClick={() =>
                update((s) => ({
                  ...s,
                  diagnostic: {
                    ...s.diagnostic,
                    stopped: false,
                    roundStart: s.diagnostic.attempts.length,
                  },
                }))
              }
            >
              补过讲解后，继续剩下的诊断
              <ArrowRight size={16} />
            </button>
          )}
        </>
      ) : (
        <div className="review-practice">
          <div className="practice-heading">
            <Pill>{item.topic}</Pill>
            <span>
              {run.cursor + 1} / {diagnosticPool.length}
            </span>
          </div>
          <Quiz
            key={item.question.id}
            question={item.question}
            lesson={lessonById[item.lessonId]}
            deferFeedback
            initialResult={result}
            initialDraft={run.draft}
            onDraft={(draft) =>
              update((s) => ({ ...s, diagnostic: { ...s.diagnostic, draft } }))
            }
            onAnswer={answer}
            onNext={next}
            last={run.cursor === diagnosticPool.length - 1}
          />
          {!result && (
            <button className="text-button no-idea" onClick={noIdea}>
              这题没有思路，记下来先跳过
            </button>
          )}
          <p className="muted small-text">
            已提交的答案会保留。只是看见题目不计为学会。
          </p>
        </div>
      )}
    </>
  );
}

function Checkup({ state, update, day }) {
  const run = state.checkups.at(-1);
  const items = run
    ? run.itemIds
        .map((id) => checkpointPool.find((i) => i.question.id === id))
        .filter(Boolean)
    : [];
  const available = chooseCheckup(
    checkpointPool,
    state,
    Math.floor(
      (day.checkpointTime ||
        Math.min(30, Math.max(0, day.budget - day.total))) / 2,
    ),
  );
  const item =
    run && !run.completed
      ? items[Math.min(run.cursor, items.length - 1)]
      : null;
  const freshCount = available.filter(
    (i) => !state.checkups.some((r) => r.itemIds.includes(i.question.id)),
  ).length;
  const currentResult =
    item && run.attempts.find((a) => a.questionId === item.question.id);
  function begin() {
    update((s) => ({
      ...s,
      checkups: [...s.checkups, startCheckup(available)],
    }));
  }
  function answer(result) {
    update((s) => recordCheckupAnswer(s, item, result));
  }
  function next() {
    update((s) => {
      const runs = [...s.checkups],
        r = runs.at(-1);
      runs[runs.length - 1] = {
        ...r,
        cursor: Math.min(r.cursor + 1, items.length - 1),
        completed: r.cursor === items.length - 1,
        ...(r.cursor === items.length - 1
          ? { finishedAt: new Date().toISOString() }
          : {}),
      };
      return { ...s, checkups: runs };
    });
  }
  return (
    <>
      <PageTitle
        eyebrow="把规则放到另一道题里"
        title="换一种问法，还能判断吗？"
      >
        只抽已经学过的单元。先完成整组，再核对解释；这是一组原创规则检查，不是正式考试模拟。
      </PageTitle>
      {(!run || run.completed || !items.length) && (
        <section className="checkup-intro">
          <div>
            <h2>{run ? "还想检查一次？" : "留一组没看过答案的问题"}</h2>
            <p>
              当前可检查 {available.length} 题，预计 {available.length * 2}{" "}
              分钟。
              {freshCount
                ? `${freshCount} 题还没有在综合复核中出现。`
                : available.length
                  ? "这组题已经见过，再做属于复练。"
                  : "先完成有保留题的课程，或在今天留出几分钟再开始。"}
            </p>
            <p>
              作答时先辨认规则和例外。本站题目为单项选择；若实际考试包含多选或不定项，还需配合对应题型的合法真题材料。
            </p>
          </div>
          <button disabled={!available.length} onClick={begin}>
            {available.length ? "开始这一组" : "当前没有可安排的题组"}
            <ArrowRight size={16} />
          </button>
        </section>
      )}
      {run && !run.completed && !items.length && (
        <div className="alert warning">
          这组题已不在当前题库，旧记录仍然保留。可以从现有课程重新开始一组。
        </div>
      )}
      {run?.completed && (
        <>
          <div className="section-heading">
            <h2>最近这轮的结果</h2>
            <Pill>{run.date}</Pill>
          </div>
          <AssessmentResults items={items} run={run} />
        </>
      )}
      {item && (
        <div className="review-practice">
          <div className="practice-heading">
            <Pill>{subjectById[lessonById[item.lessonId].subjectId].name}</Pill>
            <span>
              {run.cursor + 1} / {items.length}
            </span>
          </div>
          <Quiz
            key={`${run.startedAt}-${item.question.id}`}
            question={item.question}
            lesson={lessonById[item.lessonId]}
            deferFeedback
            initialResult={currentResult}
            initialDraft={run.draft}
            onDraft={(draft) =>
              update((s) => {
                const runs = [...s.checkups];
                runs[runs.length - 1] = { ...runs.at(-1), draft };
                return { ...s, checkups: runs };
              })
            }
            onAnswer={answer}
            onNext={next}
            last={run.cursor === items.length - 1}
          />
          <p className="muted small-text">
            中途离开会保留已提交的答案；解释等这一组做完再看。
          </p>
        </div>
      )}
      {!available.length && !run && (
        <div className="plain-note">
          <div>
            <strong>这些课有配套保留题，完成教学后可检查：</strong>
            {[...new Set(checkpointPool.map((i) => i.lessonId))]
              .filter((id) => !state.records[id]?.completedDate)
              .slice(0, 3)
              .map((id) => (
                <p key={id}>
                  <a href={`#/course/${id}`}>{lessonById[id].title}</a>
                </p>
              ))}
          </div>
        </div>
      )}
      {!available.length && !run && (
        <a className="button secondary" href="#/today">
          先去今日学习
        </a>
      )}
    </>
  );
}

function Plan({ state, today }) {
  const plans = projectPlan(lessons, state);
  const total = plans
    .filter((p) => !p.paused)
    .reduce((n, p) => n + p.budget, 0);
  const selected = new Set(plans.flatMap((p) => p.tasks.map((l) => l.id))).size;
  return (
    <>
      <PageTitle
        eyebrow="按剩余时间安排"
        title="把有限的时间，留给最需要学的地方。"
      >
        从 {state.settings.startDate} 开始 · 按实际星期安排 · 预算约{" "}
        {(total / 60).toFixed(1)} 小时（含复习与休息）
      </PageTitle>
      <div className="plan-intro">
        <div>
          <span>开始几天</span>
          <h3>建立分析入口</h3>
          <p>先给陌生科目讲解和示范，熟悉模块用短诊断验证。</p>
        </div>
        <div>
          <span>中段学习</span>
          <h3>扩展与交叉检验</h3>
          <p>逐步覆盖八科，用相邻规则和变化事实打破熟悉感。</p>
        </div>
        <div>
          <span>临近考试</span>
          <h3>减少新增，留给复现</h3>
          <p>
            按考试日期压缩安排，最后两天留给综合复核和纠错；考试当天不排学习任务。
          </p>
        </div>
      </div>
      <div className="plan-notice">
        这是按当前记录推算的安排。未来任务会随正确率、实际学习和预算变化；漏学不会整天叠加到下一天。课程地图仍可自由选学。本次预计安排{" "}
        {selected} 个教学单元，内容库共有 {lessons.length}{" "}
        个；其余保留为选学，不计为已学。
      </div>
      <div className="plain-note">
        <ListChecks size={20} />
        <p>
          这份安排不强行填满每分钟。若有自己的合法客观题真题材料，可用余量练多选、不定项和限时作答；优先订正有把握却做错的题，不把本站的单项选择练习当作完整考试模拟。
        </p>
      </div>
      <div className="plan-days">
        {plans.map((p, i) => (
          <section
            className={`plan-day ${p.date === today ? "today" : ""} ${p.past ? "past" : ""}`}
            key={p.date}
          >
            <div className="day-label">
              <strong>D{number(i + 1)}</strong>
              <span>{dateLabel(p.date)}</span>
              {p.date === today && <Pill>今天</Pill>}
              <small>
                {p.paused
                  ? "不排必修"
                  : `${p.budget} min · ${isWeekend(p.date) ? "周末" : "工作日"}`}
              </small>
            </div>
            <div className="day-detail">
              {p.tasks.length ? (
                <div className="plan-lessons">
                  {p.tasks.map((l) => (
                    <a key={l.id} href={`#/course/${l.id}`}>
                      <SubjectMark id={l.subjectId} small />
                      <span>{l.title}</span>
                      <small>{l.minutes}m</small>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {p.past
                    ? "当天没有完成教学的记录"
                    : p.paused
                      ? "计划尚未开始，或已到设置的考试日期。"
                      : "以到期复习、跨科复述和薄弱规则补讲为主。"}
                </p>
              )}
              {!p.past && !p.paused && (
                <div className="day-meta">
                  <span>
                    <RotateCcw size={13} /> 预计复现 {p.reviewTime} min
                  </span>
                  {p.repairTime > 0 && <span>补讲 {p.repairTime} min</span>}
                  {p.checkpointTime > 0 && (
                    <a href="#/checkup">综合复核 {p.checkpointTime} min</a>
                  )}
                  <span>复述 {p.reflection} min</span>
                  <span>休息 {p.breakTime} min</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

const palacePlaces = [
  {
    title: "门口 · 人去柜空",
    image: "走失的身影与空柜",
    association: "“人不见”和“无财产”同时出现，帮助记住这里是两个条件并列。",
    rule: "债务人下落不明，且无财产可供执行。仅仅联系不上，不当然满足这一例外。",
    question: "债务人失联，但仍有可执行房产，是否只凭失联就排除先诉抗辩权？",
    answer: "不能。该项要求下落不明并且无财产可供执行。",
  },
  {
    title: "桌边 · 受理印章",
    image: "盖在破产文件上的印章",
    association: "记住有法律意义的节点是法院“受理”，而非有人提出破产申请。",
    rule: "人民法院已经受理债务人的破产案件。注意区分申请与受理。",
    question: "债权人刚刚提出破产申请，法院尚未受理，是否已满足这一例外？",
    answer: "尚未满足。该项要求法院已经受理债务人的破产案件。",
  },
  {
    title: "沙发 · 证据与空盘",
    image: "放大镜、证据夹和不足的硬币",
    association: "放大镜代表债权人拿得出证据，空盘代表财产不足或丧失履行能力。",
    rule: "债权人有证据证明债务人的财产不足以履行全部债务，或者丧失履行债务能力。不能只凭猜测。",
    question: "债权人只是担心债务人将来无钱，没有相应证据，是否足够？",
    answer: "不足。此项要求债权人有证据证明法定的财产或履行能力状态。",
  },
  {
    title: "书桌 · 书面放弃",
    image: "钢笔正在签署文件",
    association: "签字文件提醒“保证人”与“书面”这两个限定。",
    rule: "保证人书面表示放弃先诉抗辩权。注意谁放弃、放弃什么，以及书面形式。",
    question: "债权人自行写了一份“保证人放弃抗辩”的声明，是否属于这一例外？",
    answer: "不属于。必须是保证人书面表示放弃先诉抗辩权。",
  },
];
function Palace({ state }) {
  const [index, setIndex] = useState(0),
    [hideScene, setHideScene] = useState(false),
    [hideText, setHideText] = useState(false),
    [mode, setMode] = useState("learn"),
    [order, setOrder] = useState([0, 1, 2, 3]),
    [position, setPosition] = useState(0),
    [revealed, setRevealed] = useState(false),
    [self, setSelf] = useState({});
  const place = palacePlaces[mode === "learn" ? index : order[position]];
  const guarantee = lessons.find(
    (l) => l.subjectId === "civil" && /保证/.test(l.title),
  );
  const current = mode === "learn" ? index : order[position];
  function start(random) {
    setMode("recall");
    setOrder(random ? shuffle([0, 1, 2, 3]) : [0, 1, 2, 3]);
    setPosition(0);
    setRevealed(false);
    setSelf({});
    setHideText(true);
    setHideScene(true);
  }
  return (
    <>
      <PageTitle
        eyebrow="THE MEMORY ROOM / OPTIONAL"
        title="给容易漏掉的条件，一个位置。"
      >
        一般保证 · 先诉抗辩权的四种例外 · 一间固定的虚构书房
      </PageTitle>
      <div className="palace-intro">
        <Sparkles size={23} />
        <p>
          先理解“一般保证先找债务人”的基本结构，再用场景记住例外。图片只辅助回忆，不替代条件判断。不使用宫殿，也不会损失课程进度。
        </p>
        {guarantee && (
          <a className="button secondary" href={`#/course/${guarantee.id}`}>
            先学保证基础 <ArrowRight size={15} />
          </a>
        )}
      </div>
      <div className="palace-toolbar">
        <div className="filter-tabs">
          <button
            className={mode === "learn" ? "active" : ""}
            onClick={() => {
              setMode("learn");
              setHideText(false);
              setHideScene(false);
            }}
          >
            看图理解
          </button>
          <button
            onClick={() => start(false)}
            className={mode === "recall" ? "active" : ""}
          >
            顺路线回忆
          </button>
          <button onClick={() => start(true)}>打乱位置提问</button>
        </div>
        <div className="inline-actions">
          <button
            className="text-button"
            onClick={() => {
              setHideText(!hideText);
              setRevealed(false);
            }}
          >
            {hideText ? <Eye size={16} /> : <EyeOff size={16} />}{" "}
            {hideText ? "显示文字" : "遮住文字"}
          </button>
          <button
            className="text-button"
            onClick={() => setHideScene(!hideScene)}
          >
            {hideScene ? <Eye size={16} /> : <EyeOff size={16} />}{" "}
            {hideScene ? "显示场景" : "隐藏整图"}
          </button>
        </div>
      </div>
      <div className={`palace-scene ${hideScene ? "scene-hidden" : ""}`}>
        {hideScene ? (
          <div>
            <EyeOff size={35} />
            <h3>在脑海里走一遍这间书房。</h3>
            <p>门口 → 桌边 → 沙发 → 书桌</p>
          </div>
        ) : (
          <>
            <img
              src={`${import.meta.env.BASE_URL}memory-room.png`}
              alt="虚构书房：左边门口有离去的虚影和空柜，桌上盖章，沙发上有证据与空盘，右边书桌正在签字。"
            />
            {palacePlaces.map((p, i) => (
              <button
                style={{ left: `${[15, 38, 62, 85][i]}%` }}
                className={current === i ? "active" : ""}
                key={p.title}
                onClick={() => {
                  setIndex(i);
                  setMode("learn");
                  setRevealed(false);
                }}
                aria-label={p.title}
              >
                {i + 1}
              </button>
            ))}
          </>
        )}
      </div>
      <div className="palace-stations">
        {palacePlaces.map((p, i) => (
          <button
            className={current === i ? "active" : ""}
            onClick={() => {
              setIndex(i);
              setMode("learn");
              setRevealed(false);
            }}
            key={p.title}
          >
            <span>{number(i + 1)}</span>
            {p.title}
          </button>
        ))}
      </div>
      <div className="palace-detail">
        <div>
          <span className="eyebrow">
            LOCATION {number(current + 1)}
            {mode === "recall" ? ` · 第 ${position + 1}/4 站` : ""}
          </span>
          <h2>{place.title}</h2>
          {!hideText && (
            <>
              <p className="association">{place.association}</p>
              <div className="palace-rule">
                <strong>完整规则与限定</strong>
                <p>{place.rule}</p>
              </div>
            </>
          )}
        </div>
        <div className="palace-question">
          <span className="eyebrow">闭卷检查 · 改变一个条件</span>
          <h3>{place.question}</h3>
          {revealed ? (
            <>
              <p>{place.answer}</p>
              <div className="inline-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    setSelf((s) => ({ ...s, [current]: "还需复习" }))
                  }
                >
                  还需复习
                </button>
                <button
                  onClick={() =>
                    setSelf((s) => ({ ...s, [current]: "能独立说明" }))
                  }
                >
                  能独立说明
                </button>
              </div>
              {self[current] && (
                <p className="muted small-text">
                  已自评：{self[current]}。这是本轮自评，不计入客观掌握状态。
                </p>
              )}
            </>
          ) : (
            <button className="secondary" onClick={() => setRevealed(true)}>
              我已在心中作答，核对答案 <Eye size={16} />
            </button>
          )}
          {mode === "recall" && (
            <button
              className="text-button"
              onClick={() => {
                if (position < 3) {
                  setPosition(position + 1);
                  setRevealed(false);
                } else {
                  setMode("learn");
                  setHideScene(false);
                  setHideText(false);
                  setRevealed(false);
                }
              }}
            >
              {position < 3 ? "下一站" : "完成路线，返回规则"}{" "}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="source-note">
        <FileText size={16} />
        <div>
          <strong>来源：孟献贵民法背诵卷 · 印刷106页 / PDF119页</strong>
          <p>
            一般保证先诉抗辩权例外；民法典第687条。图像为AI生成的虚构联想场景，完整法律含义以文字和来源为准。
          </p>
        </div>
      </div>
      <details className="method-details">
        <summary>什么时候应该收起这个宫殿？</summary>
        <p>
          如果你已经能直接回答，就收起场景。若记住画面却讲不清条件，回到保证课堂与变式练习。若连续复习仍解码很慢，改用对比表或短问答；宫殿没有强制任务或额外分数。
        </p>
      </details>
    </>
  );
}

function Settings({
  state,
  update,
  notice,
  backup,
  saveBlocked,
  setSaveBlocked,
}) {
  const [draft, setDraft] = useState(structuredClone(state.settings)),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(null),
    [reset, setReset] = useState(false);
  function save(e) {
    e.preventDefault();
    if (draft.examDate && draft.examDate < draft.startDate) {
      setMessage("考试日期不能早于开始日期。");
      return;
    }
    update((s) => ({ ...s, settings: { ...draft, configured: true } }));
    setMessage("设置已保存，未来任务已重新安排。");
    notice("已按新的基础与时间重排。");
  }
  async function readFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 15_000_000) throw new Error("备份超过15MB。");
      const value = reconcileCurriculum(
        lessons,
        decodeState(await file.text()),
      );
      setPending(value);
      setMessage("");
    } catch (err) {
      setMessage(`导入失败：${err.message}`);
    }
    e.target.value = "";
  }
  function rawBackup() {
    const text = localStorage.getItem(STORAGE_KEY) || "";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    a.download = "法习-原始记录-待检查.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <>
      <PageTitle eyebrow="按自己的时间和基础来" title="让计划，适合你的生活。">
        基础是自述，掌握靠验证。设置不会抹掉已有学习记录。
      </PageTitle>
      <form onSubmit={save} className="settings-form">
        <section className="settings-section">
          <div>
            <span className="eyebrow">01 / 时间</span>
            <h2>每天留多少时间？</h2>
            <p>预算含复习、学习、复述和休息。</p>
          </div>
          <div className="form-grid">
            <label>
              开始日期
              <input
                type="date"
                required
                value={draft.startDate}
                onInput={(e) =>
                  setDraft((s) => ({ ...s, startDate: e.target.value }))
                }
              />
            </label>
            <label>
              考试日期（可留空）
              <input
                type="date"
                value={draft.examDate}
                onInput={(e) =>
                  setDraft((s) => ({ ...s, examDate: e.target.value }))
                }
              />
            </label>
            <label>
              工作日
              <select
                value={draft.weekday}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, weekday: Number(e.target.value) }))
                }
              >
                {[120, 150, 180].map((n) => (
                  <option key={n} value={n}>
                    {n} 分钟 / {n / 60} 小时
                  </option>
                ))}
              </select>
            </label>
            <label>
              周末
              <select
                value={draft.weekend}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, weekend: Number(e.target.value) }))
                }
              >
                {[180, 240, 300, 360].map((n) => (
                  <option key={n} value={n}>
                    {n} 分钟 / {n / 60} 小时
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="settings-section">
          <div>
            <span className="eyebrow">02 / 基础</span>
            <h2>逐科设置起点</h2>
            <p>基础薄弱：先讲后练。稍熟或熟悉：可以先诊断具体规则。</p>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  familiarity: {
                    "civil-procedure": 2,
                    administrative: 1,
                    "criminal-procedure": 1,
                  },
                }))
              }
            >
              采用“程序法有基础”配置
            </button>
          </div>
          <div className="familiarity-grid">
            {subjects.map((s) => (
              <label key={s.id}>
                <SubjectMark id={s.id} small />
                <strong>{s.name}</strong>
                <select
                  value={draft.familiarity[s.id] || 0}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      familiarity: {
                        ...d.familiarity,
                        [s.id]: Number(e.target.value),
                      },
                    }))
                  }
                >
                  <option value={0}>从基础讲起</option>
                  <option value={1}>稍微熟悉</option>
                  <option value={2}>比较熟悉</option>
                </select>
              </label>
            ))}
          </div>
        </section>
        <div className="settings-submit">
          <button type="submit">
            保存并重新安排 <Check size={17} />
          </button>
          {message && <p role="status">{message}</p>}
        </div>
      </form>
      <section className="settings-section backup-section">
        <div>
          <span className="eyebrow">03 / 你的记录</span>
          <h2>进度在你手中</h2>
          <p>
            只保存在当前浏览器，没有账户、云同步或分析追踪。换设备前导出，再在新设备导入。
          </p>
        </div>
        <div>
          <div className="inline-actions">
            <button className="secondary" onClick={backup}>
              <Download size={17} /> 导出学习记录
            </button>
            <label className="button secondary file-button">
              <Upload size={17} /> 导入备份
              <input
                type="file"
                accept="application/json,.json"
                onChange={readFile}
              />
            </label>
          </div>
          <p className="muted small-text">
            导入前验证格式与版本。导入会替换当前记录，请先备份。
          </p>
          {saveBlocked && (
            <div className="alert warning">
              <p>自动保存已暂停，原有数据没有被覆盖。</p>
              <button className="secondary" onClick={rawBackup}>
                导出原始记录
              </button>
              <button className="text-button" onClick={() => setReset(true)}>
                备份后重新开始
              </button>
            </div>
          )}
          <button className="text-button danger" onClick={() => setReset(true)}>
            清除当前浏览器的学习记录
          </button>
        </div>
      </section>
      {pending && (
        <Dialog
          title="用这份备份替换当前记录？"
          onClose={() => setPending(null)}
        >
          <p>
            包含 {pending.attempts.length} 次作答、
            {Object.keys(pending.records).length}{" "}
            个规则组。当前记录不会自动合并。
          </p>
          <div className="inline-actions">
            <button className="secondary" onClick={backup}>
              先导出当前记录
            </button>
            <button
              onClick={() => {
                update(pending);
                setDraft(structuredClone(pending.settings));
                setSaveBlocked(false);
                setPending(null);
                notice("备份已导入。");
              }}
            >
              确认替换
            </button>
          </div>
        </Dialog>
      )}
      {reset && (
        <Dialog
          title="清除前，请保留一份备份。"
          onClose={() => setReset(false)}
        >
          <p>
            这会清除本浏览器的设置、课堂位置和作答历史。其他设备的记录不受影响。
          </p>
          <div className="inline-actions">
            <button
              className="secondary"
              onClick={saveBlocked ? rawBackup : backup}
            >
              导出备份
            </button>
            <button
              className="danger-button"
              onClick={() => {
                const value = initialState();
                update(value);
                setDraft(value.settings);
                setSaveBlocked(false);
                setReset(false);
                notice("当前记录已清除。");
              }}
            >
              确认清除
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function Dialog({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Sources() {
  return (
    <>
      <PageTitle
        eyebrow="来源与实际覆盖范围"
        title="每一条规则，都应该找得到来处。"
      >
        把来源、已做的内容和未覆盖的范围一起说明。
      </PageTitle>
      <div className="source-summary">
        <BookOpen size={30} />
        <div>
          <h2>
            {lessons.length} 个核心单元，
            {lessons.reduce((t, l) => t + l.questions.length, 0)} 道课堂练习
          </h2>
          <p>
            另有 {diagnosticPool.length} 道民诉诊断题（部分与课堂题重合），以及{" "}
            {checkpointPool.length}{" "}
            道综合复核保留题。依据2026众合八册背诵卷的所列页面制作。课程含原创解释、虚构案例与变化题；不提供原书扫描、下载或长篇摘录。每课列出印刷页和PDF页。全书1666页未逐页审校，内容也不等同完整考试范围。
          </p>
        </div>
      </div>
      <div className="source-books">
        {subjects.map((s) => (
          <section key={s.id}>
            <SubjectMark id={s.id} />
            <div>
              <h3>
                {s.author} · {s.name}专题讲座背诵卷
              </h3>
              <p>
                {s.pages} PDF页 · 已制作{" "}
                {lessons.filter((l) => l.subjectId === s.id).length} 个单元
              </p>
              <p className="muted">{s.gaps}</p>
              <details>
                <summary>一级学习领域与本次实际引用页</summary>
                <Coverage subjectId={s.id} />
                <p>
                  实际引用PDF页：
                  {[
                    ...new Set(
                      lessons
                        .filter((l) => l.subjectId === s.id)
                        .flatMap((l) => l.source.pdfPages),
                    ),
                  ]
                    .sort((a, b) => a - b)
                    .join("、")}
                </p>
                <p>
                  目录之外没有隐藏的已完成课程；其余范围仍需原书学习。课程页码为来源索引，不表示公开复制这些页。
                </p>
              </details>
            </div>
          </section>
        ))}
      </div>
      <div className="source-essays">
        <section>
          <h2>为什么这样复习</h2>
          <p>
            陌生内容先解释并给示范，再要求独立提取；复习时不先显示答案。结论与理由分开检查，用变化事实测试是否理解适用条件。间隔检索的研究支持将练习分散到不同日期，但没有证据保证本站的1、3、7天间隔对每个人或法考都最优。
          </p>
          <p>
            <a
              href="https://doi.org/10.1126/science.1152408"
              target="_blank"
              rel="noreferrer"
            >
              Karpicke & Roediger（2008）：检索练习研究
            </a>
            <br />
            <a
              href="https://doi.org/10.1111/j.1467-9280.2008.02209.x"
              target="_blank"
              rel="noreferrer"
            >
              Cepeda 等（2008）：间隔与保持研究
            </a>
          </p>
        </section>
        <section>
          <h2>内容与技术边界</h2>
          <p>
            本站是教育用途的核心复习工具，不能作为实际案件的法律意见。未独立完成所有法规截至今日的沿革比对；涉及更新、争议或书内冲突时，不将未解决结论编为确定评分题。具体适用请查现行法律、司法解释及官方说明。个别作者的体系表述仍须结合来源理解。
          </p>
          <p>
            没有实时AI阅卷、后台账号、自动跨设备同步或第三方分析追踪。选择题由预先制作的标准核对，口头复述和宫殿回忆只作自评。学习记录只存在浏览器，清缓存或更换域名可能导致不可访问，应定期导出。
          </p>
          <p>
            记忆宫殿为AI生成的虚构场景。错误反馈与建议可通过{" "}
            <a
              href="https://github.com/Fighterforever/law-study/issues"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Issues
            </a>{" "}
            提交；请勿提供真实案件、个人信息或未公开工作材料。
          </p>
        </section>
      </div>
    </>
  );
}
