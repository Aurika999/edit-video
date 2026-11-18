import { useState } from 'react';
import { clamp, fmt } from '../lib/format';
import { MIN_PIECE, emptyEdit } from '../lib/cuts';

// Un camp de timp (secunde) cu butonul "acum" care pune momentul curent din video.
function TimeField({ label, value, onChange, time }) {
  return (
    <div className="row">
      <label>{label}</label>
      <input type="number" min="0" step="0.1" key={`${label}-${value}`} defaultValue={value.toFixed(1)}
        onBlur={(e) => onChange(+e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
      <button title="Momentul curent din video" onClick={() => onChange(time)}>acum</button>
    </div>
  );
}

export default function CutPanel({ hasVideo, edit, duration, finalDuration, time, onEditChange, onSeek }) {
  const [piece, setPiece] = useState({ a: 0, b: 0 });

  if (!hasVideo || !edit) {
    return <p className="hint">Deschide întâi un video, apoi poți tăia din el.</p>;
  }

  const set = (patch) => onEditChange({ ...edit, ...patch });
  const setStart = (v) => set({ start: clamp(v, 0, edit.end - MIN_PIECE) });
  const setEnd = (v) => set({ end: clamp(v, edit.start + MIN_PIECE, duration) });

  const cutPiece = () => {
    const a = Math.min(piece.a, piece.b), b = Math.max(piece.a, piece.b);
    if (b - a < MIN_PIECE) { alert('Alege „De la” și „Până la” diferite (bucata trebuie să aibă măcar 0,2 secunde).'); return; }
    set({ cuts: [...edit.cuts, { a, b }].sort((x, y) => x.a - y.a) });
    setPiece({ a: b, b });
  };
  const removeCut = (i) => set({ cuts: edit.cuts.filter((_, k) => k !== i) });

  const changed = edit.start > 0 || edit.end < duration || edit.cuts.length > 0;

  return (
    <div className="cut">
      <p className="hint">
        Mută bara de timp la locul dorit (sau apasă Play și Pauză), apoi apasă <b>acum</b>.
        Video-ul tău original nu se strică: bucățile tăiate doar nu mai apar în clipul salvat.
      </p>

      <h2>Păstrează clipul</h2>
      <TimeField label="De la" value={edit.start} onChange={setStart} time={time} />
      <TimeField label="Până la" value={edit.end} onChange={setEnd} time={time} />

      <h2>Scoate o bucată din mijloc</h2>
      <TimeField label="De la" value={piece.a} onChange={(v) => setPiece((p) => ({ ...p, a: clamp(v, 0, duration) }))} time={time} />
      <TimeField label="Până la" value={piece.b} onChange={(v) => setPiece((p) => ({ ...p, b: clamp(v, 0, duration) }))} time={time} />
      <div className="btns"><button className="primary-soft" onClick={cutPiece}>✂️ Taie bucata</button></div>

      {edit.cuts.length > 0 && (
        <ul className="cuts">
          {edit.cuts.map((c, i) => (
            <li key={`${c.a}-${c.b}`}>
              <span>✂️ {fmt(c.a)} – {fmt(c.b)}</span>
              <button title="Du-te la bucata asta" onClick={() => onSeek(Math.max(0, c.a - 1))}>👀</button>
              <button onClick={() => removeCut(i)}>↩️ Pune înapoi</button>
            </li>
          ))}
        </ul>
      )}

      <p className="final-dur">Clipul salvat va avea <b>{fmt(finalDuration)}</b> (din {fmt(duration)}).</p>
      {changed && (
        <div className="btns"><button onClick={() => { onEditChange(emptyEdit(duration)); setPiece({ a: 0, b: 0 }); }}>↩️ Anulează toate tăieturile</button></div>
      )}
    </div>
  );
}
