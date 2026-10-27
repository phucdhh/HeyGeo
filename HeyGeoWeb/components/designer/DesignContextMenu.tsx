'use client';

// ─── The Sketchpad Context menu ──────────────────────────────────────────────
// Right-click (Ctrl+click on a Mac) on an object, or on empty space, opens the
// curated command list built by contextMenuModel. The only layout rule GSP
// states outright is reproduced here: the menu is placed so that Properties
// sits directly under the pointer when there is room (menus_context.htm).

import { useLayoutEffect, useRef, useState } from 'react';
import type { ContextItem, ContextRow } from './contextMenuModel';

/** The Color flyout is a fixed width, which is what the flip decision needs. */
const FLYOUT_WIDTH = 176;
const EDGE = 4;

interface Props {
  rows: ContextRow[];
  /** Pointer position inside the canvas, where the gesture happened. */
  x: number;
  y: number;
  onPick: (item: ContextItem) => void;
}

export default function DesignContextMenu({ rows, x, y, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [flyLeft, setFlyLeft] = useState(false);
  const [openSub, setOpenSub] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.offsetParent as HTMLElement | null;
    if (!el || !container) return;
    // The row GSP parks under the mouse.
    const anchor = el.querySelector<HTMLElement>('[data-anchor="true"]');
    const top = Math.max(EDGE, Math.min(y - (anchor?.offsetTop ?? 0), container.clientHeight - el.offsetHeight - EDGE));
    const left = Math.max(EDGE, Math.min(x, container.clientWidth - el.offsetWidth - EDGE));
    setFlyLeft(left + el.offsetWidth + FLYOUT_WIDTH + EDGE > container.clientWidth);
    setPos({ left, top });
  }, [rows, x, y]);

  return (
    <div
      ref={ref}
      data-context-menu="true"
      className="absolute bg-white border border-gray-200 shadow-xl rounded py-1 text-sm z-30"
      style={{
        left: pos?.left ?? x, top: pos?.top ?? y,
        visibility: pos ? 'visible' : 'hidden',
        minWidth: 208,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {rows.map((row, i) => {
        if (row.kind === 'header') {
          return <div key={i} className="px-4 py-1 text-gray-400 truncate max-w-64">{row.label}</div>;
        }
        if (row.kind === 'divider') {
          return <div key={i} className="border-t border-gray-200 my-1" />;
        }
        const item = row;
        const hasFly = !!item.submenu?.length;
        return (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => hasFly && setOpenSub(i)}
            onMouseLeave={() => hasFly && setOpenSub(null)}
          >
            <button
              data-anchor={item.id === 'properties' ? 'true' : undefined}
              className={[
                'flex items-center w-full px-4 py-1.5 text-left gap-2',
                hasFly ? 'cursor-default' : 'hover:bg-brand-600 hover:text-white cursor-pointer',
              ].join(' ')}
              onClick={() => { if (!hasFly) onPick(item); }}
            >
              {/* The check column is always there so labels line up. */}
              <span className="w-4 text-center">{item.checked ? '✓' : ''}</span>
              <span className="flex-1">{item.label}</span>
              {hasFly && <span className="text-xs text-gray-400">▶</span>}
            </button>

            {hasFly && openSub === i && (
              <div
                className="absolute top-0 bg-white border border-gray-200 shadow-xl rounded py-1"
                style={{ width: FLYOUT_WIDTH, ...(flyLeft ? { right: '100%' } : { left: '100%' }) }}
              >
                {item.submenu!.map((sub, j) => (
                  <button
                    key={j}
                    className="flex items-center w-full px-4 py-1.5 text-left gap-2 hover:bg-brand-600 hover:text-white cursor-pointer"
                    onClick={() => onPick(sub)}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: String(sub.value) }}
                    />
                    <span className="w-4 text-center">{sub.checked ? '✓' : ''}</span>
                    <span className="flex-1">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
