'use client';

/**
 * MathboxViewer – renders a saved MathBox model from its stored JS code.
 *
 * All user code runs inside a sandboxed <iframe> (WebGL + own DOM) so it
 * cannot affect the host page. The iframe communicates back via postMessage:
 *   { type: 'heygeo-ready', id, data }  – rendering done; data is canvas PNG or null
 *
 * The srcDoc is built by the shared lib/mathbox builder so the editor preview
 * and this viewer load the engine identically.
 */

import { useEffect, useRef, useState } from 'react';
import { buildMathboxSrcdoc } from '@/lib/mathbox';

interface Props {
  code: string;
  /** Unique id suffix to avoid DOM id conflicts when multiple viewers exist. */
  idSuffix?: string;
  /** Iframe height in px (WebGL canvas needs an explicit size). */
  height?: number;
  /**
   * Called once the iframe has rendered.  The argument is a function that
   * returns the canvas PNG data-URL, or null if no canvas is present.
   */
  onReady?: (captureThumb: () => string | null) => void;
}

export default function MathboxViewer({ code, idSuffix = 'view', height = 500, onReady }: Props) {
  const boardId = `heygeo-mathbox-${idSuffix}`;
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [srcdoc] = useState(() => buildMathboxSrcdoc(code, { boardId, mode: 'viewer', height }));

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const msg = ev.data as { type?: string; id?: string; data?: string | null } | null;
      if (!msg || msg.id !== boardId) return;
      if (msg.type === 'heygeo-ready') {
        const dataUrl = msg.data ?? null;
        onReadyRef.current?.(() => dataUrl);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [boardId]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      style={{ width: '100%', height, border: 'none', display: 'block' }}
      title="MathBox model"
    />
  );
}
