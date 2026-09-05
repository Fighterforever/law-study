import { useRef, useState } from "react";
import { Expand, Eye, EyeOff, Focus, Map } from "lucide-react";
import artwork from "./scene-art.json";
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
  concealLabels = false,
  showNavigation = true,
  interactive = true,
}) {
  const scene = artwork[palace.id];
  const [zoom, setZoom] = useState(false);
  const [markers, setMarkers] = useState(true);
  const map = useRef(null);
  const [x, y] = scene.points[activeIndex];
  const scale = zoom ? 2 : 1;
  const left = zoom ? Math.max(0, Math.min(50, x - 25)) : 0;
  const top = zoom ? Math.max(0, Math.min(50, y - 25)) : 0;
  const chooseByKeyboard = (event, index) => {
    if (
      !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next =
      (index + step + palace.stations.length) % palace.stations.length;
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
          <span className="memory-scene-eyebrow">一处场景 · 一组规则</span>
          <strong>{scene.title}</strong>
        </div>
        <a
          className="memory-scene-original"
          href={imageUrl(scene)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在新标签页查看完整场景图"
        >
          <Expand size={15} /> 查看大图
        </a>
      </div>
      <div
        className="memory-illustration"
        ref={map}
        role="group"
        aria-label={
          concealLabels ? "回忆场景" : `${scene.title}，点击编号选择记忆位置`
        }
      >
        <img
          className="memory-illustration-image"
          src={imageUrl(scene)}
          alt={concealLabels ? "用于提示空间位置的虚构场景" : scene.alt}
          width="1536"
          height="1024"
          decoding="async"
          style={{
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            left: `${-left * scale}%`,
            top: `${-top * scale}%`,
          }}
        />
        {markers &&
          palace.stations.map((station, index) => {
            const [px, py] = scene.points[index];
            const selected = activeIndex === index;
            const label = concealLabels
              ? `第 ${index + 1} 站`
              : `第 ${index + 1} 站：${station.place}`;
            const style = {
              left: `${(px - left) * scale}%`,
              top: `${(py - top) * scale}%`,
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
                onClick={() => onSelect(index)}
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
      </div>
      <div
        className="memory-scene-toolbar"
        role="group"
        aria-label="场景查看方式"
      >
        <button
          type="button"
          aria-pressed={!zoom}
          className={!zoom ? "active" : ""}
          onClick={() => setZoom(false)}
        >
          <Map size={15} /> 总览
        </button>
        <button
          type="button"
          aria-pressed={zoom}
          className={zoom ? "active" : ""}
          onClick={() => setZoom(true)}
        >
          <Focus size={15} /> 近看当前站
        </button>
        <button
          type="button"
          aria-pressed={!markers}
          onClick={() => setMarkers(!markers)}
        >
          {markers ? <EyeOff size={15} /> : <Eye size={15} />}
          {markers ? "隐藏编号看场景" : "显示记忆位置"}
        </button>
      </div>
      <figcaption>
        <div className="memory-scene-caption" aria-live="polite">
          <span className="memory-scene-current">{number(activeIndex)}</span>
          <div>
            <small>
              {concealLabels
                ? "回想这个位置"
                : `先找到${scene.landmarks[activeIndex]}`}
            </small>
            <strong>
              {concealLabels
                ? `回想第 ${activeIndex + 1} 站的物件与规则`
                : palace.stations[activeIndex].place}
            </strong>
          </div>
          <span className="memory-scene-total">
            {activeIndex + 1} / {palace.stations.length}
          </span>
        </div>
        {onRead && (
          <button type="button" className="memory-scene-read" onClick={onRead}>
            查看这一站的条件 ↓
          </button>
        )}
        {!concealLabels && (
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
                onClick={() => onSelect(index)}
              >
                <span>{number(index)}</span>
                {concealLabels ? `第 ${index + 1} 站` : station.place}
              </button>
            ))}
          </nav>
        )}
      </figcaption>
    </figure>
  );
}
