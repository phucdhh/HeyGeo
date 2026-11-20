/**
 * MathBox engine – self-hosted, no CDN.
 *
 * MathBox UMD (public/vendor/mathbox/mathbox.min.js) sets window.MathBox but
 * takes window.THREE as an external, so three.min.js + OrbitControls.js must
 * load first. See scripts/sync-mathbox-vendor.js for how the files get there.
 *
 * User code runs inside a sandboxed iframe (WebGL + own DOM), like CindyJS on
 * /cindy. The iframe scope injects:
 *   - BOARDID : id of the mount <div> (string)
 *   - element : the mount <div> itself
 *   - MathBox / THREE : engine globals
 * The iframe reports back via postMessage:
 *   panel : {type:'heygeo-mathbox-thumb', data}   – data is null when the canvas is missing or blank
 *   viewer: {type:'heygeo-ready', id, data}   – data is canvas PNG data-URL or null
 * Both modes also post {type:'heygeo-mathbox-error', message} on runtime errors.
 * The canvas is transparent (no page or body background) so the host surface shows
 * through; user code must ask for it via renderer.parameters.alpha, and threestrap's
 * preserveDrawingBuffer:true is what makes the thumbnail toDataURL work.
 */

const VENDOR = '/vendor/mathbox';

export interface MathboxSrcdocOpts {
  /** id of the mount div inside the iframe */
  boardId: string;
  /** 'panel' = editor preview (fills iframe), 'viewer' = share/detail embed */
  mode: 'panel' | 'viewer';
  /** mount div height in px – only used in viewer mode */
  height?: number;
}

/**
 * Build the full HTML document used as the sandboxed iframe's srcDoc, both
 * for the live editor preview and for share/detail viewers.
 */
export function buildMathboxSrcdoc(code: string, opts: MathboxSrcdocOpts): string {
  const { boardId, mode, height = 500 } = opts;

  // Escape </script> (and <!--, which can switch the parser into the script-data
  // double-escaped state) so user code cannot break out of our injected <script> block.
  const safeCode = code
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');

  const mountStyle = mode === 'panel'
    ? `position:absolute;inset:0;`
    : `width:100%;height:${height}px;position:relative;overflow:hidden;`;

  const thumbScript = mode === 'panel'
    ? `window.parent.postMessage({type:'heygeo-mathbox-thumb',data:dataUrl},'*');`
    : `window.parent.postMessage({type:'heygeo-ready',id:BOARDID,data:dataUrl},'*');`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${VENDOR}/mathbox.css">
  <style>
    html,body{margin:0;padding:0;background:transparent;height:100%;}
    #${boardId}{${mountStyle}}
    #${boardId} canvas{display:block;}
  </style>
  <script src="${VENDOR}/three.min.js"><\/script>
  <script src="${VENDOR}/OrbitControls.js"><\/script>
  <script src="${VENDOR}/mathbox.min.js"><\/script>
</head>
<body>
  <div id="${boardId}"></div>
  <script>
    (function(){
      var BOARDID = ${JSON.stringify(boardId)};
      var element = document.getElementById(BOARDID);
      var MathBox = window.MathBox;
      var THREE = window.THREE;

      function reportError(msg) {
        try { window.parent.postMessage({type:'heygeo-mathbox-error',message:String(msg)},'*'); } catch(e){}
      }
      window.addEventListener('error', function(ev){ reportError(ev.message); });
      window.addEventListener('unhandledrejection', function(ev){
        reportError(ev.reason && ev.reason.message ? ev.reason.message : ev.reason);
      });

      try {
        ${safeCode}
      } catch(err) {
        var pre = document.createElement('pre');
        pre.style.cssText = 'color:#ff6b6b;background:#1a1e23;padding:8px;white-space:pre-wrap;font-size:13px;margin:0;';
        pre.textContent = String(err);
        document.body.prepend(pre);
        reportError(err);
      }

      // A uniform (empty / single-colour) canvas makes a useless thumbnail.
      function isBlank(canvas) {
        try {
          var s = document.createElement('canvas');
          s.width = s.height = 32;
          var c = s.getContext('2d');
          c.drawImage(canvas, 0, 0, 32, 32);
          var d = c.getImageData(0, 0, 32, 32).data;
          for (var i = 4; i < d.length; i += 4) {
            if (Math.abs(d[i]-d[0]) > 2 || Math.abs(d[i+1]-d[1]) > 2 ||
                Math.abs(d[i+2]-d[2]) > 2 || Math.abs(d[i+3]-d[3]) > 2) return false;
          }
          return true;
        } catch(e) { return false; }
      }

      // Heavy scenes may not have drawn at 1.8 s, so retry once before giving up.
      function capture(isLast) {
        var canvas = document.querySelector('canvas');
        var dataUrl = null;
        if (canvas && !isBlank(canvas)) { try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
        if (dataUrl || isLast) {
          ${thumbScript}
        } else {
          setTimeout(function(){ capture(true); }, 1700);
        }
      }
      setTimeout(function(){ capture(false); }, 1800);
    })();
  <\/script>
</body>
</html>`;
}
