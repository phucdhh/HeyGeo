'use client';

import Script from 'next/script';
import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { detectIs3D } from '@/components/GeoGebraViewer';

const CONTAINER_ID = 'ggb-editor';

function GeoGebraEditor() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get('id');
  const injected = useRef(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const inject = async () => {
    if (typeof window === 'undefined' || !window.GGBApplet) return;
    if (injected.current) return;
    injected.current = true;

    let ggbBase64: string | undefined;
    if (modelId) {
      try {
        const res = await fetch(`/api/models/${encodeURIComponent(modelId)}`);
        if (res.ok) {
          const { model } = await res.json() as { model: { jsonData: unknown } };
          const rec = model?.jsonData as Record<string, unknown> | null;
          if (rec?.__type === 'geogebra' && typeof rec.base64 === 'string') {
            ggbBase64 = rec.base64;
          }
        }
      } catch {
        // fall through — open blank document
      }
    }

    const params: Record<string, unknown> = {
      appName: 'classic',
      width: window.innerWidth,
      height: window.innerHeight,
      showToolBar: true,
      showMenuBar: true,
      showAlgebraInput: true,
      showResetIcon: false,
      enableLabelDrags: true,
      enableShiftDragZoom: true,
      enableRightClick: true,
      useBrowserForJS: false,
      allowStyleBar: true,
      preventFocus: false,
      language: 'vi',
    };
    if (ggbBase64) params.ggbBase64 = ggbBase64;

    const applet = new window.GGBApplet(params, CONTAINER_ID);
    applet.inject(CONTAINER_ID);
  };

  const handleSave = () => {
    if (!modelId) return;
    const ggbApplet = (window as unknown as Record<string, unknown>).ggbApplet as {
      getBase64: (thumb: boolean, cb: (b64: string) => void) => void;
      getPNGBase64: (scale: number, transparent: boolean, dpi: number) => string;
    } | undefined;
    if (!ggbApplet) { setSaving('error'); setTimeout(() => setSaving('idle'), 3000); return; }
    setSaving('saving');
    ggbApplet.getBase64(false, async (base64: string) => {
      try {
        // Capture a real thumbnail while we have the applet
        let thumbnailSvg: string | undefined;
        try {
          const png = ggbApplet.getPNGBase64(1, false, 72);
          if (png) thumbnailSvg = `data:image/png;base64,${png}`;
        } catch { /* thumbnail capture failed — skip */ }

        const body: Record<string, unknown> = { jsonData: { __type: 'geogebra', base64, is3d: detectIs3D(base64) } };
        if (thumbnailSvg) body.thumbnailSvg = thumbnailSvg;

        const res = await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setSaving(res.ok ? 'saved' : 'error');
      } catch {
        setSaving('error');
      } finally {
        setTimeout(() => setSaving('idle'), 2500);
      }
    });
  };

  const btnLabel = saving === 'saving' ? 'Đang lưu…' : saving === 'saved' ? '✓ Đã lưu' : saving === 'error' ? 'Lỗi!' : '💾 Lưu vào HeyGeo';

  return (
    <>
      <Script
        src="https://cdn.geogebra.org/apps/deployggb.js"
        strategy="afterInteractive"
        onLoad={inject}
      />
      <div id={CONTAINER_ID} style={{ width: '100vw', height: '100vh' }} />
      {modelId && (
        <div style={{ position: 'fixed', bottom: 120, right: 12, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving === 'saving'}
            style={{
              background: saving === 'saved' ? '#16a34a' : saving === 'error' ? '#dc2626' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 13, cursor: saving === 'saving' ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
            }}
          >
            {btnLabel}
          </button>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{
              background: '#6b7280',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
            }}
          >
            ⬅ Dashboard
          </button>
        </div>
      )}
    </>
  );
}

export default function GeoGebraPage() {
  return (
    <Suspense>
      <GeoGebraEditor />
    </Suspense>
  );
}
