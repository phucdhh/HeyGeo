// ─── Sketchpad Context menu ──────────────────────────────────────────────────
// The menu that appears on right-click (Ctrl+click on a Mac) is not a copy of
// the menu bar: GSP documents it as a curated digest of the commands that apply
// to the clicked object, or to the whole sketch when the click lands on empty
// space ("Context menus show only available commands", menus_context.htm).
// The order below follows that page and the two object captures it ships
// (menu_context_object_zoom75.png, menu_context_toolobj_zoom75.png).
//
// Item labels are Vietnamese, the language every dialog in this designer uses;
// GSP's own strings are cited beside each one so the shape stays checkable.

export type ContextCommand =
  | 'select-parents'   // Select Parents
  | 'properties'       // Properties…
  | 'point-style'      // Dot / Small / Medium / Large
  | 'line-style'       // Hairline / Thin / Medium / Thick
  | 'color'            // Color ▶
  | 'visibility'       // Hide <Kind> / Show <Kind>
  | 'label'            // Show Label
  | 'trace'            // Trace
  | 'layer'            // Bring to Front / Send to Back
  | 'select-all'       // Select All
  | 'grid'             // Square Grid
  | 'axis';            // Show Coordinate System

export interface ContextItem {
  kind: 'item';
  id: ContextCommand;
  label: string;
  /** The argument the command runs with: a pixel size, a hex colour, a boolean. */
  value?: number | string | boolean;
  /** GSP ticks the style the whole selection already shares, and none if mixed. */
  checked?: boolean;
  submenu?: ContextItem[];
}

export type ContextRow =
  | { kind: 'header'; label: string }
  | { kind: 'divider' }
  | ContextItem;

/** GSP's four point styles; the numbers are JSXGraph point radii in pixels. */
/** GSP's four point sizes. `label` is the Vietnamese the body copy shows. */
export const POINT_STYLES = [
  { label: 'Chấm', en: 'Dot', size: 1 },
  { label: 'Nhỏ', en: 'Small', size: 2 },
  { label: 'Trung bình', en: 'Medium', size: 3 },
  { label: 'Lớn', en: 'Large', size: 5 },
] as const;

/** GSP's four line widths, on the 1–4 scale this designer already draws with. */
export const LINE_STYLES = [
  { label: 'Mảnh', width: 1 },
  { label: 'Mỏng', width: 2 },
  { label: 'Trung bình', width: 3 },
  { label: 'Dày', width: 4 },
] as const;

/**
 * Display | Color: GSP's eight swatches. `name` is GSP's own word, which the
 * English menu bar shows; `label` is what the Vietnamese popup calls it.
 */
export const COLOR_SWATCHES = [
  { name: 'Black',  label: 'Đen',        value: '#000000' },
  { name: 'Gray',   label: 'Xám',        value: '#808080' },
  { name: 'Red',    label: 'Đỏ',         value: '#d32f2f' },
  { name: 'Green',  label: 'Xanh lá',    value: '#388e3c' },
  { name: 'Blue',   label: 'Xanh dương', value: '#1565c0' },
  { name: 'Yellow', label: 'Vàng',       value: '#f9a825' },
  { name: 'Purple', label: 'Tím',        value: '#7b1fa2' },
  { name: 'Cyan',   label: 'Xanh ngọc',  value: '#00838f' },
] as const;

/** Layered objects, per menus_context_frontback.htm: interiors and pictures. */
const LAYERED_KINDS = ['polygon'];

/** Only the point-like objects carry a style of their own; the rest are strokes. */
export function isPointLike(kind: string): boolean {
  return kind === 'point' || kind === 'glider' || kind === 'midpoint' || kind === 'intersection';
}

/**
 * What the menu can say about the objects it was asked for. `null` means the
 * selection does not agree on that attribute, which is how a check mark
 * disappears from a style row: GSP ticks a style only when every selected
 * object already has it.
 */
export interface SelectionFacts {
  kind: string;
  /** Kind name shown in "Ẩn đa giác", the way GSP writes "Hide Angle Marker". */
  kindLabel: string;
  name: string;
  count: number;
  visible: boolean | null;
  labeled: boolean | null;
  traced: boolean | null;
  pointStyle: number | null;
  lineWidth: number | null;
  color: string | null;
  /** False for a free point: there is nothing above it to select. */
  hasParents: boolean;
}

export interface SketchFacts {
  grid: boolean;
  axis: boolean;
}

