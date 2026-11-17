import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import ToolPanel from './components/ToolPanel';
import Stage from './components/Stage';
import Timeline from './components/Timeline';
import Inspector from './components/Inspector';
import ExportDialog from './components/ExportDialog';
import { BUILTIN_STICKERS } from './lib/stickers';
import { AudioEngine, syncMusic } from './lib/audio';
import { loadImage, renderFrame } from './lib/render';
import { downloadBlob, exportVideo } from './lib/exportVideo';
import { isAudioFile, isImageFile, isVideoFile } from './lib/format';
import { MAX_SIZE } from './lib/constants';
import './App.css';

let nextId = 1;

export default function App() {
  // Elementele video/audio nu apar in pagina; video-ul se vede doar prin canvas.
  const [video] = useState(() => Object.assign(document.createElement('video'), { playsInline: true, preload: 'auto' }));
  const [musicEl] = useState(() => Object.assign(document.createElement('audio'), { preload: 'auto' }));
  const engine = useMemo(() => new AudioEngine(video, musicEl), [video, musicEl]);
  const canvasRef = useRef(null);

  const [videoInfo, setVideoInfo] = useState(null); // { name, W, H, duration }
  const [overlays, setOverlays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [library, setLibrary] = useState(BUILTIN_STICKERS);
  const [music, setMusic] = useState(null); // { name, duration, at, from, volume, loop, fadeIn, fadeOut }
  const [videoVolume, setVideoVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(null); // { progress, control }
  const [lastExport, setLastExport] = useState(null);

  const duration = videoInfo?.duration || 10;
  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  // Bucla de desenare citeste mereu starea cea mai noua din acest ref.
  const live = useRef({});
  live.current = { overlays, selectedId, music, videoInfo, exporting: !!exporting };

  useEffect(() => {
    let raf, lastT = -1;
    const loop = () => {
      const c = canvasRef.current, L = live.current;
      if (c && L.videoInfo) {
        const t = video.currentTime;
        const sel = L.exporting ? null : L.overlays.find((o) => o.id === L.selectedId);
        renderFrame(c.getContext('2d'), { video, overlays: L.overlays, selected: sel, W: c.width, H: c.height, t, animate: !video.paused || L.exporting });
        syncMusic(engine, musicEl, L.music, t, !video.paused && !video.ended, L.videoInfo.duration);
        if (Math.abs(t - lastT) > 0.03) { lastT = t; setTime(t); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [video, musicEl, engine]);

  useEffect(() => {
    const on = () => setPlaying(!video.paused && !video.ended);
    const evs = ['play', 'pause', 'ended'];
    evs.forEach((e) => video.addEventListener(e, on));
    return () => evs.forEach((e) => video.removeEventListener(e, on));
  }, [video]);

  useEffect(() => engine.setVideoVolume(videoVolume), [engine, videoVolume]);

  /* ---------- fisiere ---------- */
  const loadVideo = useCallback((file) => {
    if (video.src) URL.revokeObjectURL(video.src);
    video.onloadedmetadata = async () => {
      // Unele fisiere WEBM nu-si spun durata pana nu sari la final.
      if (!Number.isFinite(video.duration)) {
        video.currentTime = 1e9;
        await new Promise((resolve) => {
          const done = () => { video.removeEventListener('durationchange', check); resolve(); };
          const check = () => Number.isFinite(video.duration) && done();
          video.addEventListener('durationchange', check);
          setTimeout(done, 4000);
        });
      }
      const w = video.videoWidth || 1280, h = video.videoHeight || 720;
      const k = Math.min(1, MAX_SIZE / Math.max(w, h));
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      if (d <= 0) { alert('Video-ul pare gol sau stricat. Încearcă alt fișier.'); return; }
      video.currentTime = 0;
      setVideoInfo({ name: file.name, W: Math.round((w * k) / 2) * 2, H: Math.round((h * k) / 2) * 2, duration: d });
      setOverlays((prev) => prev.map((o) => ({ ...o, end: Math.min(o.end, d), start: Math.min(o.start, Math.max(0, d - 0.1)) })));
    };
    video.onerror = () => alert('Nu pot deschide acest video. Încearcă un fișier MP4 sau WEBM.');
    video.src = URL.createObjectURL(file);
    try { engine.ensure(); } catch { /* porneste la primul Play */ }
  }, [video, engine]);

  const loadMusic = useCallback((file, credit = null) => {
    if (musicEl.src) URL.revokeObjectURL(musicEl.src);
    musicEl.onloadedmetadata = () =>
      setMusic((prev) => ({
        name: file.name, duration: musicEl.duration, credit,
        at: 0, from: 0, volume: 0.7, loop: true, fadeIn: true, fadeOut: true,
        ...(prev ? { at: prev.at, volume: prev.volume, loop: prev.loop, fadeIn: prev.fadeIn, fadeOut: prev.fadeOut } : {}),
      }));
    musicEl.onerror = () => alert('Nu pot deschide acest fișier audio. Încearcă un MP3.');
    musicEl.src = URL.createObjectURL(file);
    try { engine.ensure(); } catch { /* porneste la primul Play */ }
  }, [musicEl, engine]);

  const removeMusic = useCallback(() => {
    musicEl.pause();
    if (musicEl.src) URL.revokeObjectURL(musicEl.src);
    musicEl.removeAttribute('src');
    musicEl.load();
    setMusic(null);
  }, [musicEl]);

  /* ---------- elemente ---------- */
  const addOverlay = useCallback((partial) => {
    const t = video.currentTime || 0, d = live.current.videoInfo?.duration || 10;
    let start = t, end = Math.min(d, t + 3);
    if (end - start < 1) { start = Math.max(0, d - 3); end = d; }
    // Elementele noi se aseaza putin decalat, ca sa nu cada unul peste altul.
    const k = nextId % 5;
    const o = { id: nextId++, x: 0.38 + k * 0.06, y: 0.38 + k * 0.06, rot: 0, start, end, anim: 'pop', ...partial };
    setOverlays((prev) => [...prev, o]);
    setSelectedId(o.id);
  }, [video]);

  const addEmoji = (text) => addOverlay({ kind: 'emoji', text, size: 0.2 });
  const addText = (text) => addOverlay({ kind: 'text', text, size: 0.12, color: '#ffd600', stroke: '#1a1a1a' });
  const addSticker = async (st) => {
    const img = await loadImage(st.src);
    addOverlay({ kind: 'image', src: st.src, name: st.name, size: img.naturalWidth / img.naturalHeight > 2.5 ? 0.16 : 0.3 });
  };
  const addStickerFiles = (files) => {
    files.filter(isImageFile).forEach((f) => {
      const st = { name: f.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(f) };
      setLibrary((prev) => [...prev, st]);
      addSticker(st);
    });
  };

  const updateOverlay = useCallback((id, patch) =>
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...(typeof patch === 'function' ? patch(o) : patch) } : o))), []);
  const removeOverlay = useCallback((id) => { setOverlays((prev) => prev.filter((o) => o.id !== id)); setSelectedId(null); }, []);
  const duplicateOverlay = (id) => {
    const o = overlays.find((x) => x.id === id);
    if (!o) return;
    const c = { ...o, id: nextId++, x: Math.min(1, o.x + 0.05), y: Math.min(1, o.y + 0.05) };
    setOverlays((prev) => [...prev, c]);
    setSelectedId(c.id);
  };

  const onDropFiles = (files) => {
    const v = files.find(isVideoFile);
    if (v) loadVideo(v);
    const a = files.find(isAudioFile);
    if (a) loadMusic(a);
    addStickerFiles(files);
  };

  /* ---------- play / timp ---------- */
  const togglePlay = useCallback(() => {
    if (!live.current.videoInfo || live.current.exporting) return;
    engine.ensure();
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      video.play();
    } else video.pause();
  }, [video, engine]);

  const seek = useCallback((t) => { video.currentTime = t; setTime(t); }, [video]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, select, textarea')) return;
      const L = live.current;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedId) { e.preventDefault(); removeOverlay(L.selectedId); }
      if (L.videoInfo && e.key === 'ArrowLeft') seek(Math.max(0, video.currentTime - (e.shiftKey ? 1 : 0.1)));
      if (L.videoInfo && e.key === 'ArrowRight') seek(Math.min(L.videoInfo.duration, video.currentTime + (e.shiftKey ? 1 : 0.1)));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePlay, removeOverlay, seek, video]);

  /* ---------- salvare ---------- */
  const startExport = async () => {
    if (!videoInfo || exporting) return;
    const control = { cancelled: false, cancel: null };
    setExporting({ progress: 0, control });
    try {
      const res = await exportVideo({
        canvas: canvasRef.current, video, engine, control,
        onProgress: (p) => setExporting((e) => e && { ...e, progress: p }),
      });
      if (res) {
        if (lastExport) URL.revokeObjectURL(lastExport.url);
        const url = downloadBlob(res.blob, res.name);
        setLastExport({ url, name: res.name, size: res.blob.size, type: res.blob.type });
      }
    } catch (e) {
      alert('Salvarea nu a reușit: ' + e.message);
    } finally {
      setExporting(null);
    }
  };

  // Doar pentru testare in modul de dezvoltare (npm run dev).
  if (import.meta.env.DEV) {
    window.__navzar = { loadVideo, loadMusic, addEmoji, addText, addSticker, library, video, musicEl, live, startExport, lastExport };
  }

  return (
    <div className="app">
      <Header
        canExport={!!videoInfo && !exporting}
        lastExport={lastExport}
        onOpenVideo={loadVideo}
        onExport={startExport}
      />
      <main>
        <ToolPanel
          library={library}
          music={music}
          videoVolume={videoVolume}
          time={time}
          duration={duration}
          onAddEmoji={addEmoji}
          onAddSticker={addSticker}
          onAddStickerFiles={addStickerFiles}
          onAddText={addText}
          onLoadMusic={loadMusic}
          onRemoveMusic={removeMusic}
          onMusicChange={(patch) => setMusic((m) => m && { ...m, ...patch })}
          onVideoVolume={setVideoVolume}
        />
        <section className="center">
          <Stage
            canvasRef={canvasRef}
            videoInfo={videoInfo}
            overlays={overlays}
            selected={selected}
            exporting={!!exporting}
            getTime={() => video.currentTime}
            onSelect={setSelectedId}
            onUpdate={updateOverlay}
            onOpenVideo={loadVideo}
            onDropFiles={onDropFiles}
          />
          <Timeline
            hasVideo={!!videoInfo}
            playing={playing}
            time={time}
            duration={duration}
            overlays={overlays}
            selectedId={selectedId}
            music={music}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onSelect={(o) => { setSelectedId(o.id); seek(Math.min(o.end, o.start + 0.4)); }}
          />
        </section>
        <Inspector
          overlay={selected}
          time={time}
          duration={duration}
          onUpdate={updateOverlay}
          onRemove={removeOverlay}
          onDuplicate={duplicateOverlay}
        />
      </main>
      {exporting && <ExportDialog progress={exporting.progress} onCancel={() => exporting.control.cancel?.()} />}
    </div>
  );
}
