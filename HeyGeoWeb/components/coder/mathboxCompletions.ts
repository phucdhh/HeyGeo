/**
 * MathBox CodeMirror 6 autocomplete source.
 *
 * Provides completions for:
 *  - MathBox stage primitives (cartesian, surface, line, …)
 *    names verified against node_modules/mathbox/build/esm/primitives/types/
 *  - common primitive option keys
 *  - Stage/Bootstrap API methods (set, select, three, …)
 *  - threestrap plugin names and Bootstrap options
 *  - Globals injected by MathboxModePanel (MathBox, THREE, element, BOARDID)
 */

import { type CompletionContext, type Completion } from '@codemirror/autocomplete';

// ─── Globals injected by the preview iframe ──────────────────────────────────
const GLOBALS: Completion[] = [
  { label: 'MathBox', type: 'variable', detail: 'engine global (UMD)', boost: 20 },
  { label: 'THREE', type: 'variable', detail: 'three.js global', boost: 20 },
  { label: 'element', type: 'variable', detail: 'mount <div> for the WebGL canvas', boost: 20 },
  { label: 'BOARDID', type: 'variable', detail: 'id of the mount div (string)', boost: 15 },
  { label: 'mathbox', type: 'variable', detail: 'your Stage (result of MathBox.mathBox)', boost: 10 },
  { label: 'three', type: 'variable', detail: 'mathbox.three (renderer, camera, scene)', boost: 8 },
];

// ─── Bootstrap / factory options ─────────────────────────────────────────────
const BOOTSTRAP_KEYS: Completion[] = [
  'element', 'plugins', 'controls', 'renderer', 'camera', 'classic', 'stats', 'splash', 'warmup',
].map(label => ({ label, type: 'property', detail: 'MathBox.mathBox(…)', boost: 10 }));

// ─── threestrap plugin names ─────────────────────────────────────────────────
const PLUGINS: Completion[] = [
  'core', 'empty', 'bind', 'renderer', 'size', 'fill', 'loop', 'time', 'scene', 'camera',
  'render', 'warmup', 'controls', 'cursor', 'stats', 'fullscreen', 'ui', 'vr', 'mathbox', 'splash',
].map(label => ({ label, type: 'string', detail: 'threestrap plugin', boost: 5 }));

// ─── Stage methods (mathbox.method(…)) ───────────────────────────────────────
const STAGE_METHODS: Completion[] = [
  'cartesian', 'cartesian4', 'polar', 'spherical', 'stereographic', 'stereographic4',
  'axis', 'face', 'grid', 'line', 'point', 'strip', 'surface', 'ticks', 'vector',
  'area', 'array', 'buffer', 'interval', 'matrix', 'volume', 'voxel', 'scale', 'latch',
  'group', 'inherit', 'parent', 'root', 'source', 'unit',
  'clamp', 'grow', 'join', 'lerp', 'memo', 'readback', 'repeat', 'resample', 'reverse',
  'slice', 'split', 'spread', 'subdivide', 'swizzle', 'transpose',
  'layer', 'mask', 'transform', 'transform3', 'transform4', 'fragment', 'vertex',
  'clock', 'now',
  'move', 'play', 'present', 'reveal', 'slide', 'step', 'track', 'transition',
  'dom', 'html',
  'format', 'label', 'retext', 'text',
  'shader', 'camera', 'compose', 'rtt', 'view',
  'set', 'get', 'bind', 'select', 'remove', 'destroy', 'update', 'publish', 'start', 'stop', 'frame',
].map(label => ({ label, type: 'method', detail: 'MathBox stage', boost: 12 }));

// ─── Common primitive option keys ────────────────────────────────────────────
const PRIMITIVE_KEYS: Completion[] = [
  // data / shape
  'expr', 'channels', 'items', 'width', 'height', 'depth', 'divide', 'divideX', 'divideY', 'order', 'range', 'scale', 'extent', 'epsilon',
  // drawing
  'color', 'opacity', 'visible', 'stroke', 'size', 'width', 'shaded', 'lit', 'normals', 'near', 'far',
  // transforms / views
  'axis', 'vector', 'matrix', 'position', 'rotation', 'quaternion', 'scale', 'offset', 'slope',
  // time / present
  'focus', 'speed', 'live', 'loop', 'limit', 'delay', 'from', 'to', 'current', 'nearest', 'normalize',
  // text
  'text', 'font', 'style', 'weight', 'backface', 'align', 'baseline', 'inside',
  // shaders
  'code', 'fragment', 'vertex', 'attributes', 'uniforms', 'groups', 'defines',
].map(label => ({ label, type: 'property', detail: 'MathBox option' }));

// ─── All completions merged ───────────────────────────────────────────────────
const ALL_COMPLETIONS: Completion[] = [
  ...GLOBALS,
  ...BOOTSTRAP_KEYS,
  ...PLUGINS,
  ...STAGE_METHODS,
  ...PRIMITIVE_KEYS,
];

// ─── CompletionSource ─────────────────────────────────────────────────────────
export function mathboxCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: ALL_COMPLETIONS,
    validFor: /^\w*$/,
  };
}
