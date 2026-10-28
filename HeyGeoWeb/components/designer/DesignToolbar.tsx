'use client';

import { useEffect, useRef, useState } from 'react';
import type { ToolMode } from './designTypes';
import {
  isActiveVariation,
  TOOL_FAMILIES,
  variationLabel,
  rowVariation,
  type ArrowMode,
  type ToolFamily,
  type ToolVariation,
} from './toolboxModel';

// ─── SVG Icon components (match HeyGeoToolBar.cpp programmatic icons) ─────────

const C_MAIN = '#1e3c96'; // dark blue
//const C_MAIN = '#d97706'; // amber-600
const C_ACC  = '#c83c3c'; // red accent
// const C_LINE = '#323232';

function IconSelection() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 2 L3 20 L8 15 L12 26 L15 24 L11 13 L19 13 Z"
        fill={C_MAIN}
      />
      <polygon points="20,22 25,26 20,26" fill={C_MAIN} />
    </svg>
  );
}

// Rotate arrow – a curved arrow turning about a marked centre.
function IconArrowRotate() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 14 A 8 8 0 1 1 14 22" stroke={C_MAIN} strokeWidth="2" strokeLinecap="round" fill="none" />
      <polygon points="14,26 10,19 18,19" fill={C_MAIN} />
      <circle cx="14" cy="14" r="2" fill={C_ACC} />
    </svg>
  );
}

// Dilate arrow – a circle growing away from a fixed centre.
function IconArrowDilate() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="21" r="2" fill={C_ACC} />
      <line x1="9" y1="19" x2="20" y2="8" stroke={C_MAIN} strokeWidth="2" />
      <polygon points="23,5 23,12 16,5" fill={C_MAIN} />
      <circle cx="17" cy="15" r="5" stroke={C_MAIN} strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function IconPoint() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="6.5" fill={C_MAIN} />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="14" r="9" stroke={C_MAIN} strokeWidth="2" />
      <circle cx="12" cy="14" r="2.5" fill={C_MAIN} />
      <circle cx={12 + 9 * 0.707} cy={14 - 9 * 0.707} r="2.5" fill={C_ACC} />
    </svg>
  );
}

function IconArc() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 4 22 A 12 12 0 0 1 22 4"
        stroke={C_MAIN} strokeWidth="2" fill="none" strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="1.8" fill={C_MAIN} />
      <line x1="14" y1="14" x2="4"  y2="22" stroke={C_MAIN} strokeWidth="1" strokeDasharray="3 2" />
      <line x1="14" y1="14" x2="22" y2="4"  stroke={C_MAIN} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="4"  cy="22" r="2.5" fill={C_ACC} />
      <circle cx="22" cy="4"  r="2.5" fill={C_ACC} />
    </svg>
  );
}

// Pen tool – diagonal pen body with ink nib (mirrors makePenIcon() in HeyGeoToolBar.cpp)
function IconPen() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pen body (parallelogram) */}
      <path d="M22 3 L26 7 L10 23 L6 19 Z" fill={C_MAIN} />
      {/* Nib tip (small triangle, red accent) */}
      <path d="M10 23 L6 19 L4 27 Z" fill={C_ACC} />
      {/* Ink stroke under tip */}
      <line x1="7" y1="25" x2="14" y2="25" stroke={C_ACC} strokeWidth="1.5" />
    </svg>
  );
}

// Custom tool – play triangle + 3 dots (mirrors makeCustomIcon() in HeyGeoToolBar.cpp)
function IconCustom() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,5 5,23 21,14" fill={C_MAIN} />
      <circle cx="24" cy="8"  r="1.5" fill={C_MAIN} />
      <circle cx="24" cy="14" r="1.5" fill={C_MAIN} />
      <circle cx="24" cy="20" r="1.5" fill={C_MAIN} />
    </svg>
  );
}

function IconSegment() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="23" x2="23" y2="5" stroke={C_MAIN} strokeWidth="2" />
      <circle cx="5" cy="23" r="3" fill={C_MAIN} />
      <circle cx="23" cy="5" r="3" fill={C_MAIN} />
    </svg>
  );
}

function IconRay() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="23" x2="21" y2="7" stroke={C_MAIN} strokeWidth="2" />
      <circle cx="5" cy="23" r="3" fill={C_MAIN} />
      <polygon points="21,7 14,9 19,14" fill={C_MAIN} />
    </svg>
  );
}

