import { useRef, useState } from "react";
import {
  Expand,
  Eye,
  EyeOff,
  Focus,
  Map,
  ArrowLeftRight,
  MapPin,
} from "lucide-react";
import artwork from "./scene-art.json";
import closeups from "./station-art.json";
import { MemoryCloseup, MemoryComparison } from "./MemoryCloseup.jsx";
import "./memory-scene.css";

const imageUrl = (scene) =>
  `${import.meta.env.BASE_URL}memory-scenes/${scene.file}`;
const number = (index) => String(index + 1).padStart(2, "0");

export function MemoryScenePreview({ palace }) {
  const scene = artwork[palace.id];
  return (
    <img
      className="memory-scene-preview"
      src={imageUrl(scene)}
      alt=""
      width="1536"
      height="1024"
      loading="lazy"
      decoding="async"
    />
  );
}

export default function MemoryScene({
  palace,
  activeIndex,
  onSelect,
  onRead,
  anchor,
  recall,
  concealLabels = false,
  showNavigation = true,
  interactive = true,
}) {
  const scene = artwork[palace.id];
  const atlas = closeups[palace.id];
  const stationId = palace.stations[activeIndex].id;
  const shot = atlas.stations[stationId];
  const [view, setView] = useState({ mode: "station", stationId });
  if (view.stationId !== stationId) {
    setView({ mode: "station", stationId });
  }
  const overview = view.mode === "overview" && view.stationId === stationId;
  const [markers, setMarkers] = useState(true);
  const map = useRef(null);
  const hideLabels = concealLabels || !interactive || Boolean(recall);
  const comparison =
    view.mode === "compare" &&
    view.stationId === stationId &&
    !hideLabels &&
    !recall &&
    atlas.contrast.stationId === stationId;
  const showAnchor = Boolean(anchor) && !hideLabels && !comparison;
  const [x, y] = scene.points[activeIndex];
  const selectStation = (index) => {
    setView({ mode: "station", stationId: palace.stations[index].id });
    onSelect(index);
  };
  const chooseByKeyboard = (event, index) => {
    if (
      !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next =
      (index + step + palace.stations.length) % palace.stations.length;
    setView({ mode: "overview", stationId: palace.stations[next].id });
    onSelect(next);
    requestAnimationFrame(() =>
      map.current
        ?.querySelector(`[data-station-index="${next}"]`)
        ?.focus({ preventScroll: true }),
    );
  };

  return (
    <figure className="memory-scene" style={{ "--scene-accent": scene.accent }}>
      <div className="memory-scene-heading">
        <div>
          <span className="memory-scene-eyebrow">
            {overview
              ? "总览定位"
              : comparison
                ? "同一站位 · 比较条件"
                : "走到这一站"}
          </span>
          <strong>
            {hideLabels
              ? "回想这一处场景"
              : overview
                ? scene.title
                : shot.object}
          </strong>
        </div>
        {overview && (
          <a
            className="memory-scene-original"
            href={imageUrl(scene)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在新标签页查看完整场景图"
          >
            <Expand size={15} /> 查看大图
          </a>
        )}
      </div>
      <div
        className="memory-scene-toolbar"
        role="group"
        aria-label="场景查看方式"
      >
        <button
          type="button"
          aria-pressed={!overview && !comparison}
          className={!overview && !comparison ? "active" : ""}
          onClick={() => {
            setView({ mode: "station", stationId });
          }}
        >
          <Focus size={15} />
          单站近景
        </button>
        <button
          type="button"
          aria-pressed={overview}
          className={overview ? "active" : ""}
          onClick={() => {
            setView({ mode: "overview", stationId });
          }}
        >
          <Map size={15} />
          总览定位
        </button>
        {!hideLabels && !recall && (
          <button
            type="button"
            aria-pressed={comparison}
            className={comparison ? "active" : ""}
            onClick={() => {
              setView({ mode: "compare", stationId: atlas.contrast.stationId });
              onSelect(
                palace.stations.findIndex(
                  (s) => s.id === atlas.contrast.stationId,
                ),
              );
            }}
          >
            <ArrowLeftRight size={15} />
            {atlas.contrast.stationId === stationId
              ? "易混对照"
              : `第 ${palace.stations.findIndex((s) => s.id === atlas.contrast.stationId) + 1} 站易混对照`}
          </button>
        )}
        {overview && (
          <button
            type="button"
            aria-pressed={!markers}
            onClick={() => setMarkers(!markers)}
          >
            {markers ? <EyeOff size={15} /> : <Eye size={15} />}
            {markers ? "隐藏标记" : "显示位置"}
          </button>
        )}
      </div>
      {comparison ? (
        <MemoryComparison atlas={atlas} key={palace.id} />
      ) : overview ? (
        <div
          className={`memory-illustration${hideLabels ? "" : " memory-illustration--study"}`}
          ref={map}
          role="group"
          aria-label={
            hideLabels ? "回忆场景" : `${scene.title}，点击编号选择记忆位置`
          }
        >
          <img
            className="memory-illustration-image"
            src={imageUrl(scene)}
            alt={hideLabels ? "用于提示空间位置的虚构场景" : scene.alt}
            width="1536"
            height="1024"
            decoding="async"
          />
          {markers &&
            palace.stations.map((station, index) => {
              const [px, py] = scene.points[index];
              const selected = activeIndex === index;
              const label = hideLabels
                ? `第 ${index + 1} 站`
                : `第 ${index + 1} 站：${station.place}`;
              const style = {
                left: `${px}%`,
                top: `${py}%`,
              };
              return interactive ? (
                <button
                  key={station.id}
                  type="button"
                  className={`memory-map-marker ${selected ? "active" : ""}`}
                  style={style}
                  aria-label={label}
                  title={label}
                  aria-pressed={selected}
                  tabIndex={selected ? 0 : -1}
                  data-station-index={index}
                  onClick={() => selectStation(index)}
                  onKeyDown={(e) => chooseByKeyboard(e, index)}
                >
                  {number(index)}
                </button>
              ) : (
                <span
                  key={station.id}
                  style={style}
                  className={`memory-map-marker memory-map-static ${selected ? "active" : ""}`}
                  aria-hidden="true"
                >
                  {number(index)}
                </span>
              );
            })}
          {markers && !hideLabels && (
            <div
              className={`memory-object-label ${y >= 50 ? "memory-object-label--above" : "memory-object-label--below"}`}
              style={{ "--object-x": `${x}%`, top: `${y}%` }}
              aria-hidden="true"
            >
              <span>看这里</span>
              <strong>{scene.landmarks[activeIndex]}</strong>
            </div>
          )}
        </div>
      ) : (
        <MemoryCloseup
          atlas={atlas}
          frame={shot.frame}
          alt={
            hideLabels
              ? "当前站的场景提示"
              : `${shot.object}。${shot.viewpoint}`
          }
        />
      )}
      {!hideLabels && !overview && !comparison && (
        <p className="memory-camera-position">
          <MapPin size={14} />
          {shot.viewpoint}
        </p>
      )}
      <figcaption>
        <div className="memory-scene-caption" aria-live="polite">
          <span className="memory-scene-current">{number(activeIndex)}</span>
          <div>
            <small>{hideLabels ? "回想这个位置" : "在原路线中的位置"}</small>
            <strong>
              {hideLabels
                ? `回想第 ${activeIndex + 1} 站的物件与规则`
                : palace.stations[activeIndex].place}
            </strong>
          </div>
          <span className="memory-scene-total">
            {activeIndex + 1} / {palace.stations.length}
          </span>
        </div>
        {showAnchor && (
          <div className="memory-anchor" aria-label="这一站怎样帮助记忆">
            <div className="memory-anchor-action">
              <span className="memory-anchor-label">在脑海中做这个动作</span>
              <p>{anchor.action}</p>
            </div>
            <div className="memory-anchor-distinction">
              <span className="memory-anchor-label">做题抓住这个区别</span>
              <p>{anchor.trap}</p>
            </div>
          </div>
        )}
        {recall && interactive && (
          <div className="memory-picture-recall">
            <span className="memory-anchor-label">
              凭这个物件，回答下面的问题
            </span>
            <p>{recall.prompt}</p>
            <button type="button" onClick={recall.onReveal}>
              <Eye size={16} /> 我已说完，核对条件
            </button>
          </div>
        )}
        {onRead && !hideLabels && !comparison && (
          <button type="button" className="memory-scene-read" onClick={onRead}>
            查看这一站的条件 ↓
          </button>
        )}
        {!hideLabels && !showAnchor && !recall && !comparison && (
          <p className="memory-scene-instruction">
            先认物件，再说条件。沿编号走一遍，随后切换到「闭卷练习」。
          </p>
        )}
        {showNavigation && interactive && (
          <nav className="memory-scene-stops" aria-label="选择记忆位置">
            {palace.stations.map((station, index) => (
              <button
                key={station.id}
                type="button"
                className={index === activeIndex ? "active" : ""}
                aria-pressed={index === activeIndex}
                onClick={() => selectStation(index)}
              >
                <span>{number(index)}</span>
                {hideLabels ? `第 ${index + 1} 站` : station.place}
              </button>
            ))}
          </nav>
        )}
      </figcaption>
    </figure>
  );
}
