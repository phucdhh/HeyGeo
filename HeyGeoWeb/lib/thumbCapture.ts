/**
 * Thumb capture – the shared maths behind the /html screenshot button.
 *
 * A sandboxed iframe is an opaque origin, so the studio cannot read its pixels;
 * getDisplayMedia can, because it captures what the compositor painted.  The
 * frame is then cropped to the preview pane and shrunk to a small image, since
 * HeyGeo stores the thumbnail inside the model row.
 */

/** Longest edge the studio allows, in pixels. */
export const THUMB_MAX_W = 640;
export const THUMB_MAX_H = 360;

/** Encoded budget for one thumbnail, kept under the cap lib/backup.ts restores. */
export const THUMB_MAX_BYTES = 150_000;

/** Tried in order for a given size; a screenshot of a diagram survives 0.6 easily. */
const QUALITIES = [0.82, 0.72, 0.6, 0.5];

/** Tried in order when even the lowest quality is too big. */
const SIZE_STEPS = [1, 0.8, 0.62, 0.48];

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThumbResult {
  dataUrl: string;
  mime: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  bytes: number;
}

/**
 * Largest box of the source's aspect ratio that fits the thumbnail frame.
 * Never enlarges, so a small uploaded image is not resampled up.
 */
export function fitBox(
  w: number,
  h: number,
  maxW = THUMB_MAX_W,
  maxH = THUMB_MAX_H,
): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: 0, h: 0 };
  const scale = Math.min(1, maxW / w, maxH / h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Boxes to try, largest first, all keeping the source aspect ratio. */
export function scaleLadder(w: number, h: number, steps = SIZE_STEPS): Array<{ w: number; h: number }> {
  const base = fitBox(w, h);
  if (!base.w) return [];
  const seen = new Set<string>();
  const out: Array<{ w: number; h: number }> = [];
  for (const step of steps) {
    const box = { w: Math.max(1, Math.round(base.w * step)), h: Math.max(1, Math.round(base.h * step)) };
    const key = `${box.w}x${box.h}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(box);
    }
  }
  return out;
}

/** Bytes carried by a data: URL, i.e. the size the database would hold. */
export function encodedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const body = dataUrl.slice(comma + 1);
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

/**
 * Map a pane's rect in CSS pixels onto a captured frame in device pixels.
 *
 * A tab capture covers exactly the viewport, so window.innerWidth/Height is the
 * reference.  When the author shares a whole window or screen instead, the ratio
 * is off and the result comes back null: the dialog shows that before use.
 */
export function cropForRect(
  rect: { left: number; top: number; width: number; height: number },
  videoW: number,
  videoH: number,
  viewportW: number,
  viewportH: number,
): Crop | null {
  if (!(videoW > 0) || !(videoH > 0) || !(viewportW > 0) || !(viewportH > 0)) return null;
  const scaleX = videoW / viewportW;
  const scaleY = videoH / viewportH;
  const x = Math.round(Math.max(0, Math.min(videoW - 1, rect.left * scaleX)));
  const y = Math.round(Math.max(0, Math.min(videoH - 1, rect.top * scaleY)));
  const w = Math.min(videoW - x, Math.round(rect.width * scaleX));
  const h = Math.min(videoH - y, Math.round(rect.height * scaleY));
  if (w < 16 || h < 16) return null;
  return { x, y, w, h };
}

/** Whether this browser encodes WebP; Safari before 11 and old Chrome do not. */
export function supportsWebP(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Draw a crop of `source` as small as it needs to be to fit the byte budget.
 * Returns null when nothing plausible fits, which the caller reports.
 */
export function makeThumb(
  source: CanvasImageSource,
  crop: Crop,
  maxBytes = THUMB_MAX_BYTES,
): ThumbResult | null {
  for (const box of scaleLadder(crop.w, crop.h)) {
    // A DOM canvas, not an OffscreenCanvas: only the former can hand back a
    // data: URL, which is what the model row stores.
    const canvas = document.createElement('canvas');
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, box.w, box.h);
    const mime = supportsWebP(canvas) ? 'image/webp' : 'image/jpeg';
    for (const quality of QUALITIES) {
      const dataUrl = canvas.toDataURL(mime, quality);
      const bytes = encodedBytes(dataUrl);
      if (bytes <= maxBytes) return { dataUrl, mime, width: box.w, height: box.h, bytes };
    }
  }
  return null;
}

/**
 * Shrink an image the author picked to thumbnail size, so a phone screenshot
 * coming in at several megabytes leaves the database carrying a few dozen KB.
 */
export async function fileToThumb(file: File): Promise<ThumbResult | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('file không phải ảnh'));
      img.src = url;
    });
    return makeThumb(img, { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}
