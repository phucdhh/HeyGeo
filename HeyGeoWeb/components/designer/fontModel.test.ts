import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  FONT_FAMILIES,
  FONT_SIZES,
  canChangeFont,
  familyFromStack,
  fontAttrsOf,
  fontDocumentAttrs,
  fontStack,
  isFontKind,
  objectFontFamily,
  objectFontSize,
  sharedFontFamily,
  sharedFontSize,
  withFontFamily,
  type FontPick,
} from './fontModel';

const pick = (over: Partial<FontPick> = {}): FontPick => ({
  kind: 'point', size: 12, family: 'Arial', ...over,
});

const point = (over: Record<string, unknown> = {}) => ({
  elType: 'point',
  label: { visProp: { fontsize: 12 } },
  ...over,
});

describe('the desktop font menu', () => {
  it('offers its five families and five sizes in order', () => {
    expect(FONT_FAMILIES).toEqual([
      'Latin Modern Roman', 'CMU Serif', 'Times New Roman', 'Arial', 'Courier New',
    ]);
    expect(FONT_SIZES).toEqual([10, 12, 14, 20, 30]);
  });

  it('gives each family a stack with a fallback', () => {
    expect(fontStack('Times New Roman')).toContain("'Times New Roman'");
    expect(fontStack('Times New Roman')).toContain('serif');
    expect(fontStack('Courier New')).toContain('monospace');
    // an unknown face is still usable as a CSS name
    expect(fontStack('Georgia')).toBe('Georgia');
  });
});

describe('reading a family back out of CSS', () => {
  it('recognises the exporter stacks', () => {
    expect(familyFromStack("'Latin Modern Math', 'STIX Two Math', 'Times New Roman', serif"))
      .toBe('Latin Modern Roman');
    expect(familyFromStack("'CMU Serif', 'Latin Modern Roman', 'Times New Roman', serif"))
      .toBe('CMU Serif');
    expect(familyFromStack("'Times New Roman', Georgia, serif")).toBe('Times New Roman');
    expect(familyFromStack('Arial, Helvetica, sans-serif')).toBe('Arial');
    expect(familyFromStack("'Courier New', monospace")).toBe('Courier New');
  });

  it('recognises the engine default and ignores other declarations', () => {
    expect(familyFromStack('font-style: italic;font-family: Arial, Helvetica, Geneva, sans-serif'))
      .toBe('Arial');
    expect(familyFromStack('font-style: italic')).toBeNull();
    expect(familyFromStack(undefined)).toBeNull();
  });

  it('replaces a family and keeps the rest of the declarations', () => {
    expect(withFontFamily('font-style: italic', 'Arial, sans-serif'))
      .toBe('font-style: italic;font-family:Arial, sans-serif');
    expect(withFontFamily('font-family:serif;color:red', 'Arial, sans-serif'))
      .toBe('color:red;font-family:Arial, sans-serif');
    expect(withFontFamily(undefined, 'serif')).toBe('font-family:serif');
  });
});

describe('which picks can carry a font', () => {
  it('covers the desktop G_POINT | G_CURVE | G_TEXT kinds', () => {
    for (const kind of ['point', 'glider', 'midpoint', 'intersection',
      'curve', 'functiongraph', 'plot', 'tracecurve', 'text']) {
      expect(isFontKind(kind)).toBe(true);
    }
    for (const kind of ['segment', 'line', 'circle', 'polygon', 'slider', 'actionbutton']) {
      expect(isFontKind(kind)).toBe(false);
    }
  });

  it('needs something picked and every pick font-shaped', () => {
    expect(canChangeFont([])).toBe(false);
    expect(canChangeFont([pick(), pick({ kind: 'text' })])).toBe(true);
    expect(canChangeFont([pick(), pick({ kind: 'segment' })])).toBe(false);
  });

  it('shares a size only when every pick agrees', () => {
    expect(sharedFontSize([pick(), pick({ kind: 'text' })])).toBe(12);
    expect(sharedFontSize([pick({ size: 12 }), pick({ size: 20 })])).toBeNull();
    expect(sharedFontSize([pick({ size: null })])).toBeNull();
  });

  it('shares a family only when every pick agrees', () => {
    expect(sharedFontFamily([pick(), pick({ kind: 'text' })])).toBe('Arial');
    expect(sharedFontFamily([pick({ family: 'Arial' }), pick({ family: 'CMU Serif' })])).toBeNull();
  });
});

