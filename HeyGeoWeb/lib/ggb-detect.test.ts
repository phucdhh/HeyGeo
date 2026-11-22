import { describe, expect, it } from 'vitest';
import { mergeToolCategory, toolCategoryFromJson } from './ggb-detect';

describe('the tool a saved model names', () => {
  it('reads a sketch drawn in HeyGeo Web as a HeyGeo model', () => {
    // the Gallery files both the web designer and the desktop export under HeyGeo
    expect(toolCategoryFromJson({ __type: 'heygeoweb', elements: [] })).toBe('HeyGeo');
    expect(toolCategoryFromJson({ __type: 'heygeo', elements: [] })).toBe('HeyGeo');
  });

  it('keeps the other tools apart', () => {
    expect(toolCategoryFromJson({ __type: 'sketchpad' })).toBe('Sketchpad');
    expect(toolCategoryFromJson({ __type: 'wsp' })).toBe('Web Sketchpad');
    expect(toolCategoryFromJson({ __type: 'geogebra', base64: '' })).toBe('GeoGebra');
  });

  it('tells an authored HTML page apart from a Geometry Expressions export', () => {
    expect(toolCategoryFromJson({ __type: 'gx', htmlContent: '<!DOCTYPE html>' })).toBe('Geometry Expressions');
    expect(toolCategoryFromJson({ __type: 'html', htmlContent: '<!DOCTYPE html>' })).toBe('HTML');
  });

  it('drops the previous tool category when an HTML page changes type', () => {
    expect(mergeToolCategory(['Hình học không gian', 'Geometry Expressions'], { __type: 'html', htmlContent: '' }))
      .toEqual(['Hình học không gian', 'HTML']);
  });

  it('falls back to the platform itself for a document with no type', () => {
    expect(toolCategoryFromJson({ elements: [] })).toBe('HeyGeo');
    expect(toolCategoryFromJson({ elements: [], codeMode: true })).toBe('JSXGraph');
  });

  it('replaces a stale tool category when the document says otherwise', () => {
    expect(mergeToolCategory(['Định lý', 'JSXGraph'], { __type: 'heygeoweb' }))
      .toEqual(['Định lý', 'HeyGeo']);
  });
});
