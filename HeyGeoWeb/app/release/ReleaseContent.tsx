'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export interface Release {
  platform: string;
  arch: string;
  icon: string;
  filename: string | null;
  version: string;
  note: string;
  available: boolean;
}

// ─── Tool list ────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    icon: '•',
    name: 'Point Tool',
    desc: 'Tạo điểm tự do, điểm trên các loại đường, giao điểm. Khi rê chuột tới các đối tượng có thể hỗ trợ tạo điểm trên chúng, các đối tượng đó sẽ sáng lên hỗ trợ nắm bắt (snap) thông minh.',
  },
  {
    icon: '╱',
    name: 'Segment / Ray / Line Tool',
    desc: 'Vẽ đoạn thẳng, tia, đường thẳng qua hai điểm. Hover highlight hiển thị giao điểm dự kiến (◇) với các đường khác.',
  },
  {
    icon: '○',
    name: 'Circle Tool (Compass)',
    desc: 'Vẽ đường tròn bằng tâm + bán kính hoặc tâm + điểm. Tính năng khử răng cưa mịn màng trên các màn hình có độ phân giải cao.',
  },
  {
    icon: '▷',
    name: 'Polygon Tool',
    desc: 'Vẽ đa giác tùy ý qua các điểm mà người dùng click chuột, click đôi để kết thúc. Đa giác có thể chỉ có biên hoặc có thêm tô màu phần bên trong hoặc chỉ có phần bên trong.',
  },
  {
    icon: '↖',
    name: 'Selection (Arrow) Tool',
    desc: 'Chọn và kéo các đối tượng. Toàn bộ các đối tượng khác trên mô hình sẽ cập nhật tức thì theo ràng buộc hình học.',
  },
  {
    icon: '𝐓',
    name: 'Text / Label Tool',
    desc: 'Thêm nhãn LaTeX, công thức toán học, ghi chú tùy ý vào bản vẽ với đầy đủ font hệ thống.',
  },
];

// ─── Menu list ────────────────────────────────────────────────────────────────

const MENUS = [
  {
    name: 'Construct',
    icon: '📐',
    items: [
      'Midpoint — Trung điểm của đoạn thẳng',
      'Perpendicular, Parallel — đường vuông góc / song song',
      'Intersection — giao điểm hai đối tượng',
      'Point on Object — điểm nằm trên đối tượng',
      'Arc through 3 Points, Arc on Circle',
      'Circle by Center+Point / Center+Radius',
      'Locus — quỹ tích điểm và quỹ tích đường thẳng',
    ],
  },
  {
    name: 'Measure',
    icon: '📏',
    items: [
      'Distance, Length, Angle, Area, Slope, Ratio',
      'Coordinates (x; y), Abscissa x, Ordinate y',
      'Equation — phương trình đường thẳng / đường tròn',
      'Calculator — tính biểu thức với đơn vị cm / in / px / ° / rad',
    ],
  },
  {
    name: 'Transform',
    icon: '🔄',
    items: [
      'Translate — By Marked Vector / Fixed (dx, dy) / Polar',
      'Rotate — By Marked Angle / Fixed Angle (CCW/CW)',
      'Dilate — By Marked Ratio / Fixed Ratio',
      'Reflect — By Marked Mirror Line',
      'Mark Vector / Angle / Ratio / Distance',
    ],
  },
  {
    name: 'Graph',
    icon: '📈',
    items: [
      'New Coordinate System — tạo hệ trục toạ độ, kéo gốc O, kéo U để đổi tỷ lệ',
      'Plot Function — đồ thị y = f(x)',
      'Plot Parametric Curve — đường tham số (x(t), y(t))',
      'Grid Form: Polar / Square / Rectangular / Trigonometric',
      'Snap Points — bật snap điểm theo lưới',
    ],
  },
  {
    name: 'Display',
    icon: '🎨',
    items: [
      'Colour — 16 màu chuẩn với ô preview màu',
      'Line Style — Solid / Dashed / Dotted + Thin / Normal / Thick',
      'Point Style — Small / Medium / Large với icon preview',
      'Font — Latin Modern Roman, CMU Serif, Times New Roman, Arial, Courier New',
    ],
  },
  {
    name: 'File',
    icon: '📁',
    items: [
      'Export to Web — xuất bản lên heygeo.pedu.vn, tạo thumbnail SVG tự động',
      'Export Image — PNG / JPEG / BMP với upsampling chất lượng cao',
      'Quick Play — phát lại script dựng hình (.sec)',
      'Print — in toàn bộ bản vẽ',
      'Choose Language — 12+ ngôn ngữ giao diện',
    ],
  },
];

