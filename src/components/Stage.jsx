import { useEffect, useRef, useState } from 'react';
import { hitHandle, hitOverlay, isVisible } from '../lib/render';

export default function Stage({ canvasRef, videoInfo, overlays, selected, exporting, getTime, onSelect, onUpdate, onOpenVideo, onDropFiles }) {
  const [over, setOver] = useState(false);
  const drag = useRef(null);
  const fileRef = useRef(null);
  const W = videoInfo?.W ?? 1280, H = videoInfo?.H ?? 720;

  const latest = useRef({});
  latest.current = { selected, onUpdate, getTime, H };

  const toCanvas = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const ctx = () => canvasRef.current.getContext('2d');

  const onPointerDown = (e) => {
    if (!videoInfo || exporting) return;
    const p = toCanvas(e), t = getTime();
    if (selected && isVisible(selected, t) && hitHandle(ctx(), selected, p, W, H)) {
      drag.current = { mode: 'resize', id: selected.id, cx: selected.x * W, cy: selected.y * H, d0: Math.hypot(p.x - selected.x * W, p.y - selected.y * H), s0: selected.size };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const hit = hitOverlay(ctx(), overlays, p, t, W, H);
    onSelect(hit ? hit.id : null);
    if (hit) {
      drag.current = { mode: 'move', id: hit.id, px: p.x, py: p.y, x0: hit.x, y0: hit.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e) => {
    if (!videoInfo) return;
    const p = toCanvas(e), d = drag.current;
    if (!d) {
      const t = getTime();
      let cur = 'default';
      if (selected && isVisible(selected, t) && hitHandle(ctx(), selected, p, W, H)) cur = 'nwse-resize';
      else if (hitOverlay(ctx(), overlays, p, t, W, H, 0)) cur = 'move';
      e.currentTarget.style.cursor = cur;
      return;
    }
    if (d.mode === 'move') {
      onUpdate(d.id, {
        x: Math.min(1, Math.max(0, d.x0 + (p.x - d.px) / W)),
        y: Math.min(1, Math.max(0, d.y0 + (p.y - d.py) / H)),
      });
    } else {
      const dist = Math.hypot(p.x - d.cx, p.y - d.cy);
      onUpdate(d.id, { size: Math.min(1, Math.max(0.02, (d.s0 * dist) / Math.max(1, d.d0))) });
    }
  };

  // Rotita mouse-ului mareste/micsoreaza elementul selectat.
  useEffect(() => {
    const c = canvasRef.current;
    const onWheel = (e) => {
      const { selected: s, onUpdate: up, getTime: gt } = latest.current;
      if (!s || !isVisible(s, gt())) return;
      e.preventDefault();
      up(s.id, (o) => ({ size: Math.min(1, Math.max(0.02, o.size * (e.deltaY < 0 ? 1.08 : 1 / 1.08))) }));
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  return (
    <div
      className="stage"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropFiles([...e.dataTransfer.files]); }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      {!videoInfo && (
        <div className={`drop ${over ? 'over' : ''}`}>
          <div className="big">🎬</div>
          <div><b>Trage aici un video</b><br />sau apasă butonul de mai jos</div>
          <button className="primary" onClick={() => fileRef.current.click()}>📂 Deschide video</button>
          <input ref={fileRef} type="file" accept="video/*" hidden
            onChange={(e) => { if (e.target.files[0]) onOpenVideo(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}
