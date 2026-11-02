/**
 * Parser for the legacy binary document format of The Geometer's Sketchpad
 * (".gsp", magic "GSP4"; produced by GSP 4.x and the GSP 5.x field-test
 * builds). Pure TypeScript over Uint8Array/DataView — no Node APIs — so it
 * also runs in the browser.
 *
 * Framing: every record is `u32LE dataLen, u16LE type, u16LE aux(=0)`, then
 * `dataLen` payload bytes. All integers little-endian; coordinates are
 * 8-byte little-endian doubles.
 *
 * Never throws on unknown record/object types: unknown per-object record
 * types land in `object.unknownTypes` and every record keeps its raw span in
 * `object.rawSpans`. See FORMAT.md for the reverse-engineering notes.
 */

export type GspObjectKind =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'arc'
  | 'polygon'
  | 'interior'
  | 'text'
  | 'number'
  | 'measurement'
  | 'button'
  | 'other';

export interface GspColor {
  r: number;
  g: number;
  b: number;
}

export interface GspStyle {
  /** Direct RGB from object-header bytes 12..14 (byte 15 is padding). */
  color: GspColor;
  /** Stroke width index = low nibble of header byte 10 (pen code). */
  lineWidth: number;
  /** High nibble of the pen code === 1 (observed 0x11/0x12 = dashed). */
  dashed: boolean;
  /** True iff header u16@2 (flags2) is non-zero. */
  hidden: boolean;
  /** Header byte 11 ("family": 2 = point-like, 1 = stroke/text/button). */
  pointStyle: number;
}

export interface GspCoord {
  x: number;
  y: number;
}

/** Raw span of one framed record inside (or delimiting) an object. */
export interface GspRawSpan {
  type: number;
  offset: number;
  length: number;
}

/** Number-parameter metadata from a type-2311 block. */
export interface GspNumberRange {
  /** Display position (top-left of the parameter bubble). */
  x: number;
  y: number;
  /** Display MFS text (usually the `<0>` placeholder). */
  display: string;
  precision: number;
  /** f64 triple min/max plus step and default (screen/measure units). */
  step: number;
  min: number;
  max: number;
  defaultValue: number;
}

/** Action-button descriptor from a type-2310 block. */
export interface GspButtonAction {
  /** 0 = hide/toggle-hide, 1 = show, 2 = animate, 3 = move, 7 = present. */
  actionKind: number;
  /**
   * Sub-type; observed: toggle 6/7, present 0 = simultaneous / 1 =
   * sequential, move = rate token. Other values not yet decoded.
   */
  subtype: number;
  /** u32 at 2310+16 (e.g. 600 on Present buttons). */
  param: number;
  /** Button box top-left (matches JSON geom.loc). */
  x: number;
  y: number;
}

/** Partially decoded animation blob (2003 on an Animate button, len 36). */
export interface GspAnimationState {
  /** u32@4: 0x0 = forward+repeat, 0x20000000 = both+repeat, 0x81______ = no repeat. */
  flags: number;
  /** f32@8: speed in px/s (24.0 for rate 3, 96.0 for rate 6). */
  speed: number;
  /** f32@20: observed 25600.0 (~ path width << 8). Unverified. */
  extent: number;
}

/**
 * The compiled formula of a Calculation, as record 2311 keeps it: two bytes a
 * token, in the order the formula was typed.
 */
export interface GspCalcProgram {
  /** [operand byte, class byte] pairs, last token last. */
  tokens: [number, number][];
  /** Decimals the caption shows (u16@28 of the block). */
  precision: number;
}

