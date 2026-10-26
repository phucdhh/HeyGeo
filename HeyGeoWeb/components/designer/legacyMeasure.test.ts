import { describe, expect, it } from 'vitest';
import { migrateLegacyMeasure, sourceIds } from './legacyMeasure';
import { isLegacyCodeSource, type ElementSpec } from './elementRegistry';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A text element written the way the pre-descriptor designer wrote it. */
const legacyText = (x: unknown, y: unknown, caption: string): ElementSpec => ({
  type: 'text', id: 'm1', parents: [x, y, caption], attrs: { fontSize: 13 },
});

/** The descriptor a migrated element must carry, without the anchor. */
const measureOf = (el: ElementSpec): any => migrateLegacyMeasure(el)?.attrs?.measure;
const anchorOf = (el: ElementSpec): any => migrateLegacyMeasure(el)?.attrs?.anchor;

describe('the source detector', () => {
  it('tells executable source from a caption', () => {
    expect(isLegacyCodeSource('function(){return 1}')).toBe(true);
    expect(isLegacyCodeSource('(function(){return 1})()')).toBe(false);
    expect(isLegacyCodeSource('AB = 5.00 cm')).toBe(false);
    expect(isLegacyCodeSource(12)).toBe(false);
  });

  it('reads the ids a source touches, deduplicated', () => {
    expect(sourceIds("board.objects['B'].X()-bo['A'].X()+bo['B'].Y()")).toEqual(['B', 'A']);
    expect(sourceIds("'d = '+Math.sqrt(2)")).toEqual([]);
  });
});

