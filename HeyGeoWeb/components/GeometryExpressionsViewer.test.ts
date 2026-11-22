import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, 'GeometryExpressionsViewer.tsx'), 'utf8');

describe('the frame that runs uploaded HTML', () => {
  const sandbox = source.match(/sandbox="([^"]+)"/)![1].split(/\s+/);

  it('lets a model page script itself', () => {
    expect(sandbox).toContain('allow-scripts');
  });

  // Sharing heygeo.pedu.vn would let a model page read the session and act as
  // whoever is viewing it.
  it('never shares an origin with HeyGeo', () => {
    expect(sandbox).not.toContain('allow-same-origin');
  });
});
