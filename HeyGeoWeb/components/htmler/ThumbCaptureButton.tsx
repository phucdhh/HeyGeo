'use client';

/**
 * ThumbCaptureButton – one-click preview image for an authored HTML page.
 *
 * The studio's iframe is sandboxed, so its pixels cannot be read; getDisplayMedia
 * can capture them because it works on what the screen shows.  The author picks
 * this tab in the browser's own dialog, the frame is cropped to the preview pane,
 * and HeyGeo keeps a small WebP in the model row.  If the browser or the author
 * declines, an image file can still be chosen instead.
 */

import { useCallback, useRef, useState } from 'react';
import { cropForRect, fileToThumb, makeThumb, THUMB_MAX_BYTES, type ThumbResult } from '@/lib/thumbCapture';

interface Props {
  /** The pane that holds the live iframe; only it ends up in the image. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Called with the data URL to store. */
  onCapture: (dataUrl: string, meta: { width: number; height: number; bytes: number }) => void;
  /** Image files the browser cannot decode, or that stay too big, are refused. */
  onError: (message: string) => void;
}

/** A frame of nothing but background compresses to a few hundred bytes. */
const MIN_CAPTURE_BYTES = 400;

export default function ThumbCaptureButton({ targetRef, onCapture, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((thumb: ThumbResult | null, what: string) => {
    if (!thumb) throw new Error(`${what} không nén được dưới ${Math.round(THUMB_MAX_BYTES / 1000)} KB`);
    if (thumb.bytes < MIN_CAPTURE_BYTES) throw new Error(`${what} trắng hoặc quá nhỏ`);
    onCapture(thumb.dataUrl, { width: thumb.width, height: thumb.height, bytes: thumb.bytes });
  }, [onCapture]);

  const takeShot = useCallback(async () => {
    const pane = targetRef.current;
    if (!pane) return;
    setBusy(true);
    let stream: MediaStream | null = null;
    let thumb: ThumbResult | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: window.screen.width * (window.devicePixelRatio || 1) },
          height: { ideal: window.screen.height * (window.devicePixelRatio || 1) },
        },
        audio: false,
        // The author is sharing the very tab they are editing in.
        selfBrowserSurface: 'include',
        preferCurrentTab: true,
      } as MediaStreamConstraints);

      if (!stream.getVideoTracks().length) throw new Error('không có luồng video');
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      // One painted frame is enough; the stream must not stay open.
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('khung hình không tới')), 5000);
        const grab = () => { clearTimeout(timeout); resolve(); };
        const frameCb = (video as unknown as { requestVideoFrameCallback?: (cb: () => void) => number })
          .requestVideoFrameCallback;
        if (frameCb) frameCb.call(video, grab);
        else {
          video.onloadeddata = grab;
          if (video.readyState >= 2) grab();
        }
      });

      const rect = pane.getBoundingClientRect();
      const crop = cropForRect(rect, video.videoWidth, video.videoHeight, window.innerWidth, window.innerHeight);
      thumb = crop
        ? makeThumb(video, crop)
        : makeThumb(video, { x: 0, y: 0, w: video.videoWidth, h: video.videoHeight });
      video.srcObject = null;
    } catch (err) {
      onError(err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Bạn đã huỷ hộp thoại chia sẻ màn hình.'
        : `Không chụp được preview: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
      return;
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
    // Outside the try, so the author reads this sentence and not a prefixed one.
    accept(thumb, 'Khung hình');
  }, [accept, onError, targetRef]);

  const takeFile = useCallback(async (file: File) => {
    setBusy(true);
    let thumb: ThumbResult | null = null;
    try {
      thumb = await fileToThumb(file);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không đọc được ảnh');
      return;
    } finally {
      setBusy(false);
    }
    accept(thumb, 'Ảnh đã chọn');
  }, [accept, onError]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void takeFile(file);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => void takeShot()}
        disabled={busy}
        title="Chụp khung preview đang hiển thị (WebP, tối đa 640×360)"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] disabled:opacity-50"
      >
        📷 Chụp preview
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Chọn một ảnh có sẵn, HeyGeo sẽ đổi thành WebP nhỏ"
        className="px-2.5 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] disabled:opacity-50"
      >
        …
      </button>
    </div>
  );
}
