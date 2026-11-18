import { fmt } from '../lib/format';

const label = (o) => (o.kind === 'image' ? `🖼️ ${o.name}` : o.text);

export default function Timeline({ hasVideo, playing, time, duration, overlays, selectedId, music, removed = [], finalDuration, onTogglePlay, onSeek, onSelect }) {
  const pct = (v) => `${Math.max(0, Math.min(100, (v / duration) * 100))}%`;
  let musicEnd = duration;
  if (music && !music.loop) musicEnd = Math.min(duration, music.at + (music.duration - music.from));

  return (
    <div className="controls">
      <div className="ctrlrow">
        <button disabled={!hasVideo} onClick={onTogglePlay}>{playing ? '⏸️ Pauză' : '▶️ Play'}</button>
        <span className="time">
          {fmt(time)} / {fmt(hasVideo ? duration : 0)}
          {hasVideo && removed.length > 0 && <><br /><small>✂️ final {fmt(finalDuration)}</small></>}
        </span>
        <div className="seek">
          <input type="range" min="0" max={duration} step="0.01" value={Math.min(time, duration)} disabled={!hasVideo}
            onChange={(e) => onSeek(+e.target.value)} />
          {/* bucatile taiate, hasurate peste bara de timp */}
          {hasVideo && removed.map(([a, b]) => (
            <i key={a} className="cutmark" style={{ left: pct(a), width: pct(b - a) }} />
          ))}
        </div>
      </div>
      <div className="tracks">
        <div className="playhead" style={{ left: pct(time) }} />
        {music && (
          <div className="bar">
            <span className="music" style={{ left: pct(music.at), width: pct(musicEnd - music.at) }} title={music.name}>
              🎵 {music.name}
            </span>
          </div>
        )}
        {overlays.map((o) => (
          <div className="bar" key={o.id}>
            <span
              className={o.id === selectedId ? 'sel' : ''}
              style={{ left: pct(o.start), width: pct(o.end - o.start) }}
              title={`${label(o)}  ${fmt(o.start)} – ${fmt(o.end)}`}
              onClick={() => onSelect(o)}
            >
              {label(o)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