function IconLine() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="24" x2="24" y2="4" stroke={C_MAIN} strokeWidth="2" />
      <polygon points="24,4 17,6 22,11" fill={C_MAIN} />
      <polygon points="4,24 11,22 6,17" fill={C_MAIN} />
    </svg>
  );
}

/**
 * The three polygon tools, drawn the way the Sketchpad toolbox draws them
 * (polygon_tools.png): the interior on its own, the interior with its edges as
 * objects, and the edges alone.
 */
function IconPolygon({ fill = true, thick = false }: { fill?: boolean; thick?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="14,3 25,18 19,25 9,25 3,18"
        stroke={C_MAIN}
        strokeWidth={thick ? 2.6 : 1.4}
        fill={fill ? `${C_MAIN}66` : 'none'}
      />
      <circle cx="14" cy="3" r="2.2" fill={C_ACC} />
      <circle cx="25" cy="18" r="2.2" fill={C_ACC} />
      <circle cx="9" cy="25" r="2.2" fill={C_ACC} />
    </svg>
  );
}

function IconText() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        x="4" y="22"
        fontFamily="serif"
        fontSize="22"
        fontWeight="bold"
        fill={C_MAIN}
      >
        T
      </text>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="11" stroke={C_MAIN} strokeWidth="2" />
      <circle cx="14" cy="9.5" r="1.5" fill={C_MAIN} />
      <line x1="14" y1="13" x2="14" y2="21" stroke={C_MAIN} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconSlider() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Track */}
      <line x1="4" y1="14" x2="24" y2="14" stroke={C_MAIN} strokeWidth="2" strokeLinecap="round" />
      {/* End ticks */}
      <line x1="4"  y1="11" x2="4"  y2="17" stroke={C_MAIN} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="11" x2="24" y2="17" stroke={C_MAIN} strokeWidth="1.5" strokeLinecap="round" />
      {/* Handle */}
      <circle cx="16" cy="14" r="4" fill={C_MAIN} />
      <circle cx="16" cy="14" r="2" fill="white" />
      {/* Variable label */}
      <text x="13" y="26" fontFamily="serif" fontSize="7" fill={C_ACC} fontStyle="italic">a</text>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2 h-2">
      <path d="M2 3 L4 5 L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Which icon a row shows ───────────────────────────────────────────────────
// The three arrows are one tool, so the arrow glyph is chosen by its drag mode.
const TOOL_ICONS: Record<string, React.ReactNode> = {
  selection:      <IconSelection />,
  arrow_rotate:   <IconArrowRotate />,
  arrow_dilate:   <IconArrowDilate />,
  point:          <IconPoint />,
  compass:        <IconCompass />,
  arc:            <IconArc />,
  segment:        <IconSegment />,
  ray:            <IconRay />,
  line:           <IconLine />,
  polygon:           <IconPolygon />,
  polygon_and_edges: <IconPolygon thick />,
  polygon_edges:     <IconPolygon fill={false} thick />,
  slider:         <IconSlider />,
  text:           <IconText />,
  pen:            <IconPen />,
  info:           <IconInfo />,
  custom:         <IconCustom />,
};

function iconOf(v: ToolVariation | undefined, familyId: ToolFamily['id']): React.ReactNode {
  // Only the custom tray has no variation to point at.
  if (!v) return familyId === 'custom' ? TOOL_ICONS.custom : TOOL_ICONS.selection;
  if (v.tool === 'selection') {
    return v.arrow === 'rotate' ? TOOL_ICONS.arrow_rotate
         : v.arrow === 'dilate' ? TOOL_ICONS.arrow_dilate
         : TOOL_ICONS.selection;
  }
  return TOOL_ICONS[v.tool] ?? TOOL_ICONS.custom;
}

/** Tools grouped apart in the GSP toolbox. */
const SEPARATOR_BEFORE = new Set<ToolFamily['id']>(['compass', 'text', 'info']);

// ─── Tray flyout ──────────────────────────────────────────────────────────────
interface FlyoutProps {
  familyId: ToolFamily['id'];
  items: ToolVariation[];
  isCurrent: (v: ToolVariation) => boolean;
  onSelect: (v: ToolVariation) => void;
  onClose: () => void;
}

