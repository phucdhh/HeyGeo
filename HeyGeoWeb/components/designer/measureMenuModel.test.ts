import { describe, expect, it } from 'vitest';
import { measureItems } from './measureMenuModel';
import type { HeyGeoElement } from './designTypes';

type Parent = HeyGeoElement['parents'][number];

const el = (type: string, id: string, parents: Parent[] = [], name = ''): HeyGeoElement => ({
  type, id, parents, attrs: name ? { name } : {},
});

const WORLD: HeyGeoElement[] = [
  el('point', 'A', [0, 0], 'A'),
  el('point', 'B', [4, 0], 'B'),
  el('point', 'C', [0, 3], 'C'),
  el('point', 'D', [4, 3], 'D'),
  el('midpoint', 'M', ['A', 'B'], 'M'),
  el('glider', 'G', [1, 1, 'k'], 'G'),
  el('segment', 's1', ['A', 'B']),
  el('segment', 's2', ['C', 'D']),
  el('segment', 'd1', ['A', 'C'], 'd'),
  el('line', 'L', ['B', 'C']),
  el('circle', 'k', ['A', 'B'], 'k'),
  el('arc', 'arc1', ['A', 'B', 'C']),
  el('polygon', 'poly1', ['A', 'B', 'C', 'D']),
  el('sector', 'sec1', ['A', 'B', 'C']),
  el('slider', 'sl1', [[-5, -5], [-1, -5], [0, 10, 5]]),
];

const specs = (selection: string[], id: string) =>
  measureItems(WORLD, selection).find((i) => i.id === id)!.specs;
/** The caption a one-object selection writes, or null when the row is greyed. */
const offered = (selection: string[], id: string) => specs(selection, id)[0] ?? null;