describe('migrating the designer templates', () => {
  // One pair per measurement the web designer used to persist as source. The
  // strings are copied from the pre-descriptor DesignCanvas, verbatim.
  const cases: [string, string, unknown, unknown, string][] = [
    ['distance', 'd',
      "function(){return (board.objects['A'].X()+board.objects['B'].X())/2}",
      "function(){return (board.objects['A'].Y()+board.objects['B'].Y())/2+0.5}",
      "function(){return 'd = '+Math.sqrt(Math.pow(board.objects['B'].X()-board.objects['A'].X(),2)+Math.pow(board.objects['B'].Y()-board.objects['A'].Y(),2)).toFixed(3)}",
    ],
    ['length', 'L',
      "function(){return (board.objects['p1'].X()+board.objects['p2'].X())/2}",
      "function(){return (board.objects['p1'].Y()+board.objects['p2'].Y())/2+0.5}",
      "function(){return 'L = '+Math.sqrt(Math.pow(board.objects['p2'].X()-board.objects['p1'].X(),2)+Math.pow(board.objects['p2'].Y()-board.objects['p1'].Y(),2)).toFixed(3)}",
    ],
    ['radius', 'r',
      "function(){var c=board.objects['c1']; return c.center.X()+c.Radius()*1.1}",
      "function(){return board.objects['c1'].center.Y()}",
      "function(){return 'r = '+board.objects['c1'].Radius().toFixed(3)}",
    ],
    ['circumference', 'C',
      "function(){var c=board.objects['c1']; return c.center.X()+c.Radius()*1.1}",
      "function(){return board.objects['c1'].center.Y()}",
      "function(){return 'C = '+(2*Math.PI*board.objects['c1'].Radius()).toFixed(3)}",
    ],
    ['area', 'A',
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.X()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.Y()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return 'A = '+Math.abs(p.Area?p.Area():0).toFixed(3)}",
    ],
    ['perimeter', 'P',
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.X()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.Y()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return 'P = '+(p.Perimeter?p.Perimeter().toFixed(3):'…')}",
    ],
    ['coordinates', 'B',
      "function(){return board.objects['B'].X()+0.3}",
      "function(){return board.objects['B'].Y()-0.3}",
      "function(){var pt=board.objects['B']; return 'B: ('+pt.X().toFixed(2)+', '+pt.Y().toFixed(2)+')'}",
    ],
    ['abscissa', 'x_{B}',
      "function(){return board.objects['B'].X()+0.3}",
      "function(){return board.objects['B'].Y()-0.3}",
      "function(){var pt=board.objects['B']; return 'x_{B} = '+board.objects['B'].X().toFixed(2)}",
    ],
    ['ordinate', 'y_{B}',
      "function(){return board.objects['B'].X()+0.3}",
      "function(){return board.objects['B'].Y()-0.3}",
      "function(){var pt=board.objects['B']; return 'y_{B} = '+board.objects['B'].Y().toFixed(2)}",
    ],
    ['slope', 'm',
      "function(){var l=board.objects['L']; return (l.point1.X()+l.point2.X())/2}",
      "function(){var l=board.objects['L']; return (l.point1.Y()+l.point2.Y())/2+0.4}",
      "function(){var l=board.objects['L']; var dx=l.point2.X()-l.point1.X(); if(Math.abs(dx)<1e-6)return 'm = ∞'; return 'm = '+((l.point2.Y()-l.point1.Y())/dx).toFixed(2)}",
    ],
    ['equationLine', '',
      "function(){var l=board.objects['L']; return (l.point1.X()+l.point2.X())/2}",
      "function(){var l=board.objects['L']; return (l.point1.Y()+l.point2.Y())/2+0.4}",
      "function(){var l=board.objects['L']; var p1=l.point1,p2=l.point2; var a=p1.Y()-p2.Y(),b=p2.X()-p1.X(),c=p1.X()*p2.Y()-p2.X()*p1.Y(); return a.toFixed(1)+'x + '+b.toFixed(1)+'y + '+c.toFixed(1)+' = 0'}",
    ],
    ['equationCircle', '',
      "function(){var c=board.objects['c1']; return c.X()+0.5}",
      "function(){var c=board.objects['c1']; return c.Y()-0.5}",
      "function(){var circ=board.objects['c1']; var c=circ.center||circ.point1; var r=circ.Radius?circ.Radius():1; return '(x - '+c.X().toFixed(1)+')² + (y - '+c.Y().toFixed(1)+')² = '+(r*r).toFixed(1)}",
    ],
  ];

  it.each(cases)('turns %s into a descriptor', (_name, label, x, y, caption) => {
    const out = migrateLegacyMeasure(legacyText(x, y, caption));
    expect(out).not.toBeNull();
    const measure = out!.attrs!.measure as any;
    expect(measure.label ?? '').toBe(label);
    // every parent the source read is now a data reference
    expect(measure.args.length).toBeGreaterThan(0);
    expect(JSON.stringify(out)).not.toMatch(/function\(/);
  });

  it('keeps the caption ids, precision and unit the source computed', () => {
    const d = legacyText(
      "function(){return (board.objects['A'].X()+board.objects['B'].X())/2}",
      "function(){return (board.objects['A'].Y()+board.objects['B'].Y())/2+0.5}",
      "function(){return 'd = '+Math.sqrt(Math.pow(board.objects['B'].X()-board.objects['A'].X(),2)+Math.pow(board.objects['B'].Y()-board.objects['A'].Y(),2)).toFixed(3)}",
    );
    expect(measureOf(d)).toEqual({ op: 'distance', args: ['B', 'A'], label: 'd', precision: 3 });
    expect(anchorOf(d)).toEqual({ of: ['A', 'B'], dx: 0, dy: 0.5 });
  });

  it('writes the anchor a circle caption used', () => {
    const r = legacyText(
      "function(){var c=board.objects['c1']; return c.center.X()+c.Radius()*1.1}",
      "function(){return board.objects['c1'].center.Y()}",
      "function(){return 'r = '+board.objects['c1'].Radius().toFixed(3)}",
    );
    expect(measureOf(r)).toEqual({ op: 'radius', args: ['c1'], label: 'r', precision: 3 });
    expect(anchorOf(r)).toEqual({ of: ['c1'], dx: 0, dy: 0, radiusFactor: 1.1 });
  });

  it('writes the anchor a polygon caption used', () => {
    const a = legacyText(
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.X()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return p.vertices.reduce(function(s,v){return s+v.Y()},0)/p.vertices.length}",
      "function(){var p=board.objects['poly1']; return 'A = '+Math.abs(p.Area?p.Area():0).toFixed(3)}",
    );
    expect(measureOf(a)).toEqual({ op: 'area', args: ['poly1'], label: 'A', precision: 3 });
    expect(anchorOf(a)).toEqual({ of: ['poly1'], dx: 0, dy: 0 });
  });

  it('drops the source parents but keeps the plain ones', () => {
    const migrated = migrateLegacyMeasure(legacyText(
      "function(){return board.objects['B'].X()+0.3}",
      "function(){return board.objects['B'].Y()-0.3}",
      "function(){var pt=board.objects['B']; return 'B: ('+pt.X().toFixed(2)+', '+pt.Y().toFixed(2)+')'}",
    ))!;
    expect(migrated.parents).toEqual([0, 0, 'B']);
    expect(migrated.attrs!.anchor).toEqual({ of: ['B'], dx: 0.3, dy: -0.3 });
  });

  it('keeps a literal position when the caption alone was source', () => {
    const migrated = migrateLegacyMeasure(legacyText(4, 2, "function(){return 'r = '+board.objects['c1'].Radius().toFixed(3)}"))!;
    expect(migrated.parents).toEqual([4, 2, 'r']);
    expect(migrated.attrs!.anchor).toBeUndefined();
    expect(migrated.attrs!.fontSize).toBe(13);
    expect(migrated.id).toBe('m1');
  });
});

