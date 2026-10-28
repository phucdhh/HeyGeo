'use client';

/**
 * LocusDialog – Hiển thị khi người dùng chọn Construct → Locus...
 * Hướng dẫn cách tạo quỹ tích và hiển thị lỗi nếu chọn chưa đúng.
 */

import type { LocusResult } from './designTypes';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** Kết quả từ lần thử tạo locus (undefined = chưa thử) */
  result?: LocusResult;
  onRetry: () => void;
  onClose: () => void;
}

export default function LocusDialog({ result, onRetry, onClose }: Props) {
  useDialogDismiss(onClose);
  const errorMsg =
    !result ? null :
    !result.ok && result.reason === 'no_glider'
      ? 'Không tìm thấy điểm dẫn (glider). Hãy chọn một điểm nằm trên đường/tròn.'
    : !result.ok && result.reason === 'no_trace'
      ? 'Không tìm thấy điểm quỹ tích. Hãy chọn thêm một điểm (hoặc đường thẳng) phụ thuộc vào điểm dẫn.'
    : !result.ok && result.reason === 'need_2_items'
      ? 'Hãy chọn đúng 2 đối tượng: điểm dẫn (glider) và điểm/đường quỹ tích.'
    : !result.ok && result.reason === 'trace_failed'
      ? 'Không dựng được quỹ tích: điểm được chọn phải phụ thuộc vào điểm dẫn (midpoint, intersection, điểm trên đường nối tiếp…).'
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Quỹ tích (Locus)</h2>

        <div className="text-sm text-gray-600 leading-relaxed mb-4 space-y-2">
          <p>Để tạo quỹ tích, hãy chọn đúng 2 đối tượng rồi nhấn <strong>Tạo quỹ tích</strong>:</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5">1.</span>
              <span>
                <strong>Điểm dẫn</strong> – một điểm glider (điểm nằm trên đường/tròn)
                sẽ di chuyển để tạo ra quỹ tích.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-0.5">2.</span>
              <span>
                <strong>Điểm quỹ tích</strong> – điểm (hoặc đường thẳng) phụ thuộc vào
                điểm dẫn. Quỹ tích là tập hợp tất cả các vị trí của điểm này.
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Ví dụ: G là glider trên đường tròn, M là trung điểm của PG → quỹ tích của M
            khi G chạy trên đường tròn là một đường tròn khác.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-4">
            ⚠ {errorMsg}
          </div>
        )}

        {result?.ok && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 mb-4">
            ✓ Đã tạo quỹ tích thành công.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={onRetry}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-1.5 hover:bg-brand-700 transition-colors"
          >
            Tạo quỹ tích
          </button>
        </div>
      </div>
    </div>
  );
}