// ─── Changelog entries ────────────────────────────────────────────────────────

const CHANGELOG = [
  {
    date: '2026-04-05',
    title: 'HeyGeo macOS Intel – Lần đầu ra mắt!',
    desc: 'Build đầu tiên dành cho máy Mac chip Intel (iMac 2017, MacBook Pro 2019…). Yêu cầu macOS 12 Monterey trở lên.',
  },
  {
    date: '2026-03-16',
    title: 'HeyGeo Windows x64 – Build mới (2026-03-16)',
    desc: 'Cập nhật bản build HeyGeo cho Windows Intel/AMD 64-bit. Bao gồm các sửa lỗi và cải tiến mới nhất.',
  },
  {
    date: '2026-03-14',
    title: 'HeyGeoWeb: Dynamic measure & calculator',
    desc: 'Đo lường và máy tính cập nhật giá trị động trên web khi kéo điểm. Nhãn hiển thị đúng công thức đầy đủ.',
  },
  {
    date: '2026-03-12',
    title: 'Calculator: Color, Unit type, nested calculation',
    desc: 'Màu sắc áp dụng cho biểu thức tính toán. Đơn vị đúng khi dùng kết quả tính toán trong công thức lồng nhau.',
  },
  {
    date: '2026-03-12',
    title: 'Calculator: Menu Units ▼ (cm / in / px / ° / rad)',
    desc: 'Chèn đơn vị từ menu vào công thức. Phân tích chiều (dimensional analysis) tự động.',
  },
  {
    date: '2026-03-11',
    title: 'GSP-style hover highlight cho công cụ dựng hình',
    desc: 'Đối tượng sáng lên với soft-glow màu đỏ khi hover. Highlight đồng thời giao điểm dự kiến của hai đường.',
  },
  {
    date: '2026-03-10',
    title: 'Grid Form submenu: Polar / Square / Rectangular / Trig',
    desc: 'Hệ tọa độ với 4 kiểu lưới. Trục Ox/Oy là G_LINE có thể dựng điểm trên trục như mọi đường thẳng khác.',
  },
  {
    date: '2026-03-10',
    title: 'Quỹ tích động trên Web (tracecurve + objectlocus)',
    desc: 'Quỹ tích điểm và quỹ tích đường thẳng cập nhật theo thời gian thực trên trình duyệt khi kéo điểm.',
  },
  {
    date: '2026-03-10',
    title: 'Menu Transform phong cách GSP',
    desc: 'Dialog phong phú cho Translate / Rotate / Dilate / Reflect, hỗ trợ cả Fixed và Marked mode.',
  },
  {
    date: '2026-03-10',
    title: 'SVG Thumbnail cho Export to Web',
    desc: 'Thumbnail chính xác được render trực tiếp từ canvas HeyGeo lúc xuất, không cần render lại từ JSON.',
  },
  {
    date: '2026-03-10',
    title: 'Hệ trục tọa độ — Export to Web hoàn chỉnh',
    desc: 'Kéo gốc O và điểm U trên web, tỷ lệ trục cập nhật tức thì. Đồ thị hàm số và đường tham số hoạt động đầy đủ.',
  },
  {
    date: '2026-03-10',
    title: 'Measure: Coordinates, Abscissa, Ordinate, Equation',
    desc: 'Đo toạ độ, hoành độ, tung độ và phương trình đường thẳng/đường tròn trong hệ tọa độ.',
  },
  {
    date: '2026-03-09',
    title: 'Graph Menu: Hệ trục tọa độ, hàm số, đường tham số',
    desc: 'Tạo hệ trục tọa độ, vẽ đồ thị y = f(x), đường tham số (x(t), y(t)); hỗ trợ lưới Polar, Square, Rectangular.',
  },
  {
    date: '2026-03-06',
    title: 'Anti-aliasing & HiDPI — Retina sắc nét như GSP',
    desc: 'Buffer render ở 2× resolution trên Retina. Đường thẳng, điểm, đường tròn mịn với sub-pixel anti-aliasing.',
  },
  {
    date: '2026 Q1',
    title: 'Qt 6 migration — KSEG → HeyGeo',
    desc: 'Port toàn bộ Qt 3/4 API sang Qt 6. Build thành công trên macOS Apple Silicon arm64. Đổi tên thương hiệu HeyGeo.',
  },
];