describe('migrating the desktop exporter templates', () => {
  // HeyGeoWebExporter writes the value as an IIFE and appends centimetres per
  // JSXGraph unit (here 2) inside it.
  const desktop = (caption: string) => legacyText(110, 60, caption);

  it('reads a point-to-point distance with its unit scale', () => {
    const m = measureOf(desktop(
      "function(){return 'AB = '+((function(){var bo=board.objects,dx=bo['A'].X()-bo['B'].X(),dy=bo['A'].Y()-bo['B'].Y();return Math.sqrt(dx*dx+dy*dy)*2;})()).toFixed(2)+' cm';}",
    ));
    expect(m).toEqual({ op: 'distance', args: ['A', 'B'], label: 'AB', precision: 2, unit: ' cm', scale: 2 });
  });

  it('reads a point-to-segment distance', () => {
    const m = measureOf(desktop(
      "function(){return 'd(P,s) = '+((function(){var bo=board.objects,ax=bo['P'].X(),ay=bo['P'].Y(),seg=bo['s'],px=seg.point1.X(),py=seg.point1.Y(),qx=seg.point2.X(),qy=seg.point2.Y(),ddx=qx-px,ddy=qy-py,lsq=ddx*ddx+ddy*ddy,t=lsq<1e-12?0:Math.max(0,Math.min(1,((ax-px)*ddx+(ay-py)*ddy)/lsq)),nx=px+t*ddx,ny=py+t*ddy;return Math.sqrt((ax-nx)*(ax-nx)+(ay-ny)*(ay-ny))*2;})()).toFixed(2)+' cm';}",
    ));
    expect(m).toMatchObject({ op: 'pointSegmentDistance', args: ['P', 's'], label: 'd(P,s)', scale: 2 });
  });

  it('reads a segment length and a circumference', () => {
    expect(measureOf(desktop(
      "function(){return 'L = '+((function(){var bo=board.objects,seg=bo['s'],dx=seg.point2.X()-seg.point1.X(),dy=seg.point2.Y()-seg.point1.Y();return Math.sqrt(dx*dx+dy*dy)*2;})()).toFixed(2)+' cm';}",
    )).op).toBe('length');
    expect(measureOf(desktop(
      "function(){return 'C = '+((function(){var bo=board.objects;return bo['c'].Radius()*2*Math.PI*2;})()).toFixed(2)+' cm';}",
    )).op).toBe('circumference');
  });

  it('reads a radius, an angle, a ratio and a slope', () => {
    expect(measureOf(desktop(
      "function(){return 'r = '+((function(){var bo=board.objects;return bo['c'].Radius()*2;})()).toFixed(2)+' cm';}",
    ))).toMatchObject({ op: 'radius', args: ['c'], scale: 2 });
    expect(measureOf(desktop(
      "function(){return 'ABC = '+((function(){var bo=board.objects,dx0=bo['B'].X()-bo['A'].X(),dy0=bo['B'].Y()-bo['A'].Y(),dx2=bo['C'].X()-bo['A'].X(),dy2=bo['C'].Y()-bo['A'].Y(),a0=Math.atan2(-dy0,dx0),a2=Math.atan2(-dy2,dx2);return ((-(a2-a0)+4*Math.PI)%(2*Math.PI))*180/Math.PI;})()).toFixed(2)+'°';}",
    ))).toMatchObject({ op: 'angle', args: ['B', 'A', 'C'], label: 'ABC', unit: '°' });
    expect(measureOf(desktop(
      "function(){return 's1/s2 = '+((function(){var bo=board.objects,seg0=bo['s1'],seg1=bo['s2'],dx0=seg0.point2.X()-seg0.point1.X(),dy0=seg0.point2.Y()-seg0.point1.Y(),dx1=seg1.point2.X()-seg1.point1.X(),dy1=seg1.point2.Y()-seg1.point1.Y(),l0=Math.sqrt(dx0*dx0+dy0*dy0),l1=Math.sqrt(dx1*dx1+dy1*dy1);return l1<1e-12?0:l0/l1;})()).toFixed(2);}",
    ))).toMatchObject({ op: 'ratio', args: ['s1', 's2'] });
    expect(measureOf(desktop(
      "function(){return 'm = '+((function(){var bo=board.objects,obj=bo['L'],dx=obj.point2.X()-obj.point1.X(),dy=obj.point2.Y()-obj.point1.Y();return Math.abs(dx)<1e-12?(dy<0?-1e12:1e12):dy/dx;})()).toFixed(2);}",
    ))).toMatchObject({ op: 'slope', args: ['L'] });
    // an angle has no length scale, so none is recorded
    expect(measureOf(desktop(
      "function(){return 'ABC = '+((function(){var bo=board.objects,dx0=bo['B'].X()-bo['A'].X(),dy0=bo['B'].Y()-bo['A'].Y(),dx2=bo['C'].X()-bo['A'].X(),dy2=bo['C'].Y()-bo['A'].Y(),a0=Math.atan2(-dy0,dx0),a2=Math.atan2(-dy2,dx2);return ((-(a2-a0)+4*Math.PI)%(2*Math.PI))*180/Math.PI;})()).toFixed(2)+'°';}",
    )).scale).toBeUndefined();
  });

  it('reads the four coordinate-system measures', () => {
    const prefix = "function(){var ox=board.objects['O'].X(),oy=board.objects['O'].Y();var ux=board.objects['U'].X(),uy=board.objects['U'].Y();var sf=Math.sqrt((ux-ox)*(ux-ox)+(uy-oy)*(uy-oy));";
    expect(measureOf(desktop(`${prefix}var x=(board.objects['A'].X()-ox)/sf;return 'x<sub>A</sub> = '+x.toFixed(2);}`)))
      .toMatchObject({ op: 'relativeAbscissa', args: ['O', 'U', 'A'], label: 'x<sub>A</sub>' });
    expect(measureOf(desktop(`${prefix}var y=(board.objects['A'].Y()-oy)/sf;return 'y<sub>A</sub> = '+y.toFixed(2);}`)))
      .toMatchObject({ op: 'relativeOrdinate', args: ['O', 'U', 'A'], label: 'y<sub>A</sub>' });
    expect(measureOf(desktop(
      `${prefix}var x=(board.objects['A'].X()-ox)/sf;var y=(board.objects['A'].Y()-oy)/sf;return 'A = ('+x.toFixed(2)+'; '+y.toFixed(2)+')';`,
    ))).toMatchObject({ op: 'relativeCoordinates', args: ['O', 'U', 'A'], label: 'A', precision: 2 });
    expect(measureOf(desktop(
      `${prefix}var x1=(board.objects['A'].X()-ox)/sf;var y1=(board.objects['A'].Y()-oy)/sf;var x2=(board.objects['B'].X()-ox)/sf;var y2=(board.objects['B'].Y()-oy)/sf;var d=Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));return 'AB = '+d.toFixed(2);}`,
    ))).toMatchObject({ op: 'relativeDistance', args: ['O', 'U', 'A', 'B'], label: 'AB' });
  });

  it('writes a literal position, because the desktop anchors by pixel', () => {
    const out = migrateLegacyMeasure(desktop(
      "function(){return 'AB = '+((function(){var bo=board.objects,dx=bo['A'].X()-bo['B'].X(),dy=bo['A'].Y()-bo['B'].Y();return Math.sqrt(dx*dx+dy*dy)*2;})()).toFixed(2)+' cm';}",
    ))!;
    expect(out.parents[0]).toBe(110);
    expect(out.parents[1]).toBe(60);
    expect(out.attrs!.anchor).toBeUndefined();
  });
});

