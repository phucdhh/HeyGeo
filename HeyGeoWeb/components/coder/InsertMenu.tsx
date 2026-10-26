'use client';
/**
 * InsertMenu – two-level (group → sub-group → item) smart snippet panel.
 * Structure:
 *   GROUPS  (top tabs)
 *     └─ CATEGORIES (left sidebar)
 *           └─ ITEMS (right list)
 *
 * Snippet data lives in ./snippets/ – one file per group.
 */

import { useEffect, useRef, useState } from 'react';
import type { Group } from './snippets/types';
import { basicGroup }     from './snippets/basicGroup';
import { functionsGroup } from './snippets/functionsGroup';
import { threeDGroup }    from './snippets/threeDGroup';

export type { InsertSnippet } from './snippets/types';

export const SNIPPET_GROUPS: Group[] = [
  basicGroup,
  functionsGroup,
  threeDGroup,
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onInsert: (code: string) => void;
  /** Index into SNIPPET_GROUPS – which group this button controls */
  groupIndex: number;
}

export default function InsertMenu({ onInsert, groupIndex }: Props) {
  const [open, setOpen]       = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const group = SNIPPET_GROUPS[groupIndex];
  const cat   = group.categories[activeCat] ?? group.categories[0];

  // Reset category when reopening
  function toggle() {
    setActiveCat(0);
    setOpen(v => !v);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggle}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors select-none
          ${open ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}`}
        title={`Smart Snippets – ${group.name}`}
      >
        {group.name}
        <span className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-50 flex shadow-2xl rounded-lg overflow-hidden border border-gray-700"
          style={{ width: 580, maxHeight: 480 }}
        >
          {/* Category sidebar */}
          <div className="flex flex-col w-44 bg-gray-900 border-r border-gray-700 shrink-0 overflow-y-auto">
            {group.categories.map((c, ci) => (
              <button
                key={ci}
                onClick={() => setActiveCat(ci)}
                className={`text-left px-3 py-2.5 text-xs transition-colors leading-tight
                  ${ci === activeCat
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border-r-2 border-amber-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Item list */}
          <div className="flex-1 bg-gray-950 overflow-y-auto">
            {cat.items.map((item, i) => (
              <button
                key={i}
                onClick={() => { onInsert(item.code); setOpen(false); }}
                className="w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors group"
              >
                <div className="text-sm text-gray-200 group-hover:text-amber-300 font-medium">
                  {item.label}
                </div>
                <pre className="mt-1 text-[10px] text-gray-500 whitespace-pre-wrap leading-4 line-clamp-3 font-mono">
                  {item.code.trim()}
                </pre>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

