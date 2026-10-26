'use client';

/**
 * JSXGraphViewer – renders a HeyGeo JSON model using the JSXGraph engine.
 *
 * HeyGeo JSON format (produced by the Qt desktop app):
 * {
 *   "version": "1.0",
 *   "title": "Triangle ABC",
 *   "boundingbox": [-5, 5, 5, -5],   // [x_min, y_max, x_max, y_min]
 *   "axis": true,
 *   "grid": false,
 *   "elements": [
 *     { "type": "point",   "id": "A", "parents": [0, 0], "attrs": { "name": "A" } },
 *     { "type": "segment", "id": "s1", "parents": ["A", "B"], "attrs": {} }
 *   ]
 * }
 *
 * `parents` may be literal numbers or IDs of previously defined elements.
 */

import { useEffect, useRef, useState, useId } from 'react';
import Script from 'next/script';
import { getJXG, whenJsxGraphReady } from '@/lib/jsxgraph';

export interface HeyGeoElement {
  type: string;
  id?: string;
  parents: (string | number | boolean | (number | null)[])[];
  attrs?: Record<string, unknown>;
}

export interface HeyGeoAnnotation {
  content: string; // raw HeyGeo source with $...$ / $$...$$ notation
  x: number;       // left edge as fraction of canvas width  (0..1)
  y: number;       // top  edge as fraction of canvas height (0..1)
  w: number;       // width  fraction
  h: number;       // height fraction
  fontSize?: number;   // font size in pt (default 14)
  fontColor?: string;  // CSS color string, e.g. "#333333" (default black)
}

export interface HeyGeoData {
  version?: string;
  title?: string;
  boundingbox?: [number, number, number, number];
  axis?: boolean;
  grid?: boolean;
  elements: HeyGeoElement[];
  annotations?: HeyGeoAnnotation[];
  /** Code Mode: execute raw JSXGraph source instead of rendering elements */
  codeMode?: boolean;
  code?: string;
}

interface Props {
  data: HeyGeoData;
  containerId?: string;
}

declare global {
  interface Window {
    // KaTeX: loaded from CDN
    katex: {
      renderToString: (latex: string, opts?: Record<string, unknown>) => string;
    };
    JXG: {
      JSXGraph: {
        initBoard: (id: string, options: Record<string, unknown>) => JXGBoard;
        freeBoard: (board: JXGBoard) => void;
      };
    };
  }
}

interface JXGBoard {
  create: (type: string, parents: unknown[], attrs: Record<string, unknown>) => unknown;
}

// Render a HeyGeo annotation content string (with $...$ and $$...$$) to HTML.
// Plain text is HTML-escaped; math is passed through katex.renderToString.
function renderAnnotationHtml(content: string): string {
  // Two-level split: display math first, then inline math.
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const latex = part.slice(2, -2);
        try {
          // Wrap in a div with tight margins to avoid KaTeX default 1em top/bottom margin
          return `<div style="margin:0.3em 0;text-align:center">${window.katex.renderToString(latex, { displayMode: true, throwOnError: false })}</div>`;
        } catch { return part; }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const latex = part.slice(1, -1);
        try {
          return window.katex.renderToString(latex, { displayMode: false, throwOnError: false });
        } catch { return part; }
      }
      // Plain text: escape HTML and convert newlines to <br>
      return part
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .split('\n').join('<br>');
    })
    .join('');
}

