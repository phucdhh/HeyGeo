import { describe, expect, it } from 'vitest';
import { copyClosure, pasteElements, pasteOffset } from './clipboardModel';
import type { HeyGeoElement } from './designTypes';

const el = (over: Partial<HeyGeoElement> & { type: string; id: string }): HeyGeoElement => ({
  parents: [], attrs: {}, ...over,
});

const point = (id: string, x = 0, y = 0): HeyGeoElement => el({
  type: 'point', id, parents: [x, y], attrs: { name: id },
});

/** A sketch with something of every kind of reference a copy has to keep. */
const DOC = (): HeyGeoElement[] => [
  point('A', -3, 1),
  point('B', 2, 4),
  el({ type: 'segment', id: 'sAB', parents: ['A', 'B'], attrs: {} }),
  el({ type: 'midpoint', id: 'M', parents: ['A', 'B'], attrs: { name: 'M' } }),
  el({
    type: 'text', id: 'mDist', parents: [-0.5, 2.9, 'AB'],
    attrs: { measure: { op: 'distance', args: ['A', 'B'], label: 'AB', precision: 2 } },
  }),
  el({ type: 'glider', id: 'G', parents: [1, 2, 'sAB'], attrs: { name: 'G' } }),
  el({ type: 'slider', id: 'sl', parents: [[5, 5], [6, 5], [0, 4, 10]], attrs: { name: 'a' } }),
  el({
    type: 'point', id: 'At', parents: ['A'],
    attrs: { name: "A'", image: { op: 'translate', of: ['A', 'B'] } },
  }),
  el({
    type: 'actionbutton', id: 'btn', parents: [6, 6, 'Ẩn A, B'],
    attrs: { button: { action: 'hide', name: 'A, B', targets: ['A', 'B'] } },
  }),
];

/** Ids a test paste hands out, numbered the way the canvas counter does. */
function counter() {
  const n = new Map<string, number>();
  return (e: HeyGeoElement) => {
    const k = e.type;
    const next = (n.get(k) ?? 0) + 1;
    n.set(k, next);
    return `${k}_${next}`;
  };
}

describe('what a copy carries', () => {
  it('brings what the pick is built from, and never what is built on it', () => {
    expect(copyClosure(DOC(), ['M']).map((e) => e.id)).toEqual(['A', 'B', 'M']);
    // the segment and the distance caption are built on A and B, so they stay
    expect(copyClosure(DOC(), ['A']).map((e) => e.id)).toEqual(['A']);
  });

  it('follows descriptor references, not only parents', () => {
    // the caption names A and B in its measure, and the button names them in its descriptor
    expect(copyClosure(DOC(), ['mDist']).map((e) => e.id)).toEqual(['A', 'B', 'mDist']);
    expect(copyClosure(DOC(), ['btn']).map((e) => e.id)).toEqual(['A', 'B', 'btn']);
    // an image point names the pair it translates by
    expect(copyClosure(DOC(), ['At']).map((e) => e.id)).toEqual(['A', 'B', 'At']);
  });

  it('is a copy, not a second look at the same objects', () => {
    const doc = DOC();
    const clip = copyClosure(doc, ['A']);
    clip[0].parents = [9, 9];
    expect(doc[0].parents).toEqual([-3, 1]);
  });

  it('skips an id the document no longer holds', () => {
    expect(copyClosure(DOC(), ['gone', 'A']).map((e) => e.id)).toEqual(['A']);
  });
});

describe('what a paste makes', () => {
  it('gives every object a new id and points the copies at each other', () => {
    const doc = DOC();
    const pasted = pasteElements(copyClosure(doc, ['M']), counter(), [0.5, -0.5]);
    expect(pasted.map((e) => e.id)).toEqual(['point_1', 'point_2', 'midpoint_1']);
    expect(pasted[2].parents).toEqual(['point_1', 'point_2']);
    // the copied points step aside together
    expect(pasted[0].parents).toEqual([-2.5, 0.5]);
    expect(pasted[1].parents).toEqual([2.5, 3.5]);
  });

  it('rewrites what the descriptors name', () => {
    const pasted = pasteElements(copyClosure(DOC(), ['mDist']), counter(), [0.5, -0.5]);
    const caption = pasted.find((e) => e.type === 'text')!;
    expect((caption.attrs.measure as { args: string[] }).args).toEqual(['point_1', 'point_2']);
    // and the copy's own place moved with the caption
    expect(caption.parents.slice(0, 2)).toEqual([0, 2.4]);

    const image = pasteElements(copyClosure(DOC(), ['At']), counter(), [0.5, -0.5])
      .find((e) => e.id === 'point_3')!;
    expect(image.parents).toEqual(['point_1']);
    expect(image.attrs.image).toEqual({ op: 'translate', of: ['point_1', 'point_2'] });

    const button = pasteElements(copyClosure(DOC(), ['btn']), counter(), [0.5, -0.5])
      .find((e) => e.type === 'actionbutton')!;
    expect((button.attrs.button as { targets: string[] }).targets).toEqual(['point_1', 'point_2']);
    expect(button.parents).toEqual([6.5, 5.5, 'Ẩn A, B']);
  });

  it('moves a glider along the copied path and leaves a slider’s range alone', () => {
    const pasted = pasteElements(copyClosure(DOC(), ['G', 'sl']), counter(), [0.5, -0.5]);
    const glider = pasted.find((e) => e.type === 'glider')!;
    // the path it glides on is the copy, and its own place stepped aside with it
    expect(glider.parents).toEqual([1.5, 1.5, 'segment_1']);
    const slider = pasted.find((e) => e.type === 'slider')!;
    expect(slider.parents).toEqual([[5.5, 4.5], [6.5, 4.5], [0, 4, 10]]);
  });

  it('reads a caption as text, never as the id it happens to spell', () => {
    const doc = [point('A'), el({ type: 'text', id: 't', parents: [0, 1, 'A'], attrs: {} })];
    const pasted = pasteElements(copyClosure(doc, ['t']), counter(), [0, 0]);
    expect(pasted.find((e) => e.type === 'text')!.parents[2]).toBe('A');
  });

  it('keeps a frame’s unit point with the copied frame', () => {
    const doc = [
      el({ type: 'point', id: 'O', parents: [0, 0], attrs: { coordsys: { unit: 'U' } } }),
      point('U', 2, 0),
    ];
    const pasted = pasteElements(copyClosure(doc, ['O']), counter(), [0, 0]);
    const origin = pasted.find((e) => e.id === 'point_1')!;
    expect(origin.attrs.coordsys).toEqual({ unit: 'point_2' });
  });

  it('steps further aside with every paste of the same clipboard', () => {
    expect(pasteOffset(1)).toEqual([0.5, -0.5]);
    expect(pasteOffset(2)).toEqual([1, -1]);
    // a zero or negative count is the first paste, not a paste in place
    expect(pasteOffset(0)).toEqual([0.5, -0.5]);
  });
});
