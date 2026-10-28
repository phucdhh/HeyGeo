'use client';

import { useState, useEffect, useRef } from 'react';
import type { ToolMode, CanvasHandle, NumberValue } from './designTypes';
import { COLOR_SWATCHES, POINT_STYLES } from './contextMenuModel';
import { GRID_FORMS, type GridForm, type GraphRows } from './coordsysModel';
import { type FunctionRows } from './functionMenuModel';
import { measureItems, type MeasureItem } from './measureMenuModel';
import { canCalculate } from './numberMenuModel';
import { type PlotPointRows } from './plotPointModel';
import { type ActionButtonRows } from './actionButtonModel';
import { type AnimationRows } from './animationModel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MenuItemDef {
  label?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  submenu?: MenuItemDef[];
  action?: () => void;
}

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

/** The Graph menu before the canvas has anything to say about a frame. */
const NO_FRAME_ROWS: GraphRows = {
  canNew: false, canDefine: false, canGrid: false,
  grid: 'square', showGrid: false, snap: false,
};

/** A definition can always be typed; nothing is picked to plot yet. */
const NO_FUNCTION_ROWS: FunctionRows = { canNew: true, canPlot: false, target: null };

/** No frame is marked, so no point has anything to be measured on. */
const NO_PLOT_POINT_ROWS: PlotPointRows = { canPlotPair: false, canPlotValue: false, canOpen: false };

/** Nothing is picked, so there is nothing to make a button out of. */
const NO_ACTION_BUTTON_ROWS: ActionButtonRows = { canCreate: false, canAnimate: false };

/** Nothing that can move is picked, and nothing is moving. */
const NO_ANIMATION_ROWS: AnimationRows = { canAnimate: false, running: false };

/** Graph | Grid Form, named the way the desktop's submenu names its four forms. */
const GRID_FORM_LABELS: Record<GridForm, string> = {
  polar: 'Polar Grid',
  square: 'Square Grid',
  rectangular: 'Rectangular Grid',
  trig: 'Trig Axes',
};

interface Props {
  title: string;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showAxis: boolean;
  showGrid: boolean;
  tool: ToolMode;
  /** Ids the designer has picked, in the order they were picked. */
  selectedIds: string[];
  canvasRef: React.RefObject<CanvasHandle | null>;
  onNewFile: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportJSON: () => void;
  onImportFile: () => void;
  onExportSVG: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onToggleAxis: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onToolChange: (mode: ToolMode) => void;
  onShowAbout: () => void;
  onCreateLocus: () => void;
  /** Number | New Parameter… — the studio opens the parameter dialog. */
  onNewParameter: () => void;
  /** Number | Calculate… — the studio opens the Calculator. */
  onOpenCalculate: () => void;
  /** Graph | New Function… — the studio opens the function dialog. */
  onOpenNewFunction: () => void;
  /** Graph | Plot as (x, y)… — the studio plots the picked numbers or opens its dialog. */
  onPlotAsXy: () => void;
  /** Graph | Plot Value On Axis… — the studio puts the picked number on the x axis. */
  onPlotValueOnAxis: () => void;
  /** Graph | Plot Curve… — the studio opens the parametric curve dialog. */
  onPlotCurve: () => void;
  /** Display | Animate Objects… — the studio opens the animation dialog. */
  onAnimateObjects: () => void;
  /** Display | Label Object… — the studio opens the label dialog. */
  onLabelObject: () => void;
  /** Edit | Action Buttons | Animation… — the studio asks how the button runs. */
  onActionButtonAnimation: () => void;
  onOpenTransform?: (mode: 'translate' | 'rotate' | 'dilate') => void;
  onUnderDevelopment: () => void;
}

// ─── Color palette ────────────────────────────────────────────────────────────
// The eight swatches of Display | Color, shared with the Context menu.
const COLORS = COLOR_SWATCHES.map((c) => ({ name: c.label, value: c.value }));

