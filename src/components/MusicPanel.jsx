import { useState } from 'react';
import { fmt, clamp } from '../lib/format';
import OnlineMusic from './OnlineMusic';

export default function MusicPanel({ music, videoVolume, time, duration, onLoadMusic, onRemoveMusic, onMusicChange, onVideoVolume }) {
  const [browsing, setBrowsing] = useState(false);
  const [copied, setCopied] = useState(false);
  const online = (
    <>
      <h2>Muzică gratuită online</h2>
      <OnlineMusic onPick={(file, credit) => { onLoadMusic(file, credit); setBrowsing(false); }} />
    </>
  );
  const copyCredit = () => {
    navigator.clipboard.writeText(music.credit).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  const picker = (label) => (
    <label className="filebtn">
      {label}
      <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" hidden
        onChange={(e) => { if (e.target.files[0]) onLoadMusic(e.target.files[0]); e.target.value = ''; }} />
    </label>
  );

  return (
    <div className="music">
      {!music ? (
        <>
          {picker('🎵 Alege muzică de pe calculator')}
          {online}
          <p className="hint">
            Melodiile de aici sunt gratuite și se pot folosi pe YouTube. La unele trebuie să scrii autorul
            în descrierea clipului (îți arăt textul după ce alegi).
          </p>
        </>
      ) : (
        <>
          <div className="music-name" title={music.name}>🎵 {music.name}</div>
          <div className="hint">Durata melodiei: {fmt(music.duration)}</div>
          {music.credit && (
            <div className="credit">
              <p className="hint">📝 Copiază acest text în <b>descrierea clipului</b> de pe YouTube:</p>
              <textarea readOnly rows={3} value={music.credit} onFocus={(e) => e.target.select()} />
              <button onClick={copyCredit}>{copied ? '✅ Copiat' : '📋 Copiază'}</button>
            </div>
          )}

          <div className="row">
            <label>Pornește la</label>
            <input type="number" min="0" max={duration.toFixed(1)} step="0.1" key={`at-${music.at}`}
              defaultValue={music.at.toFixed(1)}
              onBlur={(e) => onMusicChange({ at: clamp(+e.target.value, 0, duration) })}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
            <button title="Momentul curent din video" onClick={() => onMusicChange({ at: time })}>acum</button>
          </div>
          <div className="row">
            <label>Din melodie</label>
            <input type="number" min="0" max={music.duration.toFixed(1)} step="0.5" key={`from-${music.from}`}
              defaultValue={music.from.toFixed(1)}
              onBlur={(e) => onMusicChange({ from: clamp(+e.target.value, 0, Math.max(0, music.duration - 1)) })}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
          </div>
          <p className="hint" style={{ marginTop: -4 }}>„Din melodie”: sari peste începutul melodiei, de exemplu 30 ca să înceapă de la refren.</p>

          <div className="row">
            <label>Volum muzică</label>
            <input type="range" min="0" max="100" value={Math.round(music.volume * 100)}
              onChange={(e) => onMusicChange({ volume: e.target.value / 100 })} />
          </div>

          <label className="check"><input type="checkbox" checked={music.loop} onChange={(e) => onMusicChange({ loop: e.target.checked })} /> Repetă melodia dacă e mai scurtă</label>
          <label className="check"><input type="checkbox" checked={music.fadeIn} onChange={(e) => onMusicChange({ fadeIn: e.target.checked })} /> Pornește încet</label>
          <label className="check"><input type="checkbox" checked={music.fadeOut} onChange={(e) => onMusicChange({ fadeOut: e.target.checked })} /> Se stinge la final</label>

          <div className="btns">
            {picker('🔁 De pe calculator')}
            <button onClick={() => setBrowsing((b) => !b)}>{browsing ? '✖ Închide' : '🌐 Caută online'}</button>
            <button onClick={onRemoveMusic}>🗑️ Elimină</button>
          </div>
          {browsing && online}
        </>
      )}

      <h2>Sunetul din video</h2>
      <div className="row">
        <label>Volum video</label>
        <input type="range" min="0" max="100" value={Math.round(videoVolume * 100)}
          onChange={(e) => onVideoVolume(e.target.value / 100)} />
      </div>
      <p className="hint">Pune 0 dacă vrei să se audă doar muzica.</p>
    </div>
  );
}