export interface GspObject {
  /** 1-based ordinal of the object in file order (equals JSON object id). */
  id: number;
  kind: GspObjectKind;
  /** u16 at object-header payload byte 8 (primary kind discriminator). */
  classId: number;
  /** u16 at object-header payload byte 0 (construction code). */
  geomCode: number;
  /** File offset of the type-2000 header record. */
  offset: number;
  /** Total byte length of the object (header .. 2007 terminator). */
  length: number;
  /** Free coordinates (record 2201). */
  coords?: GspCoord;
  /** Parent object ids in binary order (record 2002). */
  parents?: number[];
  /** Label text from record 2005 (UTF-8; NUL stripped). */
  label?: string;
  /** Label offset from record 2005 (page pixels, y down; JSON labelOffsetX/Y). */
  labelOffset?: GspCoord;
  /** Caption/composite text (record 2300); MFS markup kept verbatim. */
  text?: string;
  textPos?: GspCoord;
  /**
   * Scalar value from record 2003 (f64@4). For points on segments/lines this
   * is the raw ratio; for points on circles and arcs GSP stores the exact pair
   * cos(2*PI*t) at 4 and sin(2*PI*t) at 12 (verified on all 34 in the corpus).
   */
  value?: number;
  /**
   * The whole payload of record 2003, the construction parameter block. It
   * opens with the construction code as a u16, so its numbers sit wherever that
   * construction wants them: a Rotate keeps sin then cos of its angle at 4 and
   * 12 and the turn in display degrees at 20, a fixed translate adds the length
   * at 32, and a dilate by a typed factor keeps it alone at 4. The converter of
   * each code reads its own offsets; the parser keeps the bytes honest.
   */
  valueRaw?: Uint8Array;
  /** Bounding rect from records 2200/2211: [x1, y1, x2, y2]. */
  boundingRect?: [number, number, number, number];
  numberRange?: GspNumberRange;
  button?: GspButtonAction;
  animation?: GspAnimationState;
  /** The compiled formula a Calculation carries (record 2311). */
  calc?: GspCalcProgram;
  /** Precision from a 2307 measurement display block. */
  measurePrecision?: number;
  /** From record 2309: u32 1 = horizontal, 0 = vertical. */
  axisOrientation?: 'horizontal' | 'vertical';
  style: GspStyle;
  /** Object types observed but not decoded (e.g. 2008, 2306, 9006). */
  unknownTypes: number[];
  /** Framed-record spans covered by this object (evidence for re-analysis). */
  rawSpans: GspRawSpan[];
}

/** A type-10044 entry: one of the six text styles the sketch draws with. */
export interface GspTextStyle {
  /** Style index; 0 is the default the labels and plain captions use. */
  index: number;
  /** Font family as the sketch names it, e.g. "Times New Roman". */
  family: string;
}

export interface GspSketch {
  /** ASCII from record 9004, e.g. "GSP5_m_3060N/Jan  8 2026". */
  buildStamp?: string;
  /** u16 @ 0x1e (verified against JSON metadata.width on all 23 fixtures). */
  pageWidth?: number;
  /** u16 @ 0x20. */
  pageHeight?: number;
  /** The sketch's text styles (record 10044), in index order. */
  textStyles: GspTextStyle[];
  objects: GspObject[];
}

/* ------------------------------------------------------------------ */

const MAGIC = 0x47535034; // "GSP4" big-endian-as-bits => first four bytes
const MAX_RECORD_LEN = 0x400000;

/** Object-header record type. */
const REC_HEADER = 2000;
const REC_PARENTS = 2002;
const REC_VALUE = 2003;
const REC_LABEL = 2005;
const REC_TERMINATOR = 2007;
const REC_BOUNDING_OLD = 2200;
const REC_FREE_COORDS = 2201;
const REC_BOUNDING = 2211;
const REC_TEXT = 2300;
const REC_MEASURE = 2307;
const REC_COORDSYS = 2308;
const REC_AXIS = 2309;
const REC_BUTTON = 2310;
const REC_NUMBER = 2311;
/** Settings record before the objects: the sketch's six text styles. */
const REC_TEXT_STYLES = 10044;

/** Top-level record types that mark the end of the object stream. */
const END_OF_OBJECTS = new Set<number>([
  999, 1001, 1003, 1204, 9000, 9004, 9005, 9008, 903, 901,
]);

