/**
 * The toolbox is the first thing a Sketchpad user reaches for, and its whole
 * shape is "nine tools, three of them with a hidden tray". These tests keep
 * that shape: the tray members GSP documents, the order Shift+arrow moves
 * through them, and the fact that the three arrows are one tool with three
 * drag modes — which is what lets every existing selection path keep working.
 */
import { describe, expect, it } from 'vitest';
import { TOOL_HINTS, TOOL_LABELS, TOOL_SHORTCUTS } from './designTypes';
import {
  activeVariation,
  cycleFamily,
  cycleVariation,
  familyOf,
  isPolygonTool,
  rowVariation,
  TOOL_FAMILIES,
  variationHint,
  variationLabel,
} from './toolboxModel';

const family = (id: string) => TOOL_FAMILIES.find((f) => f.id === id)!;

describe('the toolbox families', () => {
  it('are the nine GSP tools in toolbox order', () => {
    expect(TOOL_FAMILIES.map((f) => f.id)).toEqual([
      'arrow', 'point', 'compass', 'straight', 'polygon', 'slider', 'text', 'pen', 'info', 'custom',
    ]);
  });

  it('give the arrow, straightedge and polygon trays their GSP members', () => {
    expect(family('arrow').variations.map((v) => v.arrow)).toEqual(['translate', 'rotate', 'dilate']);
    expect(family('straight').variations.map((v) => v.tool)).toEqual(['segment', 'ray', 'line']);
    expect(family('polygon').variations.map((v) => v.tool)).toEqual(['polygon', 'polygon_and_edges', 'polygon_edges']);
  });

  it('keeps the three arrows one tool, because they only differ while dragging', () => {
    expect(new Set(family('arrow').variations.map((v) => v.tool))).toEqual(new Set(['selection']));
    expect(familyOf('selection', 'dilate')?.id).toBe('arrow');
  });

  it('gives the canvas one click behaviour for the whole polygon tray', () => {
    for (const v of family('polygon').variations) expect(isPolygonTool(v.tool)).toBe(true);
    expect(isPolygonTool('segment')).toBe(false);
    expect(isPolygonTool('selection')).toBe(false);
  });

  it('labels and hints every row the toolbox can put on the canvas', () => {
    for (const f of TOOL_FAMILIES) {
      for (const v of f.variations) {
        expect(v.tool === 'selection' || TOOL_LABELS[v.tool]).toBeTruthy();
        expect(variationLabel(v).length).toBeGreaterThan(0);
        expect(variationHint(v).length).toBeGreaterThan(0);
        if (v.key) expect(variationLabel(v)).toContain(`(${v.key})`);
      }
    }
    // the row the designer is on is always describable
    expect(variationLabel(activeVariation('ray', 'translate')!)).toContain('Tia');
    expect(variationLabel(activeVariation('selection', 'rotate')!)).toContain('Quay');
  });

  it('reuses the copy in designTypes instead of re-inventing it', () => {
    for (const f of TOOL_FAMILIES) {
      for (const v of f.variations) {
        if (v.tool === 'selection') continue;
        expect(variationHint(v)).toBe(TOOL_HINTS[v.tool]);
      }
    }
  });

  it('tells the three arrows apart, because a drag means something different in each', () => {
    const labels = family('arrow').variations.map(variationLabel);
    expect(new Set(labels).size).toBe(3);
    const hints = family('arrow').variations.map(variationHint);
    expect(new Set(hints).size).toBe(3);
  });

  it('advertises the same shortcut key that the designer actually handles', () => {
    for (const f of TOOL_FAMILIES) {
      for (const v of f.variations) {
        if (!v.key) continue;
        expect(TOOL_SHORTCUTS[v.key.toLowerCase()]).toBe(v.tool);
      }
    }
  });
});

describe('keyboard tool switching', () => {
  it('Shift+Left/Right cycles the variations of the active family', () => {
    expect(cycleVariation('selection', 'translate', 1)?.arrow).toBe('rotate');
    expect(cycleVariation('selection', 'dilate', 1)?.arrow).toBe('translate');
    expect(cycleVariation('selection', 'translate', -1)?.arrow).toBe('dilate');
    expect(cycleVariation('line', 'translate', 1)?.tool).toBe('segment');
    expect(cycleVariation('polygon', 'translate', -1)?.tool).toBe('polygon_edges');
  });

  it('has nothing to cycle in a single-tool family', () => {
    expect(cycleVariation('point', 'translate', 1)).toBeUndefined();
    expect(cycleVariation('text', 'translate', -1)).toBeUndefined();
  });

  it('Shift+Up/Down walks the toolbox and skips the empty custom tray', () => {
    const order: string[] = [];
    let v = activeVariation('selection', 'translate')!;
    for (let i = 0; i < TOOL_FAMILIES.length; ++i) {
      order.push(familyOf(v.tool, v.arrow ?? 'translate')!.id);
      v = cycleFamily(v.tool, v.arrow ?? 'translate', 1)!;
    }
    expect(order).toEqual([
      'arrow', 'point', 'compass', 'straight', 'polygon', 'slider', 'text', 'pen', 'info', 'arrow',
    ]);
    expect(cycleFamily('info', 'translate', -1)?.tool).toBe('pen');
  });

  it('gives every row a member a single click activates', () => {
    // the row of the tool in hand keeps the variation it shows
    expect(rowVariation(family('straight'), 'line', 'translate')).toEqual(
      family('straight').variations[2]);
    // another family's row falls back to its first member, so Point, Text and
    // Pen are reachable with a mouse or a finger, not only by shortcut
    expect(rowVariation(family('point'), 'segment', 'translate')).toEqual(
      family('point').variations[0]);
    expect(rowVariation(family('text'), 'selection', 'dilate')).toEqual(
      family('text').variations[0]);
    expect(rowVariation(family('arrow'), 'segment', 'translate')).toEqual(
      family('arrow').variations[0]);
    // the custom tray has nothing to offer yet
    expect(rowVariation(family('custom'), 'segment', 'translate')).toBeUndefined();
  });
});
