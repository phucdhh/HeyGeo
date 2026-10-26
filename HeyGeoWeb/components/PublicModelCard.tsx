'use client';

import Link from 'next/link';
import LatexRenderer from '@/components/LatexRenderer';
import { sanitizeSvg, isSvgVisuallyEmpty } from '@/lib/sanitizeSvg';

function toAvatarSrc(avatar: string): string {
  if (avatar.startsWith('/api/') || avatar.startsWith('http')) return avatar;
  return `/api/avatars/${avatar.replace(/^\/avatars\//, '')}`;
}

// Static GeoGebra placeholder thumbnails (mirrored from new/page.tsx)
const GGB_2D_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#f0fdf4"/><line x1="18" y1="62" x2="186" y2="62" stroke="#bbf7d0" stroke-width="2"/><line x1="103" y1="6" x2="103" y2="114" stroke="#bbf7d0" stroke-width="2"/><path d="M 22 108 Q 103 6 184 108" fill="none" stroke="#3b82f6" stroke-width="2.5"/><circle cx="103" cy="62" r="28" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="103" cy="62" r="4" fill="#ef4444"/><circle cx="131" cy="62" r="3" fill="#3b82f6"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#16a34a" font-family="sans-serif" font-weight="600">GeoGebra</text></svg>`;
const GGB_3D_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#eff6ff"/><polygon points="100,12 168,52 100,92 32,52" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="100" y1="12" x2="100" y2="92" stroke="#93c5fd" stroke-width="1.5"/><line x1="32" y1="52" x2="168" y2="52" stroke="#93c5fd" stroke-width="1.5"/><polygon points="100,12 168,52 100,108" fill="#dbeafe" fill-opacity="0.6" stroke="#2563eb" stroke-width="1.5"/><polygon points="100,12 32,52 100,108" fill="#bfdbfe" fill-opacity="0.5" stroke="#2563eb" stroke-width="1.5"/><circle cx="100" cy="108" r="3" fill="#1d4ed8"/><circle cx="100" cy="12" r="3" fill="#1d4ed8"/><text x="100" y="118" text-anchor="middle" font-size="9" fill="#1d4ed8" font-family="sans-serif" font-weight="600">GeoGebra 3D</text></svg>`;

// Static placeholder for JSXGraph models that have no saved thumbnail yet
const JXG_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#fff7ed"/><line x1="16" y1="60" x2="184" y2="60" stroke="#fed7aa" stroke-width="1.5"/><line x1="100" y1="8" x2="100" y2="112" stroke="#fed7aa" stroke-width="1.5"/><circle cx="100" cy="60" r="32" fill="none" stroke="#f97316" stroke-width="2"/><polygon points="100,28 132,76 68,76" fill="none" stroke="#ea580c" stroke-width="1.8"/><circle cx="100" cy="28" r="3" fill="#ea580c"/><circle cx="132" cy="76" r="3" fill="#ea580c"/><circle cx="68" cy="76" r="3" fill="#ea580c"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#c2410c" font-family="sans-serif" font-weight="600">JSXGraph</text></svg>`;

// Static placeholder for Web Sketchpad (wsp / sketchpad) models
const WSP_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#faf5ff"/><line x1="16" y1="60" x2="184" y2="60" stroke="#e9d5ff" stroke-width="1.5"/><line x1="100" y1="8" x2="100" y2="112" stroke="#e9d5ff" stroke-width="1.5"/><circle cx="100" cy="42" r="30" fill="none" stroke="#a855f7" stroke-width="2"/><line x1="56" y1="90" x2="144" y2="90" stroke="#7c3aed" stroke-width="2"/><line x1="56" y1="90" x2="100" y2="18" stroke="#7c3aed" stroke-width="2"/><line x1="144" y1="90" x2="100" y2="18" stroke="#7c3aed" stroke-width="2"/><circle cx="100" cy="18" r="3" fill="#7c3aed"/><circle cx="56" cy="90" r="3" fill="#7c3aed"/><circle cx="144" cy="90" r="3" fill="#7c3aed"/><circle cx="100" cy="42" r="3" fill="#a855f7"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#7c3aed" font-family="sans-serif" font-weight="600">Web Sketchpad</text></svg>`;

// Static placeholder for Geometry Expressions (gx) models
const GX_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#f0fdf9"/><line x1="16" y1="60" x2="184" y2="60" stroke="#99f6e4" stroke-width="1.5"/><line x1="100" y1="8" x2="100" y2="112" stroke="#99f6e4" stroke-width="1.5"/><ellipse cx="100" cy="60" rx="52" ry="30" fill="none" stroke="#14b8a6" stroke-width="2"/><line x1="48" y1="60" x2="152" y2="60" stroke="#0f766e" stroke-width="1.5" stroke-dasharray="4,3"/><circle cx="152" cy="60" r="3" fill="#0f766e"/><circle cx="48" cy="60" r="3" fill="#0f766e"/><circle cx="100" cy="30" r="3" fill="#0f766e"/><text x="122" y="56" font-size="9" fill="#0f766e" font-family="serif" font-style="italic">a</text><text x="100" y="116" text-anchor="middle" font-size="9" fill="#0f766e" font-family="sans-serif" font-weight="600">Geometry Expressions</text></svg>`;

