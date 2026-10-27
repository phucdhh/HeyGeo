'use client';

import type { CursorCoords, ToolMode } from './designTypes';
import { TOOL_HINTS, TOOL_LABELS } from './designTypes';
import { activeVariation, type ArrowMode, variationHint, variationLabel } from './toolboxModel';

interface Props {
  tool: ToolMode;
  /** The arrow drag mode, so the three selection arrows describe themselves. */
  arrow: ArrowMode;
  cursor: CursorCoords;
  elementCount: number;
  selectedCount: number;
  zoom?: number;
}

export default function DesignStatusBar({
  tool,
  arrow,
  cursor,
  elementCount,
  selectedCount,
  zoom,
}: Props) {
  // Tools reached from a menu rather than the toolbox have no tray row, so they
  // fall back to their own label.
  const variation = activeVariation(tool, arrow);
  const label = variation ? variationLabel(variation) : TOOL_LABELS[tool];
  const hint  = variation ? variationHint(variation) : TOOL_HINTS[tool];

  return (
    <div className="flex items-center bg-gray-200 border-t border-gray-300 px-3 h-6 text-[11px] text-gray-600 flex-shrink-0 select-none gap-4">
      {/* Active tool */}
      <span className="font-medium text-brand-700 whitespace-nowrap">
        {label}
      </span>

      {/* Divider */}
      <span className="text-gray-400">│</span>

      {/* Hint text */}
      <span className="text-gray-500 truncate flex-1">
        {hint}
      </span>

      {/* Divider */}
      <span className="text-gray-400">│</span>

      {/* Cursor coords */}
      <span className="font-mono whitespace-nowrap">
        x = {cursor.x.toFixed(3)}&nbsp;&nbsp;y = {cursor.y.toFixed(3)}
      </span>

      {/* Divider */}
      <span className="text-gray-400">│</span>

      {/* Zoom */}
      <span className="font-mono whitespace-nowrap text-gray-600">
        Zoom: {Math.round((zoom ?? 1) * 100)}%
      </span>

      {/* Divider */}
      <span className="text-gray-400">│</span>

      {/* Counts */}
      <span className="whitespace-nowrap">
        {elementCount} phần tử
        {selectedCount > 0 && (
          <span className="ml-2 text-brand-600 font-medium">
            ({selectedCount} được chọn)
          </span>
        )}
      </span>
    </div>
  );
}
