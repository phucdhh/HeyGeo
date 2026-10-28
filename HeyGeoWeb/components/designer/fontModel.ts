/**
 * The sketch font — Display | Font.
 *
 * Sketchpad keeps one font per object: a point or a curve draws its label with
 * it, a text draws itself with it. The desktop exporter already writes that font
 * where JSXGraph looks for it — `label.fontSize` on a point or curve and
 * top-level `fontSize` on a caption — and passes the family as a CSS stack in
 * `label.fontFamily`. JSXGraph has no fontFamily attribute of its own, so the
 * registry moves that stack into the label's cssStyle on the way in (see
 * createElement) and this module writes the same shape back out.
 */

/** The desktop's five choices, in menu order. */
export const FONT_FAMILIES = [
  'Latin Modern Roman',
  'CMU Serif',
  'Times New Roman',
  'Arial',
  'Courier New',
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];

/** The five sizes the desktop's Font submenu offers; Font… may ask for others. */
export const FONT_SIZES = [10, 12, 14, 20, 30] as const;

/** JSXGraph's own label default, which a fresh sketch draws with. */
export const DEFAULT_FONT_SIZE = 12;
export const DEFAULT_FONT_FAMILY = 'Arial';

/** What each menu family becomes in CSS, with a fallback for machines that lack it. */
const STACK: Record<FontFamily, string> = {
  'Latin Modern Roman': "'Latin Modern Math', 'STIX Two Math', 'Times New Roman', serif",
  'CMU Serif': "'CMU Serif', 'Latin Modern Roman', 'Times New Roman', serif",
  'Times New Roman': "'Times New Roman', Georgia, serif",
  Arial: 'Arial, Helvetica, sans-serif',
  'Courier New': "'Courier New', monospace",
};

/** Element types that carry a face: the desktop's G_POINT | G_CURVE | G_TEXT. */
const FONT_KINDS = [
  'point', 'glider', 'midpoint', 'circumcenter', 'intersection',
  'curve', 'functiongraph', 'plot', 'tracecurve',
  'text',
];

/** The CSS stack a menu family is drawn with; an unknown name is used as typed. */
export function fontStack(family: string): string {
  const known = FONT_FAMILIES.find((f) => f.toLowerCase() === family.toLowerCase());
  return STACK[known ?? (family as FontFamily)] ?? family;
}

/**
 * Which menu family a CSS stack means. The exporter writes its own stacks, the
 * engine writes Arial by default, and the designer may type anything in Font…
 * — so the first family name decides, and one we do not offer is unknown.
 */
export function familyFromStack(css: string | undefined): string | null {
  const source = css ?? '';
  const declared = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(source)?.[1];
  // a document or an exporter may hand over the stack alone, without the
  // declaration; anything else with a colon is another declaration entirely
  const value = declared ?? (source.includes(':') ? '' : source.trim());
  if (!value) return null;
  const first = value.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const lower = first.toLowerCase();
  if (lower.startsWith('latin modern')) return 'Latin Modern Roman';
  if (lower.startsWith('cmu')) return 'CMU Serif';
  if (lower.startsWith('times') || lower === 'georgia') return 'Times New Roman';
  if (lower.startsWith('arial') || lower.startsWith('helvetica')) return 'Arial';
  if (lower.startsWith('courier') || lower.includes('mono')) return 'Courier New';
  return null;
}

/** Put a family on a CSS declaration list without losing the other declarations. */
export function withFontFamily(css: string | undefined, stack: string): string {
  const rest = (css ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^font-family\s*:/i.test(part));
  rest.push(`font-family:${stack}`);
  return rest.join(';');
}

export function isFontKind(kind: string): boolean {
  return FONT_KINDS.includes(kind);
}

/** What the canvas knows about each pick, in the shape the menu needs. */
export interface FontPick {
  /** The document type, so an action button's text is not a caption. */
  kind: string;
  size: number | null;
  family: string | null;
}

export interface FontChoice {
  family?: string;
  size?: number;
}

