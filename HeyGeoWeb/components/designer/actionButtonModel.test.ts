import { describe, expect, it } from 'vitest';
import {
  BUTTON_COLUMN_X,
  MOVE_SECONDS,
  actionButtonRows,
  buttonCaption,
  buttonDeps,
  buttonName,
  buttonOf,
  buttonPlace,
  buttonProblem,
  buttonShows,
  isActionButtonSpec,
  isMovablePoint,
  movePairs,
  newActionButton,
  type ActionButtonSpec,
} from './actionButtonModel';
import type { HeyGeoElement } from './designTypes';

const el = (over: Partial<HeyGeoElement> & { id: string }): HeyGeoElement => ({
  type: 'point', parents: [], attrs: {}, ...over,
});

const point = (id: string): HeyGeoElement => el({ id, parents: [0, 0], attrs: { name: id } });

const glider = (id: string): HeyGeoElement => el({
  id, type: 'glider', parents: [0, 0, 's1'], attrs: { name: id },
});

const slider = (id: string): HeyGeoElement => el({
  id, type: 'slider', parents: [[0, 0], [1, 0], [0, 1, 2]], attrs: { name: id },
});

const RUN = { direction: 'both' as const, speed: 0.5 };

const button = (over: Partial<HeyGeoElement> = {}): HeyGeoElement => el({
  type: 'actionbutton',
  id: 'btn1',
  parents: [6, 6.5, 'Ẩn A'],
  attrs: { button: { action: 'toggle', name: 'A', targets: ['A'] } },
  ...over,
});

const spec = (over: Partial<ActionButtonSpec> = {}): ActionButtonSpec => ({
  action: 'toggle', name: 'A, B', targets: ['A', 'B'], ...over,
});

describe('an action button as data', () => {
  it('is read only off a button, and only when it describes one', () => {
    expect(buttonOf(button())).toEqual({ action: 'toggle', name: 'A', targets: ['A'] });
    // the same attribute on a caption is not a button
    expect(buttonOf({ ...button(), type: 'text' })).toBeNull();
    expect(buttonOf({ type: 'actionbutton', attrs: {} })).toBeNull();
    expect(isActionButtonSpec(spec())).toBe(true);
    expect(isActionButtonSpec({ ...spec(), action: 'animate' })).toBe(false);
    // an animation button without a direction and speed is a caption that does nothing
    expect(isActionButtonSpec({ ...spec(), action: 'animate', animation: RUN })).toBe(true);
    expect(isActionButtonSpec({ ...spec(), action: 'animate', animation: { direction: 'both', speed: 0 } }))
      .toBe(false);
    expect(isActionButtonSpec({ ...spec(), targets: 'A' })).toBe(false);
    expect(isActionButtonSpec({ ...spec(), name: 7 })).toBe(false);
    expect(isActionButtonSpec(null)).toBe(false);
  });

  it('needs its destinations, one per point, to be a move button', () => {
    const one: Partial<ActionButtonSpec> = {
      action: 'move', targets: ['A'], move: { destinations: ['B'], speed: 'fast' },
    };
    expect(isActionButtonSpec(spec(one))).toBe(true);
    // two points but one destination would leave a point with nowhere to go
    expect(isActionButtonSpec(spec({ ...one, targets: ['A', 'C'] }))).toBe(false);
    expect(isActionButtonSpec({ ...spec(), action: 'move' })).toBe(false);
    expect(isActionButtonSpec({ ...spec(one), move: { destinations: ['B'], speed: 'quick' } }))
      .toBe(false);
  });

  it('needs its sequence to be a present button', () => {
    expect(isActionButtonSpec(spec({ action: 'present', present: { sequential: true, pause: 1 } })))
      .toBe(true);
    expect(isActionButtonSpec({ ...spec(), action: 'present' })).toBe(false);
    expect(isActionButtonSpec(spec({ action: 'present', present: { sequential: true, pause: -1 } })))
      .toBe(false);
  });

  it('lists the objects it acts on as what depends on them', () => {
    expect(buttonDeps(button())).toEqual(['A']);
    expect(buttonDeps(point('A'))).toEqual([]);
    // a move button is nothing without the places it travels to
    expect(buttonDeps(el({
      type: 'actionbutton', id: 'mv',
      attrs: { button: spec({ action: 'move', targets: ['A'], move: { destinations: ['B'], speed: 'normal' } }) },
    }))).toEqual(['A', 'B']);
  });
});