// ─── History milestones ───────────────────────────────────────────────────────

const HISTORY = [
  {
    period: '1999 – 2006',
    title: 'KSEG ra đời (gốc rễ của HeyGeo)',
    desc: 'Ilya Baran (MIT) phát triển KSEG, ứng dụng hình học động mã nguồn mở xây dựng trên Qt 3. Phiên bản cuối cùng là 0.403 (2006). KSEG có đầy đủ các công cụ dựng hình, đo lường, quỹ tích và giao diện đa ngôn ngữ (12+ ngôn ngữ).',
  },
  {
    period: '2026 Q1',
    title: 'Fork và nâng cấp lên Qt 6 — đổi tên thành HeyGeo',
    desc: 'Toàn bộ dự án được fork, nâng cấp API Qt 3/4 → Qt 6, bật C++17, xây dựng native trên Apple Silicon (arm64). Đổi tên thương hiệu KSEG → HeyGeo. Build thành công và chạy được trên macOS 14+ Apple Silicon.',
  },
  {
    period: '2026-03-06',
    title: 'Nâng cấp chất lượng hiển thị: Anti-aliasing & HiDPI',
    desc: 'Buffer render ở độ phân giải Retina 2×. Toàn bộ tọa độ dựng hình chuyển sang QRectF / QPointF / QPolygonF để sub-pixel anti-aliasing.',
  },
  {
    period: '2026-03',
    title: 'Graph Menu, hệ trục tọa độ, hàm số, đường tham số',
    desc: 'Thêm Graph Menu hoàn chỉnh: tạo hệ trục tọa độ, vẽ đồ thị hàm số y = f(x), đường tham số (x(t), y(t)). Hỗ trợ 4 kiểu lưới. Đo lường trong hệ tọa độ (coordinates, equation…).',
  },
  {
    period: '2026-03',
    title: 'Export to Web — HeyGeoWeb platform',
    desc: 'HeyGeo Desktop có thể xuất bản bản vẽ trực tiếp lên heygeo.pedu.vn qua File → Export to Web. Nền tảng web dựa trên JSXGraph cho phép tương tác đầy đủ trên trình duyệt: kéo điểm, quỹ tích động, đo lường, hàm số, đường tham số, hệ tọa độ.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  releases: Release[];
}

export default function ReleaseContent({ releases }: Props) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <img src="/logo.svg" alt="HeyGeo logo" className="w-16 h-16 flex-shrink-0" />
            <span>Hey<span className="text-amber-300">Geo</span></span>
          </Link>
          <nav className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/release" className="text-sm text-white font-semibold border-b border-amber-300 pb-0.5">
              {t('release.nav_download')}
            </Link>
            <Link href="/login" className="text-sm text-amber-200 hover:text-white transition-colors">
              {t('nav.login')}
            </Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
              {t('nav.register')}
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-amber-500 text-white py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            HeyGeo Desktop
          </h1>
          <p className="text-lg text-amber-100 max-w-2xl mx-auto">
            {t('release.hero_desc')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="#download" className="btn-primary !py-2.5 !px-6 text-sm">
              {t('release.hero_btn_download')}
            </a>
            <a href="#features" className="text-sm text-amber-200 hover:text-white transition-colors self-center">
              {t('release.hero_btn_features')}
            </a>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="flex-1">

        {/* ══ 1. Introduction ══════════════════════════════════════════════ */}
        <section id="intro" className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('release.intro_title')}</h2>
            <div className="w-16 h-1 bg-brand-600 rounded mb-8" />

            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed space-y-4">
                <p>
                  <strong>HeyGeo</strong> là ứng dụng hình học động tương tác dành cho macOS và Windows (và cả Linux), cho phép dựng các đối tượng hình học phổ biến. HeyGeo hỗ trợ người dùng thiết kế các biểu diễn Toán động, khám phá và phát hiện các tính chất, bất biến, mối quan hệ liên quan đến các đối tượng Toán học.
                </p>
                <p>
                  HeyGeo là một phiên bản hiện đại hoá của ứng dụng{' '}
                  <a
                    href="https://en.wikipedia.org/wiki/KSEG_(software)"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    KSEG
                  </a>{' '}
                  (Ilya Baran, MIT), và lấy cảm hứng từ giao diện cùng ý tưởng của{' '}
                  <a
                    href="https://gsptest.scratchconsortium.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    The Geometer's Sketchpad
                  </a>{' '}
                  (Nicholas Jackiw, SFU), được nâng cấp toàn diện lên <strong>Qt 6</strong>, phát triển chính cho <strong>Apple Silicon (arm64)</strong>.
                </p>
                <p>
                  Khác với KSEG gốc, HeyGeo tích hợp thêm <strong>Export to Web</strong> — xuất bản
                  mô hình lên{' '}
                  <a href="https://heygeo.pedu.vn" className="text-brand-600 hover:underline">
                    heygeo.pedu.vn
                  </a>{' '}
                  chỉ với một lệnh, sử dụng{' '}
                  <a
                    href="https://jsxgraph.uni-bayreuth.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    JSXGraph
                  </a>{' '}
                  làm engine tương tác trên trình duyệt.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: '🎯', text: 'Dựng hình tương tác với live update' },
                  { icon: '📐', text: 'Điểm, đoạn, tia, đường thẳng, đường tròn, cung, đa giác' },
                  { icon: '📏', text: 'Đo lường: khoảng cách, góc, diện tích, độ dốc, tỉ lệ' },
                  { icon: '🧮', text: 'Máy tính biểu thức với phân tích chiều tự động' },
                  { icon: '〰️', text: 'Quỹ tích điểm và quỹ tích đường thẳng' },
                  { icon: '📈', text: 'Hệ trục tọa độ + đồ thị hàm số + đường tham số' },
                  { icon: '🔄', text: 'Transform: Translate, Rotate, Dilate, Reflect' },
                  { icon: '🌐', text: 'Export to Web — chia sẻ ngay trên heygeo.pedu.vn' },
                  { icon: '🌍', text: 'Giao diện đa ngôn ngữ (12+ ngôn ngữ)' },
                  { icon: '🖥️', text: 'Màn hình Retina HiDPI — sắc nét với anti-aliasing' },
                  { icon: '🔓', text: 'Miễn phí, mã nguồn mở (GPLv2)' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ 2. Features ════════════════════════════════════════════════════ */}
        <section id="features" className="py-20 px-6 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('release.features_title')}</h2>
            <div className="w-16 h-1 bg-brand-600 rounded mb-10" />

            {/* Tools */}
            <h3 className="text-xl font-semibold text-gray-800 mb-5">{t('release.tools_subtitle')}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
              {TOOLS.map((tool) => (
                <div key={tool.name} className="card p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg select-none">
                      {tool.icon}
                    </span>
                    <h4 className="font-semibold text-gray-900 text-sm">{tool.name}</h4>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{tool.desc}</p>
                </div>
              ))}
            </div>

            {/* Menus */}
            <h3 className="text-xl font-semibold text-gray-800 mb-5">{t('release.menus_subtitle')}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MENUS.map((menu) => (
                <div key={menu.name} className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{menu.icon}</span>
                    <h4 className="font-bold text-gray-900">{menu.name}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {menu.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                        <span className="text-brand-500 mt-0.5 flex-shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ 3. Download ═════════════════════════════════════════════════════ */}
        <section id="download" className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('release.download_title')}</h2>
            <div className="w-16 h-1 bg-brand-600 rounded mb-4" />
            <p className="text-gray-600 mb-10 text-sm">{t('release.download_desc')}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-brand-900 text-white">
                    <th className="px-5 py-3 text-left rounded-tl-xl font-semibold">{t('release.table_os')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('release.table_arch')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('release.table_version')}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t('release.table_note')}</th>
                    <th className="px-5 py-3 text-center rounded-tr-xl font-semibold">{t('release.table_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((rel, i) => (
                    <tr
                      key={rel.platform}
                      className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        <span className="mr-2">{rel.icon}</span>
                        {rel.platform}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{rel.arch}</td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">{rel.version}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{rel.note}</td>
                      <td className="px-5 py-4 text-center">
                        {rel.available && rel.filename ? (
                          <a
                            href={`/api/download/${rel.filename}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold px-4 py-2 hover:bg-brand-700 transition-colors"
                          >
                            {t('release.download_btn')}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            {rel.filename === null && rel.version === '—'
                              ? t('release.coming_soon')
                              : t('release.see_readme')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Install notes */}
            <div className="mt-10 grid sm:grid-cols-2 gap-6">
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <span>🍎</span> {t('release.install_macos_title')}
                </h4>
                <ol className="text-sm text-amber-800 space-y-1.5 list-decimal list-inside">
                  <li>Giải nén file <code className="bg-white/60 px-1 rounded">.zip</code> vừa tải về.</li>
                  <li>Kéo <code className="bg-white/60 px-1 rounded">HeyGeo.app</code> vào thư mục <code className="bg-white/60 px-1 rounded">/Applications</code>.</li>
                  <li>
                    Lần đầu mở: click chuột phải → <strong>Open</strong> (bỏ qua cảnh báo Gatekeeper).
                  </li>
                </ol>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-5">
                <h4 className="font-semibold text-sky-900 mb-2 flex items-center gap-2">
                  <span>🪟</span> {t('release.install_win_title')}
                </h4>
                <ol className="text-sm text-sky-800 space-y-1.5 list-decimal list-inside">
                  <li>Giải nén file <code className="bg-white/60 px-1 rounded">.zip</code> vào thư mục tuỳ chọn.</li>
                  <li>Chạy file <code className="bg-white/60 px-1 rounded">HeyGeo.exe</code> bên trong.</li>
                  <li>Không cần cài đặt (portable application).</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 4. History ════════════════════════════════════════════════════ */}
        <section id="history" className="py-20 px-6 bg-gray-50">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('release.history_title')}</h2>
            <div className="w-16 h-1 bg-brand-600 rounded mb-10" />

            {/* Milestones */}
            <h3 className="text-lg font-semibold text-gray-700 mb-6">{t('release.milestones_title')}</h3>
            <div className="relative border-l-2 border-brand-200 pl-8 space-y-8 mb-14">
              {HISTORY.map((h) => (
                <div key={h.period} className="relative">
                  <span className="absolute -left-[2.625rem] w-5 h-5 rounded-full bg-brand-600 border-2 border-white flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>
                  <p className="text-xs font-mono text-brand-600 mb-1">{h.period}</p>
                  <h4 className="font-semibold text-gray-900 mb-1">{h.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{h.desc}</p>
                </div>
              ))}
            </div>

            {/* Changelog */}
            <h3 className="text-lg font-semibold text-gray-700 mb-6">{t('release.changelog_title')}</h3>
            <div className="space-y-3">
              {CHANGELOG.map((entry) => (
                <div
                  key={entry.date + entry.title}
                  className="card p-4 flex gap-4 items-start"
                >
                  <span className="flex-shrink-0 font-mono text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-md mt-0.5 whitespace-nowrap">
                    {entry.date}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{entry.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{entry.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-brand-900 text-amber-200 py-8 px-6 text-center text-sm">
        <p className="mb-1">
          © {new Date().getFullYear()} HeyGeo · Developed by{' '}
          <a
            href="https://www.ganjingworld.com/@ndmphuc"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Nguyễn Đăng Minh Phúc
          </a>
        </p>
        <p className="text-amber-300 text-xs">
          HeyGeo Desktop được phát hành dưới giấy phép{' '}
          <a
            href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            GNU GPL v2
          </a>
          . Mã nguồn gốc KSEG © Ilya Baran.
        </p>
      </footer>
    </div>
  );
}
