'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import JSXGraphViewer from '@/components/JSXGraphViewer';
import WSPViewer from '@/components/WSPViewer';
import GeoGebraViewer, { type GGBApi, detectIs3D } from '@/components/GeoGebraViewer';
import GeometryExpressionsViewer from '@/components/GeometryExpressionsViewer';
import CindyJSViewer from '@/components/CindyJSViewer';
import LatexEditor from '@/components/LatexEditor';
import LatexRenderer from '@/components/LatexRenderer';

const MATH_CATEGORIES = [
  'Số học', 'Đại số', 'Hình học phẳng', 'Hình học không gian',
  'Giải tích', 'Lượng giác', 'Thống kê', 'Xác suất', 'Trò chơi',
];

const TOOL_CATEGORIES_SET = new Set([
  'HeyGeo', 'JSXGraph', 'CindyJS', 'GeoGebra', 'Sketchpad', 'Web Sketchpad', 'Geometry Expressions',
]);

function toolLabelFromType(rec: Record<string, unknown>): string | null {
  const type = rec.__type;
  if (!type) {
    return rec.codeMode === true ? 'JSXGraph' : 'HeyGeo';
  }
  switch (type) {
    case 'heygeo':    return 'HeyGeo';
    case 'jsxgraph':  return 'JSXGraph';
    case 'sketchpad':
    case 'gsp':       return 'Sketchpad';
    case 'wsp':       return 'Web Sketchpad';
    case 'geogebra':  return 'GeoGebra';
    case 'cindyjs':
    case 'cindy':     return 'CindyJS';
    case 'gx':        return 'Geometry Expressions';
    default:          return null;
  }
}

function ModelViewer({ data, onGgbReady, onCindyReady }: { data: object; onGgbReady?: (api: GGBApi) => void; onCindyReady?: (captureThumb: () => string | null) => void }) {
  const rec = data as Record<string, unknown>;
  if (rec.__type === 'sketchpad' || rec.__type === 'wsp') {
    return <WSPViewer data={(rec.data as object) ?? {}} />;
  }
  if (rec.__type === 'geogebra') {
    return <GeoGebraViewer base64={rec.base64 as string} is3d={rec.is3d as boolean | undefined} onReady={onGgbReady} />;
  }
  if (rec.__type === 'gx') {
    return <GeometryExpressionsViewer htmlContent={rec.htmlContent as string} />;
  }
  if (rec.__type === 'cindy') {
    return <CindyJSViewer code={rec.code as string} idSuffix="detail" onReady={onCindyReady} />;
  }
  return <JSXGraphViewer data={data as Parameters<typeof JSXGraphViewer>[0]['data']} />;
}

interface ModelData {
  id: string;
  title: string;
  description: string;
  guide: string;
  jsonData: object;
  isPublic: boolean;
  shareToken?: string;
  viewCount: number;
  updatedAt: Date;
  categories: string[];
  thumbnailSvg?: string | null;
}

interface Props {
  model: ModelData;
  shareUrl: string | null;
}

