'use client';

/**
 * HtmlStudio – the full-page editor behind /html.
 *
 * An authored HTML model has no HeyGeo object model to draw with, so the studio
 * is a code editor plus a preview of exactly what a visitor will see: the same
 * sandboxed iframe the viewer uses, which is why the run button reloads rather
 * than patches the frame.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import SaveModelDialog from '@/components/designer/SaveModelDialog';
import GeometryExpressionsViewer from '@/components/GeometryExpressionsViewer';
import HtmlCodeEditor, { type HtmlEditorHandle } from './HtmlCodeEditor';
import ThumbCaptureButton from './ThumbCaptureButton';
import { encodedBytes } from '@/lib/thumbCapture';
import { HTML_THUMB_SVG, type HtmlPageType } from '@/lib/htmlModel';

interface Props {
  modelId?: string;
  /** Carried through on save, so a Geometry Expressions export stays one. */
  pageType?: HtmlPageType;
  initialTitle?: string;
  initialDescription?: string;
  initialIsPublic?: boolean;
  /** The stored thumbnail, so the studio shows it and keeps it on every save. */
  initialThumbnail?: string | null;
  initialHtml: string;
}

export default function HtmlStudio({
  modelId,
  pageType = 'html',
  initialTitle,
  initialDescription = '',
  initialIsPublic = false,
  initialThumbnail = null,
  initialHtml,
}: Props) {
  const editorRef = useRef<HtmlEditorHandle | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [title,       setTitle]       = useState(initialTitle ?? 'Chưa đặt tên');
  const [description, setDescription] = useState(initialDescription);
  const [isPublic,    setIsPublic]    = useState(initialIsPublic);
  const [editingId,   setEditingId]   = useState<string | undefined>(modelId);
  const [isDirty,     setIsDirty]     = useState(false);

  const [preview, setPreview] = useState(initialHtml);
  const [runSeq,  setRunSeq]  = useState(0);
  const [code,    setCode]    = useState(initialHtml);
  // One thumbnail per row: either the placeholder or an image the author took.
  // Whatever is stored stays stored, so saving a page never discards a thumbnail
  // that another editor set.
  const [thumb, setThumb] = useState<{ dataUrl: string; isImage: boolean; width: number; height: number; bytes: number }>(() => {
    const stored = initialThumbnail ?? '';
    if (stored.startsWith('data:image/')) {
      return { dataUrl: stored, isImage: true, width: 0, height: 0, bytes: encodedBytes(stored) };
    }
    return { dataUrl: stored || HTML_THUMB_SVG, isImage: false, width: 0, height: 0, bytes: 0 };
  });
  const [thumbError, setThumbError] = useState('');
  const hasTyped = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [saveError,      setSaveError]      = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showSaveSuccess(msg: string) {
    setSaveSuccessMsg(msg);
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    saveSuccessTimer.current = setTimeout(() => setSaveSuccessMsg(''), 3000);
  }

  function run() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreview(editorRef.current?.getCode() ?? '');
    setRunSeq((n) => n + 1);
  }

  // ── Auto-run 1.2 s after the last keystroke, like the JSXGraph coder ──────
  useEffect(() => {
    if (!hasTyped.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function handleChange(next: string) {
    hasTyped.current = true;
    setCode(next);
    setIsDirty(true);
  }

  function handleSave() {
    if (editingId) doSave(title, description, isPublic, editingId);
    else setShowSaveDialog(true);
  }

  const doSave = useCallback(async (
    saveTitle: string,
    saveDesc: string,
    pub: boolean,
    updateId?: string,
  ) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const htmlContent = editorRef.current?.getCode() ?? '';
      const jsonData = { __type: pageType, htmlContent };

      const url    = updateId ? `/api/models/${updateId}` : '/api/models';
      const method = updateId ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        title: saveTitle,
        description: saveDesc,
        jsonData,
        isPublic: pub,
        thumbnailSvg: thumb.dataUrl,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setEditingId(json.model?.id ?? updateId ?? editingId);
      setTitle(saveTitle);
      setDescription(saveDesc);
      setIsPublic(pub);
      run();
      setIsDirty(false);
      setShowSaveDialog(false);
      showSaveSuccess('✓ Đã lưu mô hình');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, pageType, thumb]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900">
      {/* ── Title bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-950 text-white text-sm shrink-0 border-b border-gray-800 select-none">
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 font-bold tracking-tight text-amber-300 hover:text-amber-200 transition-colors mr-1"
        >
          <img src="/logo.svg" alt="HeyGeo" className="w-5 h-5 flex-shrink-0" />
          HeyGeo
        </a>

        <span className="text-gray-600">·</span>

        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
          className="bg-transparent text-white font-medium outline-none border-b border-transparent hover:border-gray-600 focus:border-amber-400 transition-colors px-1 min-w-0 w-48"
          maxLength={120}
        />

        <span className="text-gray-500 text-xs">{pageType === 'gx' ? 'Geometry Expressions' : 'HTML'}</span>

        {isDirty && <span className="text-gray-500 text-xs">●</span>}

        <div className="flex-1" />

        <span className="text-gray-600 text-xs hidden sm:inline">Tự chạy sau 1,2 giây · Ctrl+Enter để chạy ngay</span>

        <button
          onClick={run}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs font-semibold transition-colors"
          title="Chạy lại trang trong iframe sandbox"
        >
          ▶ Chạy
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
        >
          {isSaving ? '⏳ Đang lưu' : '💾 Lưu'}
        </button>

        <a
          href="/dashboard"
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs transition-colors"
        >
          ← Dashboard
        </a>
      </div>

      {/* ── Editor + preview ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="lg:w-1/2 flex flex-col min-h-0 border-r border-gray-800">
          <HtmlCodeEditor
            ref={editorRef}
            initialCode={initialHtml}
            onChange={handleChange}
            onRun={run}
            onSave={handleSave}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 bg-gray-800">
          <div className="h-full min-h-[400px] flex flex-col">
            <div className="flex items-center gap-2 flex-wrap pb-2">
              <ThumbCaptureButton
                targetRef={previewRef}
                onCapture={(dataUrl, meta) => {
                  setThumb({ dataUrl, isImage: true, ...meta });
                  setThumbError('');
                  setIsDirty(true);
                }}
                onError={setThumbError}
              />
              {thumb.isImage && (
                <img
                  src={thumb.dataUrl}
                  alt="Ảnh xem trước của mô hình"
                  data-testid="thumb-chip"
                  className="h-[38px] w-[68px] rounded border border-gray-700 object-cover bg-white"
                />
              )}
              <span className="text-[11px] text-gray-400">
                {thumb.isImage
                  ? `${thumb.width}×${thumb.height} · ${Math.round(thumb.bytes / 1024)} KB · thẻ mô hình dùng ảnh này`
                  : 'Thẻ mô hình đang dùng ảnh mặc định HTML'}
              </span>
              {thumbError && <span className="text-[11px] text-red-400">{thumbError}</span>}
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              Ngừng gõ 1,2 giây là trang chạy lại trong iframe sandbox — ▶ Chạy để chạy ngay.
              iframe này không có quyền truy cập HeyGeo của bạn, nên trang phải tự kéo thư viện từ CDN (three.js, JSXGraph…).
            </p>
            <div ref={previewRef} className="flex-1 min-h-[400px] rounded-xl overflow-hidden bg-white">
              <GeometryExpressionsViewer
                key={runSeq}
                htmlContent={preview}
                label={`${pageType === 'gx' ? 'Geometry Expressions' : 'HTML'} preview`}
              />
            </div>
          </div>
        </div>
      </div>

      {showSaveDialog && (
        <SaveModelDialog
          initialTitle={title}
          initialDesc={description}
          initialPublic={isPublic}
          isSaving={isSaving}
          onSave={(t, d, pub) => doSave(t, d, pub)}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {saveError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-5 py-2 rounded-lg shadow-lg z-50">
          Lỗi: {saveError}
          <button className="ml-3 underline" onClick={() => setSaveError('')}>Đóng</button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-700 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl z-50">
          <span>{saveSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
