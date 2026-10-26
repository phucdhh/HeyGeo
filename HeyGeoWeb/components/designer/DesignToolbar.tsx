'use client';

import { useState } from 'react';
import type { ToolMode } from './designTypes';

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

function IconPolygon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="14,3 25,18 19,25 9,25 3,18"
        stroke={C_MAIN}
        strokeWidth="1.8"
        fill={filled ? `${C_MAIN}44` : 'none'}
      />
      <circle cx="14" cy="3" r="2.2" fill={C_ACC} />
      <circle cx="25" cy="18" r="2.2" fill={C_ACC} />
      <circle cx="9" cy="25" r="2.2" fill={C_ACC} />
    </svg>
  );
}

function IconPolyline() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline
        points="3,24 10,8 18,18 25,5"
        stroke={C_MAIN}
        strokeWidth="2"
        fill="none"
      />
      <circle cx="3" cy="24" r="2.2" fill={C_ACC} />
      <circle cx="10" cy="8" r="2.2" fill={C_ACC} />
      <circle cx="18" cy="18" r="2.2" fill={C_ACC} />
      <circle cx="25" cy="5" r="2.2" fill={C_ACC} />
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

// ─── Sub-tool flyout data ──────────────────────────────────────────────────────
const STRAIGHT_SUBTOOLS: { mode: ToolMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'segment', label: 'Đoạn thẳng (D)', icon: <IconSegment /> },
  { mode: 'ray',     label: 'Tia (R)',         icon: <IconRay /> },
  { mode: 'line',    label: 'Đường thẳng (L)', icon: <IconLine /> },
];

const POLYGON_SUBTOOLS: { mode: ToolMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'polygon',        label: 'Đa giác (G)',          icon: <IconPolygon /> },
  { mode: 'polygon_filled', label: 'Đa giác tô màu (F)',   icon: <IconPolygon filled /> },
  { mode: 'polygon_open',   label: 'Đường gấp khúc (O)',   icon: <IconPolyline /> },
];

// ─── Individual tool button ────────────────────────────────────────────────────
interface ToolBtnProps {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  hasSubmenu?: boolean;
  onSubmenuOpen?: () => void;
}

function ToolBtn({ active, icon, title, onClick, hasSubmenu, onSubmenuOpen }: ToolBtnProps) {
  return (
    <div className="relative flex items-center w-full">
      <button
        title={title}
        onClick={onClick}
        className={[
          'flex-1 flex items-center justify-center w-10 h-10 rounded transition-colors',
          active
            ? 'bg-brand-600 text-white shadow-inner'
            : 'hover:bg-gray-200 text-gray-700',
        ].join(' ')}
      >
        <span className="w-6 h-6">{icon}</span>
      </button>
      {hasSubmenu && (
        <button
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onSubmenuOpen?.(); }}
          className="absolute right-0.5 bottom-0.5 text-gray-400 hover:text-gray-700 p-0.5 rounded"
          title="Xem thêm"
        >
          <IconChevron />
        </button>
      )}
    </div>
  );
}

// ─── Flyout submenu ────────────────────────────────────────────────────────────
interface FlyoutProps {
  items: { mode: ToolMode; label: string; icon: React.ReactNode }[];
  onSelect: (mode: ToolMode) => void;
  onClose: () => void;
}

