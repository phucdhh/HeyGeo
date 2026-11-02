/**
 * Pressing an action button, run against a live board.
 *
 * The designer and the shared viewer both draw a sketch's buttons, and buttons
 * that only answer on one of the two pages are dead furniture on the other. So
 * the press lives here, over a board and the document's own elements; each host
 * keeps what only it has — the designer's undo step and its animation clock, the
 * viewer's read-only stillness.
 *
 * A press changes the objects the button names, never the button itself, except
 * that a toggle rewrites its own caption to say what the next press will do.
 */
import type { HeyGeoElement } from './designTypes';
import type { AnimationSpec } from './animationModel';
import {
  MOVE_SECONDS,
  buttonCaption,
  buttonOf,
  buttonShows,
  type ActionButtonSpec,
} from './actionButtonModel';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The board pieces a press touches. JSXGraph's board satisfies this. */
export interface ButtonBoard {
  objects?: Record<string, any>;
  update(): void;
}

export interface ButtonRuntimeHost {
  /** Read when a press happens: a host rebuilds its board, so it is never held. */
  board(): ButtonBoard | null;
  /** The live document, in creation order. */
  elements(): HeyGeoElement[];
  /** A press is about to change the document; the designer takes its undo step here. */
  beginChange?(): void;
  /** The document changed, so the host may save or redraw. */
  changed?(): void;
  /** An animation button's run, which only a host with a clock can drive. */
  animate?(spec: AnimationSpec, targets: string[]): boolean;
  /** Something worth telling the person who pressed. */
  notify?(message: string): void;
}

export interface ButtonRuntime {
  /** Press it. False when the button has nothing left to act on. */
  press(el: HeyGeoElement): boolean;
  /** Give up any clock the runtime holds — a move in flight, a presentation. */
  stop(): void;
}

/** JSXGraph's COORDS_BY_USER, the mode its setPosition understands. */
const BY_USER = 1;

export function createButtonRuntime(host: ButtonRuntimeHost): ButtonRuntime {
  let moveFrame: number | null = null;
  let presentTimer: ReturnType<typeof setTimeout> | null = null;

  const elementOf = (id: string) => host.elements().find((e) => e.id === id);
  const objectOf = (id: string) => host.board()?.objects?.[id];

  function stop() {
    if (moveFrame !== null) { cancelAnimationFrame(moveFrame); moveFrame = null; }
    if (presentTimer !== null) { clearTimeout(presentTimer); presentTimer = null; }
  }

  /** A free point keeps the place a run left it in; the rest are derived. */
  function parkPoint(el: HeyGeoElement, x: number, y: number) {
    if (el.type === 'point') el.parents = [x, y];
  }

  function pressVisibility(el: HeyGeoElement, spec: ActionButtonSpec): boolean {
    const board = host.board();
    if (!board) return false;
    const targets = spec.targets.map(elementOf).filter((e): e is HeyGeoElement => e !== undefined);
    if (targets.length === 0) {
      host.notify?.('Nút này không còn đối tượng nào để hiện hay ẩn.');
      return false;
    }
    const shows = buttonShows(spec, (id) => elementOf(id)?.attrs?.visible !== false);
    host.beginChange?.();
    for (const target of targets) {
      target.attrs = { ...(target.attrs ?? {}), visible: shows };
      objectOf(target.id)?.setAttribute?.({ visible: shows });
    }
    // only a toggle flips, so only a toggle has to say something new: what the
    // next press will do, which is the opposite of the one just taken
    if (spec.action === 'toggle') {
      const caption = buttonCaption(spec, !shows);
      el.parents = [el.parents[0], el.parents[1], caption];
      objectOf(el.id)?.setText?.(caption);
    }
    board.update();
    host.changed?.();
    return true;
  }

  /**
   * Move each target towards its destination along a straight line. The
   * destination is read on every frame rather than remembered at the press, so a
   * move towards a point that is itself moving follows it, as Sketchpad's does.
   */
  function pressMove(spec: ActionButtonSpec): boolean {
    const board = host.board();
    const move = spec.move;
    if (!board || !move) return false;
    const jobs = spec.targets
      .map((id, i) => ({ el: elementOf(id), obj: objectOf(id), dest: objectOf(move.destinations[i]) }))
      .filter((j) => j.el && j.obj && j.dest && typeof j.obj.X === 'function')
      .map((j) => ({ el: j.el!, obj: j.obj, dest: j.dest!, x0: j.obj.X(), y0: j.obj.Y() }));
    if (jobs.length === 0) {
      host.notify?.('Nút này không còn điểm nào để di chuyển.');
      return false;
    }

    host.beginChange?.();
    const settle = (t: number) => {
      for (const job of jobs) {
        const x = job.x0 + (job.dest.X() - job.x0) * t;
        const y = job.y0 + (job.dest.Y() - job.y0) * t;
        job.obj.setPosition?.(BY_USER, [x, y]);
        if (t >= 1) parkPoint(job.el, x, y);
      }
    };

    const seconds = MOVE_SECONDS[move.speed];
    if (seconds <= 0) {
      settle(1);
      board.update();
      host.changed?.();
      return true;
    }

    stop();
    const began = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / (seconds * 1000));
      settle(t);
      host.board()?.update();
      if (t >= 1) { moveFrame = null; host.changed?.(); return; }
      moveFrame = requestAnimationFrame(frame);
    };
    moveFrame = requestAnimationFrame(frame);
    return true;
  }

  /**
   * Present: press each button the sequence names, all at once or one after
   * another with the pause Sketchpad's dialog asks for in between.
   */
  function pressPresent(spec: ActionButtonSpec): boolean {
    const buttons = spec.targets
      .map(elementOf)
      .filter((e): e is HeyGeoElement => e !== undefined && buttonOf(e) !== null);
    if (buttons.length === 0) {
      host.notify?.('Nút trình diễn này không còn nút nào để bấm.');
      return false;
    }
    const present = spec.present ?? { sequential: true, pause: 1 };
    if (!present.sequential) {
      for (const button of buttons) press(button);
      return true;
    }
    stop();
    let next = 0;
    const step = () => {
      presentTimer = null;
      press(buttons[next++]);
      if (next < buttons.length) {
        presentTimer = setTimeout(step, Math.max(0, present.pause) * 1000);
      }
    };
    step();
    return true;
  }

  function press(el: HeyGeoElement): boolean {
    const spec = buttonOf(el);
    if (!spec) return false;
    switch (spec.action) {
      case 'animate':
        return spec.animation ? (host.animate?.(spec.animation, spec.targets) ?? false) : false;
      case 'move':
        return pressMove(spec);
      case 'present':
        return pressPresent(spec);
      default:
        return pressVisibility(el, spec);
    }
  }

  return { press, stop };
}
