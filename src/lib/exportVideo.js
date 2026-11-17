// Salvarea: video-ul ruleaza o data de la inceput, iar canvas-ul (cu stickere)
// si sunetul (video + muzica) sunt inregistrate intr-un fisier nou.

import { fixDuration } from './fixDuration.js';

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
export async function exportVideo({ canvas, video, engine, onProgress, control }) {
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

  video.currentTime = 0;
  await once(video, 'seeked');

  const stream = canvas.captureStream(30);
  engine.recordStream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  let t0 = 0, t1 = 0;
  rec.onstart = () => { t0 = performance.now(); };
  const stopped = new Promise((r) => (rec.onstop = () => { t1 = performance.now(); r(); }));
  const finished = new Promise((r) => {
    control.cancel = () => { control.cancelled = true; r(); };
    video.addEventListener('ended', r, { once: true });
  });
  const tick = setInterval(() => onProgress(Math.min(1, video.currentTime / video.duration)), 200);

  engine.setMonitor(false);
  rec.start(500);
  try {
    await video.play();
    await finished;
  } finally {
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
  const blob = await fixDuration(raw, t0 && t1 > t0 ? (t1 - t0) / 1000 : video.duration);
  return { blob, name: `navzar-${stamp()}.${ext}` };
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
