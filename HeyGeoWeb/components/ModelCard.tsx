'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LatexRenderer from '@/components/LatexRenderer';
import { sanitizeSvg, isSvgVisuallyEmpty } from '@/lib/sanitizeSvg';

// ── Mini SVG thumbnail ─────────────────────────────────────────
interface HGElem {
  type: string;
  id?: string;
  parents: (string | number | boolean)[];
  attrs?: Record<string, unknown>;
}
interface HGData {
  boundingbox?: [number, number, number, number];
  elements?: HGElem[];
  codeMode?: boolean;
}

function Thumbnail({ jsonData }: { jsonData: unknown }) {
  const rec  = jsonData as Record<string, unknown> | null;

  // Sketchpad / WSP model
  if (rec?.__type === 'sketchpad' || rec?.__type === 'wsp') {
    return (
      <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="200" height="120" fill="#eef2ff"/>
        <circle cx="100" cy="56" r="42" fill="none" stroke="#818cf8" strokeWidth="2"/>
        <polygon points="100,14 61,78 139,78" fill="#eef2ff" fillOpacity="0.6" stroke="#4f46e5" strokeWidth="2"/>
        <circle cx="100" cy="14" r="3.5" fill="#f97316"/>
        <circle cx="61" cy="78" r="3.5" fill="#f97316"/>
        <circle cx="139" cy="78" r="3.5" fill="#f97316"/>
        <line x1="128" y1="14" x2="88" y2="100" stroke="#a5b4fc" strokeWidth="1.5"/>
        <line x1="128" y1="14" x2="148" y2="94" stroke="#a5b4fc" strokeWidth="1.5"/>
        <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#6366f1" fontFamily="sans-serif" fontWeight="600">{rec.__type === 'wsp' ? 'Web Sketchpad' : 'Sketchpad'}</text>
      </svg>
    );
  }

  // CindyJS model
  if (rec?.__type === 'cindy') {
    return (
      <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="200" height="120" fill="#f5f3ff"/>
        {/* Three free points */}
        <circle cx="100" cy="20" r="5" fill="#7c3aed"/>
        <circle cx="40" cy="88" r="5" fill="#7c3aed"/>
        <circle cx="160" cy="88" r="5" fill="#7c3aed"/>
        {/* Triangle edges */}
        <line x1="100" y1="20" x2="40" y2="88" stroke="#4f46e5" strokeWidth="2"/>
        <line x1="40"  y1="88" x2="160" y2="88" stroke="#4f46e5" strokeWidth="2"/>
        <line x1="160" y1="88" x2="100" y2="20" stroke="#4f46e5" strokeWidth="2"/>
        {/* Altitude lines (orthogonal) */}
        <line x1="100" y1="20" x2="100" y2="88" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="40"  y1="88" x2="130" y2="45" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3"/>
        {/* Orthocenter */}
        <circle cx="100" cy="66" r="4" fill="#c084fc"/>
        <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#6d28d9" fontFamily="sans-serif" fontWeight="600">CindyJS</text>
      </svg>
    );
  }

  // GeoGebra model
  if (rec?.__type === 'geogebra') {
    return (
      <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="200" height="120" fill="#f0fdf4"/>
        <line x1="18" y1="62" x2="186" y2="62" stroke="#bbf7d0" strokeWidth="2"/>
        <line x1="103" y1="6" x2="103" y2="114" stroke="#bbf7d0" strokeWidth="2"/>
        <path d="M 22 108 Q 103 6 184 108" fill="none" stroke="#3b82f6" strokeWidth="2.5"/>
        <circle cx="103" cy="62" r="28" fill="none" stroke="#22c55e" strokeWidth="2"/>
        <circle cx="103" cy="62" r="4" fill="#ef4444"/>
        <circle cx="131" cy="62" r="3" fill="#3b82f6"/>
        <text x="100" y="116" textAnchor="middle" fontSize="9" fill="#16a34a" fontFamily="sans-serif" fontWeight="600">GeoGebra</text>
      </svg>
    );
  }

  // Geometry Expressions model
  if (rec?.__type === 'gx') {
    return (
      <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="200" height="120" fill="#fefce8"/>
        <line x1="18" y1="62" x2="186" y2="62" stroke="#fef08a" strokeWidth="2"/>
        <line x1="100" y1="6" x2="100" y2="114" stroke="#fef08a" strokeWidth="2"/>
        <circle cx="100" cy="62" r="36" fill="none" stroke="#f59e0b" strokeWidth="2"/>
        <line x1="64" y1="26" x2="136" y2="98" stroke="#d97706" strokeWidth="1.5"/>
        <circle cx="64" cy="26" r="3.5" fill="#b45309"/>
        <circle cx="136" cy="98" r="3.5" fill="#b45309"/>
        <circle cx="100" cy="62" r="3.5" fill="#b45309"/>
        <text x="100" y="116" textAnchor="middle" fontSize="9" fill="#b45309" fontFamily="sans-serif" fontWeight="600">Geometry Expressions</text>
      </svg>
    );
  }

  const data = jsonData as HGData | null;

  // Code Mode models: show a "</ >" badge instead of 📐
  if (data?.codeMode) {
    return (
      <div className="w-full h-full flex items-center justify-center select-none">
        <span className="text-4xl font-mono font-bold text-gray-200">&lt;/&gt;</span>
      </div>
    );
  }

  if (!data?.elements?.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200 select-none">
        📐
      </div>
    );
  }

  const [xmin, ymax, xmax, ymin] = data.boundingbox ?? [-8, 8, 8, -8];
  const W = 300, H = 180;
  const toX = (x: number) => ((x - xmin) / (xmax - xmin)) * W;
  const toY = (y: number) => ((ymax - y) / (ymax - ymin)) * H;
  const scaleR = Math.min(W / (xmax - xmin), H / (ymax - ymin));

  const pmap: Record<string, [number, number]> = {};
  const nodes: React.ReactNode[] = [];
  let k = 0;

  for (const el of data.elements) {
    const visible = el.attrs?.visible !== false;
    if (el.type === 'point' || el.type === 'glider') {
      const x = typeof el.parents[0] === 'number' ? el.parents[0] : 0;
      const y = typeof el.parents[1] === 'number' ? el.parents[1] : 0;
      if (el.id) pmap[el.id] = [x, y];
      if (visible) {
        const fill = (el.attrs?.fillColor as string) ?? (el.attrs?.strokeColor as string) ?? '#d97706';
        nodes.push(<circle key={k++} cx={toX(x)} cy={toY(y)} r={4} fill={fill} />);
      }
    } else if (el.type === 'midpoint') {
      const a = pmap[el.parents[0] as string], b = pmap[el.parents[1] as string];
      if (a && b) {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (el.id) pmap[el.id] = [mx, my];
        if (visible) nodes.push(<circle key={k++} cx={toX(mx)} cy={toY(my)} r={4} fill="#d97706" />);
      }
    } else if (el.type === 'segment' || el.type === 'line' || el.type === 'arrow') {
      const a = pmap[el.parents[0] as string], b = pmap[el.parents[1] as string];
      if (a && b) {
        const stroke = (el.attrs?.strokeColor as string) ?? '#374151';
        nodes.push(<line key={k++} x1={toX(a[0])} y1={toY(a[1])} x2={toX(b[0])} y2={toY(b[1])} stroke={stroke} strokeWidth={1.5} />);
      }
    } else if (el.type === 'circle') {
      const c = pmap[el.parents[0] as string];
      if (c) {
        let r: number;
        if (typeof el.parents[1] === 'number') {
          r = el.parents[1] * scaleR;
        } else {
          const p2 = pmap[el.parents[1] as string];
          const dx = p2 ? p2[0] - c[0] : 2, dy = p2 ? p2[1] - c[1] : 0;
          r = Math.sqrt(dx * dx + dy * dy) * scaleR;
        }
        const stroke = (el.attrs?.strokeColor as string) ?? '#374151';
        nodes.push(<circle key={k++} cx={toX(c[0])} cy={toY(c[1])} r={r} fill="none" stroke={stroke} strokeWidth={1.5} />);
      }
    } else if (el.type === 'polygon') {
      const pts = (el.parents as string[]).map(id => pmap[id]).filter(Boolean)
        .map(p => `${toX(p[0]).toFixed(1)},${toY(p[1]).toFixed(1)}`);
      if (pts.length >= 3) {
        const stroke = (el.attrs?.strokeColor as string) ?? '#374151';
        const fill = (el.attrs?.fillColor as string) ?? 'none';
        nodes.push(<polygon key={k++} points={pts.join(' ')} fill={fill} fillOpacity={fill === 'none' ? undefined : 0.15} stroke={stroke} strokeWidth={1.5} />);
      }
    }
  }

  const ox = toX(0), oy = toY(0);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ display: 'block' }}>
      <rect width={W} height={H} fill="white" />
      {ox >= 0 && ox <= W && <line x1={ox} y1={0} x2={ox} y2={H} stroke="#f3f4f6" strokeWidth={1} />}
      {oy >= 0 && oy <= H && <line x1={0} y1={oy} x2={W} y2={oy} stroke="#f3f4f6" strokeWidth={1} />}
      {nodes}
    </svg>
  );
}

