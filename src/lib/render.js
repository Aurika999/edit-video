// Desenarea video-ului si a elementelor (emoji, stickere, text) pe canvas.
import { EMOJI_FONT, TEXT_FONT } from './constants';

const imageCache = new Map();
export function getImage(src) {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return img;
}

export function loadImage(src) {
  const img = getImage(src);
  if (img.complete && img.naturalWidth) return Promise.resolve(img);
  return new Promise((resolve, reject) => {
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener('error', reject, { once: true });
  });
}

export const isVisible = (o, t) => t >= o.start && t <= o.end;

const easeOutBack = (p) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

export function measure(ctx, o, H) {
  const h = o.size * H;
  if (o.kind === 'image') {
    const img = getImage(o.src);
    const ratio = img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1;
    return { w: h * ratio, h };
  }
  ctx.font = o.kind === 'emoji' ? `${h}px ${EMOJI_FONT}` : `${h}px ${TEXT_FONT}`;
  return { w: ctx.measureText(o.text).width + (o.kind === 'text' ? h * 0.14 : 0), h };
}

function animState(o, t, W, H) {
  const since = t - o.start, left = o.end - t;
  let s = 1, a = 1, dx = 0, dy = 0;
  if (o.anim === 'pop') s = easeOutBack(Math.min(1, since / 0.35));
  if (o.anim === 'fade') a = Math.max(0, Math.min(1, since / 0.4, left / 0.4));
  if (o.anim === 'bounce') dy = -Math.abs(Math.sin(since * 5)) * 0.06 * H;
  if (o.anim === 'pulse') s = 1 + 0.1 * Math.sin(since * 8);
  if (o.anim === 'shake') dx = Math.sin(since * 40) * 0.008 * W;
  return { s, a, dx, dy };
}

export function drawOverlay(ctx, o, t, W, H, animate = true) {
  const { w, h } = measure(ctx, o, H);
  // Pe pauza elementul se arata intreg, ca sa-l poti vedea si aseza.
  const st = animate ? animState(o, t, W, H) : { s: 1, a: 1, dx: 0, dy: 0 };
  ctx.save();
  ctx.globalAlpha = st.a;
  ctx.translate(o.x * W + st.dx, o.y * H + st.dy);
  ctx.rotate((o.rot * Math.PI) / 180);
  ctx.scale(st.s, st.s);
  if (o.kind === 'image') {
    const img = getImage(o.src);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (o.kind === 'emoji') {
      ctx.font = `${h}px ${EMOJI_FONT}`;
      ctx.fillText(o.text, 0, h * 0.05);
    } else {
      ctx.font = `${h}px ${TEXT_FONT}`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = h * 0.14;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(o.text, 0, h * 0.04);
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, 0, h * 0.04);
    }
  }
  ctx.restore();
}

export const selectionPad = (H) => Math.max(4, H * 0.008);
export const handleSize = (H) => Math.max(14, H * 0.03);

export function drawSelection(ctx, o, W, H) {
  const { w, h } = measure(ctx, o, H);
  const pad = selectionPad(H), hs = handleSize(H);
  ctx.save();
  ctx.translate(o.x * W, o.y * H);
  ctx.rotate((o.rot * Math.PI) / 180);
  ctx.lineWidth = Math.max(2, H / 360);
  ctx.setLineDash([H / 70, H / 110]);
  ctx.strokeStyle = '#ffd600';
  ctx.strokeRect(-w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd600';
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillRect(w / 2 + pad - hs / 2, h / 2 + pad - hs / 2, hs, hs);
  ctx.strokeRect(w / 2 + pad - hs / 2, h / 2 + pad - hs / 2, hs, hs);
  ctx.restore();
}

export function renderFrame(ctx, { video, overlays, selected, W, H, t, animate = true }) {
  if (video.readyState >= 2) ctx.drawImage(video, 0, 0, W, H);
  else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }
  for (const o of overlays) if (isVisible(o, t)) drawOverlay(ctx, o, t, W, H, animate);
  if (selected && isVisible(selected, t)) drawSelection(ctx, selected, W, H);
}

export function toLocal(o, p, W, H) {
  const a = (-o.rot * Math.PI) / 180;
  const dx = p.x - o.x * W, dy = p.y - o.y * H;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}

// tol = toleranta minima in pixeli de canvas (pe telefon degetul e mai gros decat mouse-ul).
export function hitHandle(ctx, o, p, W, H, tol = 0) {
  const { w, h } = measure(ctx, o, H);
  const pad = selectionPad(H), hs = Math.max(handleSize(H), tol), l = toLocal(o, p, W, H);
  return Math.abs(l.x - (w / 2 + pad)) < hs && Math.abs(l.y - (h / 2 + pad)) < hs;
}

export function hitOverlay(ctx, overlays, p, t, W, H, slack = 6) {
  for (let i = overlays.length - 1; i >= 0; i--) {
    const o = overlays[i];
    if (!isVisible(o, t)) continue;
    const { w, h } = measure(ctx, o, H), l = toLocal(o, p, W, H);
    if (Math.abs(l.x) <= w / 2 + slack && Math.abs(l.y) <= h / 2 + slack) return o;
  }
  return null;
}
