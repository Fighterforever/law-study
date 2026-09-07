import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Footprints,
  Lightbulb,
  MapPinned,
  Shuffle,
  Search,
  Target,
  X,
} from "lucide-react";
import guides from "../../../data/memory-guides.json";
import { subjectById } from "../../../data/subjects.js";
import { focusExamDate } from "../../../lib/focus.js";
import { emptyFocusState } from "../../../lib/focus-state.js";
import {
  memoryKey,
  stationProgress,
  palaceProgress,
  makeMemoryQueue,
  saveMemoryRating,
  memoryStudySuggestion,
} from "../../../lib/memory.js";
import {
  createMemorySession,
  advanceMemorySession,
} from "../../../lib/memory-session.js";
import MemoryScene, { MemoryScenePreview } from "./MemoryScene.jsx";
import CompanyQuest from "./quest/CompanyQuest.jsx";
import InsuranceQuest from "./quest/InsuranceQuest.jsx";
import InsuranceClocks from "./quest/InsuranceClocks.jsx";
import JurisdictionQuest from "./quest/JurisdictionQuest.jsx";
import MemoryDesk, { TaskAction } from "./MemoryDesk.jsx";
import {
  memoryAgenda,
  memoryTasks,
  agendaQuiz,
} from "../../../lib/memory-agenda.js";
import "./memory-palaces.css";

const home = "#/focus/memory";
const path = (palace, station) =>
  `${home}/${palace.id}${station ? `?station=${station.id}` : ""}`;
const setSession = (update, next) =>
  update((s) => ({
    ...s,
    focus: {
      ...(s.focus || emptyFocusState()),
      memorySession:
        typeof next === "function" ? next(s.focus?.memorySession) : next,
    },
  }));
const shortDate = (date) =>
  date ? `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日` : "";

export default function MemoryPalaces({
  data,
  state,
  update,
  today,
  route,
  focusDay,
}) {
  const id = route.split("/")[2]?.split("?")[0];
  const palace = data.palaces.find((p) => p.id === id);
  const examDate = focusExamDate(data, state);
  if (id === "company-case")
    return <CompanyQuest {...{ data, state, update, today }} />;
  if (id === "insurance-case")
    return <InsuranceQuest {...{ state, update, today }} />;
  if (id === "insurance-clocks")
    return <InsuranceClocks {...{ state, update, today }} />;
  if (id === "jurisdiction-case")
    return <JurisdictionQuest {...{ state, update, today }} />;
  if (id && !palace)
    return (
      <div className="mp-empty">
        <h2>从路线目录重新进入</h2>
        <a href={home}>查看全部记忆宫殿 →</a>
      </div>
    );
  if (palace) {
    const wanted = new URLSearchParams(route.split("?")[1]).get("station");
    const index = Math.max(
      0,
      palace.stations.findIndex((s) => s.id === wanted),
    );
    return (
      <PalaceStudy
        key={palace.id}
        explicitStation={Boolean(wanted)}
        {...{ palace, index, data, state, update, today, examDate }}
      />
    );
  }
  return (
    <PalaceCatalog
      key={route}
      {...{ data, state, update, today, examDate, focusDay, route }}
    />
  );
}

