'use client';

/**
 * CodeModePanel – JSXGraph Code Mode for HeyGeo Web
 *
 * Hỗ trợ 2 phong cách code (tương thích với jsxgraph.org/share):
 *
 * Phong cách 1 – code đơn giản, board tạo sẵn:
 *   board.create('point', [1, 2], { name: 'A' });
 *
 * Phong cách 2 – tự khởi tạo board (copy từ jsxgraph.org/share):
 *   const board = JXG.JSXGraph.initBoard(BOARDID, { boundingbox: … });
 *   board.create(…);
 *
 * Biến được inject vào scope:
 *   - BOARDID  : id của <div> preview (luôn có)
 *   - JXG      : object JSXGraph toàn cục (luôn có)
 *   - board    : board đã init sẵn (chỉ có nếu code KHÔNG gọi initBoard)
 *
 * Editor: CodeMirror 6 with JSXGraph autocomplete, real-time lint, Insert menu.
 */

import Script from 'next/script';
import dynamic from 'next/dynamic';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import InsertMenu from './InsertMenu';
import type { CodeEditorHandle } from './JSXGraphCodeEditor';
import { useAISuggest } from '@/hooks/useAISuggest';
import { getJXG, whenJsxGraphReady } from '@/lib/jsxgraph';

// CodeMirror uses browser APIs – must be client-only (no SSR)
const JSXGraphCodeEditor = dynamic(
  () => import('./JSXGraphCodeEditor'),
  { ssr: false }
);

const CODE_BOARD_ID = 'heygeo-code-preview';

// ─── Default sample code ──────────────────────────────────────────────────────
const DEFAULT_CODE = `// JSXGraph Code Mode – HeyGeo Web
// Tài liệu: https://jsxgraph.uni-bayreuth.de/docs/
//
// Có 2 cách viết code:
//
// Cách 1 – Đơn giản (board tạo sẵn, dùng ngay):
//   board.create('point', [1, 2], { name: 'A' });
//
// Cách 2 – Tương thích jsxgraph.org/share (tự khởi tạo board):
//   const board = JXG.JSXGraph.initBoard(BOARDID, { boundingbox: [-5,5,5,-5] });
//   board.create('point', [1, 2], { name: 'A' });
//   (BOARDID là biến sẵn có, KHÔNG dùng 'jxgbox' hoặc id cụ thể)

// ── Ví dụ: Tam giác + đường tròn ngoại tiếp ──────────────────────────────────
const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-6, 6, 6, -6],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: true,
});

var A = board.create('point', [-3, 1], { name: 'A', size: 4 });
var B = board.create('point', [3, 1], { name: 'B', size: 4 });
var C = board.create('point', [0, 4], { name: 'C', size: 4 });

board.create('polygon', [A, B, C], {
  fillColor: 'rgba(30,60,150,0.12)',
  strokeColor: '#1e3c96',
  strokeWidth: 2,
});

board.create('circumcircle', [A, B, C], {
  strokeColor: '#c83c3c', strokeWidth: 1.5, dash: 2,
});

board.create('circumcenter', [A, B, C], {
  name: 'O', size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c',
});
`;