describe('what is not migrated', () => {
  it('leaves a plain text element alone', () => {
    expect(migrateLegacyMeasure({ type: 'text', id: 't', parents: [1, 2, 'Chào'], attrs: {} })).toBeNull();
  });

  it('leaves a non-text element alone', () => {
    expect(migrateLegacyMeasure({ type: 'point', id: 'A', parents: [1, 2], attrs: {} })).toBeNull();
  });

  it('leaves a source no rule describes — the loader will report it', () => {
    expect(migrateLegacyMeasure(legacyText(
      0, 0,
      "function(){return 'calc = '+(board.objects['m1'].Value()*Math.sin(board.objects['m2'].Value())).toFixed(2);}",
    ))).toBeNull();
    expect(migrateLegacyMeasure(legacyText(0, 0, 'function(){window.evil();return 1;}'))).toBeNull();
    // a value that looks like a distance but reads a fourth object is not ours
    expect(migrateLegacyMeasure(legacyText(
      0, 0,
      "function(){return 'x = '+(board.objects['A'].X()+board.objects['B'].X()+board.objects['C'].X()).toFixed(2);}",
    ))).toBeNull();
  });

  it('refuses a caption with only one of its two position sources', () => {
    expect(migrateLegacyMeasure(legacyText(
      "function(){return board.objects['B'].X()+0.3}",
      4,
      "function(){return 'r = '+board.objects['c1'].Radius().toFixed(3)}",
    ))).toBeNull();
  });

  it('refuses a caption whose position does not match itself', () => {
    expect(migrateLegacyMeasure(legacyText(
      "function(){return board.objects['B'].X()+0.3}",
      "function(){return board.objects['C'].Y()-0.3}",
      "function(){var pt=board.objects['B']; return 'B: ('+pt.X().toFixed(2)+', '+pt.Y().toFixed(2)+')'}",
    ))).toBeNull();
  });
});
