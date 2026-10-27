/**
 * The toolbox as The Geometer's Sketchpad presents it.
 *
 * GSP has nine tools, and three of them hide variations in a tray that pops
 * out when the icon is pressed and held (Reference Center/tools.htm: "The
 * Selection Arrow, Straightedge, and Polygon tools each come in three
 * variations… press and hold the icon in the Toolbox until a menu pops out").
 * With a family already active, Shift+Left/Right cycles its variations and
 * Shift+Up/Down moves through the toolbox — no drag needed.
 *
 * The three arrows select identically and differ only in what a drag does, so
 * they share the `selection` tool and carry an `arrow` mode beside it.
 *
 * Two rows are HeyGeo's own: the compass tray offers an arc as well as a
 * circle, and the slider has no GSP equivalent.
 */
import { TOOL_HINTS, TOOL_LABELS, type ToolMode } from './designTypes';

export type ArrowMode = 'translate' | 'rotate' | 'dilate';

export interface ToolVariation {
  tool: ToolMode;
  /** Only the arrow family uses this; every other variation leaves it out. */
  arrow?: ArrowMode;
  /** Letter the tray shows as the keyboard shortcut, if it has one. */
  key?: string;
}

export interface ToolFamily {
  id: 'arrow' | 'point' | 'compass' | 'straight' | 'polygon' | 'slider' | 'text' | 'pen' | 'info' | 'custom';
  variations: ToolVariation[];
}

export const TOOL_FAMILIES: ToolFamily[] = [
  {
    id: 'arrow',
    variations: [
      { tool: 'selection', arrow: 'translate', key: 'S' },
      { tool: 'selection', arrow: 'rotate' },
      { tool: 'selection', arrow: 'dilate' },
    ],
  },
  { id: 'point',    variations: [{ tool: 'point', key: 'P' }] },
  { id: 'compass',  variations: [{ tool: 'compass', key: 'C' }, { tool: 'arc' }] },
  { id: 'straight', variations: [{ tool: 'segment', key: 'D' }, { tool: 'ray', key: 'R' }, { tool: 'line', key: 'L' }] },
  {
    id: 'polygon',
    variations: [
      { tool: 'polygon', key: 'G' },
      { tool: 'polygon_and_edges', key: 'F' },
      { tool: 'polygon_edges', key: 'O' },
    ],
  },
  { id: 'slider',   variations: [{ tool: 'slider', key: 'V' }] },
  { id: 'text',     variations: [{ tool: 'text', key: 'T' }] },
  { id: 'pen',      variations: [{ tool: 'pen', key: 'X' }] },
  { id: 'info',     variations: [{ tool: 'info', key: 'I' }] },
  // GSP's last row is the custom-tool tray; no custom tool has been recorded yet.
  { id: 'custom',   variations: [] },
];

/** TOOL_LABELS has one label for the whole arrow tool, so the modes name themselves. */
const ARROW_LABELS: Record<ArrowMode, string> = {
  translate: 'Mũi tên – Dịch chuyển',
  rotate:    'Mũi tên – Quay',
  dilate:    'Mũi tên – Co giãn',
};

const ARROW_HINTS: Record<ArrowMode, string> = {
  translate: 'Nhấp để chọn, kéo để di chuyển',
  rotate:    'Kéo đối tượng đang chọn để quay quanh tâm đã đánh dấu; nhấp đúp một điểm để đánh dấu tâm',
  dilate:    'Kéo đối tượng đang chọn để co giãn quanh tâm đã đánh dấu',
};

export function variationLabel(v: ToolVariation): string {
  const base = v.tool === 'selection' ? ARROW_LABELS[v.arrow ?? 'translate'] : TOOL_LABELS[v.tool];
  return v.key ? `${base} (${v.key})` : base;
}

/** Status bar text while this variation is the active tool. */
export function variationHint(v: ToolVariation): string {
  return v.tool === 'selection' ? ARROW_HINTS[v.arrow ?? 'translate'] : TOOL_HINTS[v.tool];
}

function sameVariation(a: ToolVariation, tool: ToolMode, arrow: ArrowMode): boolean {
  return a.tool === tool && (a.arrow === undefined ? true : a.arrow === arrow);
}

/** The family a tool belongs to, or null for a mode the toolbox does not own. */
export function familyOf(tool: ToolMode, arrow: ArrowMode): ToolFamily | null {
  return TOOL_FAMILIES.find((f) => f.variations.some((v) => sameVariation(v, tool, arrow))) ?? null;
}

/** The tray row the designer is currently on, for the icon and the status bar. */
export function activeVariation(tool: ToolMode, arrow: ArrowMode): ToolVariation | undefined {
  return TOOL_FAMILIES.flatMap((f) => f.variations).find((v) => sameVariation(v, tool, arrow));
}

/** True when this tray row is the one the toolbox is on. */
export function isActiveVariation(v: ToolVariation, tool: ToolMode, arrow: ArrowMode): boolean {
  return sameVariation(v, tool, arrow);
}

/**
 * The three polygon tools gather vertices the same way; only what they leave on
 * the board differs.
 */
export function isPolygonTool(tool: ToolMode): boolean {
  return tool === 'polygon' || tool === 'polygon_and_edges' || tool === 'polygon_edges';
}

/** Shift+Left/Right: the next variation inside the active family. */
export function cycleVariation(tool: ToolMode, arrow: ArrowMode, dir: 1 | -1): ToolVariation | undefined {
  const family = familyOf(tool, arrow);
  if (!family || family.variations.length < 2) return undefined;
  const at = family.variations.findIndex((v) => sameVariation(v, tool, arrow));
  const n = family.variations.length;
  return family.variations[(Math.max(at, 0) + dir + n) % n];
}

/**
 * Shift+Up/Down: the next family in the toolbox, entering it on its first
 * variation.
 */
export function cycleFamily(tool: ToolMode, arrow: ArrowMode, dir: 1 | -1): ToolVariation | undefined {
  const withVariations = TOOL_FAMILIES.filter((f) => f.variations.length > 0);
  const at = withVariations.findIndex((f) => f.variations.some((v) => sameVariation(v, tool, arrow)));
  const n = withVariations.length;
  return withVariations[(Math.max(at, 0) + dir + n) % n].variations[0];
}
