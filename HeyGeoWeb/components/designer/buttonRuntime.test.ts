import { afterEach, describe, expect, it, vi } from 'vitest';

import { createButtonRuntime, type ButtonRuntimeHost } from './buttonRuntime';
import type { HeyGeoElement } from './designTypes';

/*
 * The press a reader gets on a shared page is the press the designer runs, so
 * the runtime is tested against a stand-in board rather than through either
 * component: what a button changes, what it leaves alone and what it says when
 * there is nothing left to change.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

class FakeObject {
  visible = true;
  text = '';
  constructor(public x: number, public y: number) {}
  X() { return this.x; }
  Y() { return this.y; }
  setPosition(_mode: number, [x, y]: number[]) { this.x = x; this.y = y; }
  setAttribute(attrs: Record<string, unknown>) {
    if ('visible' in attrs) this.visible = attrs.visible as boolean;
  }
  setText(text: string) { this.text = text; }
}

function point(id: string, x: number, y: number): HeyGeoElement {
  return { type: 'point', id, parents: [x, y], attrs: {} };
}

function button(
  id: string,
  caption: string,
  spec: Record<string, unknown>,
  parents: HeyGeoElement['parents'] = [5, 5, caption],
): HeyGeoElement {
  return { type: 'actionbutton', id, parents, attrs: { button: spec as any } };
}

function harness(elements: HeyGeoElement[], places: Record<string, [number, number]> = {}) {
  const objects: Record<string, FakeObject> = {};
  for (const el of elements) {
    const [x, y] = places[el.id] ?? (typeof el.parents[0] === 'number' ? [el.parents[0] as number, 0] : [0, 0]);
    objects[el.id] = new FakeObject(x, y);
  }
  const notices: string[] = [];
  const animated: { spec: any; targets: string[] }[] = [];
  const host: ButtonRuntimeHost = {
    board: () => ({ objects, update: () => {} }),
    elements: () => elements,
    notify: (message) => { notices.push(message); },
    animate: (spec, targets) => { animated.push({ spec, targets }); return true; },
  };
  return { runtime: createButtonRuntime(host), objects, notices, animated };
}

describe('pressing a visibility button', () => {
  it('hides every object the button names', () => {
    const a = point('A', 0, 0);
    const b = point('B', 1, 0);
    const hide = button('btn', 'Ẩn A, B', { action: 'hide', name: 'A, B', targets: ['A', 'B'] });
    const h = harness([a, b, hide]);
    expect(h.runtime.press(hide)).toBe(true);
    expect(h.objects.A.visible).toBe(false);
    expect(h.objects.B.visible).toBe(false);
    // the document says so too, or a rebuilt board would show them again
    expect(a.attrs.visible).toBe(false);
    expect(b.attrs.visible).toBe(false);
  });

  it('shows what a one-shot Show names, and leaves the caption alone', () => {
    const a = point('A', 0, 0);
    a.attrs.visible = false;
    const show = button('btn', 'Hiện A', { action: 'show', name: 'A', targets: ['A'] });
    const h = harness([a, show]);
    h.runtime.press(show);
    expect(h.objects.A.visible).toBe(true);
    expect(show.parents[2]).toBe('Hiện A');
  });

  it('flips a Hide/Show and leaves it saying what the next press will do', () => {
    const a = point('A', 0, 0);
    const flip = button('btn', 'Ẩn A', { action: 'toggle', name: 'A', targets: ['A'] });
    const h = harness([a, flip]);
    h.runtime.press(flip);
    expect(h.objects.A.visible).toBe(false);
    expect(flip.parents[2]).toBe('Hiện A');
    expect(h.objects[flip.id].text).toBe('Hiện A');
    h.runtime.press(flip);
    expect(h.objects.A.visible).toBe(true);
    expect(flip.parents[2]).toBe('Ẩn A');
  });

  it('says so when the objects it acted on are gone', () => {
    const flip = button('btn', 'Ẩn A', { action: 'toggle', name: 'A', targets: ['A'] });
    const h = harness([flip]);
    expect(h.runtime.press(flip)).toBe(false);
    expect(h.notices.join(' ')).toContain('không còn đối tượng nào');
  });
});

describe('pressing a Move button', () => {
  const moveSpec = {
    action: 'move', name: 'A', targets: ['A'],
    move: { destinations: ['B'], speed: 'jump' },
  };

  it('carries a Jump run straight to the destination and writes the place down', () => {
    const a = point('A', 0, 0);
    const b = point('B', 10, 4);
    const run = button('btn', 'Đưa A tới đích', moveSpec);
    const h = harness([a, b, run], { B: [10, 4] });
    expect(h.runtime.press(run)).toBe(true);
    expect([h.objects.A.x, h.objects.A.y]).toEqual([10, 4]);
    expect(a.parents).toEqual([10, 4]);
  });

  it('follows a destination that moves while the run is going', () => {
    const a = point('A', 0, 0);
    const b = point('B', 10, 0);
    const run = button('btn', 'Đưa A tới đích', {
      ...moveSpec, move: { destinations: ['B'], speed: 'slow' },
    });
    const h = harness([a, b, run], { B: [10, 0] });
    const clock: { step: ((now: number) => void) | null } = { step: null };
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => { clock.step = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { clock.step = null; });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      h.runtime.press(run);
      expect(clock.step).not.toBeNull();
      // the destination is read on every frame, so a run chases where it went
      h.objects.B.x = 20;
      clock.step?.(1250);
      expect(h.objects.A.x).toBeCloseTo(10, 6);
      clock.step?.(2500);
      expect(h.objects.A.x).toBe(20);
      expect(a.parents).toEqual([20, 0]);
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });

  it('gives up with a notice when its points are gone', () => {
    const run = button('btn', 'Đưa A tới đích', moveSpec);
    const h = harness([run]);
    expect(h.runtime.press(run)).toBe(false);
    expect(h.notices.join(' ')).toContain('không còn điểm nào');
  });
});

describe('pressing a Present button', () => {
  /** The two one-shot buttons a sequence is made of. */
  const pair = () => [
    button('b1', 'Ẩn A', { action: 'hide', name: 'A', targets: ['A'] }),
    button('b2', 'Ẩn B', { action: 'hide', name: 'B', targets: ['B'] }),
  ];

  it('presses all of its buttons on one press', () => {
    const a = point('A', 0, 0);
    const b = point('B', 1, 0);
    const [first, second] = pair();
    const present = button('p', 'Trình diễn', {
      action: 'present', name: 'b1, b2', targets: ['b1', 'b2'],
      present: { sequential: false, pause: 0 },
    });
    const h = harness([a, b, first, second, present]);
    expect(h.runtime.press(present)).toBe(true);
    expect([h.objects.A.visible, h.objects.B.visible]).toEqual([false, false]);
  });

  it('works down a sequence with the pause the dialog asked for', () => {
    const a = point('A', 0, 0);
    const b = point('B', 1, 0);
    const [first, second] = pair();
    const present = button('p', 'Trình diễn', {
      action: 'present', name: 'b1, b2', targets: ['b1', 'b2'],
      present: { sequential: true, pause: 1.5 },
    });
    const h = harness([a, b, first, second, present]);
    vi.useFakeTimers();
    try {
      h.runtime.press(present);
      expect(h.objects.A.visible).toBe(false);
      expect(h.objects.B.visible).toBe(true);
      vi.advanceTimersByTime(1500);
      expect(h.objects.B.visible).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('says so when the sequence holds no buttons any more', () => {
    const present = button('p', 'Trình diễn', {
      action: 'present', name: 'b1', targets: ['b1'],
      present: { sequential: false, pause: 0 },
    });
    const h = harness([present]);
    expect(h.runtime.press(present)).toBe(false);
    expect(h.notices.join(' ')).toContain('không còn nút nào');
  });
});

describe('pressing an Animate button', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('hands the run to the host that keeps a clock', () => {
    const a: HeyGeoElement = { type: 'glider', id: 'G', parents: [0, 0, 'p'], attrs: {} };
    const run = button('btn', 'Chạy G', {
      action: 'animate', name: 'G', targets: ['G'],
      animation: { direction: 'both', speed: 0.25 },
    });
    const h = harness([a, run]);
    expect(h.runtime.press(run)).toBe(true);
    expect(h.animated).toEqual([{ spec: { direction: 'both', speed: 0.25 }, targets: ['G'] }]);
  });

  it('does nothing for a host without one', () => {
    const elements: HeyGeoElement[] = [
      { type: 'glider', id: 'G', parents: [0, 0, 'p'], attrs: {} },
      button('btn', 'Chạy G', {
        action: 'animate', name: 'G', targets: ['G'],
        animation: { direction: 'forward', speed: 0.25 },
      }),
    ];
    const objects = { G: new FakeObject(0, 0), btn: new FakeObject(5, 5) };
    const runtime = createButtonRuntime({
      board: () => ({ objects, update: () => {} }),
      elements: () => elements,
    });
    expect(runtime.press(elements[1])).toBe(false);
  });

  it('gives up the clock it holds when the host tears the board down', () => {
    const a = point('A', 0, 0);
    const b = point('B', 10, 0);
    const run = button('btn', 'Đưa A tới đích', {
      action: 'move', name: 'A', targets: ['A'],
      move: { destinations: ['B'], speed: 'slow' },
    });
    const h = harness([a, b, run], { B: [10, 0] });
    let cancelled = false;
    vi.stubGlobal('requestAnimationFrame', () => 7);
    vi.stubGlobal('cancelAnimationFrame', () => { cancelled = true; });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      h.runtime.press(run);
      h.runtime.stop();
      expect(cancelled).toBe(true);
      expect(h.objects.A.x).toBe(0);
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