const KIND_BY_CLASS: Record<number, GspObjectKind> = {
  4: 'point', // free / transformed points
  10: 'point', // point on path
  11: 'point', // midpoint
  40: 'point', // unit point
  41: 'point', // origin point
  45: 'point', // intersection
  56: 'point', // plotted point
  12: 'line', // line
  44: 'line', // angle bisector
  46: 'line', // parallel
  47: 'line', // perpendicular
  13: 'ray',
  14: 'segment',
  28: 'circle',
  67: 'arc',
  15: 'polygon', // generic polygon (n-gon classes 52..55 below)
  52: 'polygon', // triangle
  53: 'polygon', // quadrilateral
  54: 'polygon', // pentagon
  55: 'polygon', // hexagon
  16: 'interior', // circle interior
  68: 'interior', // arc sector
  69: 'interior', // arc segment
  19: 'text', // caption
  59: 'text', // composite text
  79: 'number', // scalar parameter
  80: 'number', // distance parameter
  81: 'number', // angle parameter
  23: 'button', // action button
  48: 'measurement', // length/distance measure or calculation
  49: 'measurement', // angle measure
  51: 'measurement', // scalar measure / calculation
  57: 'measurement', // function definition
  75: 'measurement', // derivative
  // Known "other": 38 axis, 39 coordsys, 42/43 locus samplers, 58 function
  // plot, 64 iterate map, 65 iterate image, 78 picture.
};

interface Frame {
  off: number;
  dlen: number;
  type: number;
}

interface WalkResult {
  frames: Frame[];
  /** True if the frame chain ran off the end of the buffer cleanly. */
  clean: boolean;
}

const decoder = new TextDecoder('utf-8');

/** The font family of a text style starts here in a type-10044 payload. */
const TEXT_STYLE_NAME_AT = 26;

function frameAt(view: DataView, off: number, byteLen: number): Frame | null {
  if (off + 8 > byteLen) return null;
  const dlen = view.getUint32(off, true);
  const type = view.getUint16(off + 4, true);
  if (dlen > byteLen - off - 8 || dlen > MAX_RECORD_LEN) return null;
  return { off, dlen, type };
}

function walkFrames(view: DataView, byteLen: number, start: number): WalkResult {
  const frames: Frame[] = [];
  let off = start;
  for (;;) {
    const f = frameAt(view, off, byteLen);
    if (!f) return { frames, clean: off + 8 > byteLen };
    frames.push(f);
    off += 8 + f.dlen;
  }
}

/**
 * Locate the object region: the longest cleanly-framed record chain whose
 * first record is a type-2000 object header (dataLen 16 in old GSP4-build
 * files, 28 in GSP5 builds).
 */
function findObjectsRegion(view: DataView, byteLen: number): Frame[] {
  const candidates: number[] = [];
  for (let s = 0x100; s + 8 <= byteLen; s++) {
    const dlen = view.getUint32(s, true);
    const type = view.getUint16(s + 4, true);
    if (type === REC_HEADER && (dlen === 16 || dlen === 28)) candidates.push(s);
  }
  let best: Frame[] | null = null;
  let bestClean = false;
  for (const s of candidates) {
    const w = walkFrames(view, byteLen, s);
    const better =
      !best ||
      (w.clean && !bestClean) ||
      ((w.clean === bestClean) && w.frames.length > (best?.length ?? 0));
    if (better) {
      best = w.frames;
      bestClean = w.clean;
    }
    if (!w.clean && best && bestClean) continue; // dead-end; unlikely to win
  }
  return best ?? [];
}

function findBuildStamp(view: DataView, u8: Uint8Array, byteLen: number): string | undefined {
  const limit = Math.min(byteLen - 8, 0x40000);
  for (let s = 0; s <= limit; s++) {
    const f = frameAt(view, s, byteLen);
    if (!f || f.type !== 9004 || f.dlen === 0 || f.dlen > 64) continue;
    const start = s + 8;
    let end = start;
    while (end < start + f.dlen && u8[end] !== 0) end++;
    let printable = true;
    for (let i = start; i < end; i++) {
      const c = u8[i];
      if (c < 0x20 || c > 0x7e) {
        printable = false;
        break;
      }
    }
    if (printable && end > start) return decoder.decode(u8.subarray(start, end));
  }
  return undefined;
}

/**
 * The text styles the sketch was drawn with, from the settings records that
 * precede the object region. Style 0 is the default, which is what a point's
 * label and a plain caption are set in; the names come straight from the file
 * ("Times New Roman", "Arial", …), so an imported sketch keeps its faces rather
 * than the browser's.
 */