describe('what a button says', () => {
  it('takes its name from the objects it acts on', () => {
    expect(buttonName([point('A'), point('B')])).toBe('A, B');
    // a measurement is named by its caption, and an unnamed object by its id
    expect(buttonName([
      el({ id: 'm1', type: 'text', attrs: { measure: { op: 'distance', args: [], label: 'AB' } } }),
      el({ id: 's1', type: 'segment', attrs: {} }),
    ])).toBe('AB, s1');
    // a long selection names its first object and counts the rest away
    expect(buttonName([point('A'), point('B'), point('C')])).toBe('A, …');
  });

  it('names what the next press will do', () => {
    expect(buttonCaption(spec(), false)).toBe('Ẩn A, B');
    expect(buttonCaption(spec(), true)).toBe('Hiện A, B');
    // an animation button says the same thing before and after a press: it starts
    // a run, and where that run stops is the sketch's business, not the caption's
    const run = spec({ action: 'animate', animation: RUN });
    expect(buttonCaption(run, false)).toBe('Chạy A, B');
    expect(buttonCaption(run, true)).toBe('Chạy A, B');
    // a one-shot button cannot promise anything else, so its words never change
    expect(buttonCaption(spec({ action: 'show' }), false)).toBe('Hiện A, B');
    expect(buttonCaption(spec({ action: 'hide' }), true)).toBe('Ẩn A, B');
    expect(buttonCaption(spec({ action: 'move', move: { destinations: ['A'], speed: 'slow' } }), false))
      .toBe('Đưa A, B tới đích');
    expect(buttonCaption(spec({ action: 'present', present: { sequential: true, pause: 1 } }), false))
      .toBe('Trình diễn A, B');
  });

  it('shows only when everything it acts on is hidden', () => {
    const hidden = new Set(['A', 'B']);
    expect(buttonShows(spec(), (id) => !hidden.has(id))).toBe(true);
    hidden.delete('B');
    // one object still showing, so the press hides them all
    expect(buttonShows(spec(), (id) => !hidden.has(id))).toBe(false);
    // a one-shot button does not flip: it does what its name says
    expect(buttonShows(spec({ action: 'show' }), () => true)).toBe(true);
    expect(buttonShows(spec({ action: 'hide' }), () => false)).toBe(false);
  });
});

describe('a button the app will not draw', () => {
  it('has to act on something, and on something that exists', () => {
    expect(buttonProblem(spec())).toBeNull();
    expect(buttonProblem(spec({ targets: [] }))).toContain('đối tượng');
    expect(buttonProblem(spec({ name: ' ' }))).toContain('tên');
    expect(buttonProblem(spec(), [point('A')])).toContain('không tồn tại');
    expect(buttonProblem(spec(), [point('A'), point('B')])).toBeNull();
  });

  it('needs something to move, and a way to move it, when it animates', () => {
    const run = spec({ action: 'animate', animation: RUN });
    expect(buttonProblem(run, [glider('A'), slider('B')])).toBeNull();
    expect(buttonProblem(spec({ action: 'animate' }))).toContain('cách chuyển động');
    // a press can only start what has a path or a range
    expect(buttonProblem(run, [point('A'), point('B')])).toContain('điểm trượt');
    expect(buttonProblem(run, [glider('A'), point('B')])).toBeNull();
  });

  it('needs a destination that is still in the sketch when it moves', () => {
    const mv = spec({ action: 'move', targets: ['A'], move: { destinations: ['B'], speed: 'normal' } });
    expect(buttonProblem(mv, [point('A'), point('B')])).toBeNull();
    expect(buttonProblem(mv, [point('A')])).toContain('đối tượng không tồn tại');
    expect(buttonProblem(spec({ action: 'move' }))).toContain('nơi đến');
  });

  it('needs a sequence when it presents', () => {
    expect(buttonProblem(spec({ action: 'present' }))).toContain('cách trình bày');
    const show = spec({ name: 'A', targets: ['A'] });
    expect(buttonProblem(
      spec({ action: 'present', name: 'btn1, btn2', targets: ['btn1', 'btn2'], present: { sequential: true, pause: 1 } }),
      [button({ attrs: { button: show } }), button({ id: 'btn2', attrs: { button: show } })],
    )).toBeNull();
  });
});

