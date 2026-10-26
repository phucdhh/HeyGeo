'use client';

import type { CursorCoords, ToolMode } from './designTypes';
import { TOOL_HINTS, TOOL_LABELS } from './designTypes';

interface Props {
  tool: ToolMode;
  cursor: CursorCoords;
  elementCount: number;
  selectedCount: number;
  zoom?: number;
  hint?: string;
}

export default function DesignStatusBar({
  tool,
  cursor,
  elementCount,
  selectedCount,
  zoom,
  hint,
}: Props) {
  return (
    <div className="flex items-center bg-gray-200 border-t border-gray-300 px-3 h-6 text-[11px] text-gray-600 flex-shrink-0 select-none gap-4">
      {/* Active tool */}
      <span className="font-medium text-brand-700 whitespace-nowrap">
        {TOOL_LABELS[tool]}
      </span>

      {/* Divider */}
      <span className="text-gray-400">│</span>

      {/* Hint text */}
      <span className="text-gray-500 truncate flex-1">
        {hint ?? TOOL_HINTS[tool]}
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