function PalaceCatalog({
  data,
  state,
  update,
  today,
  examDate,
  focusDay,
  route,
}) {
  const params = new URLSearchParams(route.split("?")[1]);
  const [subject, setSubject] = useState(params.get("subject") || "all");
  const [paper, setPaper] = useState(params.get("paper") || "all");
  const [query, setQuery] = useState("");
  const subjects = ["all", ...new Set(data.palaces.map((p) => p.subjectId))];
  const cards = data.palaces.map((p) => ({
    p,
    g: guides[p.id],
    progress: palaceProgress(p, state, today, examDate),
  }));
  const agenda = memoryAgenda(state, today, examDate);
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
  const startRecall = (palace, mode = "random", order) => {
    const current = state.focus?.memorySession;
    if (current?.palaceId !== palace.id || current.phase === "summary") {
      setSession(
        update,
        createMemorySession(
          palace.id,
          order || makeMemoryQueue(palace, state, today, examDate, mode),
          mode,
        ),
      );
    }
    window.location.hash = path(palace).slice(1);
  };
  const session = state.focus?.memorySession;
  const suggestion = memoryStudySuggestion(
    data,
    state,
    today,
    examDate,
    focusDay,
  );
  const shortReview = suggestion && {
    href: path(suggestion.palace, suggestion.station),
    title: `${guides[suggestion.palace.id].shortTitle} · ${suggestion.kind === "learn" ? "配合今日考点" : suggestion.kind === "resume" ? "继续回忆" : "闭卷复测"}`,
    reason: suggestion.reason,
    rank: suggestion.rank,
    actionLabel: suggestion.kind === "learn" ? "看这一站" : "开始回忆",
    onStart:
      suggestion.kind === "learn"
        ? null
        : () =>
            startRecall(
              suggestion.palace,
              suggestion.kind === "review" ? "weak" : "random",
              suggestion.order,
            ),
  };
  const visible = cards.filter(({ p, g }) => {
    const units = p.unitIds.map((id) => data.units.find((u) => u.id === id));
    return (
      (subject === "all" || p.subjectId === subject) &&
      (paper === "all" || units.some((u) => u.paperId === paper)) &&
      (!query.trim() ||
        `${p.title} ${g.anchor} ${units.map((u) => u.title).join(" ")} ${p.stations.map((s) => `${s.place} ${s.decode}`).join(" ")}`.includes(
          query.trim(),
        ))
    );
  });
  return (
    <div className="mp-atlas">
      <header className="mp-library-heading">
        <div>
          <h2>记忆宫殿</h2>
          <p>
            先选主题。看图记条件，闭卷检验；容易混淆的地方，再用案情练一遍。
          </p>
        </div>
        <a href="#/focus/plan">
          复习计划 <ArrowRight size={15} />
        </a>
      </header>
      <MemoryDesk
        agenda={agenda}
        shortReview={shortReview}
        onStartQuiz={startQuiz}
      />
      <div className="mp-catalog-heading">
        <h3>
          按主题学习{" "}
          <small>
            {visible.length} / {cards.length} 个主题
          </small>
        </h3>
        <div
          className="mp-subject-filter"
          role="group"
          aria-label="按科目选择记忆路线"
        >
          {subjects.map((s) => (
            <button
              key={s}
              aria-pressed={s === subject}
              className={s === subject ? "active" : ""}
              onClick={() => setSubject(s)}
            >
              {s === "all" ? "全部主题" : subjectById[s].name}
            </button>
          ))}
        </div>
      </div>
      <div className="mp-catalog-tools">
        <label>
          <span>按资料找</span>
          <select
            value={paper}
            onChange={(e) => {
              setPaper(e.target.value);
              setSubject("all");
            }}
            aria-label="按资料筛选记忆场景"
          >
            <option value="all">全部考前聚焦</option>
            {data.papers.map((p) => (
              <option value={p.id} key={p.id}>
                {p.shortTitle || p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="mp-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜考点、规则或场景"
            aria-label="搜索记忆场景"
          />
        </label>
      </div>
      <p className="mp-catalog-help">
        按今日考点找到对应位置即可。先用场景记住区别，再关图复述、换个事实判断，最后回到原考点做客观题。
      </p>
      {!visible.length && (
        <p className="mp-empty">
          没有匹配的主题，试试更短的关键词或切回全部资料。
        </p>
      )}
      <div className="mp-palace-grid">
        {visible.map(({ p, g, progress }, i) => {
          const tasks = agenda.tasks.filter((task) => task.palaceId === p.id);
          const unfinished =
            session?.palaceId === p.id && session.phase !== "summary";
          return (
            <article
              className="mp-palace-card mp-topic-card"
              key={p.id}
              style={{ "--mp-card-delay": `${Math.min(i, 5) * 45}ms` }}
            >
              <a
                className="mp-card-art"
                href={path(p)}
                aria-label={`进入主题：${g.shortTitle}`}
              >
                <MemoryScenePreview palace={p} />
                <span>{subjectById[p.subjectId].name}</span>
              </a>
              <div className="mp-card-body">
                <div className="mp-card-meta">
                  <span>{p.stations.length} 个记忆位置</span>
                  <span>
                    <Clock3 size={13} />约 {g.estimatedMinutes} 分钟
                  </span>
                </div>
                <h4>{g.shortTitle}</h4>
                <p>{g.anchor}</p>
                <div className="mp-topic-actions">
                  <a href={path(p)}>
                    {unfinished ? "继续学习" : "看图记忆"}{" "}
                    <ArrowRight size={15} />
                  </a>
                  <button
                    type="button"
                    onClick={() => startRecall(p)}
                    aria-label={`${unfinished ? "继续" : "开始"}闭卷回忆：${g.shortTitle}`}
                  >
                    <EyeOff size={15} />
                    {unfinished ? "继续回忆" : "闭卷回忆"}
                  </button>
                </div>
                <div className="mp-topic-status">
                  {progress.repair
                    ? `${progress.repair} 处待补全`
                    : progress.due
                      ? `${progress.due} 处今天复测`
                      : progress.practiced
                        ? `已练 ${progress.practiced}/${progress.total} 处`
                        : "尚未开始"}
                </div>
                {tasks.length > 0 && (
                  <div className="mp-topic-cases">
                    <span>案情练习 · 分清易混规则</span>
                    {tasks.map((task) => (
                      <TaskAction
                        key={task.id}
                        task={task}
                        onStartQuiz={startQuiz}
                        className="mp-topic-case"
                      >
                        <div>
                          <strong>{task.short}</strong>
                          <small>
                            {task.status}
                            {task.firstToday !== undefined
                              ? ` · 今日首次 ${task.firstToday}/3`
                              : ""}
                          </small>
                        </div>
                        <ArrowRight size={16} />
                      </TaskAction>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mp-bottom-note">
        看图回忆与案情练习分别记录，进度保存在当前浏览器。
        <a href="#/palace">补充主题：一般保证 →</a>
      </p>
    </div>
  );
}

function PalaceStudy({
  palace: p,
  index: initialIndex,
  data,
  state,
  update,
  today,
  examDate,
  explicitStation,
}) {
  const g = guides[p.id];
  const [index, setIndex] = useState(initialIndex);
  const saved = state.focus?.memorySession;
  const session =
    saved?.palaceId === p.id &&
    saved.order.every((i) => i < p.stations.length) &&
    saved.results.every((r) => p.stations.some((s) => s.id === r.stationId))
      ? saved
      : null;
  const [view, setView] = useState(
    !explicitStation && session && session.phase !== "summary"
      ? "practice"
      : "guide",
  );
  const [walkOpen, setWalkOpen] = useState(false);
  const [guideCovered, setGuideCovered] = useState(false);
  const [message, setMessage] = useState("");
  const progress = palaceProgress(p, state, today, examDate);
  const station = p.stations[index];
  const detail = g.stations[station.id];
  const select = (i, scroll = true) => {
    setIndex(i);
    window.history.replaceState(null, "", path(p, p.stations[i]));
    if (scroll && window.matchMedia("(max-width: 1200px)").matches)
      requestAnimationFrame(() =>
        document
          .getElementById("mp-scene")
          ?.scrollIntoView({ block: "start", behavior: "instant" }),
      );
  };
  const backToGuide = () => {
    if (session && session.phase !== "summary")
      select(session.order[session.index]);
    if (session && !session.transferQuality && view === "practice")
      setSession(update, (old) => ({ ...old, hintLevel: 2 }));
    setView("guide");
  };
  const continueRecall = () => {
    if (!session) return start("random");
    if (view === "guide" && !session.transferQuality)
      setSession(update, (old) => ({ ...old, hintLevel: 2 }));
    setView("practice");
  };
  function start(mode, chosen) {
    const order =
      chosen ||
      makeMemoryQueue(
        p,
        state,
        today,
        examDate,
        mode === "cued" ? "sequence" : mode,
      );
    if (!order.length) {
      setMessage("这条路线本次已闭卷说全。明天再测，或现在试一轮乱序抽问。");
      return;
    }
    setSession(update, createMemorySession(p.id, order, mode));
    setView("practice");
    setMessage("");
    requestAnimationFrame(() =>
      document
        .getElementById("mp-practice")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  }
  return (
    <div className="mp-study">
      <div className="mp-route-nav">
        <a href={home}>
          <ArrowLeft size={16} />
          返回主题目录
        </a>
        <label>
          <span className="mp-sr-only">切换记忆路线</span>
          <select
            aria-label="切换记忆路线"
            value={p.id}
            onChange={(e) => {
              window.location.hash = path(
                data.palaces.find((x) => x.id === e.target.value),
              ).slice(1);
            }}
          >
            {data.palaces.map((x) => (
              <option value={x.id} key={x.id}>
                {guides[x.id].shortTitle}
              </option>
            ))}
          </select>
        </label>
      </div>
      <header className="mp-study-heading">
        <div>
          <span className="mp-kicker">
            {subjectById[p.subjectId].name} · {p.stations.length}站 · 约
            {g.estimatedMinutes}分钟
          </span>
          <h2>{g.shortTitle}</h2>
          {view === "guide" && !guideCovered && <p>{g.anchor}</p>}
        </div>
        <div className="mp-route-count">
          <strong>
            {progress.independent}
            <small>/{progress.total}</small>
          </strong>
          <span>最近闭卷通过</span>
        </div>
      </header>
      <div className="mp-view-switch" role="group" aria-label="路线学习方式">
        <button
          className={view === "guide" ? "active" : ""}
          aria-pressed={view === "guide"}
          onClick={backToGuide}
        >
          <MapPinned size={17} />
          看场景，记条件
        </button>
        <button
          className={view === "practice" ? "active" : ""}
          aria-pressed={view === "practice"}
          onClick={continueRecall}
        >
          <EyeOff size={17} />
          {session
            ? session.phase === "summary"
              ? "查看本轮结果"
              : "继续本轮回忆"
            : "闭卷练习"}
        </button>
      </div>
      {view === "guide" && (
        <div className="mp-picture-recall-toggle">
          <button
            type="button"
            className={guideCovered ? "active" : ""}
            aria-pressed={guideCovered}
            onClick={() => setGuideCovered(!guideCovered)}
          >
            {guideCovered ? <Eye size={16} /> : <EyeOff size={16} />}
            {guideCovered ? "展开讲解" : "遮住讲解，凭图回忆"}
          </button>
          <p>先凭物件回答，再展开核对；此步骤不计掌握进度。</p>
        </div>
      )}
      {view === "guide" &&
        memoryTasks.some((task) => task.palaceId === p.id) && (
          <div className="mp-related-cases">
            <span>本主题案情练习</span>
            {memoryTasks
              .filter((task) => task.palaceId === p.id)
              .map((task) => (
                <a key={task.id} href={task.path}>
                  {task.short} <ArrowRight size={14} />
                </a>
              ))}
          </div>
        )}
      {message && (
        <p className="mp-message" role="status">
          {message}
        </p>
      )}
      {view === "guide" ? (
        <>
          {!guideCovered && (
            <div className="mp-orientation">
              <Footprints size={20} />
              <div>
                <button
                  className="mp-text-button"
                  onClick={() => setWalkOpen(!walkOpen)}
                  aria-expanded={walkOpen}
                >
                  {walkOpen ? "收起路线说明" : "第一次来？先熟悉路线"}
                  <ChevronRight size={15} />
                </button>
                {walkOpen && (
                  <>
                    <p>{g.setting}</p>
                    <p className="mp-walkthrough">{g.walkthrough}</p>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="mp-learning-layout">
            <div className="mp-scene-column" id="mp-scene">
              <MemoryScene
                palace={p}
                anchor={guideCovered ? undefined : detail}
                recall={
                  guideCovered
                    ? {
                        prompt: station.prompt,
                        onReveal: () => setGuideCovered(false),
                      }
                    : undefined
                }
                showNavigation={false}
                activeIndex={index}
                onSelect={(i) => select(i, false)}
                onRead={
                  guideCovered
                    ? undefined
                    : () =>
                        document.getElementById("mp-station")?.scrollIntoView({
                          block: "start",
                          behavior: "instant",
                        })
                }
              />
              <div className="mp-route-ribbon" aria-label="固定行走顺序">
                {p.stations.map((s, i) => {
                  const r = stationProgress(
                    state.focus?.palace[memoryKey(p, s)],
                    today,
                    examDate,
                  );
                  return (
                    <button
                      onClick={() => select(i)}
                      key={s.id}
                      className={`${i === index ? "active" : ""} ${r.status}`}
                      aria-current={i === index ? "step" : undefined}
                      title={guideCovered ? `第 ${i + 1} 站` : s.place}
                    >
                      <b>{i + 1}</b>
                      <span>
                        {guideCovered ? `第 ${i + 1} 站` : g.stations[s.id].cue}
                      </span>
                      {r.status === "ready" && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>
            <section
              className="mp-station-panel"
              id="mp-station"
              key={station.id}
              aria-label={`第${index + 1}站学习`}
            >
              <div className="mp-station-title">
                <span className="mp-station-seal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span>
                    {guideCovered ? "看着物件，把条件说出来" : "把这个位置记牢"}
                  </span>
                  <h3>
                    {guideCovered
                      ? `第 ${index + 1} 站 · 凭图回忆`
                      : station.place}
                  </h3>
                </div>
              </div>
              {!guideCovered && (
                <>
                  <div className="mp-rule">
                    <span className="mp-mini-label">画面对应的法律规则</span>
                    <p>{station.decode}</p>
                  </div>
                  <div className="mp-checklist">
                    <h4>闭卷时必须说出</h4>
                    <ol>
                      {detail.checks.map((c, i) => (
                        <li key={i}>
                          <span>{i + 1}</span>
                          {c}
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
              {!guideCovered && station.unitIds && (
                <details className="mp-station-sources">
                  <summary>
                    本站考点与客观题 · {station.unitIds.length}组
                  </summary>
                  {station.unitIds.map((id) => {
                    const unit = data.units.find((u) => u.id === id);
                    return (
                      <a key={id} href={`#/focus/unit/${id}`}>
                        {unit.title}
                        <small>
                          {unit.overlap.level === "confirmed"
                            ? "与背诵卷重合 · "
                            : ""}
                          PDF 第{unit.pages.join("、")}页 ·{" "}
                          {unit.questions.length}题
                        </small>
                        <ArrowRight size={14} />
                      </a>
                    );
                  })}
                </details>
              )}
              <div className="mp-station-move">
                <button
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => select(index - 1)}
                >
                  <ArrowLeft size={15} />
                  上一站
                </button>
                {index < p.stations.length - 1 ? (
                  <button onClick={() => select(index + 1)}>
                    下一站
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button onClick={() => start("cued")}>
                    关图，沿路回忆
                    <EyeOff size={16} />
                  </button>
                )}
              </div>
              <button
                className="secondary mp-single-practice"
                onClick={() => start("sequence", [index])}
              >
                关图，只测这一站
                <EyeOff size={15} />
              </button>
            </section>
          </div>
          <div className="mp-practice-choices">
            <div>
              <span className="mp-kicker">现在把画面关掉</span>
              <h3>选一种方式，试着自己说出来。</h3>
              <p>先记熟地点，再逐步撤掉提示。</p>
            </div>
            <button onClick={() => start("cued")}>
              <Footprints size={22} />
              <strong>沿路回忆</strong>
              <span>只给地点线索，练完整顺序</span>
            </button>
            <button onClick={() => start("random")}>
              <Shuffle size={22} />
              <strong>闭卷抽问</strong>
              <span>隐藏地点和场景，打乱顺序</span>
            </button>
            <button onClick={() => start("weak")}>
              <Target size={22} />
              <strong>只练薄弱点</strong>
              <span>先补漏项，再测到期位置</span>
            </button>
          </div>
        </>
      ) : session ? (
        <Practice
          {...{ p, g, session, state, update, today, examDate, data }}
          onStart={start}
          onGuide={backToGuide}
        />
      ) : (
        <div className="mp-empty">
          <h3>开始一轮闭卷回忆</h3>
          <button onClick={() => start("random")}>开始抽问</button>
        </div>
      )}
      {view === "guide" && !guideCovered && (
        <details className="mp-linked-units">
          <summary>
            <Target size={18} />
            把记忆用到客观题里<span>{p.unitIds.length}组考点</span>
          </summary>
          {p.unitIds.map((id) => {
            const u = data.units.find((x) => x.id === id);
            return (
              <a
                href={`#/focus/unit/${id}${state.focus?.learned[id] ? "?review" : ""}`}
                key={id}
              >
                <div>
                  <strong>{u.title}</strong>
                  <small>
                    {
                      data.papers.find((paper) => paper.id === u.paperId)
                        .shortTitle
                    }{" "}
                    · PDF 第{u.pages.join("、")}页 · {u.questions.length}
                    道原创客观题 · 新旧资料页码见单元
                  </small>
                </div>
                <ArrowRight size={17} />
              </a>
            );
          })}
        </details>
      )}
    </div>
  );
}

function Practice({
  p,
  g,
  data,
  session: s,
  state,
  update,
  today,
  examDate,
  onStart,
  onGuide,
}) {
  const patch = (next) => setSession(update, (old) => ({ ...old, ...next }));
  const station = p.stations[s.order[s.index]],
    detail = g.stations[station.id];
  const assisted = s.hintLevel > 0;
  const full = s.checks.length === detail.checks.length;
  function grade(quality) {
    if (s.quality) return;
    const result = {
      stationId: station.id,
      quality,
      assisted,
      transferQuality: "",
    };
    setSession(update, (old) => ({
      ...old,
      quality,
      transferOpen: true,
      results: [
        ...old.results.filter((r) => r.stationId !== station.id),
        result,
      ],
    }));
  }
  function gradeTransfer(quality) {
    if (s.transferQuality) return;
    update((old) => {
      const next = saveMemoryRating(
        old,
        p,
        station,
        { quality: quality === "partial" ? "partial" : s.quality, assisted },
        today,
      );
      return {
        ...next,
        focus: {
          ...next.focus,
          memorySession: {
            ...next.focus.memorySession,
            transferQuality: quality,
            results: s.results.map((r) =>
              r.stationId === station.id
                ? { ...r, assisted, transferQuality: quality }
                : r,
            ),
          },
        },
      };
    });
  }
  const next = () => {
    setSession(update, (old) => advanceMemorySession(old));
    requestAnimationFrame(() =>
      document
        .getElementById("mp-practice")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  };
  if (s.phase === "summary") {
    const weak = s.results.filter(
      (r) =>
        r.quality !== "exact" || r.assisted || r.transferQuality !== "exact",
    );
    const independent = s.results.length - weak.length;
    return (
      <section className="mp-round-summary" id="mp-practice">
        <div className="mp-summary-stamp">
          <CheckCircle2 size={35} />
        </div>
        <span className="mp-kicker">本轮已保存</span>
        <h3>
          {independent === s.results.length
            ? "这一轮，条件都说全了。"
            : "找到漏项，下次就练这里。"}
        </h3>
        <div className="mp-summary-counts">
          <div>
            <b>{s.results.length}</b>
            <span>本轮练过</span>
          </div>
          <div>
            <b>{independent}</b>
            <span>闭卷说全</span>
          </div>
          <div>
            <b>{weak.length}</b>
            <span>还需补全或撤提示</span>
          </div>
        </div>
        <p>
          这次表现已经记录。明天再闭卷抽问，检查条件和例外是否还能直接想起。
        </p>
        <ul>
          {s.results.map((r) => (
            <li key={r.stationId}>
              <span>
                {g.stations[r.stationId].cue} ·{" "}
                {p.stations.find((x) => x.id === r.stationId).place}
              </span>
              <b className={weak.includes(r) ? "repair" : "ready"}>
                {!r.transferQuality
                  ? "变式尚未完成"
                  : r.transferQuality === "partial"
                    ? "变式题会混淆"
                    : r.assisted
                      ? "下次撤掉提示"
                      : r.quality === "exact"
                        ? "闭卷说全"
                        : r.quality === "partial"
                          ? "还有漏项"
                          : "重新串联"}
              </b>
            </li>
          ))}
        </ul>
        <div className="mp-summary-actions">
          {weak.length > 0 && (
            <button
              onClick={() =>
                onStart(
                  "weak",
                  weak.map((r) =>
                    p.stations.findIndex((x) => x.id === r.stationId),
                  ),
                )
              }
            >
              <Target size={18} />
              只重练本轮薄弱点
            </button>
          )}
          <button className="secondary" onClick={() => onStart("random")}>
            <Shuffle size={18} />
            再来一轮闭卷抽问
          </button>
          <a href={home}>返回全部路线 →</a>
        </div>
        <div className="mp-station-sources">
          <span>下一步：用客观题检验刚才的规则</span>
          {p.unitIds.map((id) => {
            const u = data.units.find((unit) => unit.id === id);
            return (
              <a href={`#/focus/unit/${id}`} key={id}>
                {u.title}
                <small>
                  {u.questions.length} 道客观题 · 沿用原考点的答题进度
                </small>
                <ArrowRight size={15} />
              </a>
            );
          })}
        </div>
      </section>
    );
  }
  return (
    <section className="mp-practice-room" id="mp-practice">
      <div className="mp-practice-top">
        <span>
          <EyeOff size={17} />
          {s.mode === "cued"
            ? "沿路回忆"
            : s.mode === "weak"
              ? "薄弱点复测"
              : "闭卷抽问"}
        </span>
        <strong>
          第{s.index + 1}
          <small> / {s.order.length}站</small>
        </strong>
        <button className="mp-text-button" onClick={onGuide}>
          先回看路线
        </button>
      </div>
      <div className="mp-practice-meter">
        <i style={{ width: `${(s.index / s.order.length) * 100}%` }} />
      </div>
      <div className="mp-recall-body">
        <span className="mp-mini-label">先口述，也可以写下关键条件</span>
        <h3>{station.prompt}</h3>
        {s.hintLevel > 0 && (
          <div className="mp-cue">
            <MapPinned size={20} />
            <div>
              <strong>{station.place}</strong>
              <span>{s.hintLevel === 1 ? detail.cue : detail.action}</span>
            </div>
          </div>
        )}
        {s.hintLevel === 2 && s.phase === "recall" && (
          <div className="mp-hint-scene">
            <MemoryScene
              palace={p}
              activeIndex={s.order[s.index]}
              onSelect={() => {}}
              concealLabels
              interactive={false}
            />
          </div>
        )}
        <textarea
          aria-label="本次回忆草稿"
          placeholder="主体是谁？条件是什么？有无期间、起算点或例外？"
          value={s.notes}
          onChange={(e) => patch({ notes: e.target.value.slice(0, 10000) })}
          readOnly={s.phase !== "recall"}
        />
        {s.phase === "recall" ? (
          <div className="mp-recall-actions">
            <button
              className="secondary"
              onClick={() => patch({ hintLevel: Math.min(2, s.hintLevel + 1) })}
              disabled={s.hintLevel === 2}
            >
              <Lightbulb size={16} />
              {s.hintLevel === 0
                ? "给我地点线索"
                : s.hintLevel === 1
                  ? "再看动作提示"
                  : "已显示场景提示"}
            </button>
            <button onClick={() => patch({ phase: "check" })}>
              已回答，核对条件
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="mp-check-answer">
            <div className="mp-answer-heading">
              <span className="mp-mini-label">核对参考答案</span>
              <span>
                第{s.order[s.index] + 1}站 · {detail.cue}
              </span>
            </div>
            <p className="mp-full-answer">{station.decode}</p>
            <fieldset>
              <legend>勾选你刚才已经说出的要点</legend>
              {detail.checks.map((c, i) => (
                <label
                  className={s.checks.includes(i) ? "checked" : ""}
                  key={i}
                >
                  <input
                    type="checkbox"
                    checked={s.checks.includes(i)}
                    disabled={Boolean(s.quality)}
                    onChange={(e) =>
                      patch({
                        checks: e.target.checked
                          ? [...s.checks, i]
                          : s.checks.filter((x) => x !== i),
                      })
                    }
                  />
                  <span>{c}</span>
                </label>
              ))}
            </fieldset>
            <p className="mp-grading-note">
              用自己的话表达即可。
              {assisted
                ? "本题用过位置或场景提示，下次再闭卷试一次。"
                : "重点核对适用条件，不要求逐字背诵。"}
            </p>
            {!s.quality ? (
              <div className="mp-grade-actions">
                <button
                  onClick={() =>
                    grade(
                      s.checks.length === 0
                        ? "forgot"
                        : full
                          ? "exact"
                          : "partial",
                    )
                  }
                >
                  {s.checks.length === 0
                    ? "这站没想起，重新记"
                    : full
                      ? "记录：条件说全了"
                      : "记录：还有漏项"}
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="mp-saved" role="status">
                  <CheckCircle2 size={19} />
                  <span>
                    {!s.transferQuality
                      ? "本轮自评已保存，完成下方变式后记录本站结果。"
                      : s.transferQuality === "partial"
                        ? "变式还会混淆，已记入薄弱点。"
                        : s.quality === "exact"
                          ? assisted
                            ? "借助线索说全了，下次撤掉提示。"
                            : "规则和变式都说全了，本次闭卷结果已保存。"
                          : s.quality === "partial"
                            ? "规则仍有漏项，已记入薄弱点。"
                            : "已加入薄弱点，回到场景重新串起来。"}
                  </span>
                </div>
                <div className="mp-trap">
                  <Lightbulb size={18} />
                  <p>
                    <strong>记住这个区别</strong>
                    {detail.trap}
                  </p>
                </div>
                <div className="mp-transfer">
                  <button
                    className="mp-transfer-toggle"
                    aria-expanded={s.transferOpen}
                    onClick={() => patch({ transferOpen: !s.transferOpen })}
                  >
                    <Shuffle size={17} />
                    <strong>换个问法，再判断一次</strong>
                    <ChevronRight size={16} />
                  </button>
                  {s.transferOpen && (
                    <div>
                      <h4>{detail.transfer.prompt}</h4>
                      {!s.transferRevealed ? (
                        <button
                          className="secondary"
                          onClick={() => patch({ transferRevealed: true })}
                        >
                          我已判断，查看解析
                          <Eye size={15} />
                        </button>
                      ) : (
                        <>
                          <p>{detail.transfer.answer}</p>
                          <div className="mp-transfer-grades">
                            <button
                              className="secondary"
                              disabled={Boolean(s.transferQuality)}
                              onClick={() => gradeTransfer("partial")}
                            >
                              这题仍会混淆
                            </button>
                            <button
                              disabled={Boolean(s.transferQuality)}
                              onClick={() => gradeTransfer("exact")}
                            >
                              能独立说明理由
                            </button>
                          </div>
                          {s.transferQuality && (
                            <p className="mp-grading-note">
                              {s.transferQuality === "partial"
                                ? "这个位置已回到薄弱点，下次连同适用条件再练。"
                                : "变式判断已记录。"}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mp-next-action">
                  <span>
                    {s.transferQuality
                      ? "本轮进度已保存，可以继续下一站。"
                      : "完成上方变式判断，再进入下一站。"}
                  </span>
                  <button onClick={next} disabled={!s.transferQuality}>
                    {s.index + 1 < s.order.length ? "下一站" : "查看本轮结果"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