// Static placeholder for CindyJS models
const CINDY_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#fff1f2"/><line x1="16" y1="60" x2="184" y2="60" stroke="#fecdd3" stroke-width="1.5"/><line x1="100" y1="8" x2="100" y2="112" stroke="#fecdd3" stroke-width="1.5"/><path d="M100,60 C100,20 160,20 160,60 C160,100 100,100 100,60" fill="none" stroke="#f43f5e" stroke-width="2"/><path d="M100,60 C100,20 40,20 40,60 C40,100 100,100 100,60" fill="none" stroke="#e11d48" stroke-width="2"/><circle cx="100" cy="60" r="3" fill="#be123c"/><circle cx="160" cy="60" r="3" fill="#be123c"/><circle cx="40" cy="60" r="3" fill="#be123c"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#be123c" font-family="sans-serif" font-weight="600">CindyJS</text></svg>`;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

interface Props {
  title: string;
  description?: string | null;
  shareToken: string;
  viewCount: number;
  createdAt: Date;
  thumbnailSvg?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  authorSlug?: string | null;
  /** Used to render a meaningful fallback thumbnail when thumbnailSvg is absent */
  modelType?: string | null;
}

export default function PublicModelCard({
  title,
  description,
  shareToken,
  viewCount,
  createdAt,
  thumbnailSvg,
  authorName,
  authorAvatar,
  authorSlug,
  modelType,
}: Props) {
  // Determine the effective thumbnail: real one from DB (if not visually empty), or a static placeholder.
  const hasValidThumb = thumbnailSvg && !isSvgVisuallyEmpty(thumbnailSvg);
  const effectiveThumbnail = (hasValidThumb ? thumbnailSvg : null)
    ?? (modelType === 'geogebra' ? GGB_2D_SVG : null)
    ?? ((modelType === 'sketchpad' || modelType === 'wsp') ? WSP_SVG : null)
    ?? (modelType === 'gx' ? GX_SVG : null)
    ?? (modelType === 'cindy' ? CINDY_SVG : null)
    ?? ((!modelType || modelType === 'jsxgraph' || modelType === 'design') ? JXG_SVG : null);
  return (
    <div
      className="card hover:shadow-lg transition-shadow flex flex-col overflow-hidden group relative"
    >
      {/* Invisible link overlay covering the whole card */}
      <Link href={`/share/${shareToken}`} className="absolute inset-0 z-0" aria-label={title} prefetch={false} />

      {/* Thumbnail */}
      <div className="h-36 bg-white border-b border-gray-100 overflow-hidden pointer-events-none">
        {effectiveThumbnail ? (
          effectiveThumbnail.startsWith('data:') ? (
            <img
              src={effectiveThumbnail}
              alt={title}
              className="w-full h-full object-contain transition-transform group-hover:scale-105"
              style={{ display: 'block' }}
            />
          ) : (
            // Inline SVG – allows foreignObject (KaTeX labels) to render correctly.
            // An <img> data-URI blocks foreignObject for security, breaking JSXGraph thumbnails.
            <div
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full transition-transform group-hover:scale-105"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(effectiveThumbnail) }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200 select-none">
            📐
          </div>
        )}
      </div>

      {/* Amber top stripe = public */}
      <div className="h-1 bg-amber-400" />

      <div className="p-4 flex flex-col flex-1 pointer-events-none">
        <h3 className="font-semibold text-amber-600 group-hover:text-amber-700 leading-snug line-clamp-2 mb-1">
          {title}
        </h3>

        {description && (
          <div className="text-sm text-gray-500 line-clamp-2 mb-2">
            <LatexRenderer>{description}</LatexRenderer>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-gray-400 pt-2 pointer-events-auto relative z-10">
          {/* Author — avatar + name link */}
          {authorSlug ? (
            <Link
              href={`/${authorSlug}`}
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 truncate max-w-[55%] hover:text-amber-600 transition-colors"
            >
              <AuthorAvatar avatar={authorAvatar} name={authorName} />
              <span className="truncate">{authorName}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 truncate max-w-[55%]">
              <AuthorAvatar avatar={authorAvatar} name={authorName} />
              <span className="truncate">{authorName}</span>
            </span>
          )}
          {/* suppressHydrationWarning: locale-dependent formatting (toLocaleString/toLocaleDateString)
              may produce different output between Node.js (server) and the browser (client). */}
          <span className="flex-shrink-0 pointer-events-none" suppressHydrationWarning>
            👁 {viewCount.toLocaleString('vi-VN')} · {new Date(createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>
    </div>
  );
}

function AuthorAvatar({ avatar, name }: { avatar?: string | null; name: string }) {
  if (avatar) {
    const src = toAvatarSrc(avatar);
    return (
      <img
        src={src}
        alt={name}
        className="w-5 h-5 rounded-full object-cover flex-shrink-0 bg-indigo-100"
      />
    );
  }
  return (
    <span className="w-5 h-5 rounded-full bg-indigo-400 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 select-none">
      {getInitials(name)}
    </span>
  );
}
