import { describe, expect, it } from 'vitest';
import {
  LINE_STYLES,
  POINT_STYLES,
  objectMenu,
  selectionFacts,
  sketchMenu,
  type ContextItem,
  type ContextRow,
  type SelectionFacts,
} from './contextMenuModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boardPoint(id: string, over: any = {}) {
  return {
    id,
    elType: 'point',
    name: id.toUpperCase(),
    visProp: { visible: true, withLabel: true, trace: false, size: 3, strokecolor: '#000000', strokewidth: 2, ...over },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boardSegment(id: string, over: any = {}) {
  return {
    id,
    elType: 'segment',
    name: '',
    visProp: { visible: true, withLabel: false, trace: false, size: undefined, strokecolor: '#1e3c96', strokewidth: 2, ...over },
  };
}

const kindLabelOf = (kind: string) => ({ point: 'Điểm', segment: 'Đoạn thẳng', polygon: 'Đa giác' })[kind] ?? kind;

const items = (rows: ContextRow[]) => rows.filter((r): r is ContextItem => r.kind === 'item');
const ids = (rows: ContextRow[]) => items(rows).map((i) => i.id);

describe('the object Context menu', () => {
  it('follows Sketchpad order: name, then the commands, then styles, then display', () => {
    const rows = objectMenu(selectionFacts([boardSegment('s1')], kindLabelOf, true));
    expect(rows[0]).toEqual({ kind: 'header', label: 's1' });
    expect(ids(rows)).toEqual([
      'select-parents', 'properties',
      'line-style', 'line-style', 'line-style', 'line-style', 'color',
      'visibility', 'label',
      'trace',
    ]);
    expect(rows.filter((r) => r.kind === 'divider')).toHaveLength(3);
  });

  it('shows only commands that can actually run', () => {
    // A free point has no parents to select, so GSP would not offer the row.
    const free = objectMenu(selectionFacts([boardPoint('a')], kindLabelOf, false));
    expect(ids(free)).not.toContain('select-parents');
    const built = objectMenu(selectionFacts([boardPoint('a')], kindLabelOf, true));
    expect(ids(built)).toContain('select-parents');
  });

  it('offers point styles to points and line widths to everything else', () => {
    const point = items(objectMenu(selectionFacts([boardPoint('a')], kindLabelOf, false)));
    expect(point.filter((i) => i.id === 'point-style').map((i) => i.label))
      .toEqual(POINT_STYLES.map((s) => s.label));
    expect(point.some((i) => i.id === 'line-style')).toBe(false);

    const segment = items(objectMenu(selectionFacts([boardSegment('s1')], kindLabelOf, true)));
    expect(segment.filter((i) => i.id === 'line-style').map((i) => i.value))
      .toEqual(LINE_STYLES.map((s) => s.width));
    expect(segment.some((i) => i.id === 'point-style')).toBe(false);
  });

  it('ticks the style the whole selection shares and none when it disagrees', () => {
    const one = items(objectMenu(selectionFacts([boardPoint('a', { size: 5 })], kindLabelOf, false)));
    expect(one.filter((i) => i.checked).map((i) => i.label)).toEqual(['Lớn']);

    const mixed = items(objectMenu(
      selectionFacts([boardPoint('a', { size: 3 }), boardPoint('b', { size: 5 })], kindLabelOf, false),
    ));
    expect(mixed.filter((i) => i.id === 'point-style' && i.checked)).toHaveLength(0);
    // A group has no single kind, so the hide row drops to the plain word.
    expect(mixed.find((i) => i.id === 'visibility')?.label).toBe('Ẩn đối tượng');
  });

  it('names the object in the hide row the way GSP writes Hide Angle Marker', () => {
    const shown = items(objectMenu(selectionFacts([boardSegment('s1')], kindLabelOf, true)));
    expect(shown.find((i) => i.id === 'visibility')).toMatchObject({ label: 'Ẩn đoạn thẳng', value: false });
    const hidden = items(objectMenu(selectionFacts([boardSegment('s1', { visible: false })], kindLabelOf, true)));
    expect(hidden.find((i) => i.id === 'visibility')).toMatchObject({ label: 'Hiện đoạn thẳng', value: true });
  });

  it('hands the label and trace rows the state to switch to', () => {
    const rows = items(objectMenu(selectionFacts(
      [boardPoint('a', { withLabel: false, trace: false })], kindLabelOf, false,
    )));
    expect(rows.find((i) => i.id === 'label')).toMatchObject({ label: 'Hiện nhãn', value: true });
    expect(rows.find((i) => i.id === 'trace')).toMatchObject({ label: 'Để vết', value: true, checked: false });
  });

  it('puts a colour palette in the Color submenu and ticks the shared swatch', () => {
    const color = items(objectMenu(selectionFacts([boardPoint('a', { strokecolor: '#d32f2f' })], kindLabelOf, false)))
      .find((i) => i.id === 'color');
    expect(color?.submenu?.map((c) => c.value)).toContain('#d32f2f');
    expect(color?.submenu?.filter((c) => c.checked).map((c) => c.label)).toEqual(['Đỏ']);
  });

  it('stacks only the objects Sketchpad stacks', () => {
    const polygon = ids(objectMenu({
      ...selectionFacts([boardSegment('s1')], kindLabelOf, true),
      kind: 'polygon', kindLabel: 'Đa giác',
    }));
    expect(polygon.filter((i) => i === 'layer')).toHaveLength(2);
    expect(ids(objectMenu(selectionFacts([boardSegment('s1')], kindLabelOf, true)))).not.toContain('layer');
  });
});

describe('the sketch Context menu', () => {
  it('is the shortcut to the document commands that exist', () => {
    expect(ids(sketchMenu({ grid: true, axis: false }))).toEqual(['select-all', 'grid', 'axis']);
    const rows = items(sketchMenu({ grid: true, axis: false }));
    expect(rows.find((r) => r.id === 'grid')?.checked).toBe(true);
    expect(rows.find((r) => r.id === 'axis')?.checked).toBe(false);
  });
});

describe('selectionFacts', () => {
  it('counts a group instead of naming one object', () => {
    const f: SelectionFacts = selectionFacts([boardPoint('a'), boardPoint('b')], kindLabelOf, false);
    expect(f.name).toBe('2 đối tượng');
    expect(f.count).toBe(2);
    expect(f.labeled).toBe(true);
  });

  it('reports null for the attributes a group disagrees about', () => {
    const f = selectionFacts(
      [boardPoint('a', { trace: true }), boardPoint('b', { trace: false })],
      kindLabelOf, false,
    );
    expect(f.traced).toBeNull();
    expect(f.visible).toBe(true);
  });
});
