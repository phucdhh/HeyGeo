'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { detectIs3D } from '@/components/GeoGebraViewer';
import '@/lib/i18n';

type ModelType = 'heygeo' | 'sketchpad' | 'wsp' | 'geogebra' | 'gx';

const FILE_TYPES: { value: ModelType; accept: string; icon: string }[] = [
  { value: 'heygeo',    accept: '.json,application/json',     icon: '📐' },
  { value: 'sketchpad', accept: '.json,application/json',     icon: '📏' },
  { value: 'wsp',       accept: '.js,application/javascript', icon: '🌐' },
  { value: 'geogebra',  accept: '.ggb',                       icon: '🔷' },
  { value: 'gx',        accept: '.html,text/html',            icon: '📊' },
];

// Parse a -json.js file: "var varname = { ... };" → extract the JSON object
function parseWspJs(text: string, errorMsg: string): object {
  const m = text.match(/^(?:var\s+\w+\s*=\s*)([\s\S]+?)(?:;?\s*)$/);
  if (!m) throw new Error(errorMsg);
  return JSON.parse(m[1]);
}

// Static placeholder thumbnails for GeoGebra models (used until a real screenshot is captured)
const GEOGEBRA_2D_THUMB_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#f0fdf4"/><line x1="18" y1="62" x2="186" y2="62" stroke="#bbf7d0" stroke-width="2"/><line x1="103" y1="6" x2="103" y2="114" stroke="#bbf7d0" stroke-width="2"/><path d="M 22 108 Q 103 6 184 108" fill="none" stroke="#3b82f6" stroke-width="2.5"/><circle cx="103" cy="62" r="28" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="103" cy="62" r="4" fill="#ef4444"/><circle cx="131" cy="62" r="3" fill="#3b82f6"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#16a34a" font-family="sans-serif" font-weight="600">GeoGebra</text></svg>`;
const GEOGEBRA_3D_THUMB_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#eff6ff"/><polygon points="100,12 168,52 100,92 32,52" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="100" y1="12" x2="100" y2="92" stroke="#93c5fd" stroke-width="1.5"/><line x1="32" y1="52" x2="168" y2="52" stroke="#93c5fd" stroke-width="1.5"/><polygon points="100,12 168,52 100,108" fill="#dbeafe" fill-opacity="0.6" stroke="#2563eb" stroke-width="1.5"/><polygon points="100,12 32,52 100,108" fill="#bfdbfe" fill-opacity="0.5" stroke="#2563eb" stroke-width="1.5"/><circle cx="100" cy="108" r="3" fill="#1d4ed8"/><circle cx="100" cy="12" r="3" fill="#1d4ed8"/><text x="100" y="118" text-anchor="middle" font-size="9" fill="#1d4ed8" font-family="sans-serif" font-weight="600">GeoGebra 3D</text></svg>`;
const GX_THUMB_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#fefce8"/><line x1="18" y1="62" x2="186" y2="62" stroke="#fef08a" stroke-width="2"/><line x1="100" y1="6" x2="100" y2="114" stroke="#fef08a" stroke-width="2"/><circle cx="100" cy="62" r="36" fill="none" stroke="#f59e0b" stroke-width="2"/><line x1="64" y1="26" x2="136" y2="98" stroke="#d97706" stroke-width="1.5"/><circle cx="64" cy="26" r="3.5" fill="#b45309"/><circle cx="136" cy="98" r="3.5" fill="#b45309"/><circle cx="100" cy="62" r="3.5" fill="#b45309"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#b45309" font-family="sans-serif" font-weight="600">Geometry Expressions</text></svg>`;

