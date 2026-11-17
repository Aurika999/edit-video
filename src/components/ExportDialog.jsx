export default function ExportDialog({ progress, onCancel }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="overlay-msg">
      <div className="box">
        <h3>Se salvează video-ul…</h3>
        <p className="hint">
          Video-ul rulează o dată de la început până la sfârșit, deci durează cât clipul.<br />
          <b>Nu schimba fereastra și nu minimiza</b> până se termină.
        </p>
        <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        <div className="hint">{pct}%</div>
        <div className="btns"><button onClick={onCancel}>Anulează</button></div>
      </div>
    </div>
  );
}

/** Dupa salvare: butoane de descarcare si (pe telefon) de trimitere / salvare in Galerie. */
export function DoneDialog({ result, canShare, onShare, onClose }) {
  const mb = (result.size / 1048576).toFixed(1);
  return (
    <div className="overlay-msg">
      <div className="box">
        <h3>✅ Video-ul e gata!</h3>
        <p className="hint">{result.name} ({mb} MB)</p>
        <div className="btns col">
          <a className="button primary" href={result.url} download={result.name}>⬇️ Descarcă</a>
          {canShare && <button onClick={onShare}>📤 Salvează în Galerie / Trimite</button>}
          <button onClick={onClose}>Închide</button>
        </div>
        {canShare && (
          <p className="hint">
            Pe iPhone: apasă „Salvează în Galerie / Trimite”, apoi alege <b>Salvează video</b>.<br />
            Pe Android: „Descarcă” îl pune în Descărcări; de acolo apare și în Galerie.
          </p>
        )}
      </div>
    </div>
  );
}