function Flyout({ items, onSelect, onClose }: FlyoutProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-full top-0 ml-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48">
        {items.map((item) => (
          <button
            key={item.mode}
            onClick={() => { onSelect(item.mode); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
          >
            <span className="w-6 h-6 flex-shrink-0">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Separator() {
  return <div className="border-t border-gray-300 my-1 mx-2" />;
}

// ─── DesignToolbar ─────────────────────────────────────────────────────────────
interface Props {
  tool: ToolMode;
  onToolChange: (mode: ToolMode) => void;
  onUnderDevelopment?: () => void;
}

export default function DesignToolbar({ tool, onToolChange, onUnderDevelopment }: Props) {
  const [flyout, setFlyout] = useState<'straight' | 'polygon' | null>(null);
  const [activeStraight, setActiveStraight] = useState<ToolMode>('segment');
  const [activePolygon,  setActivePolygon]  = useState<ToolMode>('polygon');

  const isStraight = tool === 'segment' || tool === 'ray' || tool === 'line';
  const isPolygon  = tool === 'polygon' || tool === 'polygon_filled' || tool === 'polygon_open';

  function selectStraight(mode: ToolMode) {
    setActiveStraight(mode);
    onToolChange(mode);
    setFlyout(null);
  }

  function selectPolygon(mode: ToolMode) {
    setActivePolygon(mode);
    onToolChange(mode);
    setFlyout(null);
  }

  // Current icon for straight/polygon group
  const straightIcon = STRAIGHT_SUBTOOLS.find(t => t.mode === activeStraight)?.icon ?? <IconSegment />;
  const polygonIcon  = POLYGON_SUBTOOLS.find (t => t.mode === activePolygon )?.icon ?? <IconPolygon />;

  return (
    <div
      className="relative flex flex-col items-center gap-0.5 w-12 bg-gray-100 border-r border-gray-300 py-2 shadow-inner select-none z-10"
      style={{ minHeight: 0 }}
    >
      {/* ── 1. Selection ─────────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'selection'}
        icon={<IconSelection />}
        title="Chọn / Di chuyển (S)"
        onClick={() => onToolChange('selection')}
      />

      {/* ── 2. Point ─────────────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'point'}
        icon={<IconPoint />}
        title="Điểm (P)"
        onClick={() => onToolChange('point')}
      />

      <Separator />

      {/* ── 3. Compass / Circle ─────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'compass'}
        icon={<IconCompass />}
        title="Đường tròn – tâm + điểm trên (C)"
        onClick={() => onToolChange('compass')}
      />

      {/* ── 4. Straight Edge group: Segment / Ray / Line ─────────────── */}
      <div className="relative w-full">
        <ToolBtn
          active={isStraight}
          icon={straightIcon}
          title={STRAIGHT_SUBTOOLS.find(t => t.mode === activeStraight)?.label ?? 'Đoạn thẳng'}
          onClick={() => onToolChange(activeStraight)}
          hasSubmenu
          onSubmenuOpen={() => setFlyout('straight')}
        />
        {flyout === 'straight' && (
          <Flyout
            items={STRAIGHT_SUBTOOLS}
            onSelect={selectStraight}
            onClose={() => setFlyout(null)}
          />
        )}
      </div>

      {/* ── 5. Polygon group ─────────────────────────────────────────── */}
      <div className="relative w-full">
        <ToolBtn
          active={isPolygon}
          icon={polygonIcon}
          title={POLYGON_SUBTOOLS.find(t => t.mode === activePolygon)?.label ?? 'Đa giác'}
          onClick={() => onToolChange(activePolygon)}
          hasSubmenu
          onSubmenuOpen={() => setFlyout('polygon')}
        />
        {flyout === 'polygon' && (
          <Flyout
            items={POLYGON_SUBTOOLS}
            onSelect={selectPolygon}
            onClose={() => setFlyout(null)}
          />
        )}
      </div>

      {/* ── 6. Slider ────────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'slider'}
        icon={<IconSlider />}
        title="Thanh trượt – nhấp (1) điểm đầu, nhấp (2) điểm cuối (V)"
        onClick={() => onToolChange('slider')}
      />

      <Separator />

      {/* ── 7. Text ────────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'text'}
        icon={<IconText />}
        title="Văn bản / Nhãn – ẩn/hiện nhãn đối tượng (T)"
        onClick={() => onToolChange('text')}
      />

      {/* ── 7. Pen (Mark) ────────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'pen'}
        icon={<IconPen />}
        title="Bút đánh dấu – mark đoạn thẳng, góc (X)"
        onClick={() => { onToolChange('pen'); onUnderDevelopment?.(); }}
      />

      <Separator />

      {/* ── 8. Information ───────────────────────────────────────────── */}
      <ToolBtn
        active={tool === 'info'}
        icon={<IconInfo />}
        title="Thông tin – nhấp đối tượng để xem chi tiết (I)"
        onClick={() => onToolChange('info')}
      />

      {/* ── 9. Custom Tool ───────────────────────────────────────────── */}
      <ToolBtn
        active={false}
        icon={<IconCustom />}
        title="Công cụ tùy chỉnh – chạy các dựng hình người dùng định nghĩa"
        onClick={() => onUnderDevelopment?.()}
      />
    </div>
  );
}