const shared = <T,>(values: T[]): T | null =>
  values.length === 0 || values.every((v) => v === values[0]) ? values[0] ?? null : null;

/** Read the facts a menu needs straight off the board objects. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function selectionFacts(objs: any[], kindLabelOf: (kind: string) => string, hasParents: boolean): SelectionFacts {
  const first = objs[0];
  const visProp = (o: any) => o?.visProp ?? {};
  const sizes = objs.map((o) => visProp(o).size);
  const widths = objs.map((o) => visProp(o).strokewidth);
  const colors = objs.map((o) => visProp(o).strokecolor);
  return {
    kind: first?.elType ?? 'unknown',
    kindLabel: kindLabelOf(first?.elType ?? 'unknown'),
    name: objs.length > 1 ? `${objs.length} đối tượng` : String(first?.name || first?.id || ''),
    count: objs.length,
    visible: shared(objs.map((o) => visProp(o).visible !== false)),
    labeled: shared(objs.map((o) => visProp(o).withLabel === true)),
    traced: shared(objs.map((o) => visProp(o).trace === true)),
    pointStyle: isPointLike(first?.elType) ? shared(sizes) : null,
    lineWidth: shared(widths),
    color: shared(colors),
    hasParents,
  };
}

/** The object Context menu, in GSP's order. */
export function objectMenu(f: SelectionFacts): ContextRow[] {
  const rows: ContextRow[] = [{ kind: 'header', label: f.name }];

  const commands: ContextItem[] = [];
  if (f.hasParents) commands.push({ kind: 'item', id: 'select-parents', label: 'Chọn các đối tượng cha' });
  commands.push({ kind: 'item', id: 'properties', label: 'Thuộc tính…' });
  rows.push(...commands, { kind: 'divider' });

  const styles: ContextItem[] = [];
  if (f.pointStyle !== null || isPointLike(f.kind)) {
    styles.push(...POINT_STYLES.map((s) => ({
      kind: 'item' as const, id: 'point-style' as const, label: s.label,
      value: s.size, checked: f.pointStyle === s.size,
    })));
  } else {
    styles.push(...LINE_STYLES.map((s) => ({
      kind: 'item' as const, id: 'line-style' as const, label: s.label,
      value: s.width, checked: f.lineWidth === s.width,
    })));
  }
  styles.push({
    kind: 'item', id: 'color', label: 'Màu',
    submenu: COLOR_SWATCHES.map((c) => ({
      kind: 'item' as const, id: 'color' as const, label: c.label,
      value: c.value, checked: f.color === c.value,
    })),
  });
  rows.push(...styles, { kind: 'divider' });

  const display: ContextItem[] = [];
  // GSP interpolates the kind into the row ("Hide Angle Marker"); a group, or a
  // selection that is partly hidden, has no single kind, so it gets the plain word.
  const noun = f.count > 1 || f.visible === null ? 'đối tượng' : f.kindLabel.toLowerCase();
  const hiding = f.visible !== false;
  display.push({ kind: 'item', id: 'visibility', label: hiding ? `Ẩn ${noun}` : `Hiện ${noun}`, value: !hiding });
  if (f.labeled !== null) {
    display.push({
      kind: 'item', id: 'label', label: f.labeled ? 'Ẩn nhãn' : 'Hiện nhãn',
      value: f.labeled === false,
    });
  }
  rows.push(...display);

  const extras: ContextItem[] = [];
  if (f.traced !== null) {
    extras.push({ kind: 'item', id: 'trace', label: 'Để vết', checked: f.traced, value: f.traced !== true });
  }
  if (LAYERED_KINDS.includes(f.kind)) {
    extras.push({ kind: 'item', id: 'layer', label: 'Đưa lên trước', value: 'front' });
    extras.push({ kind: 'item', id: 'layer', label: 'Gửi ra sau', value: 'back' });
  }
  if (extras.length > 0) rows.push({ kind: 'divider' }, ...extras);

  return rows;
}

/** The Context menu for empty space, which GSP uses as a shortcut to the sketch. */
export function sketchMenu(f: SketchFacts): ContextRow[] {
  return [
    { kind: 'item', id: 'select-all', label: 'Chọn tất cả' },
    { kind: 'divider' },
    { kind: 'item', id: 'grid', label: 'Lưới vuông', checked: f.grid },
    { kind: 'item', id: 'axis', label: 'Hệ trục tọa độ', checked: f.axis },
  ];
}
