'use client';

import { useState, type ReactNode } from 'react';
import {
  MOVE_SPEEDS,
  MOVE_SPEED_LABELS,
  type MoveSpec,
  type MoveSpeed,
  type PresentSpec,
} from './actionButtonModel';
import { useDialogDismiss } from './useDialogDismiss';

/** The shared shell of the two Edit | Action Buttons dialogs. */
function DialogCard({
  title, hint, children, okLabel, ready, onConfirm, onCancel,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  okLabel: string;
  ready: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[26rem] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1">{title}</h2>
        <p className="text-xs text-gray-500 mb-3">{hint}</p>
        {children}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!ready}
            onClick={onConfirm}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              !ready
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MoveProps {
  onConfirm: (move: MoveSpec) => void;
  onCancel: () => void;
}

/**
 * Edit | Action Buttons | Movement… — the desktop's Movement dialog.
 *
 * Sketchpad asks two things: how fast the point travels, and whether it jumps
 * instead. The pairs of points the button will move come from the selection, so
 * the dialog only settles how the trip is made.
 */
export function MovementDialog({ onConfirm, onCancel }: MoveProps) {
  useDialogDismiss(onCancel);
  const [speed, setSpeed] = useState<MoveSpeed>('normal');

  const spec: MoveSpec = { destinations: [], speed };
  return (
    <DialogCard
      title="Nút di chuyển"
      hint="Mỗi điểm được chọn sẽ đi tới điểm kế tiếp, theo tốc độ này."
      okLabel="Tạo nút"
      ready
      onConfirm={() => onConfirm(spec)}
      onCancel={onCancel}
    >
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Tốc độ:
        <select
          value={speed}
          onChange={(e) => setSpeed(e.target.value as MoveSpeed)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(spec); }}
          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {MOVE_SPEEDS.map((s) => (
            <option key={s} value={s}>{MOVE_SPEED_LABELS[s]}</option>
          ))}
        </select>
      </label>
    </DialogCard>
  );
}

interface PresentProps {
  onConfirm: (present: PresentSpec) => void;
  onCancel: () => void;
}

/**
 * Edit | Action Buttons | Presentation… — the desktop's Presentation dialog.
 *
 * A sequence either presses its buttons one after another, holding each step so
 * the reader can see it, or presses them all together. The pause is that hold.
 */
export function PresentDialog({ onConfirm, onCancel }: PresentProps) {
  useDialogDismiss(onCancel);
  const [sequential, setSequential] = useState(true);
  const [pause, setPause] = useState(1);

  const problem = sequential && (!Number.isFinite(pause) || pause < 0)
    ? 'thời gian chờ phải từ 0 giây trở lên'
    : null;
  const spec: PresentSpec = { sequential, pause: sequential ? Math.max(0, pause) : 0 };
  return (
    <DialogCard
      title="Nút trình diễn"
      hint="Nhấn nút sẽ bấm lần lượt các nút đã chọn."
      okLabel="Tạo nút"
      ready={problem === null}
      onConfirm={() => onConfirm(spec)}
      onCancel={onCancel}
    >
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Cách trình diễn:
        <select
          value={sequential ? 'sequential' : 'simultaneous'}
          onChange={(e) => setSequential(e.target.value === 'sequential')}
          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="sequential">Lần lượt</option>
          <option value="simultaneous">Cùng lúc</option>
        </select>
      </label>

      {sequential && (
        <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
          Thời gian chờ:
          <input
            type="number"
            min={0}
            step={0.5}
            value={pause}
            onChange={(e) => setPause(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter' && problem === null) onConfirm(spec); }}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-xs text-gray-500">giây</span>
        </label>
      )}

      <p className="mt-2 h-5 text-xs text-gray-500">{problem ?? ''}</p>
    </DialogCard>
  );
}
