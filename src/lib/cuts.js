// Taierea video-ului. Fisierul original nu se schimba: tinem minte doar
//   edit = { start, end, cuts: [{ a, b }] }
// adica de unde pana unde pastram clipul si ce bucati din mijloc scoatem.
// Toate timpurile sunt in secunde din video-ul ORIGINAL.

export const MIN_PIECE = 0.2; // bucatile mai scurte de atat se ignora

export function emptyEdit(duration) {
  return { start: 0, end: duration, cuts: [] };
}

/** Bucatile scoase (inclusiv inceputul si finalul taiate), sortate si unite: [[a, b], ...] */
export function removedRanges(edit, duration) {
  if (!edit) return [];
  const r = [];
  if (edit.start > 0) r.push([0, edit.start]);
  for (const c of edit.cuts) r.push([Math.max(0, c.a), Math.min(duration, c.b)]);
  if (edit.end < duration) r.push([edit.end, duration]);
  r.sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of r) {
    if (b - a <= 0) continue;
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Bucatile pastrate: [[a, b], ...] */
export function keptRanges(edit, duration) {
  const kept = [];
  let t = 0;
  for (const [a, b] of removedRanges(edit, duration)) {
    if (a > t) kept.push([t, a]);
    t = Math.max(t, b);
  }
  if (t < duration) kept.push([t, duration]);
  return kept;
}

export function finalDuration(edit, duration) {
  return keptRanges(edit, duration).reduce((s, [a, b]) => s + (b - a), 0);
}

/** Bucata scoasa in care se afla momentul t (sau null). */
export function removedAt(removed, t) {
  return removed.find(([a, b]) => t >= a - 0.001 && t < b) ?? null;
}

/** Momentul t din original -> momentul din clipul final (dupa taieri). */
export function toFinalTime(removed, t) {
  let out = t;
  for (const [a, b] of removed) {
    if (t >= b) out -= b - a;
    else if (t > a) out -= t - a;
  }
  return Math.max(0, out);
}

/** Primul moment pastrat incepand de la t (sau null daca dupa t nu mai e nimic pastrat). */
export function nextKept(removed, t, duration) {
  const r = removedAt(removed, t);
  if (!r) return t < duration ? t : null;
  return r[1] < duration - 0.001 ? r[1] : null;
}
