export function fmt(t) {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));

export const isVideoFile = (f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(f.name);
export const isAudioFile = (f) => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(f.name);
export const isImageFile = (f) => f.type.startsWith('image/');