describe('the button Edit | Action Buttons makes', () => {
  it('is the selection, named and listed as its objects are', () => {
    expect(newActionButton('toggle', [point('A'), point('B')])).toEqual({
      action: 'toggle', name: 'A, B', targets: ['A', 'B'],
    });
  });

  it('names only the parts a run can move, and stores how it runs', () => {
    expect(newActionButton('animate', [glider('G'), point('A'), slider('a')], { animation: RUN })).toEqual({
      action: 'animate', name: 'G, a', targets: ['G', 'a'], animation: RUN,
    });
    // the dialog may not have been answered yet; the default lap is what it opens on
    expect(newActionButton('animate', [glider('G')])).toEqual({
      action: 'animate', name: 'G', targets: ['G'],
      animation: { direction: 'forward', speed: 0.25 },
    });
  });

  it('keeps the whole selection for a move, and pairs it with the answer', () => {
    const mv = newActionButton('move', [point('A'), point('B')], {
      move: { destinations: ['B'], speed: 'fast' },
    });
    expect(mv.targets).toEqual(['A', 'B']);
    expect(mv.move).toEqual({ destinations: ['B'], speed: 'fast' });
  });

  it('lands a row under the button before it, on the right margin', () => {
    const first = buttonPlace([]);
    expect(first[0]).toBe(BUTTON_COLUMN_X);
    const second = buttonPlace([button()]);
    expect(second[0]).toBe(BUTTON_COLUMN_X);
    expect(second[1]).toBeLessThan(first[1]);
    // ordinary objects do not take a row
    expect(buttonPlace([point('A'), el({ type: 'text', id: 't1' })])).toEqual(first);
  });

  it('waits for a selection', () => {
    const elements = [point('A'), point('B')];
    expect(actionButtonRows(['A'], elements).canCreate).toBe(true);
    expect(actionButtonRows([], elements).canCreate).toBe(false);
    // a selection naming objects the document no longer holds is no selection
    expect(actionButtonRows(['gone'], elements).canCreate).toBe(false);
  });

  it('offers Animation only when the selection can move', () => {
    const elements = [point('A'), glider('G'), slider('a')];
    expect(actionButtonRows(['A'], elements).canAnimate).toBe(false);
    expect(actionButtonRows(['G'], elements).canAnimate).toBe(true);
    expect(actionButtonRows(['A', 'a'], elements).canAnimate).toBe(true);
    expect(actionButtonRows([], elements).canAnimate).toBe(false);
  });

  it('offers Movement only when the selection has a pair of points', () => {
    const elements = [point('A'), glider('G'), slider('a'), el({ id: 'i1', type: 'intersection' })];
    expect(actionButtonRows(['A'], elements).canMove).toBe(false);
    expect(actionButtonRows(['A', 'G'], elements).canMove).toBe(true);
    // a constructed point has no place of its own to move to
    expect(actionButtonRows(['A', 'i1'], elements).canMove).toBe(false);
    expect(isMovablePoint(slider('a'))).toBe(false);
  });

  it('offers Presentation only when the selection has two buttons', () => {
    const elements = [point('A'), button(), el({
      type: 'actionbutton', id: 'btn2', attrs: { button: spec({ name: 'A', targets: ['A'] }) },
    })];
    expect(actionButtonRows(['A', 'btn1'], elements).canPresent).toBe(false);
    expect(actionButtonRows(['btn1', 'btn2'], elements).canPresent).toBe(true);
  });
});

describe('how a Move button travels', () => {
  it('pairs the picked points two by two and leaves an odd one out', () => {
    const points = [point('A'), point('B'), point('C'), point('D'), point('E')];
    expect(movePairs(points)).toEqual([{ from: 'A', to: 'B' }, { from: 'C', to: 'D' }]);
    expect(movePairs([point('A')])).toEqual([]);
  });

  it('gives each named speed its own seconds, and a jump none', () => {
    expect(MOVE_SECONDS.jump).toBe(0);
    expect(MOVE_SECONDS.slow).toBeGreaterThan(MOVE_SECONDS.normal);
    expect(MOVE_SECONDS.normal).toBeGreaterThan(MOVE_SECONDS.fast);
    expect(MOVE_SECONDS.fast).toBeGreaterThan(0);
  });
});

