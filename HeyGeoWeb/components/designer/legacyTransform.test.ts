import { describe, expect, it } from 'vitest';
import { migrateLegacyTransform } from './legacyTransform';
import type { ElementSpec } from './elementRegistry';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The two parents DesignCanvas wrote for one transformed point, per op. */
const pair = (make: (axis: 'X' | 'Y') => string) => [make('X'), make('Y')];

const TRANSLATE_VECTOR = (src: string, from: string, to: string) => pair((a) =>
  `function(board){var P=board.objects['${src}'], A=board.objects['${from}'], B=board.objects['${to}']; return P.${a}()+(B.${a}()-A.${a}())}`);

const TRANSLATE_OFFSET = (src: string, dx: number, dy: number) => pair((a) =>
  `function(board){var P=board.objects['${src}']; return P.${a}()+${a === 'X' ? dx : dy}}`);

const ROTATE = (src: string, centre: string, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pair((a) => a === 'X'
    ? `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; var dx=P.X()-C.X(), dy=P.Y()-C.Y(); return C.X()+dx*${cos}-dy*${sin}}`
    : `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; var dx=P.X()-C.X(), dy=P.Y()-C.Y(); return C.Y()+dx*${sin}+dy*${cos}}`);
};

const DILATE = (src: string, centre: string, k: number) => pair((a) =>
  `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; return C.${a}()+${k}*(P.${a}()-C.${a}())}`);

const REFLECT = (src: string, line: string) => pair((a) =>
  `function(board){var P=board.objects['${src}'], L=board.objects['${line}']; var p1=L.point1, p2=L.point2; var vx=p2.X()-p1.X(), vy=p2.Y()-p1.Y(); var v2=vx*vx+vy*vy; if(v2<1e-12)return P.${a}(); var wx=P.X()-p1.X(), wy=P.Y()-p1.Y(); var t=(wx*vx+wy*vy)/v2; return 2*(p1.${a}()+t*${a === 'X' ? 'vx' : 'vy'})-P.${a}()}`);

const el = (parents: unknown[], attrs: Record<string, unknown> = {}): ElementSpec => ({
  type: 'point', id: 'pt7', parents: parents as ElementSpec['parents'], attrs,
});

const imageOf = (out: ElementSpec | null) => out?.attrs?.image;

describe('migrateLegacyTransform', () => {
  it('turns a marked-vector translation into a descriptor', () => {
    const migrated = migrateLegacyTransform(el(TRANSLATE_VECTOR('A', 'V1', 'V2')));
    expect(migrated!.parents).toEqual(['A']);
    expect(imageOf(migrated)).toEqual({ op: 'translate', of: ['V1', 'V2'] });
  });

  it('turns a typed translation into numbers', () => {
    const migrated = migrateLegacyTransform(el(TRANSLATE_OFFSET('A', 2.5, -1)));
    expect(imageOf(migrated)).toEqual({ op: 'translate', of: [], dx: 2.5, dy: -1 });
  });

  it('keeps a polar translation at full precision', () => {
    const rad = (37 * Math.PI) / 180;
    const migrated = migrateLegacyTransform(el(TRANSLATE_OFFSET('A', 5 * Math.cos(rad), 5 * Math.sin(rad))));
    expect(imageOf(migrated)).toEqual({
      op: 'translate', of: [], dx: 5 * Math.cos(rad), dy: 5 * Math.sin(rad),
    });
  });

  // atan2 recovers the angle in (-180, 180], so a 270° rotation comes back as
  // -90°: the same map, described in fewer turns.
  it.each([0, 45, 90, 180, -90, 135, -123.456])('recovers a %s degree rotation', (deg) => {
    const migrated = migrateLegacyTransform(el(ROTATE('A', 'O', deg)));
    expect(imageOf(migrated)).toEqual({ op: 'rotate', of: ['O'], angle: deg });
  });

  it('turns a dilation into its ratio and centre', () => {
    expect(imageOf(migrateLegacyTransform(el(DILATE('A', 'O', 0.5)))))
      .toEqual({ op: 'dilate', of: ['O'], k: 0.5 });
    expect(imageOf(migrateLegacyTransform(el(DILATE('A', 'O', -2)))))
      .toEqual({ op: 'dilate', of: ['O'], k: -2 });
  });

  it('turns a reflection into its mirror', () => {
    expect(imageOf(migrateLegacyTransform(el(REFLECT('A', 'l1')))))
      .toEqual({ op: 'reflect', of: ['l1'] });
  });

  it('keeps the point style next to the descriptor', () => {
    const migrated = migrateLegacyTransform(el(TRANSLATE_VECTOR('A', 'V1', 'V2'), { size: 4, withLabel: true }));
    expect(migrated!.attrs).toEqual({ size: 4, withLabel: true, image: { op: 'translate', of: ['V1', 'V2'] } });
  });

  it('leaves a free point alone', () => {
    expect(migrateLegacyTransform(el([1, 2]))).toBeNull();
  });

  it('refuses a source it cannot describe rather than keeping the code', () => {
    const evildoer = pair((a) => `function(board){return window.evil(board)['A'].${a}()}`);
    expect(migrateLegacyTransform(el(evildoer))).toBeNull();
  });

  it('refuses a half-migrated point: only one parent is code', () => {
    expect(migrateLegacyTransform(el([TRANSLATE_OFFSET('A', 1, 1)[0], 2]))).toBeNull();
  });

  it('refuses two axes that copy different points', () => {
    const [x] = TRANSLATE_VECTOR('A', 'V1', 'V2');
    const [, y] = TRANSLATE_VECTOR('B', 'V1', 'V2');
    expect(migrateLegacyTransform(el([x, y]))).toBeNull();
  });

  it('refuses a rotation whose axes disagree about the centre', () => {
    const [x] = ROTATE('A', 'O', 90);
    const [, y] = ROTATE('A', 'P', 90);
    expect(migrateLegacyTransform(el([x, y]))).toBeNull();
  });

  it('refuses a point whose parents mix an op with a number', () => {
    const [x] = TRANSLATE_VECTOR('A', 'V1', 'V2');
    const [, y] = TRANSLATE_OFFSET('A', 1, 1);
    expect(migrateLegacyTransform(el([x, y]))).toBeNull();
  });

  it('is not about text: a caption belongs to legacyMeasure', () => {
    const text: ElementSpec = {
      type: 'text', id: 't1',
      parents: [0, 0, TRANSLATE_OFFSET('A', 1, 1)[0]], attrs: {},
    };
    expect(migrateLegacyTransform(text)).toBeNull();
  });
});