function collectTextStyles(view: DataView, u8: Uint8Array, endOffset: number): GspTextStyle[] {
  const styles: GspTextStyle[] = [];
  let off = 0x28;
  while (off + 8 <= endOffset) {
    // The settings records here are large (902 runs to 478 bytes), so only a
    // frame that no longer fits the file ends the walk.
    const f = frameAt(view, off, u8.length);
    if (!f) break;
    if (f.type === REC_TEXT_STYLES && f.dlen > TEXT_STYLE_NAME_AT) {
      const p = f.off + 8;
      const raw = u8.subarray(p + TEXT_STYLE_NAME_AT, p + f.dlen);
      const end = raw.indexOf(0);
      const family = decoder.decode(end < 0 ? raw : raw.subarray(0, end)).trim();
      if (family) styles.push({ index: view.getUint16(p, true), family });
    }
    off += 8 + f.dlen;
  }
  return styles;
}

/* ---------------- object grouping + decoding ---------------- */
interface Group {
  recs: Frame[];
}

function groupObjects(frames: Frame[]): Group[] {
  const groups: Group[] = [];
  let cur: Frame[] | null = null;
  for (const f of frames) {
    if (cur) {
      cur.push(f);
      if (f.type === REC_TERMINATOR && f.dlen === 0) {
        groups.push({ recs: cur });
        cur = null;
      }
    } else {
      if (f.type === REC_HEADER && f.dlen >= 16) cur = [f];
      else if (END_OF_OBJECTS.has(f.type)) break;
    }
  }
  if (cur) groups.push({ recs: cur }); // unterminated tail object (defensive)
  return groups;
}

function decodeLabel(u8: Uint8Array, view: DataView, f: Frame): {
  text?: string;
  offset?: GspCoord;
} {
  const p = f.off + 8;
  if (f.dlen < 24) return {};
  const len = view.getUint16(p + 22, true);
  if (p + 24 + len > f.off + 8 + f.dlen) return {};
  const bytes = u8.subarray(p + 24, p + 24 + len);
  const text = decoder.decode(bytes).replace(/\u0000+$/, '');
  const out: { text?: string; offset?: GspCoord } = { text };
  // The place the label was dragged to, in page pixels with y down: the same
  // pair the official JSON export calls labelOffsetX/labelOffsetY. Both label
  // variants carry it — the auto-label (u16@0 = 6) and the renamed one (7).
  out.offset = { x: view.getInt16(p + 6, true), y: view.getInt16(p + 8, true) };
  return out;
}

/** Shared display-block prologue of records 2300/2307/2311. */
function decodeDisplayBlock(u8: Uint8Array, view: DataView, f: Frame): {
  x: number;
  y: number;
  text: string;
  consumed: number;
} | null {
  const p = f.off + 8;
  if (f.dlen < 19) return null;
  const x = view.getInt16(p + 12, true);
  const y = view.getInt16(p + 14, true);
  const len = view.getUint16(p + 16, true);
  if (p + 18 + len > f.off + 8 + f.dlen) return null;
  const text = decoder.decode(u8.subarray(p + 18, p + 18 + len)).replace(/\u0000+$/, '');
  return { x, y, text, consumed: 18 + len + 1 };
}

/** Token classes record 2311 uses for a compiled formula. */
const CALC_CLASSES = new Set([0x00, 0x01, 0x02, 0x10, 0x20, 0x60, 0x70]);

/**
 * The compiled formula a Calculation keeps in record 2311.
 *
 * The block opens with the display header a measurement has (the caption sits
 * at 12/14), then 22 bytes of which u16@28 is the precision and u16@44 the
 * number of tokens; the stream itself is the last `2 × count` bytes. Two bytes
 * a token, in the order the formula was typed: see the token table in
 * FORMAT.md. Verified by rebuilding all 1124 calculations of the 23 examples
 * and comparing them with the formula their official export writes.
 */
function decodeCalcProgram(u8: Uint8Array, view: DataView, f: Frame): GspCalcProgram | undefined {
  const q = f.off + 8;
  if (f.dlen < 46 || !decodeDisplayBlock(u8, view, f)) return undefined;
  const count = view.getUint16(q + 44, true);
  const start = f.dlen - count * 2;
  if (count === 0 || start < 22) return undefined;
  const tokens: [number, number][] = [];
  for (let i = start; i < f.dlen; i += 2) {
    const cls = u8[q + i + 1];
    if (!CALC_CLASSES.has(cls)) return undefined;
    tokens.push([u8[q + i], cls]);
  }
  return { tokens, precision: view.getUint16(q + 28, true) };
}

