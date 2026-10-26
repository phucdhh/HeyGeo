'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /**
   * The sketch JSON object (parsed from Geometer's Sketchpad .json
   * or from a Web Sketchpad -json.js file).
   */
  data: object;
}

/**
 * WSPViewer – renders a Geometer's Sketchpad / Web Sketchpad model
 * inside a sandboxed iframe that loads the WSP engine from /wsp/viewer.html.
 * Sketch data is passed to the iframe via postMessage.
 */
export default function WSPViewer({ data }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dataRef   = useRef(data);
  dataRef.current  = data;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendData = () => {
      iframe.contentWindow?.postMessage(
        { type: 'wsp-init', sketch: dataRef.current },
        '*',
      );
    };

    // When the iframe reports it's ready, send the sketch data
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'wsp-ready') sendData();
    };
    window.addEventListener('message', onMessage);

    // Also send on load in case message arrived before we listened
    iframe.addEventListener('load', sendData);

    // Ping in case the iframe already loaded before this effect ran
    iframe.contentWindow?.postMessage({ type: 'wsp-ping' }, '*');

    return () => {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', sendData);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="/wsp/viewer.html"
      className="w-full h-full border-0 rounded-xl bg-white"
      style={{ minHeight: 400 }}
      title="Web Sketchpad Viewer"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
