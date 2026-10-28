'use client';

interface Props {
  /** When the draft was last written, as a clock time for the designer. */
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

/** "Khôi phục bản nháp?" — the unsaved sketch found when the page opens. */
export default function RestoreDraftDialog({ savedAt, onRestore, onDiscard }: Props) {
  const when = new Date(savedAt).toLocaleString('vi-VN');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onDiscard(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[26rem] text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-3 text-brand-900">Khôi phục bản nháp?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Có một bản vẽ chưa lưu từ <strong className="text-gray-800">{when}</strong>.
          Khôi phục bản nháp này hay bỏ nó và mở bản đã lưu?
        </p>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            Bỏ bản nháp
          </button>
          <button
            type="button"
            autoFocus
            onClick={onRestore}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-2 hover:bg-brand-700 transition-colors"
          >
            Khôi phục
          </button>
        </div>
      </div>
    </div>
  );
}