// ─── Dropdown menu item renderer ──────────────────────────────────────────────
function MenuItem({
  item,
  depth = 0,
  onClose,
}: {
  item: MenuItemDef;
  depth?: number;
  onClose: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);

  if (item.separator) {
    return <div className="border-t border-gray-200 my-1" />;
  }

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  return (
    <div
      className="relative"
      // A greyed item opens nothing: its tray would offer actions the row itself
      // says are unavailable.
      onMouseEnter={() => hasSubmenu && !item.disabled && setSubOpen(true)}
      onMouseLeave={() => hasSubmenu && setSubOpen(false)}
    >
      <button
        disabled={item.disabled}
        onClick={() => {
          if (!hasSubmenu && item.action) {
            item.action();
            onClose();
          }
        }}
        className={[
          'flex items-center justify-between w-full px-4 py-1.5 text-sm text-left',
          item.disabled
            ? 'text-gray-400 cursor-default'
            : 'text-gray-800 hover:bg-brand-600 hover:text-white cursor-pointer',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          {item.checked !== undefined && (
            <span className="w-4 text-center">{item.checked ? '✓' : ''}</span>
          )}
          {item.label}
        </span>
        <span className="flex items-center gap-2 ml-6 text-xs text-gray-400 group-hover:text-white">
          {item.shortcut && <span>{item.shortcut}</span>}
          {hasSubmenu && <span>▶</span>}
        </span>
      </button>

      {hasSubmenu && subOpen && (
        <div
          className="absolute left-full top-0 -mt-1 bg-white border border-gray-200 shadow-xl rounded py-1 w-52 z-50"
          style={{ marginLeft: depth > 0 ? 2 : 0 }}
        >
          {item.submenu!.map((sub, i) => (
            <MenuItem key={i} item={sub} depth={depth + 1} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single top-level menu ────────────────────────────────────────────────────
function TopMenu({ def, isOpen, onOpen, onClose }: {
  def: MenuDef;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        className={[
          'px-3 py-1 text-sm rounded transition-colors',
          isOpen
            ? 'bg-brand-600 text-white'
            : 'text-gray-100 hover:bg-brand-700',
        ].join(' ')}
        onClick={onOpen}
      >
        {def.label}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 shadow-xl rounded py-1 w-56 z-50">
          {def.items.map((item, i) => (
            <MenuItem key={i} item={item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DesignMenuBar ────────────────────────────────────────────────────────────
export default function DesignMenuBar({
  title,
  isDirty,
  canUndo,
  canRedo,
  showAxis,
  showGrid,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tool: _tool,
  selectedIds,
  canvasRef,
  onNewFile,
  onOpen,
  onSave,
  onSaveAs,
  onExportJSON,
  onImportFile,
  onExportSVG,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onDeleteSelected,
  onSelectAll,
  onToggleAxis,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onToolChange,
  onShowAbout,
  onCreateLocus,
  onNewParameter,
  onOpenCalculate,
  onOpenNewFunction,
  onPlotAsXy,
  onPlotValueOnAxis,
  onPlotCurve,
  onAnimateObjects,
  onLabelObject,
  onActionButtonAnimation,
  onOpenTransform,
  onUnderDevelopment,
}: Props) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (openMenu === null) return;
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  function close() { setOpenMenu(null); }

  function colorItem(c: { name: string; value: string }): MenuItemDef {
    return {
      label: c.name,
      action: () => canvasRef.current?.updateSelectedColor(c.value),
    };
  }

  // Before the canvas mounts there is no selection to ask about, so the menu
  // starts with every row greyed rather than with no rows at all.
  function measureRows(): MeasureItem[] {
    return canvasRef.current?.measureRows() ?? measureItems([], []);
  }

  /** The numbers the board shows, which is what a calculation may be built from. */
  /** The numbers the board shows, which is what a calculation may be built from. */
  function numberValues(): NumberValue[] {
    return canvasRef.current?.numberValues() ?? [];
  }

  /**
   * Whether the Graph menu's frame items have something to mark, and how the
   * marked frame's grid is set.
   */
  function frameRows(): GraphRows {
    return canvasRef.current?.graphRows() ?? NO_FRAME_ROWS;
  }

  /**
   * Whether the Graph menu's two function rows have something to work with: a
   * definition can always be typed, a curve needs one picked and a frame marked.
   */
  function functionRows(): FunctionRows {
    return canvasRef.current?.functionRows() ?? NO_FUNCTION_ROWS;
  }

  /**
   * Whether Graph | Plot as (x, y)… has two numbers to place, or only a frame to
   * type a place into. It needs one or the other, because a plotted point is
   * measured on the marked frame rather than on the page.
   */
  function plotPointRows(): PlotPointRows {
    return canvasRef.current?.plotPointRows() ?? NO_PLOT_POINT_ROWS;
  }

  /** Whether the Edit menu's Action Buttons row has a selection to work from. */
  function actionButtonRow(): ActionButtonRows {
    return canvasRef.current?.actionButtonRows() ?? NO_ACTION_BUTTON_ROWS;
  }

  /**
   * Whether Display | Animate Objects… has something to set moving, and whether
   * the speed and stop rows have a running animation to act on.
   */
  function animationRow(): AnimationRows {
    return canvasRef.current?.animationRows() ?? NO_ANIMATION_ROWS;
  }

  // ─── Menu definitions – mirrors GSP Desktop menu order ────────────────
  // File | Edit | Display | Construct | Measure | Number | Transform | Graph | Window | Help
  const frames = frameRows();
  const functions = functionRows();
  const plotted = plotPointRows();
  const actionButtons = actionButtonRow();
  const animation = animationRow();
  // Display | Label Object… asks for the current text only when it may relabel.
  const labelText = canvasRef.current?.labelObjectInfo() ?? null;
  const menus: MenuDef[] = [
    // ── File ──────────────────────────────────────────────────────────────
    {
      label: 'File',
      items: [
        { label: 'New',                        shortcut: 'Ctrl+N',       action: onNewFile },
        { label: 'New Sketch',                                           action: onUnderDevelopment },
        { separator: true },
        { label: 'Open… (In New Window)',      shortcut: 'Ctrl+O',       action: onOpen },
        { label: 'Open In Same Window…',                                 action: onOpen },
        { separator: true },
        { label: 'Close',                      shortcut: 'Ctrl+W',       action: () => window.history.back() },
        { label: 'Save',                       shortcut: 'Ctrl+S',       action: onSave },
        { label: 'Save As…',                   shortcut: 'Ctrl+Shift+S', action: onSaveAs },
        { separator: true },
        { label: 'Import JSON…',                                         action: onImportFile },
        { label: 'Export JSON…',                                         action: onExportJSON },
        { label: 'Export SVG…',                                          action: onExportSVG },
        { label: 'Publish to Web…',                                      action: onUnderDevelopment },
        { separator: true },
        { label: 'Print…',                     shortcut: 'Ctrl+P',       action: onUnderDevelopment },
        { separator: true },
        { label: 'Back to Dashboard',                                    action: () => { window.location.href = '/dashboard'; } },
      ],
    },

    // ── Edit ──────────────────────────────────────────────────────────────
    {
      label: 'Edit',
      items: [
        { label: 'Undo',             shortcut: 'Ctrl+Z',   disabled: !canUndo, action: onUndo },
        { label: 'Redo',             shortcut: 'Ctrl+Y',   disabled: !canRedo, action: onRedo },
        { separator: true },
        { label: 'Cut',              shortcut: 'Ctrl+X',   disabled: selectedIds.length === 0, action: onCut },
        { label: 'Copy',             shortcut: 'Ctrl+C',   disabled: selectedIds.length === 0, action: onCopy },
        { label: 'Paste',            shortcut: 'Ctrl+V',   disabled: !canvasRef.current?.hasClipboard(), action: onPaste },
        { label: 'Delete',           shortcut: 'Del',                          action: onDeleteSelected },
        { separator: true },
        { label: 'Select All',       shortcut: 'Ctrl+A',                       action: onSelectAll },
        { label: 'Select Parents',   disabled: selectedIds.length === 0, action: () => canvasRef.current?.selectParents() },
        { label: 'Select Children',  disabled: selectedIds.length === 0, action: () => canvasRef.current?.selectChildren() },
        { separator: true },
        { label: 'Split / Merge',                                              action: onUnderDevelopment },
        { label: 'Edit Definition…',                                           action: onUnderDevelopment },
        { separator: true },
        { label: 'Properties…',                                                action: onUnderDevelopment },
        { label: 'Preferences…',                                               action: onUnderDevelopment },
        { separator: true },
        {
          label: 'Action Buttons',
          // Sketchpad builds a button out of a selection, then offers the five
          // behaviours; Hide/Show and Animation are written so far.
          submenu: [
            {
              label: 'Animation…',
              disabled: !actionButtons.canAnimate,
              action: onActionButtonAnimation,
            },
            { label: 'Movement…', action: onUnderDevelopment },
            {
              label: 'Hide/Show',
              disabled: !actionButtons.canCreate,
              action: () => canvasRef.current?.createActionButton(),
            },
            { label: 'Presentation…', action: onUnderDevelopment },
            { label: 'Link…', action: onUnderDevelopment },
          ],
        },
        { label: 'Selection Group…',                                           action: onUnderDevelopment },
      ],
    },

    // ── Display ───────────────────────────────────────────────────────────
    {
      label: 'Display',
      items: [
        {
          label: 'Color',
          submenu: [
            ...COLORS.map(colorItem),
            { separator: true },
            { label: 'Other Color…', action: onUnderDevelopment },
          ],
        },
        {
          label: 'Line Style',
          submenu: [
            { label: 'Solid',       action: () => canvasRef.current?.updateSelectedDash(0) },
            { label: 'Dashed',      action: () => canvasRef.current?.updateSelectedDash(2) },
            { label: 'Dotted',      action: () => canvasRef.current?.updateSelectedDash(1) },
            { separator: true },
            { label: 'Thin',        action: () => canvasRef.current?.updateSelectedStrokeWidth(1) },
            { label: 'Normal',      action: () => canvasRef.current?.updateSelectedStrokeWidth(2) },
            { label: 'Thick',       action: () => canvasRef.current?.updateSelectedStrokeWidth(3) },
          ],
        },
        {
          // A point's size, not a line's: strokeWidth would only thicken its ring.
          label: 'Point Style',
          submenu: POINT_STYLES.map((s) => ({
            label: s.en,
            action: () => canvasRef.current?.updateSelectedPointSize(s.size),
          })),
        },
        {
          label: 'Font',
          submenu: [
            { label: 'Latin Modern Roman', action: onUnderDevelopment },
            { label: 'Times New Roman',    action: onUnderDevelopment },
            { label: 'Arial',              action: onUnderDevelopment },
            { separator: true },
            { label: 'Size 10', action: onUnderDevelopment },
            { label: 'Size 12', action: onUnderDevelopment },
            { label: 'Size 14', action: onUnderDevelopment },
            { label: 'Size 20', action: onUnderDevelopment },
          ],
        },
        { label: 'Text Style',                                     action: onUnderDevelopment },
        { separator: true },
        { label: 'Show/Hide Label',        shortcut: 'Ctrl+K',    action: () => canvasRef.current?.toggleSelectedLabel() },
        { label: 'Label Object…',          disabled: labelText === null, action: onLabelObject },
        { separator: true },
        { label: 'Hide Object',            shortcut: 'Ctrl+H',    action: () => canvasRef.current?.updateSelectedVisible(false) },
        { label: 'Show All Hidden',                                action: () => canvasRef.current?.showAllHidden() },
        { separator: true },
        { label: 'Axes',                   checked: showAxis,     action: onToggleAxis },
        { label: 'Grid',                   checked: showGrid,     action: onToggleGrid },
        { separator: true },
        { label: 'Animate Objects…',  disabled: !animation.canAnimate, action: onAnimateObjects },
        { label: 'Increase Speed',    disabled: !animation.running,    action: () => canvasRef.current?.increaseAnimationSpeed() },
        { label: 'Decrease Speed',    disabled: !animation.running,    action: () => canvasRef.current?.decreaseAnimationSpeed() },
        { label: 'Stop Animation',    disabled: !animation.running,    action: () => canvasRef.current?.stopAnimation() },
        { separator: true },
        { label: 'Trace Object',                                   action: () => canvasRef.current?.toggleSelectedTrace() },
        { label: 'Clear Traces',                                   action: () => canvasRef.current?.clearAllTraces() },
        { separator: true },
        { label: 'Number of Samples…',                             action: onUnderDevelopment },
      ],
    },

    // ── Construct ─────────────────────────────────────────────────────────
    {
      label: 'Construct',
      items: [
        // Points
        { label: 'Point On Object',        shortcut: 'Alt+P',     action: () => canvasRef.current?.createPointOnObject() },
        { label: 'Midpoint',               shortcut: 'Ctrl+M',    action: () => canvasRef.current?.createMidpoint() },
        { label: 'Intersection',           shortcut: 'Ctrl+I',    action: () => canvasRef.current?.createIntersection() },
        { separator: true },
        // Straight objects
        { label: 'Segment',                shortcut: 'Ctrl+L',    action: () => onToolChange('segment') },
        { label: 'Ray',                                            action: () => onToolChange('ray') },
        { label: 'Line',                                           action: () => onToolChange('line') },
        { label: 'Parallel Line',                                  action: () => canvasRef.current?.createParallel() },
        { label: 'Perpendicular Line',                             action: () => canvasRef.current?.createPerpendicular() },
        { label: 'Angle Bisector',                                 action: () => canvasRef.current?.createBisector() },
        { separator: true },
        // Circles & Arcs
        { label: 'Circle By Center+Point', shortcut: 'Alt+C',     action: () => onToolChange('compass') },
        { label: 'Circle By Center+Radius',                        action: onUnderDevelopment },
        { label: 'Arc On Circle',                                  action: onUnderDevelopment },
        { label: 'Arc Through 3 Points',                           action: () => onToolChange('arc') },
        { separator: true },
        // Interiors
        { label: 'Polygon',                shortcut: 'Alt+G',     action: () => onToolChange('polygon') },
        { label: 'Circle Interior',                                action: onUnderDevelopment },
        { label: 'Sector Interior',                                action: onUnderDevelopment },
        { label: 'Arc Interior',                                   action: onUnderDevelopment },
        { separator: true },
        // Locus
        { label: 'Locus…',                                         action: onCreateLocus },
      ],
    },

    // ── Measure ───────────────────────────────────────────────────────────
    {
      // The same model that writes the captions decides which rows the selection
      // defines, so a greyed item and a measurement that cannot be made are one
      // fact instead of two.
      label: 'Measure',
      items: measureRows().map((row) => ({
        label: row.label,
        disabled: row.specs.length === 0,
        action: () => canvasRef.current?.createMeasure(row.specs),
      })),
    },

    // ── Number ────────────────────────────────────────────────────────────
    {
      label: 'Number',
      items: [
        { label: 'New Parameter…',                action: onNewParameter },
        {
          // the desktop's canMeasureCalculate: nothing picked opens the
          // Calculator, one number picked opens it already started on that
          // number, and a shape is not something to calculate with
          label: 'Calculate…',
          disabled: !canCalculate(numberValues(), selectedIds),
          action: onOpenCalculate,
        },
        { separator: true },
        { label: 'Tabulate',                      action: onUnderDevelopment },
        { label: 'Add Table Data',                action: onUnderDevelopment },
        { label: 'Remove Table Data',             action: onUnderDevelopment },
        { separator: true },
        { label: 'Define Function From Sketch…',  action: onUnderDevelopment },
      ],
    },

    // ── Transform ─────────────────────────────────────────────────────────
    {
      label: 'Transform',
      items: [
        // Mark operations
        { label: 'Mark Vector',                   action: () => canvasRef.current?.markVector() },
        { label: 'Mark Center',                   action: () => canvasRef.current?.markCenter() },
        { label: 'Mark Mirror',                   action: () => canvasRef.current?.markMirror() },
        { label: 'Mark Angle',                    action: () => canvasRef.current?.markAngle() },
        { label: 'Mark Ratio',                    action: onUnderDevelopment },
        { label: 'Mark Distance/Length',          action: onUnderDevelopment },
        { label: 'Clear Marks',                   action: () => canvasRef.current?.clearMarks() },
        { separator: true },
        // Transform operations
        { label: 'Translate…',                    action: () => onOpenTransform?.('translate') },
        { label: 'Rotate…',                       action: () => onOpenTransform?.('rotate') },
        { label: 'Dilate…',                       action: () => onOpenTransform?.('dilate') },
        { label: 'Reflect',                       action: () => canvasRef.current?.applyReflect() },
        { separator: true },
        { label: 'Iterate…',                      action: onUnderDevelopment },
        { separator: true },
        { label: 'Define Custom Transform…',      action: onUnderDevelopment },
        { label: 'Edit Custom Transform…',        action: onUnderDevelopment },
      ],
    },

    // ── Graph ─────────────────────────────────────────────────────────────
    {
      label: 'Graph',
      items: [
        // Sketchpad marks one coordinate system at a time, either its own default
        // or the one the picked points describe, so the second item waits for a
        // point to be selected and both go grey once a frame is marked.
        {
          label: 'New Coordinate System',
          disabled: !frames.canNew,
          action: () => canvasRef.current?.newCoordsys(),
        },
        {
          label: 'Define Coordinate System',
          disabled: !frames.canDefine,
          action: () => canvasRef.current?.defineCoordsys(),
        },
        { separator: true },
        // two numbers picked go straight onto the frame; anything else opens the
        // dialog over it, and both need a frame to be measured on first
        {
          label: 'Plot As (x, y)…',
          disabled: !plotted.canOpen,
          action: onPlotAsXy,
        },
        // the desktop's canGraphPlotValueOnAxis: one number picked, and a frame
        {
          label: 'Plot Value On Axis…',
          disabled: !plotted.canPlotValue,
          action: onPlotValueOnAxis,
        },
        { label: 'New Function…',                 action: onOpenNewFunction },
        // the desktop's canGraphPlotFunction: one definition picked, and a frame
        // marked for it to be measured against
        {
          label: 'Plot Function…',
          disabled: !functions.canPlot,
          action: () => canvasRef.current?.plotFunction(),
        },
        { label: 'Plot Curve…',                   action: onPlotCurve },
        { label: 'Plot Table Data…',              action: onUnderDevelopment },
        { separator: true },
        {
          label: 'Grid Form',
          // A grid belongs to a frame, so the whole group waits for one to be marked.
          disabled: !frames.canGrid,
          submenu: GRID_FORMS.map((form) => ({
            label: GRID_FORM_LABELS[form],
            checked: frames.grid === form,
            action: () => canvasRef.current?.setGridForm(form),
          })),
        },
        // The frame's grid, not the page's: a rectangular frame drags its own y
        // spacing, a polar one counts rings, and the graph paper behind everything
        // else stays where Display | Grid puts it.
        {
          label: frames.showGrid ? 'Hide Grid' : 'Show Grid',
          disabled: !frames.canGrid,
          action: () => canvasRef.current?.toggleFrameGrid(),
        },
        {
          label: 'Snap Points',
          checked: frames.snap,
          disabled: !frames.canGrid,
          action: () => canvasRef.current?.toggleSnap(),
        },
        { separator: true },
        { label: 'Derivative…',                   action: onUnderDevelopment },
      ],
    },

    // ── Window ────────────────────────────────────────────────────────────
    {
      label: 'Window',
      items: [
        { label: 'New View Window',               action: onUnderDevelopment },
        { separator: true },
        { label: 'Pan',                           action: onUnderDevelopment },
        { label: 'Zoom In',    shortcut: 'Ctrl++', action: onZoomIn },
        { label: 'Zoom Out',   shortcut: 'Ctrl+-', action: onZoomOut },
        { label: 'Zoom to Fit',shortcut: 'Ctrl+0', action: onZoomFit },
        { label: 'Zoom 100%',                     action: onUnderDevelopment },
        { separator: true },
        { label: 'Minimize Window',               action: onUnderDevelopment },
        { label: 'Bring All To Front',            action: onUnderDevelopment },
        { separator: true },
        { label: 'Back to Dashboard',             action: () => { window.location.href = '/dashboard'; } },
      ],
    },

    // ── Help ──────────────────────────────────────────────────────────────
    {
      label: 'Help',
      items: [
        { label: 'User Guide',          shortcut: 'F1', action: () => window.open('/help', '_blank') },
        { label: 'About HeyGeo…',                       action: onShowAbout },
        { separator: true },
        { label: 'JSXGraph Documentation',              action: () => window.open('https://jsxgraph.uni-bayreuth.de/docs/', '_blank') },
      ],
    },
  ];

  return (
    <div
      ref={barRef}
      className="flex items-center bg-brand-900 text-white px-2 h-9 gap-0.5 flex-shrink-0 select-none z-30"
    >
      {/* Logo */}
      <a href="/dashboard" className="text-lg font-bold tracking-tight mr-3 text-white hover:text-indigo-200 transition-colors">
        Hey<span className="text-amber-300">Geo</span>
      </a>

      {/* Menu items */}
      {menus.map((menu, i) => (
        <TopMenu
          key={menu.label}
          def={menu}
          isOpen={openMenu === i}
          onOpen={() => setOpenMenu(i === openMenu ? null : i)}
          onClose={close}
        />
      ))}

      {/* Title + dirty indicator */}
      <div className="ml-auto flex items-center gap-2 text-sm text-indigo-200 mr-2 truncate max-w-xs">
        <span className="truncate">{title}</span>
        {isDirty && <span className="text-yellow-400 font-bold" title="Unsaved changes">●</span>}
      </div>
    </div>
  );
}