describe('the Measure menu', () => {
  it('lists the desktop menu in order', () => {
    expect(measureItems(WORLD, []).map((i) => i.id)).toEqual([
      'length', 'distance', 'perimeter', 'circumference', 'angle', 'area',
      'arcAngle', 'arcLength', 'radius', 'ratio', 'value',
      'coordinates', 'abscissa', 'ordinate', 'coordinateDistance', 'slope', 'equation',
    ]);
  });

  it('greys the whole menu out for nothing', () => {
    for (const item of measureItems(WORLD, [])) expect(item.specs, item.id).toEqual([]);
    for (const item of measureItems(WORLD, ['A'])) {
      if (!['coordinates', 'abscissa', 'ordinate'].includes(item.id)) {
        expect(item.specs, item.id).toEqual([]);
      }
    }
  });

  it('names a segment by the points it stands on', () => {
    expect(offered(['s1'], 'length')).toEqual({
      op: 'length', args: ['s1'], label: 'AB', precision: 2, unit: ' cm',
    });
    // and by its own name once the designer has given it one
    expect(offered(['d1'], 'length')).toMatchObject({ label: 'd' });
  });

  it('measures everything of one kind the selection holds', () => {
    // the desktop loops the selection: three segments give three lengths
    expect(specs(['s1', 's2', 'd1'], 'length').map((s) => s.label)).toEqual(['AB', 'CD', 'd']);
    // but a mixed selection defines no length at all
    expect(specs(['s1', 'A'], 'length')).toEqual([]);
  });

  it('measures two points between themselves and a point to a line the short way', () => {
    expect(offered(['A', 'B'], 'distance')).toMatchObject({
      op: 'distance', args: ['A', 'B'], label: 'AB',
    });
    expect(offered(['A', 'L'], 'distance')).toMatchObject({
      op: 'pointSegmentDistance', args: ['A', 'L'],
    });
    // whichever way round they were picked, the point comes first
    expect(offered(['L', 'A'], 'distance')).toMatchObject({ args: ['A', 'L'] });
    // three points are not a distance
    expect(specs(['A', 'B', 'C'], 'distance')).toEqual([]);
  });

  it('takes the angle with the second pick as its vertex', () => {
    expect(offered(['A', 'B', 'C'], 'angle')).toEqual({
      op: 'angle', args: ['A', 'B', 'C'], label: 'm\u2220ABC', precision: 2, unit: '\u00b0',
    });
    expect(offered(['A', 'C'], 'angle')).toBeNull();
    expect(offered(['A', 'B', 'k'], 'angle')).toBeNull();
  });

  it('areas a shape, and an arc the bow it closes', () => {
    expect(offered(['poly1'], 'area')).toMatchObject({ op: 'area', label: 'Area ABCD' });
    expect(offered(['k'], 'area')).toMatchObject({ op: 'area', label: 'Area k' });
    expect(offered(['sec1'], 'area')).toMatchObject({ op: 'area', label: 'Area ABC' });
    expect(offered(['arc1'], 'area')).toMatchObject({ op: 'segmentArea', label: 'Area ABC' });
    expect(offered(['A'], 'area')).toBeNull();
  });

  it('areas the sector an arc through three points fills', () => {
    const world = [
      el('point', 'A', [0, 0], 'A'),
      el('point', 'B', [4, 0], 'B'),
      el('point', 'C', [0, 3], 'C'),
      el('circumcirclesector', 'cs1', ['A', 'B', 'C']),
    ];
    const area = measureItems(world, ['cs1']).find((i) => i.id === 'area')!;
    // the wedge is a filled shape, not an arc, so its whole area is the area
    expect(area.specs[0]).toMatchObject({ op: 'area', label: 'Area ABC' });
    // ... and it is not an arc to read along
    expect(measureItems(world, ['cs1']).find((i) => i.id === 'arcLength')!.specs).toEqual([]);
  });

  it('reads an arc three ways', () => {
    expect(offered(['arc1'], 'arcAngle')).toMatchObject({ op: 'arcAngle', label: 'm\u2220ABC', unit: '\u00b0' });
    expect(offered(['arc1'], 'arcLength')).toMatchObject({ op: 'arcLength', label: 'ABC', unit: ' cm' });
    expect(offered(['arc1'], 'radius')).toMatchObject({ op: 'radius', label: 'Radius ABC', unit: ' cm' });
    // a circle has no arc to measure along
    expect(offered(['k'], 'arcLength')).toBeNull();
  });

  it('ratios two segments and circles round to their own items', () => {
    expect(offered(['s1', 's2'], 'ratio')).toMatchObject({ op: 'ratio', label: 'AB/CD' });
    expect(offered(['s1'], 'ratio')).toBeNull();
    expect(offered(['poly1'], 'perimeter')).toMatchObject({ op: 'perimeter', label: 'Perimeter ABCD' });
    expect(offered(['k'], 'circumference')).toMatchObject({ op: 'circumference', label: 'Circumference k' });
  });

  it('measures any point, however it was made', () => {
    for (const id of ['A', 'M', 'G']) {
      const label = WORLD.find((e) => e.id === id)!.attrs.name as string;
      expect(offered([id], 'coordinates')).toMatchObject({ op: 'coordinates', label });
      expect(offered([id], 'abscissa')).toMatchObject({ label: `x<sub>${label}</sub>` });
      expect(offered([id], 'ordinate')).toMatchObject({ label: `y<sub>${label}</sub>` });
    }
    expect(offered(['s1'], 'coordinates')).toBeNull();
    // a handful of points is a handful of coordinates, as it is on the desktop
    expect(specs(['A', 'B', 'C'], 'coordinates').map((s) => s.label)).toEqual(['A', 'B', 'C']);
  });

  it('gives the slope of anything straight and the equation of a line or a circle', () => {
    expect(offered(['L'], 'slope')).toMatchObject({ op: 'slope', label: 'Slope BC' });
    expect(offered(['s1'], 'slope')).toMatchObject({ op: 'slope' });
    expect(offered(['k'], 'slope')).toBeNull();
    expect(offered(['L'], 'equation')).toMatchObject({ op: 'equationLine' });
    expect(offered(['k'], 'equation')).toMatchObject({ op: 'equationCircle', label: 'Equation k' });
    // the desktop rules a segment out of an equation
    expect(offered(['s1'], 'equation')).toBeNull();
    expect(specs(['L', 'k'], 'equation').map((s) => s.op)).toEqual(['equationLine', 'equationCircle']);
  });

  it('reads a slider as a number of its own', () => {
    expect(offered(['sl1'], 'value')).toEqual({ op: 'value', args: ['sl1'], label: 'sl1', precision: 2 });
  });

  it('offers nothing whose geometry has left the board', () => {
    expect(offered(['ghost'], 'coordinates')).toBeNull();
    const noEndpoints = [el('segment', 's9', ['A', 'gone'])];
    expect(measureItems(noEndpoints, ['s9']).find((i) => i.id === 'length')!.specs).toEqual([]);
    // and the row beside it survives: a point among segments loses length only
    expect(specs(['s1', 'ghost'], 'length')).toEqual([]);
  });
});

