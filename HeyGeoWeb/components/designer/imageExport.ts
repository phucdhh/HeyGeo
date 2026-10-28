/**
 * File | Export To Image… — the sketch as a bitmap.
 *
 * The board already draws itself as SVG (CanvasHandle.exportSVG), so exporting
 * an image is that same drawing painted onto a canvas. The desktop's dialog
 * offers the formats Qt can write and a "High Quality Image" tick; the web has
 * PNG and JPEG to offer, and the tick doubles the pixels in each direction.
 */

export type ImageFormat = 'png' | 'jpeg';

export interface ImageFormatInfo {
  format: ImageFormat;
  /** What the dialog lists. */
  label: string;
  mime: string;
  ext: string;
}

export const IMAGE_FORMATS: ImageFormatInfo[] = [
  { format: 'png', label: 'PNG', mime: 'image/png', ext: 'png' },
  { format: 'jpeg', label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
];

/** The desktop's High Quality Image tick: twice the pixels each way. */
export const HIGH_QUALITY_SCALE = 2;

function infoOf(format: ImageFormat): ImageFormatInfo {
  return IMAGE_FORMATS.find((f) => f.format === format) ?? IMAGE_FORMATS[0];
}

/** The file the browser saves, named after the sketch the way Export SVG is. */
export function imageFileName(title: string, format: ImageFormat): string {
  // the desktop writes jpg for a jpeg, so the extension follows the format
  const stem = title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'heygeo';
  return `${stem}.${infoOf(format).ext}`;
}

/**
 * The size the drawing paints at. JSXGraph writes width and height on the root
 * element in pixels; a document loaded from elsewhere may carry only a viewBox,
 * which is in the same units.
 */
export function svgSize(svg: string): { width: number; height: number } | null {
  const root = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!root) return null;
  const attr = (name: string): string | null => {
    const m = new RegExp(`\\b${name}="([^"]*)"`).exec(root);
    return m ? m[1] : null;
  };
  const px = (value: string | null): number | null => {
    if (value === null) return null;
    // "100%" is not a pixel count to paint at
    const m = /^\s*([\d.]+)(?:px)?\s*$/.exec(value);
    const n = m ? Number.parseFloat(m[1]) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const width = px(attr('width'));
  const height = px(attr('height'));
  if (width !== null && height !== null) return { width, height };
  const box = (attr('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (box.length === 4 && box[2] > 0 && box[3] > 0 && box.every(Number.isFinite)) {
    return { width: box[2], height: box[3] };
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không đọc được hình vẽ để xuất ảnh.'));
    img.src = src;
  });
}

/**
 * Paint an SVG string onto a canvas and encode it. Only a browser has an Image
 * and a canvas, so the app exercises this half; the naming and sizing above are
 * what the unit tests hold.
 */
export async function rasterizeSvg(
  svg: string,
  format: ImageFormat,
  scale: number = 1,
): Promise<Blob> {
  const size = svgSize(svg);
  if (!size) throw new Error('Hình vẽ chưa có kích thước để xuất ảnh.');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(size.width * scale));
    canvas.height = Math.max(1, Math.round(size.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt này không vẽ được ảnh.');
    // the board is white, and JPEG has no transparency to fall back on
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const mime = infoOf(format).mime;
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Không đóng gói được ảnh.'))),
        mime,
        0.95,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
