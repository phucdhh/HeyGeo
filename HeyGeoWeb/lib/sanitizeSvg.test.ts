import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitizeSvg';

const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">${inner}</svg>`;

describe('sanitizeSvg', () => {
  it('removes scripts and inline event handlers', () => {
    const out = sanitizeSvg(svg('<script>alert(1)</script><circle r="4" onload="alert(2)"/>'));
    expect(out).not.toMatch(/script|onload/i);
    expect(out).toContain('<circle r="4"/>');
  });

  it('removes the containers that smuggle a document of their own', () => {
    const out = sanitizeSvg(svg(
      '<foreignObject><iframe srcdoc="<script>alert(1)</script>"></iframe></foreignObject>'
      + '<iframe src="https://evil.example"></iframe><embed src="x.swf"/><object data="x"></object>',
    ));
    expect(out).not.toMatch(/foreignObject|iframe|embed|object/i);
  });

  it('drops a link that would run code when clicked', () => {
    const out = sanitizeSvg(svg(
      '<a href="javascript:alert(1)"><text>x</text></a>'
      + '<image xlink:href="data:text/html;base64,PHNjcmlwdD4="/>',
    ));
    expect(out).not.toMatch(/javascript:|data:text\/html/i);
  });

  it('leaves the geometry and a normal image reference alone', () => {
    const out = sanitizeSvg(svg('<path d="M 0 0 L 10 10"/><image href="data:image/png;base64,AA"/>'));
    expect(out).toContain('<path d="M 0 0 L 10 10"/>');
    expect(out).toContain('data:image/png');
  });

  it('still normalises the root tag for a thumbnail', () => {
    const out = sanitizeSvg('<svg width="600" height="500"><circle r="4"/></svg>');
    expect(out).toContain('viewBox="0 0 600 500"');
    expect(out).toContain('width="100%"');
    expect(out).toContain('preserveAspectRatio="xMidYMid meet"');
  });
});