export default function ModelDetailClient({ model: initial, shareUrl: initialShareUrl }: Props) {
  const router = useRouter();
  const [model, setModel]        = useState(initial);
  const [shareUrl, setShareUrl]  = useState(initialShareUrl);
  const [editing, setEditing]    = useState(false);
  const [draft, setDraft]        = useState({ title: model.title, description: model.description, guide: model.guide, categories: model.categories });
  const [saving, setSaving]      = useState(false);
  const [copying, setCopying]       = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [replacing, setReplacing]   = useState(false);
  const [error, setError]           = useState('');
  const [panelOpen, setPanelOpen]   = useState(true);
  const replaceFileRef    = useRef<HTMLInputElement>(null);
  const replaceJsonRef    = useRef<HTMLInputElement>(null);

  const isGx = (model.jsonData as Record<string, unknown>).__type === 'gx';
  const autoToolCategory = toolLabelFromType(model.jsonData as Record<string, unknown>);
  const isHeyGeo = autoToolCategory === 'HeyGeo';

  const downloadGx = () => {
    const rec = model.jsonData as Record<string, unknown>;
    const html = rec.htmlContent as string;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.title.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    setError('');
    const text = await file.text();
    const newJsonData = { __type: 'gx', htmlContent: text };
    const res = await fetch(`/api/models/${model.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonData: newJsonData }),
    });
    const data = await res.json();
    setReplacing(false);
    if (!res.ok) { setError(data.error ?? 'Lỗi khi thay thế file'); return; }
    setModel((m) => ({ ...m, jsonData: newJsonData }));
    if (replaceFileRef.current) replaceFileRef.current.value = '';
  };

  const handleReplaceJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    setError('');
    try {
      const text = await file.text();
      const newJsonData = JSON.parse(text);
      const res = await fetch(`/api/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonData: newJsonData }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi khi thay thế JSON'); return; }
      setModel((m) => ({ ...m, jsonData: newJsonData }));
    } catch {
      setError('File JSON không hợp lệ');
    } finally {
      setReplacing(false);
      if (replaceJsonRef.current) replaceJsonRef.current.value = '';
    }
  };

  // Called once when the GeoGebra applet finishes loading.
  // 1. Captures a real PNG thumbnail if one hasn't been stored yet.
  // 2. Corrects is3d in the DB: old models may have is3d===false (incorrect
  //    result from the old head-only scan).  Re-detect and persist the truth.
  const handleGgbReady = (api: GGBApi) => {
    const rec = model.jsonData as Record<string, unknown>;
    // is3d needs correction if it was never set OR was stored as false (old bug)
    const is3dNeedsUpdate = rec.__type === 'geogebra' && rec.is3d !== true;
    const needsThumbnail = !model.thumbnailSvg;

    if (!needsThumbnail && !is3dNeedsUpdate) return;

    const updates: Record<string, unknown> = {};

    // Capture real PNG thumbnail
    if (needsThumbnail) {
      try {
        const png = api.getPNGBase64(1, false, 72);
        if (png) updates.thumbnailSvg = `data:image/png;base64,${png}`;
      } catch { /* thumbnail capture not available */ }
    }

    // Re-detect is3d with the corrected scanner and persist it
    if (is3dNeedsUpdate) {
      const detectedIs3d = detectIs3D(rec.base64 as string);
      // Only write back if the value actually changed (avoid unnecessary PUTs)
      if (detectedIs3d !== rec.is3d) {
        updates.jsonData = { ...rec, is3d: detectedIs3d };
      }
    }

    if (Object.keys(updates).length === 0) return;

    fetch(`/api/models/${model.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});

    if (updates.thumbnailSvg) {
      setModel((m) => ({ ...m, thumbnailSvg: updates.thumbnailSvg as string }));
    }
  };

  // Called once after CindyJS renders its first frame.
  // Captures the canvas as a PNG thumbnail and saves it if not already stored.
  const handleCindyReady = (captureThumb: () => string | null) => {
    if (model.thumbnailSvg) return;   // already have one
    const dataUrl = captureThumb();
    if (!dataUrl) return;
    fetch(`/api/models/${model.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnailSvg: dataUrl }),
    }).catch(() => {});
    setModel((m) => ({ ...m, thumbnailSvg: dataUrl }));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/models/${model.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Lỗi khi lưu'); return; }
    setModel((m) => ({ ...m, ...draft }));
    setEditing(false);
  };

  const togglePublic = async () => {
    const res = await fetch(`/api/models/${model.id}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Lỗi'); return; }
    setModel((m) => ({ ...m, isPublic: data.model.isPublic }));
    setShareUrl(data.shareUrl ?? null);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const deleteModel = async () => {
    if (!confirm('Bạn có chắc muốn xoá mô hình này không?')) return;
    setDeleting(true);
    await fetch(`/api/models/${model.id}`, { method: 'DELETE' });
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        {editing ? (
          <input
            className="input-field text-sm py-1.5 !max-w-xs"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        ) : (
          <h1 className="font-semibold text-gray-900">{model.title}</h1>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Public/Private toggle */}
          <button
            onClick={togglePublic}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              model.isPublic
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {model.isPublic ? '🌐 Công khai' : '🔒 Riêng tư'}
          </button>

          {/* Copy share link */}
          {model.isPublic && shareUrl && (
            <button onClick={copyLink} className="btn-secondary !py-1.5 !text-xs">
              {copying ? '✓ Đã sao chép!' : '🔗 Sao chép link'}
            </button>
          )}

          {/* HeyGeo-only: replace JSON */}
          {isHeyGeo && !editing && (
            <>
              <button
                onClick={() => replaceJsonRef.current?.click()}
                disabled={replacing}
                className="btn-secondary !py-1.5 !text-xs"
              >
                {replacing ? 'Đang thay thế…' : '🔄 Thay thế JSON'}
              </button>
              <input
                ref={replaceJsonRef}
                type="file"
                accept=".heyjson,.json,application/json"
                className="hidden"
                onChange={handleReplaceJson}
              />
            </>
          )}

          {/* GX-only: download + replace */}
          {isGx && !editing && (
            <>
              <button onClick={downloadGx} className="btn-secondary !py-1.5 !text-xs">
                📥 Tải xuống HTML
              </button>
              <button
                onClick={() => replaceFileRef.current?.click()}
                disabled={replacing}
                className="btn-secondary !py-1.5 !text-xs"
              >
                {replacing ? 'Đang thay thế…' : '🔄 Thay thế file'}
              </button>
              <input
                ref={replaceFileRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={handleReplaceFile}
              />
            </>
          )}

          {/* Edit / Save */}
          {editing ? (
            <>
              <button onClick={save} disabled={saving} className="btn-primary !py-1.5 !text-xs">
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button onClick={() => { setEditing(false); setDraft({ title: model.title, description: model.description, guide: model.guide, categories: model.categories }); }} className="btn-secondary !py-1.5 !text-xs">
                Huỷ
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary !py-1.5 !text-xs">
              ✏️ Chỉnh sửa
            </button>
          )}

          {/* Delete */}
          <button onClick={deleteModel} disabled={deleting} className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            🗑 Xoá
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Model viewer */}
        <div className="flex-1 p-4 overflow-auto">
          <ModelViewer data={model.jsonData} onGgbReady={handleGgbReady} onCindyReady={handleCindyReady} />
        </div>

        {/* Toggle tab – always visible, sits on the border between viewer and panel */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          title={panelOpen ? 'Thu nhỏ bảng thông tin' : 'Mở bảng thông tin'}
          className="absolute right-0 top-4 z-10 flex items-center justify-center w-6 h-10 bg-white border border-gray-200 border-r-0 rounded-l-md shadow-sm hover:bg-gray-50 transition-colors"
          style={{ right: panelOpen ? (editing ? '640px' : '320px') : '0px', transition: 'right 0.2s' }}
        >
          <span className="text-gray-500 text-xs select-none">{panelOpen ? '›' : '‹'}</span>
        </button>

        {/* Info panel – wider in edit mode to fit the two-column LaTeX editor */}
        <aside className={`${panelOpen ? (editing ? 'w-[640px]' : 'w-80') : 'w-0'} bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 transition-[width] duration-200 overflow-x-hidden`}>
          <div className={`p-5 ${panelOpen ? '' : 'hidden'}`}>
          {model.isPublic && shareUrl && (
            <div className="mb-5 p-3 rounded-lg bg-brand-50 border border-brand-200">
              <p className="text-xs font-medium text-brand-700 mb-1">Link chia sẻ</p>
              <p className="text-xs text-brand-600 break-all">{shareUrl}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Lượt xem</p>
            <p className="font-medium text-gray-700">{model.viewCount}</p>
          </div>

          {editing ? (
            <>
              <div className="mb-4">
                <LatexEditor
                  label="Mô tả"
                  value={draft.description}
                  onChange={(v) => setDraft({ ...draft, description: v })}
                  rows={4}
                  placeholder="Nhập mô tả mô hình…"
                />
              </div>
              <div className="mb-4">
                <LatexEditor
                  label="Hướng dẫn khảo sát"
                  value={draft.guide}
                  onChange={(v) => setDraft({ ...draft, guide: v })}
                  rows={8}
                  placeholder="Nhập hướng dẫn khảo sát…"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-indigo-600 block mb-2">Danh mục</label>
                {autoToolCategory && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Công cụ:</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{autoToolCategory}</span>
                    <span className="text-xs text-gray-400">(tự động)</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {MATH_CATEGORIES.map((cat) => {
                    const selected = draft.categories.filter((c) => !TOOL_CATEGORIES_SET.has(c)).includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const mathCats = draft.categories.filter((c) => !TOOL_CATEGORIES_SET.has(c));
                          setDraft({
                            ...draft,
                            categories: selected
                              ? mathCats.filter((c) => c !== cat)
                              : [...mathCats, cat],
                          });
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selected
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-xs font-bold text-indigo-600 block mb-1">Mô tả</label>
                {model.description ? (
                  <p className="text-sm text-gray-700">
                    <LatexRenderer>{model.description}</LatexRenderer>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có mô tả</p>
                )}
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-indigo-600 block mb-1">Hướng dẫn khảo sát</label>
                {model.guide ? (
                  <p className="text-sm text-gray-700">
                    <LatexRenderer>{model.guide}</LatexRenderer>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có hướng dẫn</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-indigo-600 block mb-1">Danh mục</label>
                {model.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {model.categories.map((cat) => (
                      <span key={cat} className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa phân loại</p>
                )}
              </div>
            </>
          )}          </div>        </aside>
      </div>
    </div>
  );
}