/**
 * Font rows follow canEditChangeFont's kinds. Sketchpad also lets an empty
 * selection set the pen later objects are drawn with; this app keeps no such
 * pen, so a row with nothing picked has no face to change and stays disabled.
 */
export function canChangeFont(picks: FontPick[]): boolean {
  return picks.length > 0 && picks.every((p) => isFontKind(p.kind));
}

/** The one size every pick shares, or null when they differ or it is unknown. */
export function sharedFontSize(picks: FontPick[]): number | null {
  const sizes = picks.map((p) => p.size);
  if (sizes.length === 0 || sizes[0] === null) return null;
  return sizes.every((s) => s === sizes[0]) ? sizes[0] : null;
}

/** The one family every pick shares, or null when they differ or it is unknown. */
export function sharedFontFamily(picks: FontPick[]): string | null {
  const families = picks.map((p) => p.family);
  if (families.length === 0 || families[0] === null) return null;
  return families.every((f) => f === families[0]) ? families[0] : null;
}

type LiveObject = {
  elType?: string;
  visProp?: { fontsize?: number; cssstyle?: string };
  label?: { visProp?: { fontsize?: number; cssstyle?: string } };
};

/** The size a label or a text draws with now. */
export function objectFontSize(obj: LiveObject | null | undefined): number | null {
  if (!obj) return null;
  const own = typeof obj.visProp?.fontsize === 'number' ? obj.visProp.fontsize : null;
  if (obj.elType === 'text') return own ?? DEFAULT_FONT_SIZE;
  const label = obj.label?.visProp?.fontsize;
  return typeof label === 'number' ? label : own ?? DEFAULT_FONT_SIZE;
}

/** The menu family a label or a text draws with now. */
export function objectFontFamily(obj: LiveObject | null | undefined): string | null {
  if (!obj) return null;
  const css = obj.elType === 'text'
    ? obj.visProp?.cssstyle
    : obj.label?.visProp?.cssstyle ?? obj.visProp?.cssstyle;
  return familyFromStack(css) ?? DEFAULT_FONT_FAMILY;
}

/**
 * The engine attributes for one object: a text takes the face itself, while a
 * point or curve passes it to its label. A size applies on its own; a family
 * has to become CSS because JSXGraph has no attribute for it.
 */
export function fontAttrsOf(
  obj: LiveObject | null | undefined,
  font: FontChoice,
): Record<string, unknown> {
  const stack = font.family === undefined ? null : fontStack(font.family);

  if (obj?.elType === 'text') {
    const attrs: Record<string, unknown> = {};
    if (font.size !== undefined) attrs.fontSize = font.size;
    if (stack !== null) {
      attrs.cssStyle = withFontFamily(obj.visProp?.cssstyle, stack);
      attrs.display = 'html';
    }
    return attrs;
  }

  const label: Record<string, unknown> = {};
  if (font.size !== undefined) label.fontSize = font.size;
  if (stack !== null) {
    label.cssStyle = withFontFamily(obj?.label?.visProp?.cssstyle, stack);
    label.display = 'html';
  }
  return { label };
}

/**
 * The same choice as the document keeps it. A point or curve stores the family
 * in label.fontFamily, exactly as the desktop exporter does, so a reload passes
 * the same stack through createElement again; a text keeps CSS because that is
 * what makes its own face.
 */
export function fontDocumentAttrs(
  el: { type: string; attrs: Record<string, unknown> },
  font: FontChoice,
): Record<string, unknown> {
  const stack = font.family === undefined ? null : fontStack(font.family);

  if (el.type === 'text') {
    const attrs: Record<string, unknown> = {};
    if (font.size !== undefined) attrs.fontSize = font.size;
    if (stack !== null) {
      const css = typeof el.attrs.cssStyle === 'string' ? el.attrs.cssStyle : undefined;
      attrs.cssStyle = withFontFamily(css, stack);
    }
    return attrs;
  }

  const label = { ...(el.attrs.label as Record<string, unknown> | undefined) };
  if (font.size !== undefined) label.fontSize = font.size;
  if (stack !== null) label.fontFamily = stack;
  return { label };
}