// ─── Execute user code inside the preview board ───────────────────────────────
//
// Chiến lược thực thi (tương thích jsxgraph.org/share):
//
//  • BOARDID luôn được inject vào scope → code copy từ share chạy được ngay.
//  • Nếu code CÓ gọi initBoard (phong cách share) → chỉ inject BOARDID + JXG,
//    để code tự khởi tạo board theo options họ muốn.
//  • Nếu code KHÔNG gọi initBoard (phong cách đơn giản) → pre-init một board
//    mặc định và inject thêm biến `board` để dùng trực tiếp.
//  • 'jxgbox' (id mặc định của nhiều ví dụ cũ) được thay tự động bằng BOARDID.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function execCode(code: string, boardId: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jxg = (window as any).JXG;
  if (!jxg) return 'JSXGraph chưa được tải. Vui lòng đợi hoặc tải lại trang.';

  try {
    // Free previous board (cả main board lẫn 'jxgbox' nếu có)
    for (const id of [boardId, 'jxgbox']) {
      if (jxg.boards && jxg.boards[id]) {
        try { jxg.JSXGraph.freeBoard(jxg.boards[id]); } catch { /* ignore */ }
      }
    }

    // Thay 'jxgbox' bằng boardId trong code (ví dụ cũ hard-code div id)
    let normalizedCode = code.replace(/(['"\`])jxgbox\1/g, `'${boardId}'`);

    // JSXGraph ≥ 1.10 có thể hang vô hạn khi useMathJax:true nhưng window.MathJax chưa load.
    // Tự động chuyển sang useKatex:true nếu KaTeX đã có sẵn.
    if (!(window as any).MathJax && (window as any).katex) {
      normalizedCode = normalizedCode.replace(/useMathJax\s*:\s*true/g, 'useKatex: true');
    }

    const callsInitBoard = /\.initBoard\s*\(/.test(normalizedCode);

    if (callsInitBoard) {
      // Phong cách share: code tự khởi tạo board.
      // Chỉ inject BOARDID và JXG; không pre-init gì cả.
      // eslint-disable-next-line no-new-func
      new Function('BOARDID', 'JXG', normalizedCode)(boardId, jxg);
    } else {
      // Phong cách đơn giản: pre-init board mặc định, inject thêm `board`.
      const board = jxg.JSXGraph.initBoard(boardId, {
        boundingbox: [-8, 8, 8, -8],
        keepaspectratio: true,
        showCopyright: false,
        showNavigation: true,
        axis: false,
        grid: false,
        pan:  { enabled: false },
        zoom: { wheel: true, min: 0.1, max: 50 },
      });
      // eslint-disable-next-line no-new-func
      new Function('BOARDID', 'JXG', 'board', normalizedCode)(boardId, jxg, board);
    }

    return null; // no error
  } catch (e) {
    return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
}

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface CodePanelHandle {
  /** Returns the current source code in the editor */
  getCode: () => string;
  /** Returns the last captured SVG thumbnail (null if not yet run) */
  getThumbSvg: () => string | null;
}

/**
 * Capture the best SVG preview available in the DOM.
 * Supports standard single boards as well as multi-board or customized containers.
 */
function captureBestSvg(containerId: string): string | null {
  if (typeof document === 'undefined') return null;

  const baseEl = document.getElementById(containerId);
  const root = baseEl?.closest('.overflow-auto') || baseEl?.parentElement?.parentElement || baseEl?.parentElement || document.body;
  const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('svg'));
  if (svgs.length === 0) return null;

  // Filter for SVGs that contain actual geometric elements
  const isMeaningful = (s: SVGSVGElement) => {
    return !!s.querySelector('circle, path, line, polygon, polyline, ellipse, text, image, rect:not([width="100%"])');
  };

  const meaningfulSvgs = svgs.filter(isMeaningful);
  const bestSvg = meaningfulSvgs[0] || svgs[0];
  if (!bestSvg) return null;

  const clone = bestSvg.cloneNode(true) as SVGSVGElement;
  const rect = bestSvg.getBoundingClientRect();
  const w = bestSvg.getAttribute('width') || (rect.width > 0 ? String(Math.round(rect.width)) : '600');
  const h = bestSvg.getAttribute('height') || (rect.height > 0 ? String(Math.round(rect.height)) : '500');

  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  if (!clone.getAttribute('viewBox') && w && h) {
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  return new XMLSerializer().serializeToString(clone);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onBack: () => void;
  /** Pre-fill the editor with saved code when loading an existing code-mode model */
  initialCode?: string;
  /** Hide the "← Design Mode" back button (used when CodeModePanel is the only panel) */
  hideBackButton?: boolean;
  /** Called whenever the code changes (for dirty-flag tracking in parent) */
  onCodeChange?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CodeModePanel = forwardRef<CodePanelHandle, Props>(function CodeModePanel({ visible, onBack, initialCode, hideBackButton, onCodeChange }, ref) {
  // code is tracked both in editorRef (CodeMirror source of truth) and codeCacheRef
  // codeCacheRef lets us read current code without the CodeMirror ref being ready
  const editorRef   = useRef<CodeEditorHandle | null>(null);
  const codeCacheRef = useRef<string>(initialCode ?? DEFAULT_CODE);

  const [displayCode, setDisplayCode] = useState(initialCode ?? DEFAULT_CODE);
  const [error,       setError]       = useState<string | null>(null);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const [jxgLoaded,   setJxgLoaded]   = useState(() => getJXG() !== null);
  const [runCount,    setRunCount]     = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbSvgRef = useRef<string | null>(null);

  // Expose getCode() and getThumbSvg() to parent (CoderStudio / DesignStudio reads these on Save)
  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() ?? codeCacheRef.current,
    getThumbSvg: () => {
      const liveSvg = captureBestSvg(CODE_BOARD_ID);
      return liveSvg || thumbSvgRef.current;
    },
  }));

  // ── AI suggestion (Groq) ───────────────────────────────────────────────────
  const { suggest: aiSuggest, cancel: aiCancel } = useAISuggest((suggestion) => {
    editorRef.current?.setSuggestion(suggestion);
  });

  function handleSuggest(code: string, charBefore: string) {
    // Drop the sync dispatch (clearSuggestion) here! The state field automatically 
    // clears on update.docChanged anyway. Dispatching inside an updateListener 
    // crashes the autocompletion ViewPlugin.
    aiSuggest(code, charBefore);
  }

  // ── Engine + KaTeX availability. JXG may already be on the page from Design Mode.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).katex) setKatexLoaded(true);
    if (getJXG()) { setJxgLoaded(true); return; }
    let cancelled = false;
    whenJsxGraphReady()
      .then(() => { if (!cancelled) setJxgLoaded(true); })
      .catch(() => { if (!cancelled) setError('Không tải được engine JSXGraph. Kiểm tra kết nối mạng.'); });
    return () => { cancelled = true; aiCancel(); };
  }, []);

  // ── Run ───────────────────────────────────────────────────────────────────
  const run = useCallback(() => {
    if (!jxgLoaded) return;
    const code = editorRef.current?.getCode() ?? codeCacheRef.current;
    // JSXGraph ≥ 1.10 hangs if useKatex:true but window.katex not present.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (/useKatex/i.test(code) && !(window as any).katex) return;
    const err = execCode(code, CODE_BOARD_ID);
    setError(err);
    if (!err) {
      setRunCount(c => c + 1);
      // Capture SVG thumbnail from the preview board.
      // Wait 500ms so JSXGraph (incl. 3D) fully finishes rendering.
      setTimeout(() => {
        const svgStr = captureBestSvg(CODE_BOARD_ID);
        if (svgStr) thumbSvgRef.current = svgStr;
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jxgLoaded, katexLoaded]); // katexLoaded in deps → run recreates when KaTeX arrives → auto-run retries

  // ── Auto-run on display code change (1.2 s debounce) ─────────────────────
  useEffect(() => {
    if (!jxgLoaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [displayCode, jxgLoaded, run]);

  // ── Initial run when panel becomes visible and JXG is ready ──────────────
  useEffect(() => {
    if (visible && jxgLoaded) run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, jxgLoaded]);

  // ── Handle code change from editor ────────────────────────────────────────
  function handleCodeChange(newCode: string) {
    codeCacheRef.current = newCode;
    setDisplayCode(newCode);
    onCodeChange?.();
  }

  // ── Handle Insert snippet ─────────────────────────────────────────────────
  function handleInsert(snippet: string) {
    editorRef.current?.insertAtCursor(snippet);
    // Trigger debounce
    codeCacheRef.current = editorRef.current?.getCode() ?? codeCacheRef.current;
    setDisplayCode(codeCacheRef.current);
    onCodeChange?.();
  }

  // ── Draggable resizer state ───────────────────────────────────────────────
  const [splitPct, setSplitPct]   = useState(50);
  const containerRef              = useRef<HTMLDivElement>(null);
  const dragStartXRef             = useRef(0);
  const dragStartSplitRef         = useRef(50);
  const isDraggingRef             = useRef(false);

  function startDrag(startX: number) {
    isDraggingRef.current     = true;
    dragStartXRef.current     = startX;
    dragStartSplitRef.current = splitPct;
  }

  function applyDrag(currentX: number) {
    if (!isDraggingRef.current || !containerRef.current) return;
    const totalW = containerRef.current.getBoundingClientRect().width;
    if (totalW === 0) return;
    const dx     = currentX - dragStartXRef.current;
    const newPct = Math.max(15, Math.min(85, dragStartSplitRef.current + (dx / totalW) * 100));
    setSplitPct(newPct);
  }

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    startDrag(e.clientX);

    function onMouseMove(ev: MouseEvent) { applyDrag(ev.clientX); }
    function onMouseUp() {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }

  function handleDividerTouchStart(e: React.TouchEvent) {
    startDrag(e.touches[0].clientX);

    function onTouchMove(ev: TouchEvent) {
      ev.preventDefault();
      applyDrag(ev.touches[0].clientX);
    }
    function onTouchEnd() {
      isDraggingRef.current = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* KaTeX CSS */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
      {/* KaTeX JS */}
      <Script
        src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
        strategy="afterInteractive"
        onLoad={() => setKatexLoaded(true)}
      />
      {/* JSXGraph – self-hosted, injected by lib/jsxgraph on demand */}

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white select-none shrink-0 border-b border-gray-700">
        {!hideBackButton && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-xs font-medium"
            title="Quay lại chế độ thiết kế (Design Mode)"
          >
            ← Design Mode
          </button>
        )}

        {/* Smart Snippet buttons – one per group */}
        <InsertMenu onInsert={handleInsert} groupIndex={0} />
        <InsertMenu onInsert={handleInsert} groupIndex={1} />
        <InsertMenu onInsert={handleInsert} groupIndex={2} />

        {/* Run button */}
        <button
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            run();
          }}
          disabled={!jxgLoaded}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-colors text-xs font-semibold"
          title="Chạy code (Ctrl+Enter)"
        >
          ▶ Run
        </button>

        {/* Run status */}
        {runCount > 0 && !error && (
          <span className="text-green-400 text-xs">✓ OK</span>
        )}
      </div>

      {/* ── Two-column main area (resizable) ─────────────────────────────────── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden" style={{ cursor: isDraggingRef.current ? 'col-resize' : 'auto' }}>

        {/* ── Left: CodeMirror editor ───────────────────────────────────────── */}
        <div className="flex flex-col bg-[#282c34] overflow-hidden" style={{ width: `${splitPct}%` }}>

          {/* Column header */}
          <div className="flex items-center px-3 py-1 bg-[#21252b] border-b border-[#3e4451] shrink-0">
            <span className="text-[#abb2bf] text-xs font-mono tracking-wide mr-auto">script.js</span>
            <button
              onClick={() => {
                setDisplayCode(DEFAULT_CODE);
                codeCacheRef.current = DEFAULT_CODE;
              }}
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              title="Khôi phục code mẫu"
            >
              reset
            </button>
          </div>

          {/* Runtime error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-900/80 border-b border-red-700 shrink-0 max-h-28 overflow-y-auto">
              <span className="text-red-300 text-xs mt-0.5 shrink-0">⚠ Runtime</span>
              <pre className="text-red-200 text-xs font-mono whitespace-pre-wrap leading-5 flex-1">{error}</pre>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 shrink-0 text-xs" title="Đóng">✕</button>
            </div>
          )}

          {/* CodeMirror editor */}
          <JSXGraphCodeEditor
            ref={editorRef}
            initialCode={displayCode}
            onChange={handleCodeChange}
            onSuggest={handleSuggest}
            onRun={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              run();
            }}
          />
        </div>

        {/* ── Draggable divider ──────────────────────────────────────────────── */}
        <div
          onMouseDown={handleDividerMouseDown}
          onTouchStart={handleDividerTouchStart}
          className="w-3 shrink-0 bg-gray-700 hover:bg-amber-500 active:bg-amber-400 transition-colors cursor-col-resize select-none touch-none flex items-center justify-center group"
          title="Kéo để thay đổi độ rộng"
        >
          <div className="w-0.5 h-8 bg-gray-500 group-hover:bg-amber-300 rounded-full transition-colors" />
        </div>

        {/* ── Right: JSXGraph preview ──────────────────────────────────────── */}
        <div className="flex flex-col bg-white overflow-hidden" style={{ width: `${100 - splitPct}%` }}>

          {/* Column header */}
          <div className="flex items-center px-3 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
            <span className="text-gray-500 text-xs">Preview</span>
            {!jxgLoaded && (
              <span className="ml-2 text-yellow-600 text-xs animate-pulse">Đang tải JSXGraph…</span>
            )}
            {jxgLoaded && runCount > 0 && (
              <span className="ml-2 text-gray-400 text-xs">tự động · {runCount}×</span>
            )}
          </div>

          {/* Scrollable viewport – board is fixed 600×500, not resized by panel */}
          <div className="flex-1 overflow-auto">
            <style>{`#${CODE_BOARD_ID}, #${CODE_BOARD_ID} * { touch-action: none; }`}</style>
            <div id={CODE_BOARD_ID} style={{ width: 600, height: 500 }} />
          </div>
        </div>

      </div>
    </div>
  );
});

export default CodeModePanel;
