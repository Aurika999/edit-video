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
  // Cati pixeli de canvas inseamna un pixel de ecran (pe telefon canvas-ul e mult micsorat).
  const scale = () => W / canvasRef.current.getBoundingClientRect().width;
  const ctx = () => canvasRef.current.getContext('2d');

  // Degetele (sau mouse-ul) apasate acum pe video: pointerId -> punct.
  const pointers = useRef(new Map());
  const pinchInfo = (s) => {
    const [a, b] = [...pointers.current.values()];
    return { d0: Math.hypot(b.x - a.x, b.y - a.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: s.size, r0: s.rot, id: s.id };
  };

  const onPointerDown = (e) => {
    if (!videoInfo || exporting) return;
    const p = toCanvas(e), t = getTime();
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture(e.pointerId);

    // Al doilea deget: marire si rotire cu doua degete.
    if (pointers.current.size === 2) {
      const s = latest.current.selected;
      drag.current = s && isVisible(s, t) ? { mode: 'pinch', ...pinchInfo(s) } : null;
      return;
    }
    if (pointers.current.size > 2) return;

    const touch = e.pointerType !== 'mouse';
    const k = scale();
    const tol = touch ? 22 * k : 0, slack = touch ? 14 * k : 6;
    if (selected && isVisible(selected, t) && hitHandle(ctx(), selected, p, W, H, tol)) {
      drag.current = { mode: 'resize', id: selected.id, cx: selected.x * W, cy: selected.y * H, d0: Math.hypot(p.x - selected.x * W, p.y - selected.y * H), s0: selected.size };
      return;
    }
    const hit = hitOverlay(ctx(), overlays, p, t, W, H, slack);
    onSelect(hit ? hit.id : null);
    drag.current = hit ? { mode: 'move', id: hit.id, px: p.x, py: p.y, x0: hit.x, y0: hit.y } : null;
  };

  const onPointerMove = (e) => {
    if (!videoInfo) return;
    const p = toCanvas(e), d = drag.current;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    if (!d) {
      if (e.pointerType !== 'mouse') return;
      const t = getTime();
      let cur = 'default';
      if (selected && isVisible(selected, t) && hitHandle(ctx(), selected, p, W, H)) cur = 'nwse-resize';
      else if (hitOverlay(ctx(), overlays, p, t, W, H, 0)) cur = 'move';
      e.currentTarget.style.cursor = cur;
      return;
    }
    if (d.mode === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      let rot = d.r0 + ((ang - d.a0) * 180) / Math.PI;
      rot = ((rot + 540) % 360) - 180;
      onUpdate(d.id, { size: Math.min(1, Math.max(0.02, (d.s0 * dist) / Math.max(1, d.d0))), rot: Math.round(rot) });
    } else if (d.mode === 'move') {
      onUpdate(d.id, {
        x: Math.min(1, Math.max(0, d.x0 + (p.x - d.px) / W)),
        y: Math.min(1, Math.max(0, d.y0 + (p.y - d.py) / H)),
      });
    } else {
      const dist = Math.hypot(p.x - d.cx, p.y - d.cy);
      onUpdate(d.id, { size: Math.min(1, Math.max(0.02, (d.s0 * dist) / Math.max(1, d.d0))) });
    }
  };

  const onPointerEnd = (e) => {
    pointers.current.delete(e.pointerId);
    // Dupa ce ridici un deget din doua, nu mai mutam nimic pana nu apesi din nou.
    if (pointers.current.size === 0 || drag.current?.mode === 'pinch') drag.current = null;
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
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
      {!videoInfo && (
        <div className={`drop ${over ? 'over' : ''}`}>
          <div className="big">🎬</div>
          <div><b>Trage aici un video</b><br />sau apasă butonul de mai jos<br /><span className="hint">Pe telefon îl alegi din Galerie.</span></div>
          <button className="primary" onClick={() => fileRef.current.click()}>📂 Deschide video</button>
          <input ref={fileRef} type="file" accept="video/*" hidden
            onChange={(e) => { if (e.target.files[0]) onOpenVideo(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}
