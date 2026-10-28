import { describe, expect, it } from 'vitest';
import {
  HIGH_QUALITY_SCALE,
  IMAGE_FORMATS,
  imageFileName,
  svgSize,
} from './imageExport';

describe('File | Export To Image', () => {
  it('offers the two formats and writes each its own extension', () => {
    expect(IMAGE_FORMATS.map((f) => f.format)).toEqual(['png', 'jpeg']);
    expect(imageFileName('Tam giác ABC', 'png')).toBe('Tam giác ABC.png');
    // the desktop writes .jpg for a jpeg
    expect(imageFileName('Tam giác ABC', 'jpeg')).toBe('Tam giác ABC.jpg');
  });

  it('names a sketch that has no title yet', () => {
    expect(imageFileName('', 'png')).toBe('heygeo.png');
    expect(imageFileName('   ', 'png')).toBe('heygeo.png');
  });

  it('keeps a title from turning into a path', () => {
    expect(imageFileName('a/b:c*d?"e"<f>|g', 'png')).toBe('a-b-c-d-e-f-g.png');
  });

  it('doubles the pixels when the high quality box is ticked', () => {
    expect(HIGH_QUALITY_SCALE).toBe(2);
  });

  it('reads the size JSXGraph writes on the root element', () => {
    expect(svgSize('<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><g/></svg>'))
      .toEqual({ width: 800, height: 600 });
    // an inner width is not the drawing's width
    expect(svgSize('<svg height="600" width="800"><rect width="12" height="34"/></svg>'))
      .toEqual({ width: 800, height: 600 });
  });

  it('falls back to the viewBox, and refuses a drawing it cannot size', () => {
    expect(svgSize('<svg viewBox="0 0 320 200"><g/></svg>')).toEqual({ width: 320, height: 200 });
    expect(svgSize('<svg width="100%" height="100%"><g/></svg>')).toBeNull();
    expect(svgSize('<div/>')).toBeNull();
  });
});
