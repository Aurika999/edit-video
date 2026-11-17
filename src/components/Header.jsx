import { useRef } from 'react';

export default function Header({ canExport, lastExport, onOpenVideo, onExport }) {
  const fileRef = useRef(null);
  return (
    <header>
      <h1>⚽ EDITOR NAVZAR</h1>
      <button onClick={() => fileRef.current.click()}>📂 Deschide video</button>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => { if (e.target.files[0]) onOpenVideo(e.target.files[0]); e.target.value = ''; }}
      />
      <div className="sp" />
      {lastExport && (
        <span className="hint">
          Salvat: <a className="dl" href={lastExport.url} download={lastExport.name}>{lastExport.name}</a>{' '}
          ({(lastExport.size / 1048576).toFixed(1)} MB)
        </span>
      )}
      <button className="primary" disabled={!canExport} onClick={onExport}>💾 Salvează video</button>
    </header>
  );
}
