'use client';

import { useState } from 'react';
import type { CanvasHandle, SelectedElementInfo } from './designTypes';

const STROKE_COLORS = [
  '#000000', '#808080', '#d32f2f', '#388e3c',
  '#1565c0', '#f9a825', '#7b1fa2', '#00838f',
  '#e91e63', '#ff5722', '#795548', '#607d8b',
];

const FILL_COLORS = [
  '#ffebee', '#e8f5e9', '#e3f2fd', '#fff9c4',
  '#f3e5f5', '#e0f7fa', '#fce4ec', '#ffccbc',
  '#f5f5f5', '#ffe082', '#b2dfdb', '#d7ccc8',
];

const FILL_TYPES = ['circle', 'arc', 'polygon'];

interface Props {
  selected: SelectedElementInfo[];
  canvasRef: React.RefObject<CanvasHandle | null>;
}

// ─── Section header ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-b border-gray-200">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

// ─── Small label + control row ────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs mb-1.5">
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={['w-8 h-5 rounded-full transition-colors relative', value ? 'bg-brand-500' : 'bg-gray-300'].join(' ')}
    >
      <span className={['absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', value ? 'translate-x-3.5' : 'translate-x-0.5'].join(' ')} />
    </button>
  );
}

export default function DesignPropertiesPanel({ selected, canvasRef }: Props) {
  const el = selected[0] ?? null;
  const multi = selected.length > 1;
  const [editName, setEditName] = useState('');
  const [nameEditing, setNameEditing] = useState(false);

  const typeLabel: Record<string, string> = {
    point: 'Điểm', glider: 'Điểm trên đối tượng', segment: 'Đoạn thẳng',
    line: 'Đường thẳng', ray: 'Tia', circle: 'Đường tròn', arc: 'Cung tròn',
    polygon: 'Đa giác', angle: 'Góc', text: 'Văn bản', midpoint: 'Trung điểm',
    intersection: 'Giao điểm', perpendicular: 'Vuông góc',
    parallel: 'Song song', bisector: 'Phân giác', slider: 'Thanh trượt',
    functiongraph: 'Đồ thị hàm số',
  };

  const hasFill = el ? FILL_TYPES.includes(el.type) : false;
  const isPoint = el ? ['point', 'glider', 'midpoint', 'intersection'].includes(el.type) : false;

  if (selected.length === 0) {
    return (
      <div className="w-52 bg-gray-50 border-l border-gray-300 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-100">
          <p className="text-xs font-semibold text-gray-600">Thuộc tính</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Chọn một đối tượng để xem và chỉnh sửa thuộc tính.
            <br/>
            <span className="text-gray-300">Nhấp đúp để mở dialog.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-52 bg-gray-50 border-l border-gray-300 flex flex-col overflow-y-auto flex-shrink-0 text-gray-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-100 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-600">
          {multi ? `${selected.length} đối tượng được chọn` : (typeLabel[el.type] ?? el.type)}
        </p>
        {!multi && el.id && (
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">ID: {el.id}</p>
        )}
      </div>

      {/* ── Name ── */}
      {!multi && (
        <Section title="Nhãn">
          <Row label="Tên">
            {nameEditing ? (
              <input
                className="w-full text-xs border border-brand-400 rounded px-1.5 py-0.5 focus:outline-none"
                value={editName}
                autoFocus
                onChange={e => setEditName(e.target.value)}
                onBlur={() => { canvasRef.current?.updateSelectedName(editName); setNameEditing(false); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { canvasRef.current?.updateSelectedName(editName); setNameEditing(false); }
                  if (e.key === 'Escape') setNameEditing(false);
                }}
              />
            ) : (
              <button
                className="w-full text-left text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white hover:border-brand-400 transition-colors truncate"
                onClick={() => { setEditName(el.name); setNameEditing(true); }}
              >
                {el.name || <span className="text-gray-400 italic">Trống</span>}
              </button>
            )}
          </Row>
        </Section>
      )}

      {/* ── Coordinates ── */}
      {!multi && el.coords && (
        <Section title="Tọa độ">
          <Row label="x"><span className="text-xs font-mono text-gray-700">{el.coords[0].toFixed(4)}</span></Row>
          <Row label="y"><span className="text-xs font-mono text-gray-700">{el.coords[1].toFixed(4)}</span></Row>
        </Section>
      )}

      {/* ── Stroke color ── */}
      <Section title="Màu nét">
        <div className="grid grid-cols-6 gap-1 mb-2">
          {STROKE_COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => canvasRef.current?.updateSelectedStrokeColor?.(c)}
              className="w-6 h-6 rounded border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: el?.strokeColor === c ? '#6366f1' : '#e5e7eb' }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={el?.strokeColor ?? '#000000'}
            onChange={e => canvasRef.current?.updateSelectedStrokeColor?.(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
            title="Chọn màu tùy chỉnh"
          />
          <span className="text-[10px] font-mono text-gray-400">{el?.strokeColor?.toUpperCase() ?? ''}</span>
        </div>
      </Section>

      {/* ── Fill color (circles, arcs, polygons) ── */}
      {hasFill && (
        <Section title="Màu tô">
          <div className="grid grid-cols-6 gap-1 mb-2">
            {FILL_COLORS.map(c => (
              <button
                key={c}
                title={c}
                onClick={() => canvasRef.current?.updateSelectedFillColor?.(c)}
                className="w-6 h-6 rounded border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: el?.fillColor === c ? '#6366f1' : '#e5e7eb' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={el?.fillColor === 'none' ? '#ffffff' : (el?.fillColor ?? '#ffffff')}
              onChange={e => canvasRef.current?.updateSelectedFillColor?.(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5 bg-white"
              title="Chọn màu tô"
            />
            <button
              onClick={() => canvasRef.current?.updateSelectedFillColor?.('none')}
              className={[
                'flex-1 text-xs rounded border px-1.5 py-1 transition-colors',
                el?.fillColor === 'none'
                  ? 'border-brand-400 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400',
              ].join(' ')}
            >
              Không tô
            </button>
          </div>
          {el?.fillColor !== 'none' && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Độ mờ</span>
                <span className="font-mono">{Math.round((el?.fillOpacity ?? 0.1) * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={Math.round((el?.fillOpacity ?? 0.1) * 100)}
                onChange={e =>
                  canvasRef.current?.updateSelectedFillOpacity?.(Number(e.target.value) / 100)
                }
                className="w-full accent-brand-700"
              />
            </div>
          )}
        </Section>
      )}

      {/* ── Stroke width ── */}
      {!isPoint && (
        <Section title="Độ dày nét">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                onClick={() => canvasRef.current?.updateSelectedStrokeWidth(w)}
                title={`${w}px`}
                className={[
                  'flex-1 flex items-center justify-center h-7 rounded border transition-colors',
                  el?.strokeWidth === w ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-400',
                ].join(' ')}
              >
                <div className="w-full rounded" style={{ height: Math.min(w + 1, 5), backgroundColor: '#1e3c96' }} />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Dash pattern ── */}
      {!isPoint && (
        <Section title="Kiểu nét">
          <div className="flex gap-2">
            {[
              { dash: 0, label: '—', title: 'Liền nét' },
              { dash: 2, label: '- -', title: 'Nét đứt' },
              { dash: 1, label: '···', title: 'Chấm' },
            ].map(({ dash, label, title }) => (
              <button
                key={dash}
                onClick={() => canvasRef.current?.updateSelectedDash(dash)}
                title={title}
                className={[
                  'flex-1 text-xs h-7 rounded border transition-colors font-mono',
                  el?.dash === dash ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white hover:border-gray-400 text-gray-600',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Visibility & Fixed ── */}
      <Section title="Trạng thái">
        <Row label="Hiển thị">
          <Toggle value={el?.visible ?? true} onChange={v => canvasRef.current?.updateSelectedVisible(v)} />
        </Row>
        {el?.type === 'point' && (
          <Row label="Cố định">
            <Toggle value={el.fixed} onChange={v => canvasRef.current?.updateSelectedFixed(v)} />
          </Row>
        )}
      </Section>

      {/* ── Animation (for gliders – points on objects) ── */}
      {!multi && el.type === 'glider' && (
        <Section title="Hoạt hình">
          <div className="flex gap-2">
            <button
              onClick={() => canvasRef.current?.startAnimation?.(el.id)}
              className="flex-1 flex items-center justify-center gap-1 text-xs h-7 rounded border border-gray-200 bg-white hover:bg-brand-50 hover:border-brand-400 text-gray-700 transition-colors"
              title="Bắt đầu chuyển động dọc theo đường"
            >
              ▶ Chạy
            </button>
            <button
              onClick={() => canvasRef.current?.stopAnimation?.(el.id)}
              className="flex-1 flex items-center justify-center gap-1 text-xs h-7 rounded border border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 text-gray-700 transition-colors"
              title="Dừng chuyển động"
            >
              ■ Dừng
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}