describe('reading the live font off an object', () => {
  it('reads a point from its label and a text from itself', () => {
    expect(objectFontSize(point())).toBe(12);
    expect(objectFontSize({ elType: 'text', visProp: { fontsize: 20 } })).toBe(20);
    expect(objectFontSize({ elType: 'curve', label: { visProp: { fontsize: 30 } } })).toBe(30);
    expect(objectFontSize(null)).toBeNull();
  });

  it('falls back to the engine defaults when nothing was set', () => {
    expect(objectFontSize({ elType: 'point', label: { visProp: {} } })).toBe(DEFAULT_FONT_SIZE);
    expect(objectFontFamily({ elType: 'point', label: { visProp: {} } })).toBe(DEFAULT_FONT_FAMILY);
  });

  it('names the family a label or text draws with', () => {
    expect(objectFontFamily({
      elType: 'point',
      label: { visProp: { cssstyle: 'font-family:"Times New Roman", Georgia, serif' } },
    })).toBe('Times New Roman');
    expect(objectFontFamily({
      elType: 'text',
      visProp: { cssstyle: 'font-style: italic' },
    })).toBe('Arial');
  });
});

describe('writing a font onto a live object', () => {
  it('gives a point and a curve the size on their label', () => {
    expect(fontAttrsOf(point(), { size: 20 }))
      .toEqual({ label: { fontSize: 20 } });
    expect(fontAttrsOf({ elType: 'curve', label: { visProp: {} } }, { size: 30 }))
      .toEqual({ label: { fontSize: 30 } });
  });

  it('gives a family to a label as CSS it can draw', () => {
    const attrs = fontAttrsOf(point(), { family: 'Times New Roman' });
    expect(attrs).toEqual({
      label: {
        cssStyle: "font-family:'Times New Roman', Georgia, serif",
        display: 'html',
      },
    });
  });

  it('keeps a label’s other declarations when the family changes', () => {
    const attrs = fontAttrsOf(
      { elType: 'point', label: { visProp: { cssstyle: 'font-style: italic' } } },
      { family: 'Courier New' },
    );
    expect((attrs.label as Record<string, unknown>).cssStyle)
      .toBe("font-style: italic;font-family:'Courier New', monospace");
  });

  it('sizes a text itself and gives it the family as CSS', () => {
    expect(fontAttrsOf({ elType: 'text', visProp: {} }, { size: 20 }))
      .toEqual({ fontSize: 20 });
    expect(fontAttrsOf(
      { elType: 'text', visProp: { cssstyle: 'font-style: italic' } },
      { family: 'Arial' },
    )).toEqual({
      cssStyle: 'font-style: italic;font-family:Arial, Helvetica, sans-serif',
      display: 'html',
    });
  });
});

describe('writing a font into the document', () => {
  it('stores both on the label, the way the exporter does', () => {
    expect(fontDocumentAttrs(
      { type: 'point', attrs: { strokeColor: '#000000', label: { withLabel: true } } },
      { family: 'CMU Serif', size: 20 },
    )).toEqual({
      label: { withLabel: true, fontSize: 20, fontFamily: "'CMU Serif', 'Latin Modern Roman', 'Times New Roman', serif" },
    });
  });

  it('stores a text’s size at the top level and its family as CSS', () => {
    expect(fontDocumentAttrs(
      { type: 'text', attrs: { strokeColor: '#333333', cssStyle: 'font-style: italic' } },
      { family: 'Arial', size: 14 },
    )).toEqual({
      fontSize: 14,
      cssStyle: 'font-style: italic;font-family:Arial, Helvetica, sans-serif',
    });
  });

  it('leaves out what the choice did not mention', () => {
    expect(fontDocumentAttrs({ type: 'point', attrs: { label: { withLabel: true } } }, { size: 30 }))
      .toEqual({ label: { withLabel: true, fontSize: 30 } });
    expect(fontDocumentAttrs({ type: 'text', attrs: {} }, { family: 'Arial' }))
      .toEqual({ cssStyle: 'font-family:Arial, Helvetica, sans-serif' });
  });
});
