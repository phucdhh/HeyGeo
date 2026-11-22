import { describe, expect, it } from 'vitest';
import {
  cropForRect,
  encodedBytes,
  fitBox,
  scaleLadder,
  THUMB_MAX_H,
  THUMB_MAX_W,
} from './thumbCapture';

describe('fitBox', () => {
  it('shrinks a capture to the thumbnail frame without changing its ratio', () => {
    // 1512×900 preview pane on a 2× display
    expect(fitBox(3024, 1800)).toEqual({ w: 605, h: 360 });
    expect(fitBox(THUMB_MAX_W * 2, THUMB_MAX_H * 2)).toEqual({ w: THUMB_MAX_W, h: THUMB_MAX_H });
  });

  it('never enlarges a small image', () => {
    expect(fitBox(320, 200)).toEqual({ w: 320, h: 200 });
  });

  it('has no answer for an empty source', () => {
    expect(fitBox(0, 400)).toEqual({ w: 0, h: 0 });
    expect(fitBox(-5, 400)).toEqual({ w: 0, h: 0 });
    expect(fitBox(NaN, 400)).toEqual({ w: 0, h: 0 });
  });
});

describe('scaleLadder', () => {
  it('starts at the frame size and only gets smaller', () => {
    const ladder = scaleLadder(1920, 1080);
    expect(ladder[0]).toEqual({ w: 640, h: 360 });
    expect(ladder.at(-1)!.w).toBeLessThan(ladder[0].w);
    expect(ladder.every((b) => b.w > 0 && b.h > 0)).toBe(true);
  });

  it('does not repeat a size, so a tiny crop is not tried four times', () => {
    const ladder = scaleLadder(18, 18, [1, 1, 0.999, 0.5]);
    expect(new Set(ladder.map((b) => `${b.w}x${b.h}`)).size).toBe(ladder.length);
  });

  it('is empty for an unusable crop', () => {
    expect(scaleLadder(0, 0)).toEqual([]);
  });
});

describe('encodedBytes', () => {
  it('counts the payload, not the base64 characters', () => {
    const three = btoa('abc');
    expect(encodedBytes(`data:image/webp;base64,${three}`)).toBe(3);
    expect(encodedBytes(`data:image/webp;base64,${btoa('ab')}`)).toBe(2);
    expect(encodedBytes(`data:image/webp;base64,${btoa('a')}`)).toBe(1);
  });

  it('is the number a backup restore would check against', () => {
    // 150 KB of image is 200 000 base64 characters, which is why the two limits differ
    expect(encodedBytes('data:image/webp;base64,' + 'A'.repeat(200_000))).toBe(150_000);
  });
});

describe('cropForRect', () => {
  const rect = { left: 800, top: 60, width: 700, height: 900 };

  it('maps a CSS rect onto a device-pixel frame', () => {
    expect(cropForRect(rect, 3024, 1800, 1512, 900)).toEqual({ x: 1600, y: 120, w: 1400, h: 1680 });
  });

  it('clips a pane that runs past the captured frame', () => {
    const crop = cropForRect(rect, 1512, 900, 1512, 900)!;
    expect(crop.x + crop.w).toBeLessThanOrEqual(1512);
    expect(crop.y + crop.h).toBeLessThanOrEqual(900);
  });

  it('refuses a capture that is not the tab, and a pane too small to read', () => {
    expect(cropForRect(rect, 0, 0, 1512, 900)).toBeNull();
    expect(cropForRect({ left: 800, top: 60, width: 4, height: 900 }, 3024, 1800, 1512, 900)).toBeNull();
    expect(cropForRect(rect, 1920, 1080, 0, 900)).toBeNull();
  });
});
