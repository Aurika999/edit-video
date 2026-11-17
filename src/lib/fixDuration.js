// MediaRecorder scrie fisierul "pe bucati", in timp ce inregistreaza, asa ca
// nu stie durata totala: in antet ramane 0 (MP4) sau lipseste (WEBM).
// Unele playere (Windows, Fotografii etc.) arata atunci "0 secunde".
// Aici scriem durata reala in antetul fisierului, dupa ce s-a terminat inregistrarea.

export async function fixDuration(blob, seconds) {
  if (!(seconds > 0)) return blob;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const out = blob.type.includes('webm') ? fixWebm(bytes, seconds) : fixMp4(bytes, seconds);
    return out ? new Blob([out], { type: blob.type }) : blob;
  } catch (e) {
    console.warn('Nu am putut scrie durata in fisier:', e);
    return blob;
  }
}

/* ---------------- MP4 ---------------- */

function boxes(b, dv, start, end) {
  const list = [];
  let p = start;
  while (p + 8 <= end) {
    let size = dv.getUint32(p);
    const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    let header = 8;
    if (size === 1) { size = Number(dv.getBigUint64(p + 8)); header = 16; }
    else if (size === 0) size = end - p;
    if (size < header || p + size > end) break;
    list.push({ type, start: p, data: p + header, end: p + size });
    p += size;
  }
  return list;
}

function fixMp4(b, seconds) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const moov = boxes(b, dv, 0, b.length).find((x) => x.type === 'moov');
  if (!moov) return null;
  const kids = boxes(b, dv, moov.data, moov.end);
  const mvhd = kids.find((x) => x.type === 'mvhd');
  if (!mvhd) return null;

  // mvhd: version(1) flags(3), apoi creation/modification, timescale, duration
  const v = b[mvhd.data];
  const tsPos = mvhd.data + 4 + (v === 1 ? 16 : 8);
  const timescale = dv.getUint32(tsPos);
  if (!timescale) return null;
  const dur = Math.round(seconds * timescale);
  const put = (pos, version) => (version === 1 ? dv.setBigUint64(pos, BigInt(dur)) : dv.setUint32(pos, dur));

  put(tsPos + 4, v);

  for (const k of kids) {
    if (k.type === 'trak') {
      const tkhd = boxes(b, dv, k.data, k.end).find((x) => x.type === 'tkhd');
      if (tkhd) {
        // tkhd: version/flags, creation, modification, track_ID(4), reserved(4), duration
        const tv = b[tkhd.data];
        put(tkhd.data + 4 + (tv === 1 ? 16 : 8) + 8, tv);
      }
    } else if (k.type === 'mvex') {
      const mehd = boxes(b, dv, k.data, k.end).find((x) => x.type === 'mehd');
      if (mehd) put(mehd.data + 4, b[mehd.data]);
    }
  }
  return b;
}

/* ---------------- WEBM (EBML) ---------------- */

function readId(b, p) {
  const f = b[p];
  const len = f & 0x80 ? 1 : f & 0x40 ? 2 : f & 0x20 ? 3 : f & 0x10 ? 4 : 0;
  if (!len) throw new Error('EBML ID invalid');
  let id = 0;
  for (let i = 0; i < len; i++) id = id * 256 + b[p + i];
  return { id, len };
}

function readSize(b, p) {
  const f = b[p];
  let len = 1, mask = 0x80;
  while (len <= 8 && !(f & mask)) { len++; mask >>= 1; }
  if (len > 8) throw new Error('EBML size invalid');
  let val = f & (mask - 1);
  let unknown = val === mask - 1;
  for (let i = 1; i < len; i++) {
    val = val * 256 + b[p + i];
    if (b[p + i] !== 0xff) unknown = false;
  }
  return { val, len, unknown };
}

function readElement(b, p) {
  const id = readId(b, p);
  const size = readSize(b, p + id.len);
  const data = p + id.len + size.len;
  return { id: id.id, start: p, sizePos: p + id.len, size, data, end: size.unknown ? Infinity : data + size.val };
}

const SEGMENT = 0x18538067, INFO = 0x1549a966, DURATION = 0x4489, CLUSTER = 0x1f43b675;

function fixWebm(b, seconds) {
  const head = readElement(b, 0); // EBML header
  const seg = readElement(b, head.end);
  if (seg.id !== SEGMENT) return null;
  const segEnd = Math.min(seg.end, b.length);

  let p = seg.data, info = null;
  while (p < segEnd) {
    const el = readElement(b, p);
    if (el.id === INFO) { info = el; break; }
    if (el.id === CLUSTER || el.size.unknown) break;
    p = el.end;
  }
  if (!info || info.size.unknown) return null;

  // Durata in WEBM e in unitati TimecodeScale (implicit 1 ms).
  const ms = seconds * 1000;

  // Daca exista deja Duration, il suprascriem pe loc.
  for (let q = info.data; q < info.end;) {
    const el = readElement(b, q);
    if (el.id === DURATION) {
      const dv = new DataView(b.buffer, b.byteOffset + el.data, el.size.val);
      if (el.size.val === 8) dv.setFloat64(0, ms);
      else if (el.size.val === 4) dv.setFloat32(0, ms);
      else return null;
      return b;
    }
    q = el.end;
  }

  // Altfel adaugam elementul Duration la finalul sectiunii Info.
  const content = b.subarray(info.data, info.end);
  const dur = new Uint8Array(11);
  dur.set([0x44, 0x89, 0x88]);
  new DataView(dur.buffer).setFloat64(3, ms);
  const newLen = content.length + dur.length;

  const idBytes = b.subarray(info.start, info.sizePos);
  const sizeBytes = new Uint8Array(8); // dimensiune scrisa pe 8 octeti
  let v = newLen;
  for (let i = 7; i >= 1; i--) { sizeBytes[i] = v % 256; v = Math.floor(v / 256); }
  sizeBytes[0] = 0x01;

  const newInfo = concat([idBytes, sizeBytes, content, dur]);
  const delta = newInfo.length - (info.end - info.start);

  const before = b.slice(0, info.start);
  // Daca Segment are dimensiune cunoscuta, o marim si pe ea.
  if (!seg.size.unknown) {
    const nv = seg.size.val + delta, len = seg.size.len;
    if (nv >= 2 ** (7 * len) - 1) return null;
    let x = nv;
    for (let i = len - 1; i >= 0; i--) { before[seg.sizePos + i] = x % 256; x = Math.floor(x / 256); }
    before[seg.sizePos] |= 0x80 >> (len - 1);
  }
  return concat([before, newInfo, b.subarray(info.end)]);
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of parts) { out.set(x, o); o += x.length; }
  return out;
}
