/**
 * Lightweight, safe-by-construction rich-text markup used for the model
 * "Mô tả" (description) and "Hướng dẫn khảo sát" (guide) fields.
 *
 * The raw value stored in the database is plain text that may contain a
 * small BBCode-like tag set: [b] [i] [color=...] [size=...] [url=...].
 * `richTextToHtml` turns that into HTML, escaping every plain-text leaf and
 * only ever emitting a fixed, hard-coded set of elements/attributes — so
 * there is no way for stored data (however it was produced) to inject
 * arbitrary HTML/JS. This makes server-side sanitization unnecessary: the
 * renderer itself cannot be tricked into emitting unsafe markup.
 */

// ---- Colors -----------------------------------------------------------
// Fixed palette only — keys are what gets written into [color=KEY] tags.
// (No white — the editor/preview background is white.)
export const RICHTEXT_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'red',    label: 'Đỏ',  hex: '#dc2626' },
  { key: 'orange', label: 'Cam', hex: '#ea580c' },
  { key: 'yellow', label: 'Vàng', hex: '#ca8a04' },
  { key: 'green',  label: 'Lục', hex: '#16a34a' },
  { key: 'blue',   label: 'Xanh', hex: '#2563eb' },
  { key: 'purple', label: 'Tím', hex: '#9333ea' },
  { key: 'pink',   label: 'Hồng', hex: '#db2777' },
  { key: 'brown',  label: 'Nâu', hex: '#92400e' },
  { key: 'gray',   label: 'Xám', hex: '#4b5563' },
  { key: 'black',  label: 'Đen', hex: '#111827' },
];

const COLOR_MAP: Record<string, string> = Object.fromEntries(
  RICHTEXT_COLORS.map((c) => [c.key, c.hex])
);

export function colorHex(key: string): string | undefined {
  return COLOR_MAP[key.toLowerCase().trim()];
}

// ---- Font size ----------------------------------------------------------
export const BASE_FONT_SIZE = 13;
export const MAX_FONT_SIZE = 18; // base + 5, per product spec

export function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return BASE_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(BASE_FONT_SIZE, Math.round(n)));
}

// ---- Links ---------------------------------------------------------------
// Only these domains (and their subdomains) may be linked to.
export const ALLOWED_LINK_DOMAINS = ['pedu.vn', 'truyenthong.edu.vn'];

export function isAllowedLinkUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  return ALLOWED_LINK_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// ---- HTML escaping -------------------------------------------------------
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// ---- Tag parsing ----------------------------------------------------------
type Token =
  | { type: 'open'; tag: string; attr?: string }
  | { type: 'close'; tag: string }
  | { type: 'text'; text: string };

const TAG_RE = /\[(\/?)(b|i|color|size|url)(?:=([^\]]*))?\]/gi;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src))) {
    if (m.index > last) tokens.push({ type: 'text', text: src.slice(last, m.index) });
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    tokens.push(closing ? { type: 'close', tag } : { type: 'open', tag, attr: m[3] });
    last = TAG_RE.lastIndex;
  }
  if (last < src.length) tokens.push({ type: 'text', text: src.slice(last) });
  return tokens;
}

function renderTag(tag: string, attr: string | undefined, inner: string): string {
  switch (tag) {
    case 'b':
      return `<strong>${inner}</strong>`;
    case 'i':
      return `<em>${inner}</em>`;
    case 'color': {
      const hex = colorHex(attr ?? '');
      return hex ? `<span style="color:${hex}">${inner}</span>` : inner;
    }
    case 'size': {
      const n = clampFontSize(parseInt(attr ?? '', 10));
      return `<span style="font-size:${n}px">${inner}</span>`;
    }
    case 'url': {
      const href = (attr ?? '').trim();
      if (isAllowedLinkUrl(href)) {
        return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer nofollow" class="underline text-brand-600">${inner}</a>`;
      }
      return inner;
    }
    default:
      return inner;
  }
}

/**
 * Convert a plain-text segment (i.e. text that is guaranteed NOT to contain
 * $...$ LaTeX, which callers must have already split out) into safe HTML,
 * interpreting the [b]/[i]/[color]/[size]/[url] tag set recursively.
 */
export function richTextToHtml(src: string): string {
  const tokens = tokenize(src);
  let i = 0;

  function parse(stopTag?: string): string {
    let out = '';
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'close') {
        if (t.tag === stopTag) {
          i++;
          return out;
        }
        // Stray/mismatched closing tag — drop it and keep going.
        i++;
        continue;
      }
      if (t.type === 'open') {
        i++;
        const inner = parse(t.tag);
        out += renderTag(t.tag, t.attr, inner);
        continue;
      }
      i++;
      out += escapeHtml(t.text).replace(/\n/g, '<br>');
    }
    return out;
  }

  return parse();
}