function decodeNumberBlock(u8: Uint8Array, view: DataView, f: Frame): GspNumberRange | undefined {
  const disp = decodeDisplayBlock(u8, view, f);
  if (!disp) return undefined;
  const m = disp.consumed; // 22 for the canonical `<0>` display
  const p = f.off + 8;
  if (f.dlen < m + 70) {
    return {
      x: disp.x, y: disp.y, display: disp.text,
      precision: f.dlen >= m + 8 ? view.getUint16(p + m + 4, true) : 0,
      step: NaN, min: NaN, max: NaN, defaultValue: NaN,
    };
  }
  return {
    x: disp.x,
    y: disp.y,
    display: disp.text,
    precision: view.getUint16(p + m + 4, true),
    step: view.getFloat64(p + m + 30, true),
    min: view.getFloat64(p + m + 38, true),
    max: view.getFloat64(p + m + 46, true),
    defaultValue: view.getFloat64(p + m + 54, true),
  };
}

function decodeObject(view: DataView, u8: Uint8Array, group: Group, id: number): GspObject {
  const h = group.recs[0];
  const p = h.off + 8;
  const geomCode = view.getUint16(p, true);
  const flags2 = h.dlen >= 4 ? view.getUint16(p + 2, true) : 0;
  const classId = h.dlen >= 10 ? view.getUint16(p + 8, true) : 0;
  const pen = h.dlen >= 11 ? u8[p + 10] : 0x22;
  const family = h.dlen >= 12 ? u8[p + 11] : 1;
  const color: GspColor =
    h.dlen >= 15
      ? { r: u8[p + 12], g: u8[p + 13], b: u8[p + 14] }
      : { r: 0, g: 0, b: 0 };

  const kind: GspObjectKind = KIND_BY_CLASS[classId] ?? 'other';
  const last = group.recs[group.recs.length - 1];
  const obj: GspObject = {
    id,
    kind,
    classId,
    geomCode,
    offset: h.off,
    length: last.off + 8 + last.dlen - h.off,
    style: {
      color,
      lineWidth: pen & 0x0f,
      dashed: (pen >> 4) === 1,
      hidden: flags2 !== 0,
      pointStyle: family,
    },
    unknownTypes: [],
    rawSpans: [],
  };

  for (const f of group.recs.slice(1)) {
    obj.rawSpans.push({ type: f.type, offset: f.off, length: f.dlen });
    const q = f.off + 8;
    switch (f.type) {
      case REC_PARENTS: {
        if (f.dlen >= 4) {
          const count = view.getUint32(q, true);
          const ids: number[] = [];
          for (let i = 0; i < count && q + 4 + (i + 1) * 4 <= f.off + 8 + f.dlen; i++) {
            ids.push(view.getUint32(q + 4 + i * 4, true));
          }
          obj.parents = ids;
        }
        break;
      }
      case REC_VALUE: {
        if (classId === 23 && f.dlen >= 24) {
          // Animate-button state blob (36 bytes in observed fixtures).
          obj.animation = {
            flags: view.getUint32(q + 4, true),
            speed: view.getFloat32(q + 8, true),
            extent: view.getFloat32(q + 20, true),
          };
        } else if (f.dlen >= 12) {
          obj.valueRaw = u8.slice(q, q + f.dlen);
          obj.value = view.getFloat64(q + 4, true);
        }
        break;
      }
      case REC_LABEL: {
        const lab = decodeLabel(u8, view, f);
        if (lab.text !== undefined) obj.label = lab.text;
        if (lab.offset !== undefined) obj.labelOffset = lab.offset;
        break;
      }
      case REC_FREE_COORDS: {
        if (f.dlen >= 16) {
          obj.coords = { x: view.getFloat64(q, true), y: view.getFloat64(q + 8, true) };
        }
        break;
      }
      case REC_BOUNDING_OLD:
      case REC_BOUNDING: {
        if (f.dlen >= 8) {
          obj.boundingRect = [
            view.getUint16(q, true),
            view.getUint16(q + 2, true),
            view.getUint16(q + 4, true),
            view.getUint16(q + 6, true),
          ];
        }
        break;
      }
      case REC_TEXT: {
        const disp = decodeDisplayBlock(u8, view, f);
        if (disp) {
          obj.text = disp.text;
          obj.textPos = { x: disp.x, y: disp.y };
        }
        break;
      }
      case REC_MEASURE: {
        const disp = decodeDisplayBlock(u8, view, f);
        if (disp) {
          obj.textPos = { x: disp.x, y: disp.y };
          obj.text = disp.text;
          const m = disp.consumed;
          // u32 precision lives at meta+6 (e.g. 2307 L32: `<0>\0 0000 0600
          // 0000 02000000` -> precision 2 @28).
          if (f.dlen >= m + 10) obj.measurePrecision = view.getUint32(q + m + 6, true);
        }
        break;
      }
      case REC_AXIS: {
        if (f.dlen >= 4) {
          obj.axisOrientation = view.getUint32(q, true) === 1 ? 'horizontal' : 'vertical';
        }
        break;
      }
      case REC_BUTTON: {
        if (f.dlen >= 24) {
          const x = view.getInt16(q + 20, true);
          const y = view.getInt16(q + 22, true);
          obj.button = {
            actionKind: view.getUint16(q + 12, true),
            subtype: view.getUint16(q + 14, true),
            param: view.getUint32(q + 16, true),
            x,
            y,
          };
          obj.coords = { x, y };
        }
        break;
      }
      case REC_NUMBER: {
        const nr = decodeNumberBlock(u8, view, f);
        if (nr) {
          obj.numberRange = nr;
          obj.textPos = { x: nr.x, y: nr.y };
        }
        // A Calculation is a measurement whose 2311 block carries the compiled
        // formula instead of a range.
        if (classId === 48 || classId === 49 || classId === 51) {
          const prog = decodeCalcProgram(u8, view, f);
          if (prog) {
            obj.calc = prog;
            if (nr) obj.textPos = { x: nr.x, y: nr.y };
          }
        }
        break;
      }
      case REC_TERMINATOR:
      case REC_COORDSYS:
        break; // 2007 = object end; 2308 = coordsys marker (opaque, len 8)
      default: {
        // 2008 (label flag), 2306 (locus/plot samples), 2314 (IterateMap),
        // 2216/2316/8004 (picture data), 9006 (unknown, NOT trace) etc.
        if (!obj.unknownTypes.includes(f.type)) obj.unknownTypes.push(f.type);
        break;
      }
    }
  }
  return obj;
}