export default function JSXGraphViewer({ data, containerId }: Props) {
  const uid = useId().replace(/:/g, '');
  const boardId = containerId ?? `jxg-${uid}`;
  const boardRef      = useRef<JXGBoard | null>(null);
  const annOverlayRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded]     = useState(() => getJXG() !== null);
  const [katexLoaded, setKatex] = useState(false);
  const [error, setError]       = useState('');

  // If KaTeX was already loaded by a previous render, detect eagerly.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.katex) setKatex(true);
    let cancelled = false;
    whenJsxGraphReady()
      .then(() => { if (!cancelled) setLoaded(true); })
      .catch(() => { if (!cancelled) setError('Không thể tải engine JSXGraph. Kiểm tra kết nối mạng.'); });
    return () => { cancelled = true; };
  }, []);

  // Render annotation overlays with KaTeX whenever katex or data changes.
  useEffect(() => {
    if (!katexLoaded || !annOverlayRef.current) return;
    if (typeof window === 'undefined' || !window.katex) return;
    const overlay = annOverlayRef.current;
    overlay.innerHTML = '';
    const anns = data?.annotations;
    if (!anns || anns.length === 0) return;
    for (const ann of anns) {
      const div = document.createElement('div');
      div.style.position  = 'absolute';
      div.style.left      = `${ann.x * 100}%`;
      div.style.top       = `${ann.y * 100}%`;
      div.style.width     = `${ann.w * 100}%`;
      div.style.overflow  = 'hidden';
      div.style.fontSize   = `${ann.fontSize ?? 14}px`;
      div.style.color       = ann.fontColor ?? '#000000';
      div.style.lineHeight = '1.5';
      div.style.padding   = '4px 6px';
      div.style.background = 'rgba(255,255,255,0.85)';
      div.style.borderRadius = '3px';
      // Reset KaTeX display-math margins inside this overlay div
      const style = document.createElement('style');
      style.textContent = '.heygeo-ann .katex-display { margin: 0 !important; }';
      div.classList.add('heygeo-ann');
      div.appendChild(style);
      const content = document.createElement('span');
      content.innerHTML = renderAnnotationHtml(ann.content);
      div.appendChild(content);
      overlay.appendChild(div);
    }
  }, [katexLoaded, data]);

  useEffect(() => {
    if (!loaded || !data) return;
    if (typeof window === 'undefined' || !window.JXG) return;

    // JSXGraph ≥ 1.10 hangs synchronously when useKatex:true but window.katex not present.
    // Wait for KaTeX to load before running code-mode models that use it.
    if (data.codeMode && data.code && /useKatex/i.test(data.code) && !katexLoaded) return;

    // Free any existing board
    if (boardRef.current) {
      window.JXG.JSXGraph.freeBoard(boardRef.current);
      boardRef.current = null;
    }

    setError('');

    // Collects per-element cleanup fns (e.g. label-drag capture listeners)
    const labelCleanupFns: (() => void)[] = [];

    const cleanup = () => {
      labelCleanupFns.forEach(fn => fn());
      if (boardRef.current && window.JXG) {
        window.JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };

    // ── Code Mode: execute raw JSXGraph source (saved from Code Mode editor) ──
    if (data.codeMode && data.code) {
      try {
        const jxg = window.JXG;
        const code = data.code;

        // Normalise 'jxgbox' → actual boardId (old share examples)
        let normalizedCode = code.replace(/(['"\`])jxgbox\1/g, `'${boardId}'`);

        // JSXGraph ≥ 1.10 có thể hang vô hạn khi useMathJax:true nhưng window.MathJax chưa load.
        // Tự động chuyển sang useKatex:true nếu KaTeX đã có sẵn.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(window as any).MathJax && window.katex) {
          normalizedCode = normalizedCode.replace(/useMathJax\s*:\s*true/g, 'useKatex: true');
        }

        const callsInitBoard = /\.initBoard\s*\(/.test(normalizedCode);

        if (callsInitBoard) {
          // Wrap JXG.JSXGraph.initBoard so the right options are set at CONSTRUCTION time.
          // Post-hoc attribute mutation (board.attr.pan.xxx = …) is unreliable because:
          //   - JSXGraph may snapshot attrs during handler registration.
          //   - view3d trackball event handlers are only wired up when trackball.enabled is
          //     true AT createElement time; flipping it later has no effect.
          // Strategy:
          //   1) pan.needTwoFingers:true → board's touchStartMoveOriginOneFinger returns false
          //      for single-finger touch → board stays in BOARD_MODE_NONE → view3d's own
          //      pointerDownHandler fires and activates trackball rotation.
          //   2) Patch board.create to force trackball:{enabled:true, button:-1} for every
          //      view3d element, so its pointer handlers are registered from the start.
          //   3) Set touch-action:none on containerObj to allow single-finger pointer events.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const origInitBoard = (jxg.JSXGraph as any).initBoard;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (jxg.JSXGraph as any).initBoard = (id: string, opts: any = {}) => {
            const patchedOpts = {
              ...opts,
              pan: { ...(opts.pan ?? {}), needTwoFingers: true },
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const board: any = origInitBoard.call(jxg.JSXGraph, id, patchedOpts);
            // Patch board.create for view3d trackball
            const origCreate = board.create.bind(board);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            board.create = (type: string, parents: unknown[], attrs: any = {}) => {
              if (typeof type === 'string' && type.toLowerCase() === 'view3d') {
                // Force trackball on with button:-1 (any pointer/touch)
                attrs = { ...attrs, trackball: { enabled: true, button: -1, key: 'none' } };
              }
              return origCreate(type, parents, attrs);
            };
            // Touch-action:none lets single-finger reach view3d pointer handlers
            if (board.containerObj) {
              board.containerObj.style.touchAction = 'none';
            }
            return board;
          };

          try {
            // eslint-disable-next-line no-new-func
            new Function('BOARDID', 'JXG', normalizedCode)(boardId, jxg);
          } finally {
            // Always restore the original initBoard
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (jxg.JSXGraph as any).initBoard = origInitBoard;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          boardRef.current = ((jxg as any).boards?.[boardId] ?? null) as JXGBoard | null;
        } else {
          const board = jxg.JSXGraph.initBoard(boardId, {
            boundingbox: data.boundingbox ?? [-8, 8, 8, -8],
            keepaspectratio: true,
            showCopyright: false,
            showNavigation: true,
            pan: { needTwoFingers: true },
          });
          boardRef.current = board;
          // eslint-disable-next-line no-new-func
          new Function('BOARDID', 'JXG', 'board', normalizedCode)(boardId, jxg, board);
        }
      } catch (e) {
        console.error('JSXGraph code mode render error:', e);
        const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        setError(`Lỗi thực thi code: ${msg}`);
      }
      return cleanup; // always register cleanup for code mode
    }

    // ── Normal mode: init board then create elements ─────────────────────────
    try {
      const board = window.JXG.JSXGraph.initBoard(boardId, {
        boundingbox: data.boundingbox ?? [-8, 8, 8, -8],
        axis: data.axis ?? false,
        grid: data.grid ?? false,
        showCopyright: false,
        showNavigation: true,
        keepaspectratio: true,
        resize: { enabled: true, throttle: 50 },
        pan: { needTwoFingers: true },
      });

      boardRef.current = board;

      const elMap: Record<string, unknown> = {};

      for (const el of data.elements) {
        const parents = el.parents.map((p) => {
          if (typeof p === 'string' && elMap[p] !== undefined) return elMap[p];
          // Coordinate arrays for curve plot type: convert null → NaN (pen-lift separator)
          if (Array.isArray(p)) return (p as (number | null)[]).map(v => (v === null ? NaN : v));
          // Dynamic function strings for text elements (measure/calculate values).
          // The string "function(){...}" closes over a `board` variable injected
          // via new Function so that board.objects['id'].X()/Y() resolve correctly.
          // The returned function is wrapped in an error guard: if the inner
          // computation throws (e.g. a referenced element isn't ready yet),
          // JSXGraph gets a safe '…' string instead of displaying fn.toString().
          if (typeof p === 'string' && p.trimStart().startsWith('function(')) {
            try {
              // eslint-disable-next-line no-new-func
              const raw = new Function('board', `return (${p});`)(board);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return function(this: any) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const v = (raw as any).call(this);
                  return v != null ? String(v) : '…';
                } catch (err) {
                  console.error('[HeyGeo] text fn error:', err, '\nfn:', p.slice(0, 120));
                  return '…';
                }
              };
            } catch {
              return '…'; // syntax error in generated funcStr – show harmless placeholder
            }
          }
          return p;
        });

        // ── objectlocus: dynamic envelope of a line-family locus ─────────────
        // The C++ exporter emits type='objectlocus' when the locus driven object
        // is a G_LINE (perpendicular bisector, parallel, etc.).
        // We replicate the WSP GeomLocus DriveChain algorithm:
        //   1. For each glider position on its slideObject,
        //   2. Update all elements from glider → drivenLine (insertion order),
        //   3. Read drivenLine.stdform to get the line direction,
        //      and drivenLine.point1 as a finite base point,
        //   4. Extend ±15 board-units to produce a visible segment,
        //   5. Append to dataX/dataY with NaN pen-lift separator.
        // parents: [gliderId, drivenLineId]
        if (el.type === 'objectlocus') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const olGlider = elMap[el.parents[0] as string] as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const olLine   = elMap[el.parents[1] as string] as any;
          if (olGlider && olLine) {
            const olN: number = (el.attrs as any)?.numberPoints ?? 150;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { numberPoints: _olnp, ...olRestAttrs } = (el.attrs ?? {}) as any;
            const olCurveAttrs = el.id
              ? { id: el.id, curveType: 'plot', ...olRestAttrs }
              : { curveType: 'plot', ...olRestAttrs };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const olCurve = (board as any).create('curve', [[0], [0]], olCurveAttrs);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (olCurve as any).updateDataArray = function (this: any) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const slideObj = (olGlider as any).slideObject;
              if (!slideObj) { this.dataX = []; this.dataY = []; return; }

              const mi: number = slideObj.minX();
              const ma: number = slideObj.maxX();
              const step = (ma - mi) / olN;
              const savePos: number = (olGlider as any).position;
              this.dataX = [];
              this.dataY = [];

              // For closed paths (circle/line), add one extra sample to close.
              // OBJECT_CLASS_CURVE = 3 in JSXGraph.
              let le = olN;
              if (slideObj.elementClass !== 3) le++;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const brdObjs = (board as any).objects;

              for (let i = 0; i < le; i++) {
                const t = mi + i * step;
                const px = slideObj.X(t) / slideObj.Z(t);
                const py = slideObj.Y(t) / slideObj.Z(t);

                // Reposition the glider
                (olGlider as any).setPositionDirectly(1 /* COORDS_BY_USER */, [px, py]);

                // Update the dependency chain from glider → drivenLine
                // (mirrors JSXGraph tracecurve.updateDataArray exactly)
                let from = false;
                for (const eid in brdObjs) {
                  if (!Object.prototype.hasOwnProperty.call(brdObjs, eid)) continue;
                  const pEl = brdObjs[eid];
                  if (pEl === olGlider) { from = true; }
                  if (from && pEl.needsRegularUpdate) {
                    const st = pEl.visProp?.trace;
                    if (pEl.visProp) pEl.visProp.trace = false;
                    pEl.needsUpdate = true;
                    pEl.update(true);
                    if (pEl.visProp) pEl.visProp.trace = st;
                    if (pEl === olLine) break;
                  }
                }

                // Extract geometry from drivenLine's stdform:
                //   c0 + c1*x + c2*y = 0
                //   direction: (-c2, c1), base point: point1 (finite)
                const sf = (olLine as any).stdform;
                if (sf) {
                  const ddx = -sf[2], ddy = sf[1];
                  const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
                  const ext = 15 / dlen;
                  const p1 = (olLine as any).point1;
                  let bx: number, by: number;
                  if (p1 && isFinite(p1.X()) && isFinite(p1.Y())) {
                    bx = p1.X(); by = p1.Y();
                  } else if (Math.abs(sf[1]) >= Math.abs(sf[2])) {
                    bx = -sf[0] / sf[1]; by = 0;
                  } else {
                    bx = 0; by = -sf[0] / sf[2];
                  }
                  this.dataX.push(bx - ddx * ext, bx + ddx * ext, NaN);
                  this.dataY.push(by - ddy * ext, by + ddy * ext, NaN);
                }
              }

              // Restore original glider position and re-constrain the chain
              (olGlider as any).position = savePos;
              let from2 = false;
              for (const eid in brdObjs) {
                if (!Object.prototype.hasOwnProperty.call(brdObjs, eid)) continue;
                const pEl = brdObjs[eid];
                if (pEl === olGlider) { from2 = true; }
                if (from2 && pEl.needsRegularUpdate) {
                  const st = pEl.visProp?.trace;
                  if (pEl.visProp) pEl.visProp.trace = false;
                  pEl.needsUpdate = true;
                  pEl.update(true);
                  if (pEl.visProp) pEl.visProp.trace = st;
                  if (pEl === olLine) break;
                }
              }
            };
            if (el.id) elMap[el.id] = olCurve;
          }
          continue;
        }

        // Pass el.id into attrs so JSXGraph registers the element in board.objects
        // with the correct ID. This is required for JessieCode $('id') lookups in
        // dynamic transform expressions (e.g. X($('p0'))-X($('p1'))).
        // Special: eventbinding – wire up a drag listener so that when
        // `parents[0]` (e.g. origin O) is dragged, `parents[1]` (e.g. U)
        // is translated by the same delta, keeping the coordinate system rigid.
        // coordsys_u_drag: parents=[U, O, xTicks, yTicks]
        // Constrains U to horizontal-right of O, and updates tick spacing on drag.
        if (el.type === 'eventbinding' && el.attrs?.event === 'coordsys_u_drag') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tgt    = elMap[el.parents[0] as string] as any; // U
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const origin = elMap[el.parents[1] as string] as any; // O
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const xTicks = elMap[el.parents[2] as string] as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const yTicks = elMap[el.parents[3] as string] as any;
          if (tgt && origin) {
            tgt.on('drag', () => {
              const minDist = 0.1;
              const clampedX = Math.max(tgt.X() as number, (origin.X() as number) + minDist);
              tgt.setPosition(1, [clampedX, origin.Y() as number]);
              // Imperatively update tick spacing = current |O→U| distance
              const dist = clampedX - (origin.X() as number);
              if (xTicks?.setAttribute) xTicks.setAttribute({ ticksdistance: dist });
              if (yTicks?.setAttribute) yTicks.setAttribute({ ticksdistance: dist });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (board as any).update();
            });
          }
          continue;
        }

        if (el.type === 'eventbinding' && el.attrs?.event === 'move_with') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const src = elMap[el.parents[0] as string] as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tgt = elMap[el.parents[1] as string] as any;
          if (src && tgt) {
            let prevX = src.X() as number;
            let prevY = src.Y() as number;
            src.on('down', () => { prevX = src.X(); prevY = src.Y(); });
            src.on('drag', () => {
              const dx = (src.X() as number) - prevX;
              const dy = (src.Y() as number) - prevY;
              // COORDS_BY_USER = 1 in JSXGraph
              tgt.setPosition(1, [tgt.X() + dx, tgt.Y() + dy]);
              prevX = src.X();
              prevY = src.Y();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (board as any).update();
            });
          }
          continue;
        }

        let attrs: Record<string, unknown> = el.id
          ? { id: el.id, ...(el.attrs ?? {}) }
          : { ...(el.attrs ?? {}) };

        const created = board.create(el.type, parents, attrs);
        if (el.id) elMap[el.id] = created;

        // Make point labels draggable by intercepting pointer events at the board
        // container level (capture phase), before JSXGraph's own bubble-phase
        // pointerdown listener.
        //
        // Why not listen on label.rendNode directly?
        //   JSXGraph sets `pointer-events: none` on label DOM nodes (they are
        //   decorators, not interactive elements by design), so `pointerdown` on
        //   `rendNode` never fires — even though cursor proximity-based hover works.
        //
        // Why not use JSXGraph's built-in drag?
        //   • `board.attr.ignorelabels` defaults to `true`, which explicitly skips
        //     labels in `initMoveObject` regardless of `isDraggable`.
        //   • `createLabel()` forces `isDraggable = false` after construction.
        //
        // Solution: capture-phase listener on containerObj fires before JSXGraph's
        // bubble-phase listener. `pt.label.hasPoint(x, y)` uses JSXGraph's own
        // hit-test (works regardless of CSS pointer-events). If the label is hit,
        // stopPropagation() kills the board's drag and we handle offset ourselves.
        //
        // Offset convention: [dx_pixels_right, dy_pixels_up] (math Y axis).
        if (el.type === 'point') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pt = created as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const brd = board as any;
          const container = brd.containerObj as HTMLElement;

          let startClientX = 0, startClientY = 0, startOffX = 0, startOffY = 0;

          const onLabelMove = (e: PointerEvent) => {
            if (!pt.label) return;
            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            // offset[1] is positive-upward; clientY is positive-downward.
            pt.label.setAttribute({ offset: [startOffX + dx, startOffY - dy] });
            brd.update();
          };

          const onLabelUp = () => {
            container.style.cursor = '';
            window.removeEventListener('pointermove', onLabelMove);
          };

          const onLabelDown = (e: PointerEvent) => {
            // Skip if label absent, invisible, or no position data yet.
            if (!pt?.label?.visPropCalc?.visible) return;
            // Convert event coords to board screen coords (handles CSS transforms).
            const pos: [number, number] = brd.getMousePosition(e);
            if (!pt.label.hasPoint(pos[0], pos[1])) return;

            // Label is under cursor — take ownership of this drag.
            e.stopPropagation(); // block board's bubble-phase pointerdown
            const off = pt.label.visProp?.offset;
            startClientX = e.clientX;
            startClientY = e.clientY;
            startOffX = Array.isArray(off) ? (off[0] as number) : 0;
            startOffY = Array.isArray(off) ? (off[1] as number) : 0;
            container.style.cursor = 'grabbing';
            window.addEventListener('pointermove', onLabelMove);
            window.addEventListener('pointerup', onLabelUp, { once: true });
          };

          // true = capture phase, fires before board's bubble-phase listener
          container.addEventListener('pointerdown', onLabelDown, true);
          labelCleanupFns.push(() => {
            container.removeEventListener('pointerdown', onLabelDown, true);
            window.removeEventListener('pointermove', onLabelMove);
            window.removeEventListener('pointerup', onLabelUp);
          });

          // Show grab cursor when hovering over the label via JSXGraph's own hover
          // event (proximity-based, unaffected by pointer-events:none).
          // pt.label can be null/undefined for points with withLabel:false.
          if (pt.label?.on) {
            pt.label.on('over', () => { container.style.cursor = 'grab'; });
            pt.label.on('out',  () => { container.style.cursor = ''; });
          }
        }
      }
    } catch (e) {
      console.error('JSXGraph render error:', e);
      setError('Không thể hiển thị mô hình. Vui lòng kiểm tra định dạng JSON.');
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, katexLoaded, data, boardId]);

  return (
    <>
      {/* JSXGraph – self-hosted, injected on demand by lib/jsxgraph */}
      {/* KaTeX CDN for math annotation rendering */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"
        strategy="afterInteractive"
        onLoad={() => setKatex(true)}
      />

      {/* touch-action:none must cover the board AND its SVG children (touch-action doesn't inherit) */}
      <style>{`#${boardId}, #${boardId} * { touch-action: none; }`}</style>

      <div className="w-full h-full relative flex flex-col">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg z-10">
            <p className="text-sm text-red-600 text-center px-4">{error}</p>
          </div>
        )}
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Đang tải engine JSXGraph…</p>
            </div>
          </div>
        )}
        <div className="relative w-full flex-1" style={{ minHeight: '280px' }}>
          <div
            id={boardId}
            className="w-full h-full rounded-lg border border-gray-200 bg-white"
            style={{ touchAction: 'none' }}
          />
          {/* Math annotation overlay — rendered with KaTeX auto-render */}
          <div
            ref={annOverlayRef}
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: 'hidden' }}
          />
        </div>
      </div>
    </>
  );
}
