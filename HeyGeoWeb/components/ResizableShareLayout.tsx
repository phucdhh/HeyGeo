'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Props {
  viewer: React.ReactNode;
  aside: React.ReactNode;
}

const MIN_HEIGHT = 180;
const DEFAULT_HEIGHT = 288; // equivalent to h-72
const LG_BREAKPOINT = 1024; // Tailwind `lg`

export default function ResizableShareLayout({ viewer, aside }: Props) {
  const [viewerHeight, setViewerHeight] = useState(DEFAULT_HEIGHT);
  const [isDesktop, setIsDesktop] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  // Track whether we're on desktop so we never apply the inline height there.
  // (inline style has higher specificity than Tailwind lg: classes)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= LG_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startH: viewerHeight };
    },
    [viewerHeight],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientY - dragRef.current.startY;
    const maxH = Math.round(window.innerHeight * 0.8);
    const newH = Math.min(Math.max(dragRef.current.startH + delta, MIN_HEIGHT), maxH);
    setViewerHeight(newH);
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div className="flex lg:flex-1 lg:min-h-0 flex-col lg:flex-row">
      {/* Viewer — resizable height on mobile, flex-fill on desktop */}
      <div
        className="min-w-0 overflow-hidden p-4 lg:p-6 lg:flex-1 lg:h-auto lg:min-h-0"
        // Only apply inline height on mobile; on desktop lg:flex-1 handles sizing.
        // Inline style has higher CSS specificity than Tailwind classes, so we must
        // skip it on desktop to avoid overriding lg:h-auto / lg:flex-1.
        style={isDesktop ? undefined : { height: viewerHeight }}
      >
        {viewer}
      </div>

      {/* Drag handle — visible only on mobile (< lg) */}
      <div
        className="lg:hidden flex-shrink-0 flex items-center justify-center h-6 bg-gray-100 border-y border-gray-200 cursor-ns-resize touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Kéo để thay đổi kích thước"
        aria-label="Kéo để thay đổi chiều cao vùng mô hình"
      >
        {/* Pill indicator */}
        <div className="w-10 h-1 rounded-full bg-gray-400" />
      </div>

      {/* Info panel */}
      <aside className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-6 overflow-y-auto">
        {aside}
      </aside>
    </div>
  );
}
