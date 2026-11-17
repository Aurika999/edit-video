import { ANIMS } from '../lib/constants';
import { clamp } from '../lib/format';

const TITLES = { image: '🖼️ Sticker', emoji: 'Emoji', text: '🔤 Text' };

export default function Inspector({ overlay: o, time, duration, onUpdate, onRemove, onDuplicate }) {
  if (!o) {
    return (
      <aside className="right">
        <h2>Element selectat</h2>
        <p className="hint">Apasă pe un emoji, sticker sau text din video ca să-l modifici.</p>
      </aside>
    );
  }
  const up = (patch) => onUpdate(o.id, patch);
  const commitNum = (field) => (e) => {
    const v = +e.target.value;
    if (field === 'start') up({ start: clamp(v, 0, o.end - 0.1) });
    else up({ end: clamp(v, o.start + 0.1, duration) });
  };

  return (
    <aside className="right">
      <h2>Element selectat</h2>
      <div className="kind">{TITLES[o.kind]}</div>

      {o.kind === 'text' && (
        <>
          <div className="row"><input type="text" maxLength={60} value={o.text} onChange={(e) => up({ text: e.target.value })} /></div>
          <div className="row">
            <label>Culoare</label><input type="color" value={o.color} onChange={(e) => up({ color: e.target.value })} />
            <label style={{ minWidth: 'auto' }}>Contur</label><input type="color" value={o.stroke} onChange={(e) => up({ stroke: e.target.value })} />
          </div>
        </>
      )}

      <div className="row"><label>Mărime</label>
        <input type="range" min="2" max="100" value={Math.round(o.size * 100)} onChange={(e) => up({ size: e.target.value / 100 })} /></div>
      <div className="row"><label>Rotire</label>
        <input type="range" min="-45" max="45" value={o.rot} onChange={(e) => up({ rot: +e.target.value })} /></div>

      <div className="row"><label>Apare la</label>
        <input type="number" min="0" step="0.1" key={`s-${o.id}-${o.start}`} defaultValue={o.start.toFixed(1)}
          onBlur={commitNum('start')} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
        <button title="Momentul curent din video" onClick={() => up({ start: clamp(time, 0, o.end - 0.1) })}>acum</button></div>
      <div className="row"><label>Dispare la</label>
        <input type="number" min="0" step="0.1" key={`e-${o.id}-${o.end}`} defaultValue={o.end.toFixed(1)}
          onBlur={commitNum('end')} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
        <button title="Momentul curent din video" onClick={() => up({ end: clamp(time, o.start + 0.1, duration) })}>acum</button></div>

      <div className="row"><label>Animație</label>
        <select value={o.anim} onChange={(e) => up({ anim: e.target.value })}>
          {ANIMS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select></div>

      <div className="btns">
        <button onClick={() => up({ start: 0, end: duration })}>↔️ Pe tot clipul</button>
        <button onClick={() => up({ x: 0.5, y: 0.5 })}>🎯 La mijloc</button>
      </div>
      <div className="btns">
        <button onClick={() => onDuplicate(o.id)}>📄 Duplică</button>
        <button onClick={() => onRemove(o.id)}>🗑️ Șterge</button>
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Sfat: <b>Delete</b> șterge elementul, <b>Spațiu</b> pornește/oprește video-ul, săgețile mută timpul (cu Shift câte o secundă).
      </p>
    </aside>
  );
}