export default function NewModelPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [modelType, setModelType] = useState<ModelType>('heygeo');
  const [form, setForm]           = useState({ title: '', description: '', guide: '' });
  const [jsonData, setJsonData]   = useState<object | null>(null);
  const [thumbnailSvg, setThumbnailSvg] = useState<string | null>(null);
  const [fileName, setFileName]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const currentType = FILE_TYPES.find((ft) => ft.value === modelType)!;
  const currentLabel = t(`upload.type_${modelType}_label` as Parameters<typeof t>[0]);
  const currentHint  = t(`upload.type_${modelType}_hint`  as Parameters<typeof t>[0]);

  const handleTypeChange = (type: ModelType) => {
    setModelType(type);
    setJsonData(null);
    setThumbnailSvg(null);
    setFileName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setError('');

    if (modelType === 'gx') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        // Auto-extract title from <title> or <h1> tag
        if (!form.title) {
          const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
          const h1Match = text.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          const autoTitle = (titleMatch?.[1] ?? h1Match?.[1] ?? '').trim();
          if (autoTitle) setForm((f) => ({ ...f, title: autoTitle }));
        }
        setJsonData({ __type: 'gx', htmlContent: text });
        setThumbnailSvg(GX_THUMB_SVG);
      };
      reader.readAsText(file);
      return;
    }

    if (modelType === 'geogebra') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const b64 = dataUrl.split(',')[1];
        const is3d = detectIs3D(b64);
        setJsonData({ __type: 'geogebra', base64: b64, is3d });
        // Provide a static thumbnail so galleries show something meaningful
        // rather than the generic 📐 emoji while a real screenshot is not yet available.
        setThumbnailSvg(is3d ? GEOGEBRA_3D_THUMB_SVG : GEOGEBRA_2D_THUMB_SVG);
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        let parsed: object;
        if (modelType === 'wsp') {
          const inner = parseWspJs(text, t('upload.error_bad_wsp'));
          parsed = { __type: 'wsp', data: inner };
        } else {
          const raw = JSON.parse(text);
          if (modelType === 'sketchpad') {
            parsed = { __type: 'sketchpad', data: raw };
          } else if (modelType === 'heygeo') {
            parsed = { ...raw, __type: 'heygeo' };
          } else {
            parsed = raw;
          }
        }
        setJsonData(parsed);
        if (!form.title) {
          const rec = parsed as Record<string, unknown>;
          const inner = (rec.data as Record<string, unknown>) ?? rec;
          const autoTitle =
            (inner?.title as string) ??
            ((inner?.metadata as Record<string, unknown>)?.['original-document-name'] as string) ??
            '';
          if (autoTitle) setForm((f) => ({ ...f, title: autoTitle }));
        }
      } catch (e) {
        setError(t('upload.error_read', { msg: (e as Error).message }));
        setJsonData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonData) { setError(t('upload.error_no_file')); return; }
    if (!form.title.trim()) { setError(t('upload.error_no_title')); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, jsonData, ...(thumbnailSvg ? { thumbnailSvg } : {}) }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t('upload.error_failed'));
      return;
    }

    router.push(`/models/${data.model.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{t('upload.title')}</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('upload.file_type')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FILE_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => handleTypeChange(ft.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                  modelType === ft.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{ft.icon}</span>
                <span className="leading-tight">{t(`upload.type_${ft.value}_label` as Parameters<typeof t>[0])}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File drop zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {currentLabel} <span className="text-red-500">*</span>
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-brand-500 hover:bg-brand-50 transition-colors"
          >
            <input
              ref={fileRef}
              type="file"
              accept={currentType.accept}
              className="hidden"
              onChange={handleFile}
            />
            {fileName ? (
              <div>
                <div className="text-3xl mb-2">✅</div>
                <p className="font-medium text-gray-700">{fileName}</p>
                <p className="text-xs text-gray-400 mt-1">{t('upload.file_change_hint')}</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">{currentType.icon}</div>
                <p className="font-medium text-gray-700">{t('upload.drop_hint')}</p>
                <p className="text-sm text-gray-400 mt-1">{currentHint}</p>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('upload.title_label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="input-field"
            placeholder={t('upload.title_placeholder')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('upload.description_label')}</label>
          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder={t('upload.description_placeholder')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Guide */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('upload.guide_label')}
            <span className="ml-2 text-xs text-gray-400">{t('upload.guide_hint')}</span>
          </label>
          <textarea
            rows={5}
            className="input-field resize-none"
            placeholder={t('upload.guide_placeholder')}
            value={form.guide}
            onChange={(e) => setForm({ ...form, guide: e.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('upload.submitting') : t('upload.submit')}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            {t('upload.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
