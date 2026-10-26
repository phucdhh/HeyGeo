'use client';

import { useEffect, useRef, useId } from 'react';
import Script from 'next/script';

export interface GGBApi {
  getPNGBase64: (scale: number, transparent: boolean, dpi: number) => string;
  getBase64: (includeThumbnail: boolean, callback: (b64: string) => void) => void;
  /** Evaluate a GeoGebra scripting command. */
  evalCommand: (command: string) => boolean;
  /** Switch to a named perspective: 'G'=2D, 'D'=3D, 'GD'=2D+3D side-by-side, etc. */
  setPerspective: (perspective: string) => void;
}

interface Props {
  /** Base64-encoded .ggb file content */
  base64: string;
  /** Whether the model contains 3D objects. Auto-detected from base64 if omitted. */
  is3d?: boolean;
  /**
   * Called once when the GeoGebra applet is fully loaded and ready.
   * Receives the applet API object so callers can capture thumbnails etc.
   */
  onReady?: (api: GGBApi) => void;
}

declare global {
  interface Window {
    GGBApplet: new (params: Record<string, unknown>, arg2?: string | HTMLElement | boolean | { is3D: boolean }) => { inject: (container: string | HTMLElement) => void };
    // Dynamic per-instance load callbacks registered by GeoGebraViewer
    [key: `ggbOnLoad_${string}`]: ((api: GGBApi) => void) | undefined;
  }
}

/**
 * Detect whether a base64-encoded .ggb file (ZIP format) contains 3D content.
 * GeoGebra stores 3D data in a file named "geogebra3d.xml" inside the ZIP.
 *
 * Strategy: scan both the HEAD (local file headers come first) AND the TAIL
 * (ZIP Central Directory is always at the END of the archive and lists every
 * filename).  Scanning only the head misses 3D files where geogebra.xml is
 * large (> scan window) and pushes geogebra3d.xml's local header past the limit.
 * The Central Directory at the tail is a reliable fallback.
 *
 * Base64 slices must start/end on a 4-char boundary so atob() can decode them.
 */
export function detectIs3D(base64: string): boolean {
  const TARGET = 'geogebra3d.xml';
  // 87380 base64 chars ≈ 64 KB of binary; large enough for any typical Central Directory
  const SCAN = 87380;

  try {
    const len = base64.length;
    if (len === 0) return false;

    // ── Head scan ──────────────────────────────────────────────────────────
    // Round DOWN to nearest multiple-of-4 so atob receives a valid string
    const headLen = Math.floor(Math.min(len, SCAN) / 4) * 4;
    if (atob(base64.slice(0, headLen)).includes(TARGET)) return true;

    // ── Tail scan ──────────────────────────────────────────────────────────
    // The ZIP Central Directory is at the very end of the file.  Start at a
    // multiple-of-4 boundary so the slice is valid base64 (the original string
    // ends with proper '=' padding, so slicing from a /4 boundary is safe).
    if (len > SCAN) {
      const tailStart = Math.floor((len - SCAN) / 4) * 4;
      if (atob(base64.slice(tailStart)).includes(TARGET)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * GeoGebraViewer – renders a GeoGebra .ggb file using the official
 * GeoGebra Web API (https://wiki.geogebra.org/en/Reference:GeoGebra_App_Parameters).
 * The .ggb file is passed as a base64 string via the `ggbBase64` parameter.
 *
 * Uses appName "classic" so both 2D and 3D files are rendered correctly.
 * For 2D files the perspective is forced to "G" (Graphics only) to hide the
 * Algebra sidebar.  For 3D files the file's own saved layout is preserved so
 * multi-view models (e.g. 3D + 2D cross-section side-by-side) display correctly.
 */
export default function GeoGebraViewer({ base64, is3d: is3dProp, onReady }: Props) {
  const uid        = useId().replace(/:/g, '');
  const containerId = `ggb-${uid}`;
  const loadCallbackName = `ggbOnLoad_${uid}` as `ggbOnLoad_${string}`;
  const base64Ref  = useRef(base64);
  base64Ref.current = base64;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const injected   = useRef(false);

  const inject = () => {
    if (typeof window === 'undefined' || !window.GGBApplet) return;
    if (injected.current) return;
    injected.current = true;

    const container = document.getElementById(containerId);
    if (!container) return;

    const w = container.clientWidth  || 800;
    const h = container.clientHeight || 500;

    // Determine 3D-ness.
    // IMPORTANT: only trust is3dProp===true from the DB.  Old models may have
    // is3d===false stored from a buggy scan (only head was checked).  For those,
    // re-run detectIs3D (which now checks both head and ZIP Central Directory)
    // to get the correct answer.  detectIs3D is cheap: it decodes ~128 KB max.
    const is3d = is3dProp === true || detectIs3D(base64Ref.current);

    // For 2D files: force perspective 'G' to hide the Algebra sidebar.
    // For 3D files: do NOT set a perspective param — let the file's own saved
    // perspective (which has both 2D and 3D views visible) load naturally.
    const extraParams: Record<string, unknown> = is3d ? {} : { perspective: 'G' };

    // Register per-instance appletOnLoad callback so GeoGebra fires it when ready
    window[loadCallbackName] = (api: GGBApi) => {
      onReadyRef.current?.(api);
      // Clean up the global to avoid leaks
      delete window[loadCallbackName];
    };

    const applet = new window.GGBApplet(
      {
        // 'classic' loads the correct codebase if we force it via true/views param.
        appName: 'classic',
        width: w,
        height: h,
        ggbBase64: base64Ref.current,
        ...extraParams,
        showToolBar: false,
        showAlgebraInput: false,
        showMenuBar: false,
        enableRightClick: true,
        enableShiftDragZoom: true,
        showZoomButtons: true,
        showFullscreenButton: true,
        useBrowserForJS: true,
        allowStyleBar: true,
        scaleContainerClass: 'ggb-viewer-container',
        allowUpscale: false,
        autoHeight: true,
        appletOnLoad: loadCallbackName,
      },
      // Pass a boolean "true" to html5NoWebSimple parameter in GGBApplet constructor
      // so it loads the full 'web3d' codebase instead of 'webSimple'.
      is3d ? true : false
    );
    // Inject into the container explicitly
    applet.inject(containerId);
  };

  // Clean up the global callback if component unmounts before applet loads
  useEffect(() => {
    return () => { delete window[loadCallbackName]; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If API already loaded (e.g. page navigation), inject immediately
    if (typeof window !== 'undefined' && window.GGBApplet) {
      inject();
    }
  });

  return (
    <div className="w-full h-full relative min-h-[400px]">
      <Script
        src="https://cdn.geogebra.org/apps/deployggb.js"
        strategy="afterInteractive"
        onLoad={inject}
      />
      {/* 
        The parent wrapper MUST have the scaleContainerClass (ggb-viewer-container) 
        so GeoGebra's internal script can find it via parentNode traversal and apply 
        responsive CSS scaling to the applet on window resize. 
      */}
      <div className="ggb-viewer-container absolute inset-0 w-full h-full">
        <div
          id={containerId}
          className="w-full h-full rounded-xl overflow-hidden bg-white"
        />
      </div>
    </div>
  );
}
