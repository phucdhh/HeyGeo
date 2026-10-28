/**
 * Edit | Copy, Cut and Paste — a piece of a sketch carried to another place.
 *
 * Sketchpad's clipboard holds the picked objects together with everything they
 * are built from: pick a midpoint and the copy brings the two points it halves,
 * because without them there is no midpoint to make. Nothing that is built *on*
 * the selection travels, which is the other half of that rule — a copied point
 * does not drag its circle along.
 *
 * A paste is a new construction, not a second view of the old one, so every id
 * is given a fresh number and every reference is rewritten to it. The copy also
 * steps aside by half a unit per paste, the way Sketchpad's does, so pressing
 * Paste twice leaves two copies rather than one on top of the other.
 */
import type { HeyGeoElement } from './designTypes';
import { coordParents, parentIds } from './sceneModel';
import { isReferenceParent } from './elementRegistry';

/** What the clipboard holds, and how many times it has been pasted. */
export interface Clipboard {
  /** in document order, so parents come before what is built from them */
  elements: HeyGeoElement[];
  pastes: number;
}

/** A clone of a document slice that shares nothing with the original. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The selection plus every ancestor it needs, in document order.
 *
 * An id the document does not hold is skipped: a button may name an object the
 * designer has already deleted, and copying must not fail because of it.
 */
export function copyClosure(elements: HeyGeoElement[], selection: string[]): HeyGeoElement[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const wanted = new Set<string>();
  const queue = selection.filter((id) => byId.has(id));
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (wanted.has(id)) continue;
    wanted.add(id);
    const el = byId.get(id)!;
    const deps = [...parentIds(el)];
    // a frame's unit point is named in its mark, and a copy of the frame without
    // it would share the original's scale
    const unit = (el.attrs?.coordsys as { unit?: unknown } | undefined)?.unit;
    if (typeof unit === 'string') deps.push(unit);
    for (const p of deps) {
      if (byId.has(p) && !wanted.has(p)) queue.push(p);
    }
  }
  return elements.filter((e) => wanted.has(e.id)).map((e) => clone(e));
}

/** How far the nth paste of a clipboard steps aside, in user units. */
export function pasteOffset(pastes: number): [number, number] {
  const n = Math.max(1, pastes);
  return [0.5 * n, -0.5 * n];
}

/** Id lists in descriptors — measure args, images, plots, buttons, anchors. */
function renameIds(list: unknown, map: Map<string, string>): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((id) => (typeof id === 'string' ? map.get(id) ?? id : id));
}

type Descriptor = Record<string, unknown>;

/** The id list each descriptor keeps, named the way that descriptor names it. */
const DESCRIPTOR_IDS: [string, 'args' | 'of'][] = [
  ['measure', 'args'],
  ['anchor', 'of'],
  ['image', 'of'],
  ['plotAt', 'args'],
];

function renameAttrs(source: Descriptor, map: Map<string, string>): Descriptor {
  const out = { ...source };
  for (const [key, field] of DESCRIPTOR_IDS) {
    const d = out[key];
    if (!d || typeof d !== 'object') continue;
    const list = (d as Descriptor)[field];
    if (Array.isArray(list)) out[key] = { ...(d as Descriptor), [field]: renameIds(list, map) };
  }
  const button = out.button;
  if (button && typeof button === 'object' && Array.isArray((button as Descriptor).targets)) {
    out.button = { ...(button as Descriptor), targets: renameIds((button as Descriptor).targets, map) };
  }
  // a frame's unit point is named in its mark, not in its parents
  const coordsys = out.coordsys;
  if (coordsys && typeof coordsys === 'object') {
    const unit = (coordsys as Descriptor).unit;
    if (typeof unit === 'string' && map.has(unit)) {
      out.coordsys = { ...(coordsys as Descriptor), unit: map.get(unit) };
    }
  }
  return out;
}

/**
 * Where a copy sits, moved aside: the two coordinates of a point or a caption,
 * and the two screen ends of a parameter's rail. Everything else is placed by
 * what it is built from and follows the copy on its own.
 */
function shiftPosition(el: HeyGeoElement, dx: number, dy: number): void {
  const p = el.parents;
  if ((coordParents(el) !== null || el.type === 'text')
    && typeof p[0] === 'number' && typeof p[1] === 'number') {
    p[0] += dx;
    p[1] += dy;
    return;
  }
  if (el.type === 'slider') {
    for (const i of [0, 1]) {
      const at = p[i];
      if (Array.isArray(at) && typeof at[0] === 'number' && typeof at[1] === 'number') {
        p[i] = [at[0] + dx, at[1] + dy];
      }
    }
  }
}

/**
 * The pasted elements: every id renewed, every reference pointed at the copy,
 * and every place stepped aside.
 *
 * `newId` is the canvas's own counter, so the copies cannot take an id the
 * document already uses — the reason this takes a callback rather than deciding
 * names here.
 */
export function pasteElements(
  clip: HeyGeoElement[],
  newId: (el: HeyGeoElement) => string,
  offset: [number, number],
): HeyGeoElement[] {
  const map = new Map<string, string>();
  for (const el of clip) map.set(el.id, newId(el));

  return clip.map((source) => {
    const el = clone(source);
    el.id = map.get(source.id) ?? source.id;
    el.parents = source.parents.map((p, i) => {
      if (isReferenceParent(source, i) && typeof p === 'string' && map.has(p)) return map.get(p)!;
      return clone(p);
    });
    el.attrs = renameAttrs(clone(source.attrs ?? {}), map);
    shiftPosition(el, offset[0], offset[1]);
    return el;
  });
}