// ── Card ───────────────────────────────────────────────────────
interface Props {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  viewCount: number;
  shareToken?: string;
  updatedAt: Date;
  jsonData?: unknown;
  thumbnailSvg?: string;
  codeMode?: boolean;
}

export default function ModelCard({ id, title, description, isPublic, viewCount, shareToken, updatedAt, jsonData, thumbnailSvg, codeMode }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');

  const shareUrl = isPublic && shareToken ? `${baseUrl}/share/${shareToken}` : null;

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/models/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
      else setConfirmDel(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="h-40 bg-white border-b border-gray-100 overflow-hidden">
        {thumbnailSvg && !isSvgVisuallyEmpty(thumbnailSvg) ? (
          thumbnailSvg.startsWith('data:') ? (
            <img
              src={thumbnailSvg}
              alt={title}
              className="w-full h-full object-contain"
              style={{ display: 'block' }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(thumbnailSvg) }}
            />
          )
        ) : (
          <Thumbnail jsonData={jsonData} />
        )}
      </div>

      {/* Status bar */}
      <div className={`h-1 ${isPublic ? 'bg-green-400' : 'bg-gray-200'}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/models/${id}`} prefetch={false} className="font-semibold text-gray-900 hover:text-brand-600 leading-snug line-clamp-2">
            {title}
          </Link>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isPublic ? 'Công khai' : 'Riêng tư'}
          </span>
        </div>

        {description && (
          <div className="text-sm text-gray-500 line-clamp-2 mb-3">
            <LatexRenderer>{description}</LatexRenderer>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-auto mb-3">
          {isPublic && <span>{viewCount} lượt xem · </span>}
          Cập nhật {new Date(updatedAt).toLocaleDateString('vi-VN')}
        </p>

        {/* Actions */}
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 flex-1">Xoá mô hình này?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              {deleting ? 'Đang xoá…' : 'Xoá'}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg"
            >
              Huỷ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/models/${id}`} className="btn-secondary !py-1.5 !text-xs">
              Xem
            </Link>
            {codeMode ? (
              <Link href={`/coding?id=${id}`} className="btn-primary !py-1.5 !text-xs">
                💻 Edit code
              </Link>
            ) : (() => {
              const modelType = (jsonData as Record<string, unknown> | null)?.__type as string | undefined;
            if (modelType === 'cindy') {
                return (
                  <Link href={`/cindy?id=${id}`} className="btn-primary !py-1.5 !text-xs">
                    🎯 Edit CindyJS
                  </Link>
                );
              }
              if (modelType === 'sketchpad' || modelType === 'wsp') {
                return (
                  <a href={`/wsp?id=${id}`} target="_blank" rel="noopener noreferrer" className="btn-primary !py-1.5 !text-xs">
                    ✏️ WSP
                  </a>
                );
              }
              if (modelType === 'geogebra') {
                return (
                  <a href={`/geogebra?id=${id}`} target="_blank" rel="noopener noreferrer" className="btn-primary !py-1.5 !text-xs">
                    ✏️ GeoGebra
                  </a>
                );
              }
              if (modelType === 'gx') {
                return (
                  <button
                    onClick={() => {
                      const html = (jsonData as Record<string, unknown>).htmlContent as string;
                      const blob = new Blob([html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="btn-primary !py-1.5 !text-xs"
                  >
                    📥 Tải xuống
                  </button>
                );
              }
              return (
                <Link href={`/design?id=${id}`} className="btn-primary !py-1.5 !text-xs">
                  ✏️ Design
                </Link>
              );
            })()}
            {shareUrl && (
              <button onClick={copy} className="btn-secondary !py-1.5 !text-xs">
                {copied ? '✓ Đã sao chép' : '🔗 Copy link'}
              </button>
            )}
            <button
              onClick={() => setConfirmDel(true)}
              className="ml-auto text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
            >
              🗑 Xoá
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