/** A frame the designer defined: origin at (1,1), its unit point 1.5 units right. */
const FRAMED: HeyGeoElement[] = [
  ...WORLD,
  { type: 'point', id: 'O', parents: [1, 1], attrs: { name: 'O', coordsys: { unit: 'U' } } },
  el('point', 'U', [2.5, 1], 'U'),
];

const framed = (selection: string[], id: string) =>
  measureItems(FRAMED, selection).find((i) => i.id === id)!.specs;

describe('the Measure menu over a frame the designer defined', () => {
  it('reads a point in that frame instead of in the board', () => {
    expect(framed(['A'], 'coordinates')).toEqual([
      { op: 'relativeCoordinates', args: ['O', 'U', 'A'], label: 'A', precision: 2 },
    ]);
    expect(framed(['A'], 'abscissa')).toEqual([
      { op: 'relativeAbscissa', args: ['O', 'U', 'A'], label: 'x<sub>A</sub>', precision: 2 },
    ]);
    expect(framed(['A'], 'ordinate')).toMatchObject([
      { op: 'relativeOrdinate', args: ['O', 'U', 'A'], label: 'y<sub>A</sub>' },
    ]);
  });

  it('names the point it measures, not the frame it reads through', () => {
    expect(framed(['A', 'B', 'C'], 'coordinates').map((s) => s.label)).toEqual(['A', 'B', 'C']);
    expect(framed(['M'], 'abscissa')[0].label).toBe('x<sub>M</sub>');
  });

  it('measures two points between themselves in that frame', () => {
    expect(framed(['A', 'B'], 'coordinateDistance')).toEqual([
      { op: 'relativeDistance', args: ['O', 'U', 'A', 'B'], label: 'AB', precision: 2, unit: ' cm' },
    ]);
    // the pick order is the pair, as it is for a plain distance
    expect(framed(['B', 'A'], 'coordinateDistance')[0]).toMatchObject({ args: ['O', 'U', 'B', 'A'], label: 'BA' });
  });

  it('greys the coordinate distance without a frame or without two points', () => {
    // the desktop needs a coordinate system in the document to read it through
    expect(offered(['A', 'B'], 'coordinateDistance')).toBeNull();
    expect(framed(['A'], 'coordinateDistance')).toEqual([]);
    expect(framed(['A', 'M', 'B'], 'coordinateDistance')).toEqual([]);
    expect(framed(['A', 's1'], 'coordinateDistance')).toEqual([]);
  });

  it('leaves every other row alone', () => {
    expect(framed(['s1'], 'length')[0]).toMatchObject({ op: 'length', label: 'AB' });
    expect(framed(['A', 'B'], 'distance')[0]).toMatchObject({ op: 'distance' });
  });

  it('uses the board frame while nothing is marked', () => {
    expect(specs(['A'], 'coordinates')[0]).toMatchObject({ op: 'coordinates', args: ['A'] });
  });

  it('falls back to the board when the frame loses a point', () => {
    const broken = FRAMED.filter((e) => e.id !== 'U');
    expect(measureItems(broken, ['A']).find((i) => i.id === 'coordinates')!.specs)
      .toMatchObject([{ op: 'coordinates', args: ['A'] }]);
  });
});
