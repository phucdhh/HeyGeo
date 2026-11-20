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
 * interval, labels…) in float textures read by vertex shaders. Some in-app WebViews
 * (seen in Zalo) either read zeros back from RGB/FLOAT uploads or expose no
 * OES_texture_float at all, so only the shader-drawn axes show up. This probes the
 * real upload/readback round trip and patches the texture uploads to fit:
 *   - RGB float broken, RGBA float fine -> widen RGB uploads to RGBA
 *   - no float textures, half float fine -> upload every float texture as RGBA half float
 *   - neither works -> show a notice
 * Probe details go to the parent as 'heygeo-mathbox-compat'.
 */
const COMPAT_SCRIPT = `
      (function(){
        var info = {};
        var HALF = 0x8D61; // HALF_FLOAT_OES

        var f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
        function toHalf(v) {
          f32[0] = v;
          var x = u32[0], sign = (x >>> 16) & 0x8000, e = (x >>> 23) & 0xff, m = x & 0x7fffff;
          if (e === 0xff) return sign | 0x7c00 | (m ? 0x200 : 0);
          var ne = e - 127 + 15;
          if (ne >= 31) return sign | 0x7c00;
          if (ne <= 0) {
            if (ne < -10) return sign;
            var shift = 14 - ne;
            return sign | (((m | 0x800000) + (1 << (shift - 1))) >> shift);
          }
          var r = (ne << 10) | (m >> 13);
          if (m & 0x1000) r++;
          return sign | r;
        }

        // Expand any float upload to RGBA (as half floats when asHalf) so every texture
        // is a plain 4-channel one; LUMINANCE samples as (l,l,l,1) and L+A as (l,l,l,a).
        function expand(src, w, h, channels, asHalf) {
          var n = w * h, out = asHalf ? new Uint16Array(n * 4) : new Float32Array(n * 4);
          var one = asHalf ? 0x3c00 : 1;
          function cv(v) { return asHalf ? toHalf(v) : v; }
          for (var i = 0; i < n; i++) {
            var r, g, b, a;
            if (channels === 1) { r = g = b = cv(src[i]); a = one; }
            else if (channels === 2) { r = g = b = cv(src[2*i]); a = cv(src[2*i+1]); }
            else if (channels === 3) { r = cv(src[3*i]); g = cv(src[3*i+1]); b = cv(src[3*i+2]); a = one; }
            else { r = cv(src[4*i]); g = cv(src[4*i+1]); b = cv(src[4*i+2]); a = cv(src[4*i+3]); }
            out[4*i] = r; out[4*i+1] = g; out[4*i+2] = b; out[4*i+3] = a;
          }
          return out;
        }

        function channelsOf(gl, fmt) {
          if (fmt === gl.LUMINANCE) return 1;
          if (fmt === gl.LUMINANCE_ALPHA) return 2;
          if (fmt === gl.RGB) return 3;
          if (fmt === gl.RGBA) return 4;
          return 0;
        }

        // widenAll=false: only RGB float uploads; asHalf=true: every float upload as half float.
        function patchUploads(asHalf) {
          var P = window.WebGLRenderingContext.prototype;
          var origImage = P.texImage2D, origSub = P.texSubImage2D;
          function applies(gl, fmt, type, data) {
            if (type !== gl.FLOAT) return false;
            var ch = channelsOf(gl, fmt);
            if (!ch) return false;
            if (data && !(data instanceof Float32Array)) return false;
            return asHalf || ch === 3;
          }
          P.texImage2D = function(target, level, ifmt, w, h, border, fmt, type, data) {
            if (arguments.length === 9 && applies(this, fmt, type, data)) {
              var ch = channelsOf(this, fmt);
              return origImage.call(this, target, level, this.RGBA, w, h, border, this.RGBA,
                asHalf ? HALF : type, data ? expand(data, w, h, ch, asHalf) : (asHalf ? new Uint16Array(w*h*4) : null));
            }
            return origImage.apply(this, arguments);
          };
          P.texSubImage2D = function(target, level, x, y, w, h, fmt, type, data) {
            if (arguments.length === 9 && applies(this, fmt, type, data)) {
              var ch = channelsOf(this, fmt);
              return origSub.call(this, target, level, x, y, w, h, this.RGBA,
                asHalf ? HALF : type, expand(data, w, h, ch, asHalf));
            }
            return origSub.apply(this, arguments);
          };
          if (asHalf) {
            // three only enables the extensions it knows; make sure half float is on for every context.
            var origGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(kind) {
              var c = origGetContext.apply(this, arguments);
              if (c && kind !== '2d' && c.getExtension) { try { c.getExtension('OES_texture_half_float'); } catch(e){} }
              return c;
            };
          }
        }

        // Upload [0.25, 0.5, 0.75, 1] the way MathBox would, sample it in a vertex shader and read the pixel back.
        function probe(gl, mode) {
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
            if (mode === 'rgb') {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.FLOAT, new Float32Array([0.25, 0.5, 0.75]));
            } else if (mode === 'rgba') {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array([0.25, 0.5, 0.75, 1]));
            } else {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, HALF, new Uint16Array([toHalf(0.25), toHalf(0.5), toHalf(0.75), toHalf(1)]));
            }
            gl.viewport(0, 0, 1, 1);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, 1);
            var px = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            return Math.abs(px[0]-64) < 8 && Math.abs(px[1]-128) < 8 && Math.abs(px[2]-191) < 8;
          } catch(e) { return false; }
          finally { gl.deleteTexture(tex); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); }
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
            info.half = !!gl.getExtension('OES_texture_half_float');
            info.vtf = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
            var usable = false;
            if (info.vtf > 0 && info.float) {
              info.rgb = probe(gl, 'rgb');
              info.rgba = probe(gl, 'rgba');
              if (info.rgb && info.rgba && !window.__heygeoForceHalf) usable = true;
              else if (!info.rgb && info.rgba && !window.__heygeoForceHalf) { patchUploads(false); info.widened = true; usable = true; }
            }
            if (!usable && info.vtf > 0 && info.half) {
              info.halfOk = probe(gl, 'half');
              if (info.halfOk) { patchUploads(true); info.halved = true; usable = true; }
            }
            if (!usable) {
              info.ua = navigator.userAgent.slice(0, 120);
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
