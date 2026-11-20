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
 * Runs inside the iframe before user code. MathBox keeps its data (matrix, array,
 * interval, labels…) in float textures read by vertex shaders, and uploads them as
 * RGB/FLOAT for 3-channel data. Some in-app WebViews (seen in Zalo) accept that
 * upload but read back zeros, so only the shader-drawn axes show up. This probes the
 * real round trip; if RGB fails but RGBA works it widens RGB float uploads to RGBA,
 * otherwise it shows a notice. Probe details go to the parent as 'heygeo-mathbox-compat'.
 */
const COMPAT_SCRIPT = `
      (function(){
        var info = {};
        function probe(gl, channels) {
          var tex = gl.createTexture();
          var vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER), prog = gl.createProgram();
          try {
            gl.shaderSource(vs, 'uniform sampler2D t; varying vec4 v; void main(){ v = texture2D(t, vec2(0.5)); gl_Position = vec4(0.0,0.0,0.0,1.0); gl_PointSize = 1.0; }');
            gl.shaderSource(fs, 'precision mediump float; varying vec4 v; void main(){ gl_FragColor = vec4(v.rgb, 1.0); }');
            gl.compileShader(vs); gl.compileShader(fs);
            gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
            gl.useProgram(prog);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            var fmt = channels === 3 ? gl.RGB : gl.RGBA;
            var data = new Float32Array(channels === 3 ? [0.25, 0.5, 0.75] : [0.25, 0.5, 0.75, 1]);
            gl.texImage2D(gl.TEXTURE_2D, 0, fmt, 1, 1, 0, fmt, gl.FLOAT, data);
            gl.viewport(0, 0, 1, 1);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, 1);
            var px = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            return Math.abs(px[0]-64) < 8 && Math.abs(px[1]-128) < 8 && Math.abs(px[2]-191) < 8;
          } catch(e) { return false; }
          finally { gl.deleteTexture(tex); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); }
        }

        function widenRgbFloatUploads() {
          var P = window.WebGLRenderingContext.prototype;
          var origImage = P.texImage2D, origSub = P.texSubImage2D;
          function widen(w, h, src) {
            var n = w * h, out = new Float32Array(n * 4);
            for (var i = 0; i < n; i++) {
              out[4*i] = src[3*i]; out[4*i+1] = src[3*i+1]; out[4*i+2] = src[3*i+2]; out[4*i+3] = 1;
            }
            return out;
          }
          P.texImage2D = function(target, level, ifmt, w, h, border, fmt, type, data) {
            if (arguments.length === 9 && fmt === this.RGB && type === this.FLOAT) {
              return origImage.call(this, target, level, this.RGBA, w, h, border, this.RGBA, type, data ? widen(w, h, data) : data);
            }
            return origImage.apply(this, arguments);
          };
          P.texSubImage2D = function(target, level, x, y, w, h, fmt, type, data) {
            if (arguments.length === 9 && fmt === this.RGB && type === this.FLOAT) {
              return origSub.call(this, target, level, x, y, w, h, this.RGBA, type, widen(w, h, data));
            }
            return origSub.apply(this, arguments);
          };
        }

        function notice(text) {
          var d = document.createElement('div');
          d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:5;padding:8px 10px;background:#fef3c7;color:#92400e;font:12px/1.4 system-ui,sans-serif;';
          d.textContent = text;
          document.body.appendChild(d);
        }

        try {
          var c = document.createElement('canvas');
          c.width = c.height = 1;
          var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
          if (!gl) {
            info.webgl = false;
            notice('Trình duyệt này không hỗ trợ WebGL, không thể hiển thị mô hình 3D. Hãy mở liên kết bằng Chrome hoặc Safari. / WebGL is unavailable here – please open this link in Chrome or Safari.');
          } else {
            info.float = !!gl.getExtension('OES_texture_float');
            info.vtf = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
            if (info.float && info.vtf > 0) {
              info.rgb = probe(gl, 3);
              info.rgba = probe(gl, 4);
            }
            if (window.__heygeoForceWiden || (info.rgb === false && info.rgba === true)) {
              widenRgbFloatUploads();
              info.widened = true;
            } else if (!info.float || !info.vtf || info.rgba === false) {
              notice('Trình duyệt này không hỗ trợ texture số thực nên mô hình 3D có thể không hiển thị đầy đủ. Hãy mở liên kết bằng Chrome hoặc Safari. / Float textures are unavailable here – open this link in Chrome or Safari. [' + JSON.stringify(info) + ']');
            }
          }
        } catch(e) { info.error = String(e); }
        try { window.parent.postMessage({type:'heygeo-mathbox-compat',info:info},'*'); } catch(e){}
      })();
`;

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
${COMPAT_SCRIPT}

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