/**
 * Parse a Sketchpad binary document. Never throws for unknown record or
 * object types; they are surfaced through `unknownTypes` + `rawSpans`.
 */
export function parseGsp(buf: Uint8Array): GspSketch {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const byteLen = buf.byteLength;
  const sketch: GspSketch = { objects: [], textStyles: [] };

  if (byteLen >= 8 && view.getUint32(0, false) === MAGIC) {
    if (byteLen >= 0x22) {
      sketch.pageWidth = view.getUint16(0x1e, true);
      sketch.pageHeight = view.getUint16(0x20, true);
    }
    sketch.buildStamp = findBuildStamp(view, buf, byteLen);
  }

  const region = findObjectsRegion(view, byteLen);
  if (region.length) sketch.textStyles = collectTextStyles(view, buf, region[0].off);
  const groups = groupObjects(region);
  groups.forEach((g, i) => {
    try {
      sketch.objects.push(decodeObject(view, buf, g, i + 1));
    } catch {
      // Absolute last-resort: a malformed object must not sink the document.
      const h = g.recs[0];
      sketch.objects.push({
        id: i + 1,
        kind: 'other',
        classId: 0,
        geomCode: 0,
        offset: h.off,
        length: h.dlen,
        style: {
          color: { r: 0, g: 0, b: 0 },
          lineWidth: 0,
          dashed: false,
          hidden: false,
          pointStyle: 0,
        },
        unknownTypes: [-1],
        rawSpans: g.recs.map((f) => ({ type: f.type, offset: f.off, length: f.dlen })),
      });
    }
  });
  return sketch;
}
