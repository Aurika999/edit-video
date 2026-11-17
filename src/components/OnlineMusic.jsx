import { useEffect, useRef, useState } from 'react';
import { fmt } from '../lib/format';

// Cauta muzica gratuita (licente Creative Commons) prin Openverse:
// melodii de pe Jamendo, Freesound si Wikimedia, fara cont si fara cheie.
// Doar licente care permit folosirea in clipuri monetizate si modificarea.
const API = 'https://api.openverse.org/v1/audio/';
const SUGGESTIONS = ['energetic', 'sport', 'rock', 'epic', 'happy', 'electronic', 'hip hop'];
const LICENSE_NAMES = { cc0: 'CC0 (liber)', pdm: 'Domeniu public', by: 'CC BY', 'by-sa': 'CC BY-SA' };

function needsCredit(license) {
  return license !== 'cc0' && license !== 'pdm';
}

export default function OnlineMusic({ onPick }) {
  const [query, setQuery] = useState('energetic');
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('');
  const [playing, setPlaying] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const preview = useRef(null);

  if (!preview.current) preview.current = new Audio();
  useEffect(() => {
    const a = preview.current;
    a.onended = () => setPlaying(null);
    return () => { a.pause(); a.removeAttribute('src'); };
  }, []);

  const search = async (q = query, p = 1) => {
    if (!q.trim()) return;
    setStatus('Caut…');
    const params = new URLSearchParams({
      q: q.trim(), page: p, page_size: 12, category: 'music',
      license_type: 'commercial,modification', mature: 'false',
    });
    try {
      const res = await fetch(`${API}?${params}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const items = data.results.filter((r) => r.url && (r.duration || 0) >= 20000);
      setResults((prev) => (p === 1 ? items : [...(prev || []), ...items]));
      setPage(p);
      setHasMore(p < data.page_count);
      setStatus(p === 1 && !items.length ? 'Nu am găsit nimic. Încearcă alt cuvânt (în engleză).' : '');
    } catch {
      setStatus('Nu mă pot conecta. Verifică internetul și încearcă din nou.');
    }
  };

  const togglePreview = (r) => {
    const a = preview.current;
    if (playing === r.id) { a.pause(); setPlaying(null); return; }
    a.src = r.url;
    a.play().then(() => setPlaying(r.id)).catch(() => setStatus('Nu pot asculta această melodie. Alege alta.'));
  };

  const pick = async (r) => {
    setLoadingId(r.id);
    preview.current.pause();
    setPlaying(null);
    try {
      const res = await fetch(r.url);
      if (!res.ok) throw new Error(res.status);
      const blob = await res.blob();
      const name = `${r.title} – ${r.creator || 'necunoscut'}.mp3`;
      const file = new File([blob], name, { type: blob.type || 'audio/mpeg' });
      const credit = needsCredit(r.license)
        ? `Muzică: „${r.title}” de ${r.creator || 'necunoscut'} (${(LICENSE_NAMES[r.license] || r.license.toUpperCase())} ${r.license_version || ''}) ${r.foreign_landing_url || ''}`.replace(/\s+/g, ' ').trim()
        : null;
      onPick(file, credit);
    } catch {
      setStatus('Nu am putut descărca melodia. Încearcă alta.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="online">
      <div className="row">
        <input type="text" value={query} placeholder="ex: energetic, rock…" onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button onClick={() => search()}>🔍</button>
      </div>
      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => { setQuery(s); search(s); }}>{s}</button>
        ))}
      </div>
      {status && <p className="hint">{status}</p>}
      {results && results.length > 0 && (
        <ul className="tracks">
          {results.map((r) => (
            <li key={r.id}>
              <button className="play" title={playing === r.id ? 'Oprește' : 'Ascultă'} onClick={() => togglePreview(r)}>
                {playing === r.id ? '⏸' : '▶'}
              </button>
              <div className="info">
                <div className="t" title={r.title}>{r.title}</div>
                <div className="hint">{r.creator} · {fmt(r.duration / 1000)} · {LICENSE_NAMES[r.license] || r.license}</div>
              </div>
              <button className="use" disabled={loadingId !== null} onClick={() => pick(r)}>
                {loadingId === r.id ? '…' : 'Folosește'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasMore && <div className="btns"><button onClick={() => search(query, page + 1)}>Mai multe</button></div>}
    </div>
  );
}
