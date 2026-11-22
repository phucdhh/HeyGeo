import { describe, expect, it } from 'vitest';
import { htmlEditorUrl, htmlPageType } from './htmlModel';

describe('which editor a model belongs to', () => {
  it('sends an authored page to the HTML editor, not the designer', () => {
    expect(htmlPageType({ __type: 'html', htmlContent: '<!DOCTYPE html>' })).toBe('html');
    expect(htmlPageType({ __type: 'gx', htmlContent: '<!DOCTYPE html>' })).toBe('gx');
    expect(htmlEditorUrl('cmwqrpsl40034')).toBe('/html?id=cmwqrpsl40034');
  });

  it('leaves every model the designer can interpret alone', () => {
    // Opening these in the HTML editor would show nothing, and saving there
    // would drop their elements.
    expect(htmlPageType({ __type: 'heygeoweb', elements: [] })).toBeNull();
    expect(htmlPageType({ codeMode: true, code: 'JXGBoard();' })).toBeNull();
    expect(htmlPageType({ __type: 'geogebra', base64: 'AAA' })).toBeNull();
  });

  it('calls a page a page even when the type says otherwise', () => {
    // A model saved before the type split carries htmlContent under 'gx'; a
    // hand-copied document may carry no type at all.
    expect(htmlPageType({ htmlContent: '<canvas></canvas>' })).toBe('html');
  });

  it('refuses a non-string htmlContent', () => {
    expect(htmlPageType({ __type: 'html', htmlContent: null })).toBeNull();
    expect(htmlPageType(null)).toBeNull();
  });
});
