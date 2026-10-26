'use client';

/**
 * CindyJSViewer – renders a saved CindyJS model from its stored JS code.
 *
 * All user code runs inside a sandboxed <iframe> so that any DOM manipulation
 * (document.body.prepend, document.head.appendChild, etc.) is confined to the
 * iframe document and cannot affect the host page layout or styles.
 *
 * The iframe communicates back to the parent via postMessage:
 *   { type: 'heygeo-height', id, height }  – resize the iframe to fit content
 *   { type: 'heygeo-ready',  id, data }    – rendering done; data is canvas PNG or null
 */

import { useEffect, useRef, useState } from 'react';

const CINDY_CDN = 'https://cindyjs.org/dist/v0.8/Cindy.js';
const CINDY_CSS = 'https://cindyjs.org/dist/v0.8/CindyJS.css';

interface Props {
  code: string;
  /** Unique id suffix to avoid DOM id conflicts when multiple viewers exist. */
  idSuffix?: string;
  /**
   * Called once the iframe has rendered.  The argument is a function that
   * returns the canvas PNG data-URL, or null if no canvas is present.
   */
  onReady?: (captureThumb: () => string | null) => void;
}

/** Detect whether stored code is an HTML fragment or plain JS.
 * HTML mode: code starts with an HTML tag (possibly after whitespace/comments).
 * JS mode: anything else — even if the JS happens to contain template-literal HTML.
 */
function detectCodeMode(code: string): 'html' | 'js' {
  return /^\s*</.test(code) ? 'html' : 'js';
}

/** Build a full HTML document to run inside the sandboxed iframe. */
function buildSrcdoc(code: string, boardId: string): string {
  const isHtml = detectCodeMode(code) === 'html';

  const postMessageScript = `
  <script>
    (function(){
      var BOARDID = ${JSON.stringify(boardId)};
      setTimeout(function(){
        var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 300);
        window.parent.postMessage({type:'heygeo-height',id:BOARDID,height:h},'*');
      }, 400);
      setTimeout(function(){
        var canvas = document.querySelector('canvas');
        var dataUrl = null;
        if(canvas){ try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
        window.parent.postMessage({type:'heygeo-ready',id:BOARDID,data:dataUrl},'*');
      }, 1800);
    })();
  <\/script>`;

  const head = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${CINDY_CSS}">
  <style>html,body{margin:0;padding:0;}</style>
  <script>window.cindyDontWait=true;<\/script>
  <script src="${CINDY_CDN}"><\/script>
</head>
<body>`;

  if (isHtml) {
    // HTML mode: embed raw fragment — </script> tags must stay intact for the HTML parser.
    return `${head}\n${code}\n${postMessageScript}\n</body>\n</html>`;
  }

  // JS mode: escape </script> to prevent early termination of our injected <script> block.
  const safeCode = code.replace(/<\/script>/gi, '<\\/script>');
  return `${head}
  <div id="${boardId}"></div>
  <script>
    (function(){
      var BOARDID = ${JSON.stringify(boardId)};
      var CindyJS = window.CindyJS;
      try {
        ${safeCode}
      } catch(err) {
        var pre = document.createElement('pre');
        pre.style.cssText = 'color:red;padding:8px;white-space:pre-wrap;font-size:13px;';
        pre.textContent = String(err);
        document.body.prepend(pre);
      }
      // Report document height so the parent can resize the iframe.
      setTimeout(function(){
        var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 300);
        window.parent.postMessage({type:'heygeo-height',id:BOARDID,height:h},'*');
      }, 400);
      // Signal ready and optionally capture a canvas thumbnail.
      setTimeout(function(){
        var canvas = document.querySelector('canvas');
        var dataUrl = null;
        if(canvas){ try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
        window.parent.postMessage({type:'heygeo-ready',id:BOARDID,data:dataUrl},'*');
      }, 1800);
    })();
  <\/script>
</body>
</html>`;
}

export default function CindyJSViewer({ code, idSuffix = 'view', onReady }: Props) {
  const boardId = `heygeo-cindy-${idSuffix}`;
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; });

  const [iframeHeight, setIframeHeight] = useState(450);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const msg = ev.data as { type?: string; id?: string; height?: number; data?: string | null } | null;
      if (!msg || msg.id !== boardId) return;

      if (msg.type === 'heygeo-height' && typeof msg.height === 'number') {
        // Clamp to a sane range — prevents layout abuse via postMessage spoofing.
        setIframeHeight(Math.min(Math.max(msg.height, 300), 4000));
      }
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
      srcDoc={buildSrcdoc(code, boardId)}
      sandbox="allow-scripts"
      style={{ width: '100%', height: iframeHeight, border: 'none', display: 'block' }}
      title="CindyJS model"
    />
  );
}
