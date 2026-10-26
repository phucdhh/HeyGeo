'use client';

import { useState, useEffect, useRef } from 'react';
import type { ToolMode, CanvasHandle } from './designTypes';

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

interface Props {
  title: string;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showAxis: boolean;
  showGrid: boolean;
  tool: ToolMode;
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
  onOpenTransform?: (mode: 'translate' | 'rotate' | 'dilate') => void;
  onUnderDevelopment: () => void;
}

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = [
  { name: 'Black',  value: '#000000' },
  { name: 'Gray',   value: '#808080' },
  { name: 'Red',    value: '#d32f2f' },
  { name: 'Green',  value: '#388e3c' },
  { name: 'Blue',   value: '#1565c0' },
  { name: 'Yellow', value: '#f9a825' },
  { name: 'Purple', value: '#7b1fa2' },
  { name: 'Cyan',   value: '#00838f' },
];

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
      onMouseEnter={() => hasSubmenu && setSubOpen(true)}
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

  // ─── Menu definitions – mirrors GSP Desktop menu order ────────────────
  // File | Edit | Display | Construct | Measure | Number | Transform | Graph | Window | Help
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
        { label: 'Cut',              shortcut: 'Ctrl+X',                       action: onUnderDevelopment },
        { label: 'Copy',             shortcut: 'Ctrl+C',                       action: onUnderDevelopment },
        { label: 'Paste',            shortcut: 'Ctrl+V',                       action: onUnderDevelopment },
        { label: 'Delete',           shortcut: 'Del',                          action: onDeleteSelected },
        { separator: true },
        { label: 'Select All',       shortcut: 'Ctrl+A',                       action: onSelectAll },
        { label: 'Select Parents',                                             action: onUnderDevelopment },
        { label: 'Select Children',                                            action: onUnderDevelopment },
        { separator: true },
        { label: 'Split / Merge',                                              action: onUnderDevelopment },
        { label: 'Edit Definition…',                                           action: onUnderDevelopment },
        { separator: true },
        { label: 'Properties…',                                                action: onUnderDevelopment },
        { label: 'Preferences…',                                               action: onUnderDevelopment },
        { separator: true },
        { label: 'Action Button',                                              action: onUnderDevelopment },
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
          label: 'Point Style',
          submenu: [
            { label: 'Large',       action: () => canvasRef.current?.updateSelectedStrokeWidth(6) },
            { label: 'Medium',      action: () => canvasRef.current?.updateSelectedStrokeWidth(4) },
            { label: 'Small',       action: () => canvasRef.current?.updateSelectedStrokeWidth(2) },
          ],
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
        { label: 'Label Object…',                                  action: onUnderDevelopment },
        { separator: true },
        { label: 'Hide Object',            shortcut: 'Ctrl+H',    action: () => canvasRef.current?.updateSelectedVisible(false) },
        { label: 'Show All Hidden',                                action: () => canvasRef.current?.showAllHidden() },
        { separator: true },
        { label: 'Axes',                   checked: showAxis,     action: onToggleAxis },
        { label: 'Grid',                   checked: showGrid,     action: onToggleGrid },
        { separator: true },
        { label: 'Animate Objects…',                               action: onUnderDevelopment },
        { label: 'Increase Speed',                                 action: onUnderDevelopment },
        { label: 'Decrease Speed',                                 action: onUnderDevelopment },
        { label: 'Stop Animation',                                 action: onUnderDevelopment },
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
        { label: 'Polygon Interior',       shortcut: 'Alt+G',     action: () => onToolChange('polygon_filled') },
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
      label: 'Measure',
      items: [
        { label: 'Length',               action: () => canvasRef.current?.measureLength() },
        { label: 'Distance',             action: () => canvasRef.current?.measureDistance() },
        { label: 'Perimeter',            action: () => canvasRef.current?.measurePerimeter() },
        { label: 'Circumference',        action: () => canvasRef.current?.measurePerimeter() },
        { label: 'Angle',                action: () => canvasRef.current?.measureAngle() },
        { label: 'Area',                 action: () => canvasRef.current?.measureArea() },
        { label: 'Arc Angle',            action: onUnderDevelopment },
        { label: 'Arc Length',           action: onUnderDevelopment },
        { label: 'Radius',               action: () => canvasRef.current?.measureRadius() },
        { label: 'Ratio',                action: onUnderDevelopment },
        { separator: true },
        { label: 'Point Value',          action: onUnderDevelopment },
        { label: 'Coordinates',          action: () => canvasRef.current?.measureCoordinates() },
        { label: 'Abscissa (x)',         action: () => canvasRef.current?.measureAbscissa() },
        { label: 'Ordinate (y)',         action: () => canvasRef.current?.measureOrdinate() },
        { label: 'Coordinate Distance',  action: onUnderDevelopment },
        { label: 'Slope',                action: () => canvasRef.current?.measureSlope() },
        { label: 'Equation',             action: () => canvasRef.current?.measureEquation() },
      ],
    },

    // ── Number ────────────────────────────────────────────────────────────
    {
      label: 'Number',
      items: [
        { label: 'New Parameter…',                action: onUnderDevelopment },
        { label: 'Calculate…',                    action: onUnderDevelopment },
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
        { label: 'New Coordinate System',         action: onUnderDevelopment },
        { label: 'Define Axes…',                  action: onUnderDevelopment },
        { separator: true },
        { label: 'Plot As (x, y)…',               action: onUnderDevelopment },
        { label: 'Plot Value On Axis…',           action: onUnderDevelopment },
        { label: 'New Function…',                 action: onUnderDevelopment },
        { label: 'Plot Function…',                action: onUnderDevelopment },
        { label: 'Plot Parametric Curve…',        action: onUnderDevelopment },
        { label: 'Plot Table Data…',              action: onUnderDevelopment },
        { separator: true },
        {
          label: 'Grid Form',
          submenu: [
            { label: 'Polar Grid',       action: onUnderDevelopment },
            { label: 'Square Grid',      action: onUnderDevelopment },
            { label: 'Rectangular Grid', action: onUnderDevelopment },
            { label: 'Trig Axes',        action: onUnderDevelopment },
          ],
        },
        { label: 'Show/Hide Grid', checked: showGrid, action: onToggleGrid },
        { label: 'Snap Points',                   action: onUnderDevelopment },
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
