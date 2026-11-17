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
