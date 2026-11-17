import { useState } from 'react';
import { EMOJIS } from '../lib/constants';
import MusicPanel from './MusicPanel';

const TABS = [
  ['emoji', '😀 Emoji'],
  ['stickere', '🖼️ Stickere'],
  ['text', '🔤 Text'],
  ['muzica', '🎵 Muzică'],
];

export default function ToolPanel(props) {
  const { library, onAddEmoji, onAddSticker, onAddStickerFiles, onAddText } = props;
  const [tab, setTab] = useState('emoji');
  const [text, setText] = useState('GOOOL! ⚽');

  const submitText = () => { if (text.trim()) onAddText(text.trim()); };

  return (
    <aside className="left">
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'emoji' && (
        <>
          <div className="emojis emoji-font">
            {EMOJIS.map((e) => <button key={e} title={`Adaugă ${e}`} onClick={() => onAddEmoji(e)}>{e}</button>)}
          </div>
          <p className="hint">Mergi la momentul dorit din video, apoi apasă pe un emoji.</p>
        </>
      )}

      {tab === 'stickere' && (
        <>
          <div className="stickers">
            {library.map((st) => (
              <button key={st.src} title={`Adaugă ${st.name}`} onClick={() => onAddSticker(st)}>
                <img src={st.src} alt={st.name} />
              </button>
            ))}
          </div>
          <label className="filebtn">
            ➕ Sticker propriu (PNG)
            <input type="file" accept="image/*" multiple hidden
              onChange={(e) => { onAddStickerFiles([...e.target.files]); e.target.value = ''; }} />
          </label>
        </>
      )}

      {tab === 'text' && (
        <>
          <input type="text" value={text} maxLength={60} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitText()} />
          <div className="btns"><button onClick={submitText}>➕ Adaugă text</button></div>
          <p className="hint">Poți pune și emoji în text, de exemplu „Super șut! 🔥”. Culoarea o alegi din dreapta.</p>
        </>
      )}

      {tab === 'muzica' && <MusicPanel {...props} />}

      <h2>Cum se folosește</h2>
      <p className="hint">
        1. Deschide un video.<br />
        2. Mergi la momentul dorit și adaugă emoji, sticker, text sau muzică.<br />
        3. Trage elementele cu mouse-ul. Colțul galben le mărește, la fel și rotița mouse-ului.<br />
        4. Din dreapta alegi cât timp apar și animația.<br />
        5. Apasă <b>Salvează video</b>.
      </p>
    </aside>
  );
}
