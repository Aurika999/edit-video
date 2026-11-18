// Salvarea: video-ul ruleaza o data de la inceput, iar canvas-ul (cu stickere)
// si sunetul (video + muzica) sunt inregistrate intr-un fisier nou.

import { fixDuration } from './fixDuration.js';
import { nextKept, toFinalTime } from './cuts.js';

const finalDuration = (removed, D) => D - removed.reduce((s, [a, b]) => s + (b - a), 0);

const MIMES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,opus',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

const once = (el, ev) => new Promise((r) => el.addEventListener(ev, r, { once: true }));

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * control: { cancelled, cancel } - cancel() se poate apela ca sa opreasca salvarea.
 * Intoarce { blob, name } sau null daca s-a anulat.
 */
export async function exportVideo({ canvas, video, engine, onProgress, control, removed = [] }) {
  const mime = pickMime();
  if (!mime) throw new Error('Browserul nu poate salva video. Folosește Google Chrome sau Microsoft Edge.');
  engine.ensure();

  // Pe iPhone video-ul poate porni doar in urma unei atingeri: il "deblocam" acum,
  // cat inca suntem in clic-ul de pe butonul Salveaza.
  video.play()?.catch(() => {});
  video.pause();

  // Telefonul sa nu stinga ecranul in timpul salvarii (altfel se opreste inregistrarea).
  let wake = null;
  try { wake = await navigator.wakeLock?.request('screen'); } catch { /* nu e obligatoriu */ }

  const D = video.duration;
  const total = finalDuration(removed, D);
  const begin = nextKept(removed, 0, D);
  if (begin === null || total < 0.3) throw new Error('Ai tăiat tot video-ul. Lasă măcar o bucată.');

  const seekTo = async (t) => {
    video.currentTime = t;
    await once(video, 'seeked');
    // asteptam sa se deseneze cadrul nou pe canvas inainte sa continuam inregistrarea
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  await seekTo(begin);

  const stream = canvas.captureStream(30);
  engine.recordStream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  let t0 = 0, t1 = 0, pausedMs = 0;
  rec.onstart = () => { t0 = performance.now(); };
  const stopped = new Promise((r) => (rec.onstop = () => { t1 = performance.now(); r(); }));

  let done;
  const finished = new Promise((r) => (done = r));
  control.cancel = () => { control.cancelled = true; done(); };
  video.addEventListener('ended', () => done(), { once: true });

  // Urmarim video-ul: cand ajunge la o bucata taiata, oprim inregistrarea,
  // sarim peste bucata si pornim din nou. La finalul ultimei bucati pastrate ne oprim.
  let jumping = false, raf = 0;
  const watch = async () => {
    raf = requestAnimationFrame(watch);
    if (jumping || control.cancelled) return;
    const t = video.currentTime;
    const r = removed.find(([a, b]) => t >= a - 0.03 && t < b);
    if (!r) return;
    const next = r[1] < D - 0.001 ? r[1] : null;
    if (next === null) { done(); return; }
    jumping = true;
    const p0 = performance.now();
    rec.pause();
    video.pause();
    await seekTo(next);
    if (!control.cancelled) {
      rec.resume();
      pausedMs += performance.now() - p0;
      await video.play();
    }
    jumping = false;
  };
  const tick = setInterval(() => onProgress(Math.min(1, toFinalTime(removed, video.currentTime) / total)), 200);

  engine.setMonitor(false);
  rec.start(500);
  try {
    await video.play();
    raf = requestAnimationFrame(watch);
    await finished;
  } finally {
    cancelAnimationFrame(raf);
    clearInterval(tick);
    video.pause();
    if (rec.state !== 'inactive') rec.stop();
    await stopped;
    stream.getVideoTracks().forEach((t) => t.stop());
    engine.setMonitor(true);
    wake?.release().catch(() => {});
  }
  if (control.cancelled) return null;

  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  const raw = new Blob(chunks, { type: mime.split(';')[0] });
  const measured = t0 && t1 > t0 ? (t1 - t0 - pausedMs) / 1000 : 0;
  const blob = await fixDuration(raw, measured > 0 ? measured : total);
  return { blob, name: `razvan-${stamp()}.${ext}` };
}

/** Se poate trimite fisierul prin meniul de distribuire al telefonului (Galerie, WhatsApp...)? */
export function canShareFile(blob, name) {
  try {
    return !!navigator.canShare?.({ files: [new File([blob], name, { type: blob.type })] });
  } catch {
    return false;
  }
}

export async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  try {
    await navigator.share({ files: [file], title: name });
  } catch (e) {
    if (e.name !== 'AbortError') throw e; // AbortError = ai inchis meniul
  }
}

/** Pe telefon/tableta descarcarea automata e des blocata, asa ca acolo aratam butoane. */
export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches;

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
