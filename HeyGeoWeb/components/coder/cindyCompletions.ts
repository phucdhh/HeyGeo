/**
 * CindyJS CodeMirror 6 autocomplete source.
 *
 * Provides completions for:
 *  - CindyJS() top-level config keys
 *  - ports / geometry / scripts object keys
 *  - Geometry element types ("Free", "Segment", etc.)
 *  - CindyScript built-in functions (used inside script strings)
 *  - Global variables injected by CindyModePanel (BOARDID, CindyJS)
 */

import { type CompletionContext, type Completion } from '@codemirror/autocomplete';

// ─── Global variables injected by the panel ──────────────────────────────────
const GLOBALS: Completion[] = [
  { label: 'CindyJS', type: 'variable', detail: 'CindyJS constructor', boost: 20 },
  { label: 'BOARDID', type: 'variable', detail: 'injected canvas div id', boost: 20 },
];

// ─── Top-level CindyJS({…}) config keys ──────────────────────────────────────
const CONFIG_KEYS: Completion[] = [
  'ports', 'scripts', 'geometry', 'defaultAppearance',
  'angleUnit', 'csconsole', 'use', 'images', 'cinderella',
].map(label => ({ label, type: 'property', detail: 'CindyJS config', boost: 8 }));

// ─── ports[i] keys ────────────────────────────────────────────────────────────
const PORT_KEYS: Completion[] = [
  'id', 'width', 'height', 'transform', 'background', 'coordinateSystem',
].map(label => ({ label, type: 'property', detail: 'port config' }));

// ─── scripts keys ─────────────────────────────────────────────────────────────
const SCRIPT_KEYS: Completion[] = [
  'init', 'draw', 'mousedown', 'mouseup', 'mousemove', 'mousedrag',
  'tick', 'keydown', 'keyup',
].map(label => ({ label, type: 'keyword', detail: 'script event', boost: 6 }));

// ─── geometry element types ───────────────────────────────────────────────────
const GEO_TYPES: Completion[] = [
  'Free', 'Segment', 'Join', 'Meet', 'Orthogonal',
  'Circle', 'CircleBy3', 'CircleByFixedRadius',
  'Midpoint', 'Angle', 'Polar',
  'ThroughPoint', 'Parallel', 'Reflection',
  'Intersection', 'Locus',
].map(label => ({ label, type: 'type', detail: 'geometry type', boost: 10 }));

// ─── geometry element property keys ──────────────────────────────────────────
const GEO_KEYS: Completion[] = [
  'name', 'type', 'pos', 'args', 'color', 'alpha', 'size',
  'labeled', 'visible', 'fixed',
].map(label => ({ label, type: 'property', detail: 'geo element key' }));

// ─── defaultAppearance keys ───────────────────────────────────────────────────
const APPEARANCE_KEYS: Completion[] = [
  'dimDependent', 'fontFamily', 'lineSize', 'pointSize', 'textsize',
].map(label => ({ label, type: 'property', detail: 'appearance' }));

// ─── CindyScript built-in functions (used inside script strings) ──────────────
const CS_BUILTINS: Completion[] = [
  // Drawing
  'draw', 'drawtext', 'fill', 'fillPolygon', 'drawcircle', 'drawsegment',
  // Math
  'dist', 'angle', 'abs', 'sqrt', 'sin', 'cos', 'tan', 'arctan2',
  'floor', 'ceil', 'round', 'mod', 'max', 'min', 'sign', 'sum', 'product',
  're', 'im',
  // Geometry
  'midpoint', 'normalize', 'cross', 'dot',
  // Logic / control
  'if', 'while', 'repeat', 'forall', 'apply',
  // Output
  'println', 'print',
  // Color helpers
  'color', 'hue', 'grey',
].map(label => ({ label, type: 'function', detail: 'CindyScript', boost: 5 }));

// ─── All completions merged ───────────────────────────────────────────────────
const ALL_COMPLETIONS: Completion[] = [
  ...GLOBALS,
  ...CONFIG_KEYS,
  ...PORT_KEYS,
  ...SCRIPT_KEYS,
  ...GEO_TYPES,
  ...GEO_KEYS,
  ...APPEARANCE_KEYS,
  ...CS_BUILTINS,
];

// ─── CompletionSource ─────────────────────────────────────────────────────────
export function cindyCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: ALL_COMPLETIONS,
    validFor: /^\w*$/,
  };
}
