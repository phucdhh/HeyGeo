'use client';

/**
 * DesignStudio – main orchestrator for the HeyGeo web designer.
 *
 * Layout (mirrors HeyGeo Desktop):
 *  ┌──────────────────────────────────────────────────────┐
 *  │  DesignMenuBar                                        │  ← desktop-style menu bar
 *  ├─────┬────────────────────────────────────────┬────────┤
 *  │  T  │                                        │ Props  │
 *  │  o  │            DesignCanvas                │ Panel  │
 *  │  o  │         (JSXGraph, interactive)        │        │
 *  │  l  │                                        │        │
 *  │  b  │                                        │        │
 *  │  a  │                                        │        │
 *  │  r  │                                        │        │
 *  ├─────┴────────────────────────────────────────┴────────┤
 *  │  DesignStatusBar                                      │  ← coords, hints, counts
 *  └──────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CanvasHandle,
  CursorCoords,
  HeyGeoData,
  LocusResult,
  SelectedElementInfo,
  ToolMode,
  NumberValue,
  SliderPos,
} from './designTypes';
import { emptyData, TOOL_SHORTCUTS } from './designTypes';
import {
  cycleFamily,
  cycleVariation,
  type ArrowMode,
} from './toolboxModel';
import { calculateSpec, seedCalculate } from './numberMenuModel';
import { plotPointSeed, type PlotPointSpec } from './plotPointModel';

import DesignMenuBar         from './DesignMenuBar';
import DesignToolbar         from './DesignToolbar';
import DesignCanvas          from './DesignCanvas';
import DesignPropertiesPanel from './DesignPropertiesPanel';
import DesignStatusBar       from './DesignStatusBar';
import SaveModelDialog       from './SaveModelDialog';
import ElementPropertiesDialog from './ElementPropertiesDialog';
import SliderConfigDialog from './SliderConfigDialog';
import CalculateDialog from './CalculateDialog';
import NewFunctionDialog from './NewFunctionDialog';
import PlotPointDialog from './PlotPointDialog';
import PlotCurveDialog from './PlotCurveDialog';
import AnimateDialog from './AnimateDialog';
import LocusDialog from './LocusDialog';
import TransformDialog, { type TransformMode } from './TransformDialog';

interface Props {
  initialData?: HeyGeoData | null;
  modelId?: string;
  initialDescription?: string;
  initialIsPublic?: boolean;
}

export default function DesignStudio({ initialData, modelId, initialDescription, initialIsPublic }: Props) {
  const canvasRef     = useRef<CanvasHandle | null>(null);
  const fileInputRef  = useRef<HTMLInputElement | null>(null);

  const [tool,     setTool]     = useState<ToolMode>('selection');
  /** What a drag does while `tool === 'selection'`; other tools ignore it. */
  const [arrow,    setArrow]    = useState<ArrowMode>('translate');
  const [isDirty,  setIsDirty]  = useState(false);
  const [showAxis, setShowAxis] = useState(initialData?.axis ?? false);
  const [showGrid, setShowGrid] = useState(initialData?.grid ?? false);
  const [title,    setTitle]    = useState(initialData?.title ?? 'Chưa đặt tên');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [isPublic,    setIsPublic]    = useState(initialIsPublic ?? false);
  const [editingId, setEditingId] = useState<string | undefined>(modelId);

  const [selected,     setSelected]     = useState<SelectedElementInfo[]>([]);
  const [cursor,       setCursor]       = useState<CursorCoords>({ x: 0, y: 0 });
  const [elementCount, setElementCount] = useState(0);
  const [canUndo,      setCanUndo]      = useState(false);
  const [canRedo,      setCanRedo]      = useState(false);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [saveError,      setSaveError]      = useState('');

  // About dialog
  const [showAbout, setShowAbout] = useState(false);

  // Element Properties dialog (opened by double-click on canvas element)
  const [propertiesInfo, setPropertiesInfo] = useState<SelectedElementInfo | null>(null);

  // Slider config dialog (opened after two-click slider placement)
  const [sliderPos, setSliderPos] = useState<SliderPos | null>(null);

  // Number | Calculate… dialog, over the numbers the board showed when it opened
  const [calculate, setCalculate] = useState<{
    values: NumberValue[];
    initial: { expr: string; args: string[] };
  } | null>(null);

  function handleNewParameter() {
    const place = canvasRef.current?.beginParameter();
    if (place) setSliderPos(place);
  }

  function handleOpenCalculate() {
    const values = canvasRef.current?.numberValues() ?? [];
    setCalculate({ values, initial: seedCalculate(values, selected.map((s) => s.id)) });
  }

  // Transform dialog (opened from Transform → Translate / Rotate / Dilate…)
  const [transformMode, setTransformMode] = useState<TransformMode | null>(null);

  /** Graph | New Function… — open whenever the menu row is used; it needs nothing picked. */
  const [newFunctionOpen, setNewFunctionOpen] = useState(false);

  /** Graph | Plot Curve… — the parametric pair is always typed; it needs nothing picked. */
  const [plotCurveOpen, setPlotCurveOpen] = useState(false);

  /**
   * Display | Animate Objects… and Edit | Action Buttons | Animation… — the same
   * two questions, answered either to start a run now or to write a button that
   * makes it.
   */
  const [animateMode, setAnimateMode] = useState<'run' | 'button' | null>(null);

  /**
   * Graph | Plot as (x, y)… — the two numbers picked go onto the frame as they
   * are; anything else is typed in Sketchpad's dialog over the numbers the board
   * showed when the row was used.
   */
  const [plotPoint, setPlotPoint] = useState<{
    values: NumberValue[];
    initial: PlotPointSpec;
  } | null>(null);

  function handlePlotAsXy() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // the two numbers picked are the point Sketchpad plots without asking; anything
    // else is typed, over the numbers the board shows right now
    if (canvas.plotPointRows().canPlotPair) {
      canvas.plotPickedPair();
      return;
    }
    const values = canvas.numberValues();
    setPlotPoint({ values, initial: plotPointSeed(values, selected.map((s) => s.id)) });
  }

  // Locus dialog (opened from Construct → Locus…)
  const [locusDialogOpen, setLocusDialogOpen] = useState(false);
  const [locusResult, setLocusResult] = useState<LocusResult | undefined>(undefined);
  function handleOpenLocusDialog() {
    setLocusResult(undefined);
    setLocusDialogOpen(true);
  }
  function handleCreateLocus() {
    const r = canvasRef.current?.createLocus();
    setLocusResult(r);
    if (r?.ok) {
      setTimeout(() => setLocusDialogOpen(false), 1000);
    }
  }

  // Zoom level (polled every 500 ms from the canvas imperative handle)
  const [zoom, setZoom] = useState(1);

  // Under Development toast
  const [devToast, setDevToast] = useState(false);
  const devToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Status notification toast
  const [notifyMsg, setNotifyMsg] = useState('');
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showNotification(msg: string) {
    setNotifyMsg(msg);
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => setNotifyMsg(''), 3000);
  }

  // Save success toast
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showSaveSuccess(msg: string) {
    setSaveSuccessMsg(msg);
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    saveSuccessTimer.current = setTimeout(() => setSaveSuccessMsg(''), 3000);
  }
  function notifyUnderDev() {
    setDevToast(true);
    if (devToastTimer.current) clearTimeout(devToastTimer.current);
    devToastTimer.current = setTimeout(() => setDevToast(false), 2500);
  }

  // ─── Undo/redo button state poll ─────────────────────────────────────────
  function refreshUndoState() {
    setCanUndo(canvasRef.current?.canUndo() ?? false);
    setCanRedo(canvasRef.current?.canRedo() ?? false);
  }

  // ─── Tool changes ─────────────────────────────────────────────────────────
  function handleToolChange(mode: ToolMode, arrowMode?: ArrowMode) {
    setTool(mode);
    if (arrowMode) setArrow(arrowMode);
  }

  // The keydown listener below is installed once, so it reads the toolbox
  // position from refs rather than from the state it first closed over.
  const toolRef  = useRef(tool);
  const arrowRef = useRef(arrow);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { arrowRef.current = arrow; }, [arrow]);

  // ─── Dirty flag ───────────────────────────────────────────────────────────
  const handleDirty = useCallback(() => {
    setIsDirty(true);
    refreshUndoState();
    // Update element count from canvas data
    const data = canvasRef.current?.getHeyGeoData();
    if (data) setElementCount(data.elements.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectionChange = useCallback((els: SelectedElementInfo[]) => {
    setSelected(els);
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Ctrl/Meta shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { handleUndo(); return; }
        if (e.key === 'y') { handleRedo(); return; }
        if (e.key === 'c') { e.preventDefault(); canvasRef.current?.copySelection(); return; }
        if (e.key === 'x') { e.preventDefault(); canvasRef.current?.cutSelection(); refreshUndoState(); return; }
        if (e.key === 'v') { e.preventDefault(); canvasRef.current?.pasteClipboard(); refreshUndoState(); return; }
        if (e.key === 's') { e.preventDefault(); handleSave(); return; }
        if (e.key === 'a') { e.preventDefault(); canvasRef.current?.selectAll(); return; }
        if (e.key === '=') { e.preventDefault(); canvasRef.current?.zoomIn(); return; }
        if (e.key === '-') { e.preventDefault(); canvasRef.current?.zoomOut(); return; }
        if (e.key === '0') { e.preventDefault(); canvasRef.current?.zoomFit(); return; }
        return;
      }
      // Shift+arrow is the GSP toolbox keyboard: Left/Right changes the
      // variation of the current tool, Up/Down moves through the toolbox.
      if (e.shiftKey && e.key.startsWith('Arrow')) {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        const next = e.key === 'ArrowLeft' || e.key === 'ArrowRight'
          ? cycleVariation(toolRef.current, arrowRef.current, dir)
          : cycleFamily(toolRef.current, arrowRef.current, dir);
        if (next) {
          e.preventDefault();
          handleToolChange(next.tool, next.arrow);
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        canvasRef.current?.deleteSelected();
        refreshUndoState();
        return;
      }
      if (e.key === 'Escape') {
        // Sketchpad's Escape walks down a ladder: first the Context menu, then the
        // construction in flight, then the selection, then nothing at all.
        if (!canvasRef.current?.closeContextMenu() && !canvasRef.current?.cancelCurrentTool()) {
          canvasRef.current?.clearSelection();
        }
        return;
      }
      const toolShortcut = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (toolShortcut) setTool(toolShortcut);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Zoom level polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const z = canvasRef.current?.getZoom?.() ?? 1;
      setZoom(z);
    }, 500);
    return () => clearInterval(id);
  }, []);

  // ─── Commands ─────────────────────────────────────────────────────────────
  function handleUndo() {
    canvasRef.current?.undo();
    setIsDirty(true);
    refreshUndoState();
    const data = canvasRef.current?.getHeyGeoData();
    if (data) setElementCount(data.elements.length);
  }

  function handleRedo() {
    canvasRef.current?.redo();
    setIsDirty(true);
    refreshUndoState();
    const data = canvasRef.current?.getHeyGeoData();
    if (data) setElementCount(data.elements.length);
  }

  function handleNewFile() {
    if (isDirty && !confirm('Bạn chưa lưu. Tạo mới sẽ mất dữ liệu hiện tại. Tiếp tục?')) return;
    const fresh = emptyData();
    canvasRef.current?.loadData(fresh);
    setTitle(fresh.title);
    setIsDirty(false);
    setEditingId(undefined);
    setSelected([]);
    setElementCount(0);
    refreshUndoState();
  }

  function handleOpen() {
    // Redirect to dashboard to pick a model (simplest approach)
    if (isDirty && !confirm('Bạn chưa lưu. Chuyển sang trang sẽ mất dữ liệu hiện tại. Tiếp tục?')) return;
    window.location.href = '/dashboard';
  }

  function handleSave() {
    if (editingId) {
      // PUT to update existing model – preserve current description and isPublic
      doSave(title, description, isPublic, editingId);
    } else {
      setShowSaveDialog(true);
    }
  }

  function handleSaveAs() {
    setShowSaveDialog(true);
  }

  async function doSave(
    saveTitle: string,
    saveDesc: string,
    isPublic: boolean,
    updateId?: string,
  ) {
    setIsSaving(true);
    setSaveError('');
    try {
      const canvasData = canvasRef.current?.getHeyGeoData();
      if (!canvasData) throw new Error('Canvas không sẵn sàng');
      const data: HeyGeoData = canvasData;
      data.title = saveTitle;
      canvasRef.current?.setTitle(saveTitle);
      setTitle(saveTitle);

      const url    = updateId ? `/api/models/${updateId}` : '/api/models';
      const method = updateId ? 'PUT' : 'POST';
      const thumbnailSvg = canvasRef.current?.exportSVG?.() || undefined;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: saveTitle, description: saveDesc, jsonData: data, isPublic, thumbnailSvg }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setEditingId(json.model?.id ?? updateId ?? editingId);
      if (json.model?.description != null) setDescription(json.model.description);
      if (json.model?.isPublic != null) setIsPublic(json.model.isPublic);
      setIsDirty(false);
      setShowSaveDialog(false);
      showSaveSuccess('✓ Đã lưu mô hình');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsSaving(false);
    }
  }

  function handleExportJSON() {
    const data = canvasRef.current?.getHeyGeoData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title || 'heygeo'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportSVG() {
    const svgStr = canvasRef.current?.exportSVG?.();
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title || 'heygeo'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile() {
    fileInputRef.current?.click();
  }

  function handleToggleAxis() {
    const next = !showAxis;
    setShowAxis(next);
    canvasRef.current?.setAxis(next);
  }

  function handleToggleGrid() {
    const next = !showGrid;
    setShowGrid(next);
    canvasRef.current?.setGrid(next);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* ── Menu bar ── */}
      <DesignMenuBar
        title={title}
        isDirty={isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        showAxis={showAxis}
        showGrid={showGrid}
        tool={tool}
        selectedIds={selected.map((s) => s.id)}
        canvasRef={canvasRef}
        onNewFile={handleNewFile}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportJSON={handleExportJSON}
        onImportFile={handleImportFile}
        onExportSVG={handleExportSVG}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={() => {
          canvasRef.current?.cutSelection();
          refreshUndoState();
        }}
        onCopy={() => canvasRef.current?.copySelection()}
        onPaste={() => {
          canvasRef.current?.pasteClipboard();
          refreshUndoState();
        }}
        onDeleteSelected={() => {
          canvasRef.current?.deleteSelected();
          refreshUndoState();
        }}
        onSelectAll={() => canvasRef.current?.selectAll()}
        onToggleAxis={handleToggleAxis}
        onToggleGrid={handleToggleGrid}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomFit={() => canvasRef.current?.zoomFit()}
        onToolChange={setTool}
        onShowAbout={() => setShowAbout(true)}
        onCreateLocus={handleOpenLocusDialog}
        onNewParameter={handleNewParameter}
        onOpenCalculate={handleOpenCalculate}
        onOpenNewFunction={() => setNewFunctionOpen(true)}
        onPlotAsXy={handlePlotAsXy}
        onPlotValueOnAxis={() => canvasRef.current?.plotValueOnAxis()}
        onPlotCurve={() => setPlotCurveOpen(true)}
        onAnimateObjects={() => setAnimateMode('run')}
        onActionButtonAnimation={() => setAnimateMode('button')}
        onOpenTransform={(mode) => setTransformMode(mode)}
        onUnderDevelopment={notifyUnderDev}
      />

      {/* ── Main area: toolbar | canvas | properties ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <DesignToolbar tool={tool} arrow={arrow} onToolChange={handleToolChange} onUnderDevelopment={notifyUnderDev} />

        {/* Canvas – fills all remaining space */}
        <DesignCanvas
          ref={canvasRef}
          tool={tool}
          arrow={arrow}
          initialData={initialData}
          onCursorMove={setCursor}
          onSelectionChange={handleSelectionChange}
          onDirty={handleDirty}
          onOpenProperties={(info) => setPropertiesInfo(info)}
          onOpenSliderConfig={(pos) => setSliderPos(pos)}
          onNotify={showNotification}
        />

        {/* Right properties panel */}
        <DesignPropertiesPanel
          selected={selected}
          canvasRef={canvasRef}
        />
      </div>

      {/* ── Status bar ── */}
      <DesignStatusBar
          tool={tool}
          arrow={arrow}
          cursor={cursor}
          elementCount={elementCount}
          selectedCount={selected.length}
          zoom={zoom}
        />

      {/* ── Save dialog ── */}
      {showSaveDialog && (
        <SaveModelDialog
          initialTitle={title}
          isSaving={isSaving}
          onSave={(t, d, pub) => doSave(t, d, pub)}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
      {saveError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-5 py-2 rounded-lg shadow-lg z-50">
          Lỗi: {saveError}
          <button className="ml-3 underline" onClick={() => setSaveError('')}>Đóng</button>
        </div>
      )}

      {/* ── Save success toast ── */}
      {saveSuccessMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-700 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-50 animate-fadeIn">
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── Status notification toast ── */}
      {notifyMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-brand-800 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-50 animate-fadeIn">
          <span>ℹ {notifyMsg}</span>
        </div>
      )}

      {/* ── Under Development toast ── */}
      {devToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-50 animate-fadeIn">
          <span className="text-yellow-400">⚠️</span>
          <span>Under Development. Please send a request to <strong>Nguyễn Đăng Minh Phúc</strong>.</span>
        </div>
      )}

      {/* ── Element Properties dialog ── */}
      {propertiesInfo && (
        <ElementPropertiesDialog
          info={propertiesInfo}
          canvasRef={canvasRef}
          onClose={() => setPropertiesInfo(null)}
        />
      )}

      {/* ── Slider config dialog ── */}
      {sliderPos && (
        <SliderConfigDialog
          onConfirm={(cfg) => {
            canvasRef.current?.confirmSlider?.(cfg);
            setSliderPos(null);
          }}
          onCancel={() => {
            canvasRef.current?.cancelCurrentTool();
            setSliderPos(null);
          }}
        />
      )}

      {/* ── Number | Calculate… dialog ── */}
      {calculate && (
        <CalculateDialog
          values={calculate.values}
          initial={calculate.initial}
          onConfirm={(expr, args) => {
            canvasRef.current?.createMeasure([calculateSpec(expr, args, calculate.values)]);
            setCalculate(null);
          }}
          onCancel={() => setCalculate(null)}
        />
      )}

      {/* ── Graph | New Function… dialog ── */}
      {newFunctionOpen && (
        <NewFunctionDialog
          onConfirm={(expr, domain) => {
            canvasRef.current?.newFunction(expr, domain);
            setNewFunctionOpen(false);
          }}
          onCancel={() => setNewFunctionOpen(false)}
        />
      )}

      {/* ── Graph | Plot as (x, y)… dialog ── */}
      {plotPoint && (
        <PlotPointDialog
          values={plotPoint.values}
          initial={plotPoint.initial}
          onConfirm={(spec) => {
            canvasRef.current?.plotPoint(spec);
            setPlotPoint(null);
          }}
          onCancel={() => setPlotPoint(null)}
        />
      )}

      {/* ── Graph | Plot Curve… dialog ── */}
      {plotCurveOpen && (
        <PlotCurveDialog
          onConfirm={(spec) => {
            canvasRef.current?.plotCurve(spec);
            setPlotCurveOpen(false);
          }}
          onCancel={() => setPlotCurveOpen(false)}
        />
      )}

      {/* ── Display | Animate Objects… and Action Buttons | Animation… ── */}
      {animateMode && (
        <AnimateDialog
          purpose={animateMode}
          onConfirm={(spec) => {
            if (animateMode === 'button') canvasRef.current?.createAnimationButton(spec);
            else canvasRef.current?.startAnimation(spec);
            setAnimateMode(null);
          }}
          onCancel={() => setAnimateMode(null)}
        />
      )}

      {/* ── Transform dialog ── */}
      {transformMode && (
        <TransformDialog
          mode={transformMode}
          marks={canvasRef.current?.getMarks() ?? {}}
          onTranslate={(params) => canvasRef.current?.applyTranslate(params)}
          onRotate={(params) => canvasRef.current?.applyRotate(params)}
          onDilate={(params) => canvasRef.current?.applyDilate(params)}
          onClose={() => setTransformMode(null)}
        />
      )}

      {/* ── Locus dialog ── */}
      {locusDialogOpen && (
        <LocusDialog
          result={locusResult}
          onRetry={handleCreateLocus}
          onClose={() => setLocusDialogOpen(false)}
        />
      )}

      {/* ── About dialog ── */}
      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-sm text-center"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-brand-900 mb-1">
              Hey<span className="text-amber-300">Geo</span> Design
            </h2>
            <p className="text-sm text-gray-500 mb-4">Web-based geometry designer</p>
            <p className="text-xs text-gray-400">
              Powered by JSXGraph · Built on HeyGeo Desktop format
            </p>
            <button
              className="mt-6 px-5 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
              onClick={() => setShowAbout(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden file input for JSON import ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text) as HeyGeoData;
            if (isDirty && !confirm('Bạn chưa lưu. Nhập tệp mới sẽ mất dữ liệu hiện tại. Tiếp tục?')) return;
            canvasRef.current?.loadData(data);
            setTitle(data.title ?? 'Không tên');
            setIsDirty(false);
            setEditingId(undefined);
            setSelected([]);
            setElementCount(data.elements?.length ?? 0);
            refreshUndoState();
          } catch {
            alert('Không thể đọc tệp. Hãy đảm bảo là tệp JSON hợp lệ.');
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
