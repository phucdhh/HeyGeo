import { describe, expect, it } from 'vitest';
import { centreOf, endpointIds } from './pointConstructModel';

const pick = (kind: string, parents: string[]) => ({ id: 'x', kind, parents });

describe('Construct | Endpoints', () => {
  it('names a segment’s two endpoints', () => {
    expect(endpointIds(pick('segment', ['A', 'B']))).toEqual(['A', 'B']);
  });

  it('names only the fixed end of a ray', () => {
    expect(endpointIds(pick('ray', ['A', 'B']))).toEqual(['A']);
  });

  it('reads an arc’s ends, not its centre', () => {
    // [centre, start, end]
    expect(endpointIds(pick('arc', ['O', 'S', 'E']))).toEqual(['S', 'E']);
  });

  it('reads the outer points of an arc through three points', () => {
    // [start, through, end]
    expect(endpointIds(pick('circumcirclearc', ['S', 'T', 'E']))).toEqual(['S', 'E']);
  });

  it('refuses anything the desktop does not offer the row for', () => {
    expect(endpointIds(null)).toBeNull();
    expect(endpointIds(pick('circle', ['A', 'B']))).toBeNull();
    expect(endpointIds(pick('line', ['A', 'B']))).toBeNull();
    expect(endpointIds(pick('sector', ['O', 'S', 'E']))).toBeNull();
  });
});

describe('Construct | Center Point', () => {
  it('reveals the centre a circle was built on', () => {
    expect(centreOf(pick('circle', ['O', 'B']))).toEqual({ reveal: 'O' });
  });

  it('reveals the centre an arc was built on', () => {
    expect(centreOf(pick('arc', ['O', 'S', 'E']))).toEqual({ reveal: 'O' });
  });

  it('builds the centre an arc through three points implies', () => {
    expect(centreOf(pick('circumcirclearc', ['S', 'T', 'E'])))
      .toEqual({ circumcentre: ['S', 'T', 'E'] });
  });

  it('refuses a filled shape and anything that is not a circle or an arc', () => {
    expect(centreOf(null)).toBeNull();
    expect(centreOf(pick('sector', ['O', 'S', 'E']))).toBeNull();
    expect(centreOf(pick('circumcirclesector', ['S', 'T', 'E']))).toBeNull();
    expect(centreOf(pick('segment', ['A', 'B']))).toBeNull();
  });
});
