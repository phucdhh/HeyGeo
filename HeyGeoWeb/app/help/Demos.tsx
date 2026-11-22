'use client';

/**
 * Live figures for /help. Each one runs the same viewer component the share
 * page uses, so what a reader drags here is what a model really does.
 */

import { useEffect, useState } from 'react';
import JSXGraphViewer from '@/components/JSXGraphViewer';
import WSPViewer from '@/components/WSPViewer';
import CindyJSViewer from '@/components/CindyJSViewer';
import MathboxViewer from '@/components/MathboxViewer';
import {
  DESIGN_DOC_SAMPLE,
  JSXGRAPH_CODE_SAMPLE,
  CINDY_CODE_SAMPLE,
  MATHBOX_CODE_SAMPLE,
} from './samples';

function Frame({
  caption,
  hint,
  height,
  children,
}: {
  caption: string;
  hint: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <figure className="mt-4 mb-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <figcaption className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{caption}</span>
        <span className="flex-shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          {hint}
        </span>
      </figcaption>
      <div style={{ height }}>{children}</div>
    </figure>
  );
}

export function DemoHeyGeoDoc() {
  return (
    <Frame caption="HeyGeo Design · mô hình thật" hint="kéo A, B, C" height={380}>
      <div className="h-full w-full p-2">
        <JSXGraphViewer data={DESIGN_DOC_SAMPLE} containerId="help-demo-design" />
      </div>
    </Frame>
  );
}

export function DemoJsxGraphCode() {
  return (
    <Frame caption="JSXGraph Code Mode · mô hình thật" hint="kéo · cuộn" height={380}>
      <div className="h-full w-full p-2">
        <JSXGraphViewer
          data={{ version: '1.0', elements: [], codeMode: true, code: JSXGRAPH_CODE_SAMPLE }}
          containerId="help-demo-jxgcode"
        />
      </div>
    </Frame>
  );
}

export function DemoWebSketchpad() {
  const [sketch, setSketch] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/help/wsp-triangle.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((d) => { if (alive) setSketch(d); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  return (
    <Frame caption="Web Sketchpad · sketch thật" hint="kéo 3 đỉnh" height={470}>
      {failed && <p className="p-4 text-sm text-red-600">Không tải được sketch mẫu.</p>}
      {!failed && !sketch && <p className="p-4 text-sm text-gray-500">Đang tải sketch mẫu…</p>}
      {sketch && (
        <div className="h-full w-full">
          <WSPViewer data={sketch} />
        </div>
      )}
    </Frame>
  );
}

export function DemoCindy() {
  return (
    <Frame caption="CindyJS · mô hình thật" hint="kéo A, B, C" height={380}>
      <div className="h-full w-full overflow-auto bg-white">
        <CindyJSViewer code={CINDY_CODE_SAMPLE} idSuffix="help-cindy" />
      </div>
    </Frame>
  );
}

export function DemoMathbox() {
  return (
    <Frame caption="MathBox (WebGL) · mô hình thật" hint="kéo để xoay · cuộn để phóng" height={380}>
      <MathboxViewer code={MATHBOX_CODE_SAMPLE} idSuffix="help-mathbox" height={360} />
    </Frame>
  );
}
