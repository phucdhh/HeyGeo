'use client';

import { useState } from 'react';
import type { MarkInfo } from './designTypes';

export type TransformMode = 'translate' | 'rotate' | 'dilate';

interface Props {
  mode: TransformMode;
  marks: MarkInfo;
  onTranslate: (params: { type: 'vector' } | { type: 'rect'; dx: number; dy: number } | { type: 'polar'; distance: number; angleDeg: number }) => void;
  onRotate: (params: { angleDeg: number }) => void;
  onDilate: (params: { ratio: number } | { marked: true }) => void;
  onClose: () => void;
}

export default function TransformDialog({
  mode,
  marks,
  onTranslate,
  onRotate,
  onDilate,
  onClose,
}: Props) {
  // Translate state
  const [transType, setTransType] = useState<'vector' | 'rect' | 'polar'>(
    marks.vector ? 'vector' : 'rect'
  );
  const [dx, setDx] = useState(2);
  const [dy, setDy] = useState(2);
  const [dist, setDist] = useState(3);
  const [polarAngle, setPolarAngle] = useState(45);

  // Rotate state
  const [rotAngle, setRotAngle] = useState(marks.angle ? marks.angle.deg : 90);

  // Dilate state — the desktop opens on the marked ratio when there is one.
  const [dilateType, setDilateType] = useState<'marked' | 'fixed'>(
    marks.ratio ? 'marked' : 'fixed'
  );
  const [num, setNum] = useState(2);
  const [den, setDen] = useState(1);

  function handleConfirm() {
    if (mode === 'translate') {
      if (transType === 'vector') {
        onTranslate({ type: 'vector' });
      } else if (transType === 'rect') {
        onTranslate({ type: 'rect', dx, dy });
      } else {
        onTranslate({ type: 'polar', distance: dist, angleDeg: polarAngle });
      }
    } else if (mode === 'rotate') {
      onRotate({ angleDeg: rotAngle });
    } else if (mode === 'dilate') {
      if (dilateType === 'marked') {
        onDilate({ marked: true });
      } else {
        const ratio = den !== 0 ? num / den : num;
        onDilate({ ratio });
      }
    }
    onClose();
  }

  const title =
    mode === 'translate' ? 'Phép tịnh tiến (Translate)'
    : mode === 'rotate'   ? 'Phép quay (Rotate)'
    : 'Phép vị tự (Dilate)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-96 text-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4 text-brand-900">{title}</h2>

        {/* ── TRANSLATE MODE ── */}
        {mode === 'translate' && (
          <div className="space-y-4">
            <div className="flex rounded-lg bg-gray-100 p-1 text-xs">
              <button
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  transType === 'vector' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setTransType('vector')}
              >
                Vectơ đánh dấu
              </button>
              <button
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  transType === 'rect' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setTransType('rect')}
              >
                Tọa độ (dx, dy)
              </button>
              <button
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  transType === 'polar' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setTransType('polar')}
              >
                Tọa độ cực
              </button>
            </div>

            {transType === 'vector' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                {marks.vector ? (
                  <p>
                    Vectơ đã đánh dấu:{' '}
                    <strong className="text-brand-700">
                      {marks.vector.fromName} → {marks.vector.toName}
                    </strong>
                  </p>
                ) : (
                  <p className="text-amber-800">
                    ⚠ Chưa đánh dấu vectơ. Hãy chọn 2 điểm rồi nhấn <strong>Transform → Mark Vector</strong> trước, hoặc chuyển sang tab Tọa độ.
                  </p>
                )}
              </div>
            )}

            {transType === 'rect' && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <label className="w-24 text-gray-600 text-xs">Ngang (dx)</label>
                  <input
                    type="number"
                    step="any"
                    value={dx}
                    onChange={e => setDx(Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="w-24 text-gray-600 text-xs">Dọc (dy)</label>
                  <input
                    type="number"
                    step="any"
                    value={dy}
                    onChange={e => setDy(Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            {transType === 'polar' && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <label className="w-24 text-gray-600 text-xs">Khoảng cách</label>
                  <input
                    type="number"
                    step="any"
                    value={dist}
                    onChange={e => setDist(Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="w-24 text-gray-600 text-xs">Góc (độ)</label>
                  <input
                    type="number"
                    step="any"
                    value={polarAngle}
                    onChange={e => setPolarAngle(Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROTATE MODE ── */}
        {mode === 'rotate' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
              {marks.center ? (
                <p>
                  Tâm quay:{' '}
                  <strong className="text-brand-700">{marks.center.name}</strong>
                </p>
              ) : (
                <p className="text-amber-800">
                  ⚠ Chưa đánh dấu tâm. Hãy chọn 1 điểm và nhấn <strong>Transform → Mark Center</strong> (hoặc nháy đúp vào điểm).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <label className="w-24 text-gray-600 text-xs">Góc quay (độ)</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={rotAngle}
                  onChange={e => setRotAngle(Number(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Quick angles */}
              <div className="flex gap-1.5 pt-1">
                {[30, 45, 60, 90, 120, 180].map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotAngle(deg)}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      rotAngle === deg
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DILATE MODE ── */}
        {mode === 'dilate' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
              {marks.center ? (
                <p>
                  Tâm vị tự:{' '}
                  <strong className="text-brand-700">{marks.center.name}</strong>
                </p>
              ) : (
                <p className="text-amber-800">
                  ⚠ Chưa đánh dấu tâm. Hãy chọn 1 điểm và nhấn <strong>Transform → Mark Center</strong> (hoặc nháy đúp vào điểm).
                </p>
              )}
            </div>

            <div className="flex rounded-lg bg-gray-100 p-1 text-xs">
              <button
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  dilateType === 'marked' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setDilateType('marked')}
              >
                Tỉ số đánh dấu
              </button>
              <button
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  dilateType === 'fixed' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setDilateType('fixed')}
              >
                Nhập tỉ số
              </button>
            </div>

            {dilateType === 'marked' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                {marks.ratio ? (
                  <p>
                    Tỉ số đã đánh dấu:{' '}
                    <strong className="text-brand-700">
                      {marks.ratio.label} = {marks.ratio.value.toFixed(3)}
                    </strong>
                  </p>
                ) : (
                  <p className="text-amber-800">
                    ⚠ Chưa đánh dấu tỉ số. Hãy chọn 2 đoạn thẳng hoặc 1 số đo rồi nhấn <strong>Transform → Mark Ratio</strong>, hoặc chuyển sang tab Nhập tỉ số.
                  </p>
                )}
              </div>
            )}

            {dilateType === 'fixed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <label className="w-24 text-gray-600 text-xs">Tỉ số vị tự (k)</label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    step="any"
                    value={num}
                    onChange={e => setNum(Number(e.target.value))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-gray-400 font-bold">/</span>
                  <input
                    type="number"
                    step="any"
                    value={den}
                    onChange={e => setDen(Number(e.target.value))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-xs text-gray-500 ml-2">
                    = {(den !== 0 ? num / den : num).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quick ratios */}
              <div className="flex gap-1.5 pt-1">
                {[
                  { label: '2', n: 2, d: 1 },
                  { label: '1/2', n: 1, d: 2 },
                  { label: '3', n: 3, d: 1 },
                  { label: '-1', n: -1, d: 1 },
                  { label: '-1/2', n: -1, d: 2 },
                ].map(r => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => { setNum(r.n); setDen(r.d); }}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      num === r.n && den === r.d
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── Buttons ── */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              (mode === 'translate' && transType === 'vector' && !marks.vector) ||
              (mode === 'rotate' && !marks.center) ||
              (mode === 'dilate' && !marks.center) ||
              (mode === 'dilate' && dilateType === 'marked' && !marks.ratio)
            }
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Thực hiện
          </button>
        </div>
      </div>
    </div>
  );
}
