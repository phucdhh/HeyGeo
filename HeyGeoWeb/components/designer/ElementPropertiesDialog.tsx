'use client';

import { useEffect, useRef, useState } from 'react';
import type { CanvasHandle, SelectedElementInfo } from './designTypes';

interface Props {
  info: SelectedElementInfo;
  canvasRef: React.RefObject<CanvasHandle | null>;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  point:         'Điểm tự do',
  glider:        'Điểm trên đối tượng',
  midpoint:      'Trung điểm',
  intersection:  'Giao điểm',
  segment:       'Đoạn thẳng',
  ray:           'Tia',
  line:          'Đường thẳng',
  circle:        'Đường tròn',
  arc:           'Cung tròn',
  polygon:       'Đa giác',
  text:          'Văn bản / Nhãn',
  angle:         'Góc',
  functiongraph: 'Đồ thị hàm số',
  slider:        'Trượt (Slider)',
  parallel:      'Đường song song',
  perpendicular: 'Đường vuông góc',
  bisector:      'Tia phân giác',
};

const POINT_TYPES = ['point', 'glider', 'midpoint', 'intersection'];

export default function ElementPropertiesDialog({ info, canvasRef, onClose }: Props) {
  const [name,        setName]        = useState(info.name);
  const [strokeColor, setStrokeColor] = useState(info.strokeColor);
  const [strokeWidth, setStrokeWidth] = useState(info.strokeWidth);
  const [coordX,      setCoordX]      = useState(info.coords?.[0]?.toFixed(4) ?? '');
  const [coordY,      setCoordY]      = useState(info.coords?.[1]?.toFixed(4) ?? '');
  const nameRef = useRef<HTMLInputElement>(null);

  const typeLabel  = TYPE_LABELS[info.type] ?? info.type;
  const isPointLike = POINT_TYPES.includes(info.type);
  const isFreePoint = info.type === 'point';
  const isText      = info.type === 'text';

  useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

  // Apply changes
  function handleApply() {
    const canvas = canvasRef.current;
    if (!canvas) { onClose(); return; }

    if (name.trim() !== info.name)
      canvas.updateSelectedName(name.trim());
    if (strokeColor !== info.strokeColor)
      canvas.updateSelectedColor(strokeColor);
    if (strokeWidth !== info.strokeWidth)
      canvas.updateSelectedStrokeWidth(strokeWidth);
    if (isFreePoint && info.coords) {
      const nx = parseFloat(coordX), ny = parseFloat(coordY);
      if (!isNaN(nx) && !isNaN(ny) && (nx !== info.coords[0] || ny !== info.coords[1])) {
        canvas.updateSelectedCoords?.(nx, ny);
      }
    }
    onClose();
  }

  // Keyboard: Enter = apply, Escape = cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter' && tag !== 'TEXTAREA') handleApply();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, strokeColor, strokeWidth, coordX, coordY]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="bg-brand-800 text-white px-4 py-2.5 flex items-center justify-between select-none">
          <h3 className="text-sm font-semibold tracking-wide">Thuộc tính: {typeLabel}</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl leading-none transition-colors"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-4 py-4 space-y-3.5">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tên nhãn
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập tên hiển thị…"
              className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Free point coordinates (editable) */}
          {isFreePoint && info.coords != null && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tọa độ</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-gray-400 w-4">x</span>
                  <input
                    type="number"
                    value={coordX}
                    onChange={e => setCoordX(e.target.value)}
                    step="0.01"
                    className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-gray-400 w-4">y</span>
                  <input
                    type="number"
                    value={coordY}
                    onChange={e => setCoordY(e.target.value)}
                    step="0.01"
                    className="flex-1 min-w-0 border border-gray-300 rounded-md px-2 py-1 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Constrained point coordinates (read-only) */}
          {isPointLike && !isFreePoint && info.coords != null && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tọa độ (chỉ đọc)
              </label>
              <p className="text-sm text-gray-700 font-mono bg-gray-50 rounded px-2.5 py-1.5 border border-gray-200">
                ({info.coords[0].toFixed(4)}, {info.coords[1].toFixed(4)})
              </p>
            </div>
          )}

          {/* Text element note */}
          {isText && (
            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              Nội dung văn bản là biểu thức động. Chỉnh sửa qua định nghĩa phần tử trong Panel.
            </p>
          )}

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Màu</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={strokeColor}
                onChange={e => setStrokeColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
              />
              <span className="text-xs font-mono text-gray-500">{strokeColor.toUpperCase()}</span>
              {/* Quick palette */}
              <div className="flex gap-1 ml-auto">
                {['#1e3c96','#c83c3c','#388e3c','#f57f17','#6a1b9a','#000000'].map(c => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => setStrokeColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: strokeColor === c ? '#fff' : 'transparent',
                      outline: strokeColor === c ? `2px solid ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stroke width (not for points) */}
          {!isPointLike && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Độ dày đường — <span className="font-mono">{strokeWidth}px</span>
              </label>
              <input
                type="range" min={1} max={6} step={1}
                value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                className="w-full accent-brand-700"
              />
            </div>
          )}

          {/* ID */}
          <div className="text-xs text-gray-400 bg-gray-50 rounded px-2.5 py-1 border border-gray-100">
            ID: <span className="font-mono text-gray-600">{info.id}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg
                       hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-sm font-medium bg-brand-700 text-white rounded-lg
                       hover:bg-brand-800 transition-colors"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