function Flyout({ familyId, items, isCurrent, onSelect, onClose }: FlyoutProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-full top-0 ml-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-56">
        {items.map((item) => (
          <button
            key={item.arrow ?? item.tool}
            onClick={() => onSelect(item)}
            className={[
              'flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors',
              isCurrent(item)
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-gray-700 hover:bg-brand-50 hover:text-brand-700',
            ].join(' ')}
          >
            <span className="w-6 h-6 flex-shrink-0">{iconOf(item, familyId)}</span>
            {variationLabel(item)}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── One toolbox row ──────────────────────────────────────────────────────────
interface RowProps {
  family: ToolFamily;
  /** The variation this row is on, or undefined for an empty tray. */
  current?: ToolVariation;
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (v: ToolVariation) => void;
  onEmptyTray: () => void;
}

/**
 * A single click activates the tool; holding the icon pops the tray, which is
 * how GSP opens it (tools.htm: "press and hold the icon in the Toolbox until a
 * menu pops out"). The chevron stays as the visible affordance for the same
 * tray, since nothing on the web suggests that holding works.
 */
function ToolRow({ family, current, active, open, onOpen, onClose, onSelect, onEmptyTray }: RowProps) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldOpen = useRef(false);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  function beginHold() {
    if (family.variations.length < 2) return;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      heldOpen.current = true;
      onOpen();
    }, 450);
  }

  function cancelHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }

  function click() {
    const openedByHold = heldOpen.current;
    heldOpen.current = false;
    if (openedByHold) return;
    if (current) onSelect(current);
    else onEmptyTray();
  }

  return (
    <div className="relative w-full">
      <div className="relative flex items-center w-full">
        <button
          title={current ? variationLabel(current) : 'Công cụ tuỳ chỉnh'}
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onClick={click}
          className={[
            'flex-1 flex items-center justify-center w-10 h-10 rounded transition-colors',
            active
              ? 'bg-brand-600 text-white shadow-inner'
              : 'hover:bg-gray-200 text-gray-700',
          ].join(' ')}
        >
          <span className="w-6 h-6">{iconOf(current, family.id)}</span>
        </button>
        {family.variations.length > 1 && (
          <button
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="absolute right-0.5 bottom-0.5 text-gray-400 hover:text-gray-700 p-0.5 rounded"
            title="Xem thêm"
          >
            <IconChevron />
          </button>
        )}
      </div>
      {open && (
        <Flyout
          familyId={family.id}
          items={family.variations}
          isCurrent={(v) => active && v === current}
          onSelect={onSelect}
          onClose={onClose}
        />
      )}
    </div>
  );
}

// ─── DesignToolbar ─────────────────────────────────────────────────────────────
interface Props {
  tool: ToolMode;
  arrow: ArrowMode;
  /** The arrow families carry a drag mode; other tools leave it as it was. */
  onToolChange: (mode: ToolMode, arrow?: ArrowMode) => void;
  onUnderDevelopment?: () => void;
}

export default function DesignToolbar({ tool, arrow, onToolChange, onUnderDevelopment }: Props) {
  const [openFamily, setOpenFamily] = useState<ToolFamily['id'] | null>(null);

  function choose(v: ToolVariation) {
    onToolChange(v.tool, v.arrow);
    if (v.tool === 'pen') onUnderDevelopment?.();
    setOpenFamily(null);
  }

  return (
    <div
      className="relative flex flex-col items-center gap-0.5 w-12 bg-gray-100 border-r border-gray-300 py-2 shadow-inner select-none z-10"
      style={{ minHeight: 0 }}
    >
      {TOOL_FAMILIES.map((family) => {
        // The row shows, and a single click activates, the member the family is
        // on — or its first member when another tool is held. Without the
        // fallback a mouse or a finger could never reach Point, Text or Pen.
        const active = family.variations.some((v) => isActiveVariation(v, tool, arrow));
        const shown = rowVariation(family, tool, arrow);
        return (
          <div key={family.id} className="contents">
            {SEPARATOR_BEFORE.has(family.id) && (
              <div className="border-t border-gray-300 my-1 mx-2 w-full" />
            )}
            <ToolRow
              family={family}
              current={shown}
              active={active}
              open={openFamily === family.id}
              onOpen={() => setOpenFamily(family.id)}
              onClose={() => setOpenFamily(null)}
              onSelect={choose}
              onEmptyTray={() => onUnderDevelopment?.()}
            />
          </div>
        );
      })}
    </div>
  );
}
