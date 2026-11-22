import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import HelpToc, { type TocEntry } from './HelpToc';
import CodeBlock from './CodeBlock';
import { A, Callout, Code, DocTable, K, List, P, Section, Sub } from './Blocks';
import { DemoCindy, DemoHeyGeoDoc, DemoJsxGraphCode, DemoMathbox, DemoWebSketchpad } from './Demos';
import {
  CINDY_CODE_SAMPLE,
  DESIGN_DOC_SAMPLE,
  JSXGRAPH_CODE_SAMPLE,
  JSXGRAPH_CODE_SIMPLE,
  MATHBOX_CODE_SAMPLE,
  MATHBOX_SURFACE_SAMPLE,
  WSP_JSON_NOTE,
} from './samples';

export const metadata: Metadata = {
  title: 'Trợ giúp',
  description:
    'Hướng dẫn dùng HeyGeo: tám cách tạo mô hình Toán học (Design, Desktop, Sketchpad .gsp, Web Sketchpad, JSXGraph, CindyJS, MathBox, GeoGebra, Geometry Expressions), tải lên, xuất bản và chia sẻ.',
};

const TOC: TocEntry[] = [
  { href: '#about', label: '1. About HeyGeo' },
  { href: '#about-vs', label: '1.1 Khác gì GeoGebra, Sketchpad?', sub: true },
  { href: '#formats', label: '2. Tám cách tạo mô hình' },
  { href: '#formats-engine', label: '2.1 HeyGeo chọn engine thế nào', sub: true },
  { href: '#formats-online', label: '2.2 Cái nào cần internet', sub: true },
  { href: '#design', label: '3. HeyGeo Design (kéo thả)' },
  { href: '#design-keys', label: '3.1 Công cụ & phím tắt', sub: true },
  { href: '#design-draft', label: '3.2 Nháp, lưu, xuất bản', sub: true },
  { href: '#desktop', label: '4. HeyGeo Desktop & .heyjson' },
  { href: '#wsp', label: '5. Web Sketchpad (/wsp)' },
  { href: '#gsp', label: '6. Sketchpad .gsp' },
  { href: '#jsxgraph', label: '7. JSXGraph Code Mode (/coding)' },
  { href: '#cindy', label: '8. Cinderella & CindyJS (/cindy)' },
  { href: '#mathbox', label: '9. MathBox – WebGL (/mathbox)' },
  { href: '#geogebra', label: '10. GeoGebra (.ggb)' },
  { href: '#gx', label: '11. Geometry Expressions (.html)' },
  { href: '#share', label: '12. Gallery & liên kết chia sẻ' },
  { href: '#account', label: '13. Tài khoản, Dashboard, giới hạn' },
  { href: '#faq', label: '14. Câu hỏi thường gặp' },
  { href: '#fix', label: '15. Khắc phục sự cố' },
  { href: '#contact', label: '16. Liên hệ & đóng góp' },
  { href: '#changelog', label: '17. Cập nhật gần đây' },
];

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';

export default async function HelpPage() {
  // Header chỉ cần biết có phiên hay không; trang này không chạm DB.
  let signedIn = false;
  try {
    const token = (await cookies()).get('auth-token')?.value;
    signedIn = token ? Boolean(await verifyToken(token)) : false;
  } catch {
    signedIn = false;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5">
          <a href="/" className="flex items-center gap-2 text-lg font-extrabold text-gray-900 hover:no-underline">
            <img src="/logo.svg" alt="HeyGeo" className="h-7 w-7" />
            <span>
              Hey<span className="text-brand-600">Geo</span>{' '}
              <span className="font-semibold text-gray-400">Help</span>
            </span>
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/gallery" className="text-gray-500 hover:text-gray-900">Gallery</a>
            <a href="/design" className="text-gray-500 hover:text-gray-900">Design</a>
            <a href="/release" className="text-gray-500 hover:text-gray-900">Download</a>
            {signedIn ? (
              <a href="/dashboard" className="rounded-lg bg-brand-500 px-4 py-1.5 font-bold text-brand-900 hover:bg-amber-400">
                Dashboard
              </a>
            ) : (
              <a href="/login" className="rounded-lg bg-brand-500 px-4 py-1.5 font-bold text-brand-900 hover:bg-amber-400">
                Đăng nhập
              </a>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-7 px-5 pb-20 pt-7 lg:grid-cols-[250px_minmax(0,1fr)]">
        <HelpToc entries={TOC} />

        <main className="min-w-0">
          <p className="mb-5 text-[15px] text-gray-500">
            Trang này giải thích <K>tám dòng mô hình Toán học</K> mà HeyGeo chứa được, cách tạo từng loại và giới hạn
            thật của chúng. Mọi hình động trong trang đều là mô hình thật — <K>kéo thử được</K>.
          </p>

          {/* ─── 1. About ─── */}
          <Section
            num="1"
            id="about"
            title="About HeyGeo"
            lead="HeyGeo là nền tảng web tự host cho hình học động: tạo, chứa và chia sẻ mô hình tương tác bằng một đường link."
          >
            <P>
              HeyGeo không bắt bạn chọn một phần mềm duy nhất. Một hình vẽ có thể làm bằng trình soạn kéo thả{' '}
              <A href="/design">/design</A>, bằng app <A href="/release">HeyGeo Desktop</A>, bằng code JSXGraph ở{' '}
              <A href="/coding">/coding</A>, bằng trình soạn Web Sketchpad ở <A href="/wsp">/wsp</A>, bằng CindyJS ở{' '}
              <A href="/cindy">/cindy</A>, bằng MathBox (WebGL) ở <A href="/mathbox">/mathbox</A>, hoặc nhận file{' '}
              <code>.gsp</code> / <code>.ggb</code> / <code>.html</code> tải lên. Tất cả đổ về cùng một chỗ:{' '}
              <A href="/gallery">Gallery</A> và một liên kết <Code>/share/&lt;token&gt;</Code> không cần tài khoản để xem.
            </P>
            <P>
              Mô hình là <K>dữ liệu đọc được</K> — JSON hoặc JavaScript thuần, nằm trong một cột của cơ sở dữ liệu — nên
              bạn mở được bằng trình soạn text, so sánh được giữa hai bản, và mang sang máy khác mà không cần phần mềm
              của HeyGeo.
            </P>
            <div className="my-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-brand-900">
                MP
              </div>
              <div className="min-w-0">
                <div className="font-bold text-gray-900">Nguyễn Đăng Minh Phúc</div>
                <div className="text-sm text-gray-500">
                  Tác giả HeyGeo · <A href="https://www.ganjingworld.com/@ndmphuc">ganjingworld.com/@ndmphuc</A>
                </div>
              </div>
            </div>

            <Sub id="about-vs" title="1.1 HeyGeo khác gì GeoGebra, Sketchpad?">
              <DocTable
                head={['Tiêu chí', 'HeyGeo', 'GeoGebra / Sketchpad']}
                rows={[
                  [
                    'Nguồn mô hình',
                    'JSON / JS thuần, xem và sửa bằng trình soạn text; nhiều engine cùng nằm trong một thư viện.',
                    'Định dạng riêng (.ggb là ZIP, .gsp là nhị phân) hoặc thiết kế đóng trong ứng dụng.',
                  ],
                  [
                    'Công cụ tạo',
                    'Kéo thả, viết code, hoặc trình soạn gốc của từng dòng (Web Sketchpad, CindyJS, MathBox, applet GeoGebra).',
                    'Một hệ công cụ duy nhất cho một định dạng.',
                  ],
                  [
                    'Chia sẻ',
                    'Một link /share/<token> công khai, người xem không cần tài khoản, kèm hướng dẫn khảo sát và bình luận.',
                    'Tài khoản + kho riêng của hãng, hoặc gửi kèm file.',
                  ],
                  [
                    '3D và GPU',
                    'MathBox (three.js + WebGL) kéo xoay được: mặt cong, trường vector, đường tham số chạy theo thời gian.',
                    'GeoGebra 3D làm tốt; Sketchpad 5 không có 3D động.',
                  ],
                  [
                    'Tiếng Việt',
                    'Giao diện web có 9 ngôn ngữ, tài liệu và thông báo lỗi bằng tiếng Việt.',
                    'Có dịch, nhưng tài liệu và thuật ngữ không đồng nhất.',
                  ],
                  [
                    'Hạ tầng',
                    'Mã nguồn mở, tự host; mô hình của bạn không nằm trong kho của hãng.',
                    'Dịch vụ của hãng hoặc bản thương mại.',
                  ],
                  [
                    'Chạy offline',
                    'App desktop chạy hoàn toàn offline; web chỉ cần mạng cho CindyJS, GeoGebra và nhãn công thức KaTeX (mục 2.2).',
                    'Tuỳ từng phần.',
                  ],
                ]}
              />
              <Callout>
                Đã có sẵn hình ở định dạng khác thì đừng vẽ lại: xem <A href="#formats">mục 2</A> — có{' '}
                <K>6 con đường nạp file</K> và một bộ chuyển <code>.gsp</code> thành hình sống sửa được.
              </Callout>
            </Sub>
          </Section>

          {/* ─── 2. Formats ─── */}
          <Section
            num="2"
            id="formats"
            title="Tám cách tạo một mô hình"
            lead="Cột “Cần mạng khi xem” là thứ hay bị hỏi nhất, nên nó nằm ngay trong bảng."
          >
            <DocTable
              head={['#', 'Dòng mô hình', 'Tạo / sửa ở đâu', 'HeyGeo lưu gì', 'Engine vẽ', 'Sửa tiếp trong HeyGeo?', 'Cần mạng khi xem?']}
              rows={[
                ['1', 'HeyGeo (kéo thả)', '/design', 'JSON phần tử (elements)', 'JSXGraph', 'Có', 'Không*'],
                ['2', 'HeyGeo Desktop', 'app desktop → .heyjson', 'JSON phần tử', 'JSXGraph', 'Có (File → Import…)', 'Không*'],
                ['3', 'Sketchpad .gsp', 'Sketchpad 4 / 5 → tải lên', 'JSON HeyGeo sau chuyển đổi', 'JSXGraph', 'Có (đã thành mô hình HeyGeo)', 'Không*'],
                ['4', 'Web Sketchpad', '/wsp, hoặc sketch .json / -json.js', 'JSON sketch nguyên bản', 'WSP 4.6.2 (iframe)', 'Có (/wsp?id=…)', 'Không'],
                ['5', 'JSXGraph Code Mode', '/coding', 'JavaScript + nhãn codeMode', 'JSXGraph 1.12.2', 'Có', 'Không*'],
                ['6', 'Cinderella → CindyJS', '/cindy', 'JavaScript hoặc HTML fragment', 'CindyJS v0.8', 'Có', 'Có (cindyjs.org)'],
                ['7', 'MathBox (WebGL)', '/mathbox', 'JavaScript', 'three.js + MathBox 2.3.1 (iframe)', 'Có', 'Không'],
                ['8', 'GeoGebra .ggb', 'GeoGebra → tải lên, hoặc /geogebra', 'base64 của file .ggb', 'Applet GeoGebra', 'Có (/geogebra?id=…)', 'Có (cdn.geogebra.org)'],
                ['9', 'Geometry Expressions', 'GE → Export HTML → tải lên', 'HTML nguyên vẹn', 'iframe sandbox', 'Có (/html?id=… sửa mã HTML)', 'Tùy file export'],
                ['10', 'HTML tự viết', 'Bạn tự viết trang → tải lên, hoặc /html', 'HTML nguyên vẹn', 'Trình duyệt của trang (canvas / three.js / JSXGraph…)', 'Có (/html?id=…)', 'Tùy trang'],
              ]}
            />
            <p className="text-xs text-gray-500">
              * Ngoài trừ mô hình có nhãn công thức LaTeX: KaTeX được nạp từ CDN.
            </p>

            <Sub id="formats-engine" title="2.1 HeyGeo chọn engine bằng cách nào">
              <P>
                Khi xem, bạn không phải chọn engine. Mỗi mô hình mang một nhãn <Code>__type</Code> trong <Code>jsonData</Code>,
                và trang xem (<Code>/share/&lt;token&gt;</Code> hay trang chi tiết trong Dashboard) đọc nhãn đó để gọi đúng
                trình vẽ:
              </P>
              <DocTable
                head={['__type', 'Trình vẽ', 'Ghi chú']}
                rows={[
                  ['heygeoweb', 'JSXGraphViewer', 'Vẽ bằng /design.'],
                  ['heygeo', 'JSXGraphViewer', '.heyjson tải lên từ app desktop.'],
                  ['gsp', 'JSXGraphViewer', 'Kết quả chuyển đổi từ file .gsp.'],
                  ['(codeMode: true)', 'JSXGraphViewer', 'Code Mode /coding — vẫn là engine JSXGraph, chạy JS thay vì dựng phần tử.'],
                  ['sketchpad', 'WSPViewer', 'Sketch Web Sketchpad lưu thành .json.'],
                  ['wsp', 'WSPViewer', 'Sketch Web Sketchpad, chạy trong iframe /wsp/viewer.html.'],
                  ['geogebra', 'GeoGebraViewer', 'base64 của .ggb + cờ is3d.'],
                  ['gx', 'GeometryExpressionsViewer', 'HTML tự chứa trong iframe.'],
                  ['html', 'GeometryExpressionsViewer', 'Trang HTML tự viết, cũng nhốt trong iframe sandbox.'],
                  ['cindy', 'CindyJSViewer', 'JavaScript hoặc HTML fragment.'],
                  ['mathbox', 'MathboxViewer', 'JavaScript trong iframe WebGL.'],
                ]}
              />
              <Callout tone="info">
                Khi tải lên, hộp <K>Loại tệp</K> ở <A href="/models/new">Dashboard → Tạo mô hình</A> chỉ nói cho HeyGeo{' '}
                <em>cách đọc file</em>; engine suy ra từ nội dung, không từ lựa chọn đó. Ngoại lệ duy nhất là{' '}
                <code>.html</code>: hai dòng 9 và 10 đọc file y hệt nhau, lựa chọn chỉ quyết định mô hình được{' '}
                <em>gắn nhãn</em> Geometry Expressions hay HTML.
              </Callout>
            </Sub>

            <Sub id="formats-online" title="2.2 Dòng nào cần internet khi trình chiếu">
              <List
                items={[
                  <><K>Không cần mạng:</K> JSXGraph (dòng 1, 2, 3, 5), MathBox (dòng 7), Web Sketchpad (dòng 4) — cả ba thư viện đều được HeyGeo tự host trong <Code>public/vendor</Code> và <Code>public/wsp</Code>.</>,
                  <><K>Cần mạng:</K> CindyJS (nạp <Code>cindyjs.org/dist/v0.8</Code>), GeoGebra (nạp <Code>cdn.geogebra.org/apps/deployggb.js</Code>), và mọi mô hình có nhãn công thức LaTeX vì KaTeX lấy từ CDN.</>,
                  <><K>Tuỳ file:</K> Geometry Expressions — HTML export thường tự chứa; nếu nó gọi script bên ngoài thì vẫn cần mạng.</>,
                ]}
              />
              <P>
                Ảnh thu nhỏ trong Gallery luôn hiển thị được khi offline, vì nó là một mảnh SVG/PNG được chụp lại lúc lưu mô hình.
              </P>
            </Sub>
          </Section>

          {/* ─── 3. Design ─── */}
          <Section
            num="3"
            id="design"
            title="HeyGeo Design — soạn hình bằng kéo thả"
            lead="/design là trình soạn chính: thanh trình đơn kiểu Sketchpad, hộp công cụ bên trái, khung vẽ ở giữa, bảng tính chất bên phải."
          >
            <P>
              Bạn bấm công cụ, nhấp vào khung vẽ, hình hiện ra và <K>sống ngay</K>: điểm kéo được, quan hệ hình học được
              giữ. Đây là cách nhanh nhất để có một mô hình HeyGeo thuần, cũng là nơi mở lại được mô hình của dòng 2 và 3.
            </P>
            <DemoHeyGeoDoc />
            <div className="mb-3 text-xs text-gray-500">
              Hình trên là tài liệu HeyGeo thật ({DESIGN_DOC_SAMPLE.elements.length} phần tử) — trung điểm M và đường tròn
              tâm A vẫn đúng khi bạn kéo A, B, C.
            </div>

            <Sub id="design-keys" title="3.1 Công cụ, trình đơn và phím tắt">
              <P>
                Thanh trình đơn: <Code>File · Edit · Display · Construct · Measure · Number · Transform · Graph · Window · Help</Code>{' '}
                — viết tiếng Anh để khớp Sketchpad; hộp thoại và nhãn đối tượng là tiếng Việt.
              </P>
              <DocTable
                head={['Phím', 'Tác dụng']}
                rows={[
                  ['s p c d r l g f o t v i x', 'Chọn · Điểm · Compa · Đoạn thẳng · Tia · Đường thẳng · Đa giác · Đa giác + cạnh · Chỉ cạnh · Văn bản · Thanh trượt · Thông tin · Bút (đang phát triển)'],
                  ['Shift + ← / →', 'Đổi biến thể của công cụ đang dùng (đoạn → tia → đường thẳng)'],
                  ['Shift + ↑ / ↓', 'Nhảy qua lại giữa các hàng công cụ'],
                  ['Ctrl/Cmd + Z / Y', 'Hoàn tác / làm lại'],
                  ['Ctrl/Cmd + C / X / V / A', 'Copy / cắt / dán / chọn tất cả'],
                  ['Ctrl/Cmd + S', 'Lưu mô hình'],
                  ['Ctrl/Cmd + = / − / 0 / 1', 'Phóng to / thu nhỏ / vừa khung / reset zoom'],
                  ['Ctrl/Cmd + B', 'Bật tắt đậm với chữ đang chọn'],
                  ['Ctrl/Cmd + G', 'Vẽ đồ thị hàm số (hàng Function của menu Graph)'],
                  ['+ / −', 'Bước tham số đang chọn một nấc, hoặc thêm/bớt mẫu của quỹ tích'],
                  ['Delete / Backspace', 'Xoá đối tượng đang chọn'],
                  ['Esc', 'Thoát theo bậc: menu ngữ cảnh → công cụ đang chờ → bỏ chọn'],
                ]}
              />
              <P>Làm được trong /design:</P>
              <List
                items={[
                  'điểm tự do, điểm trên đối tượng, trung điểm, giao điểm, tâm đường tròn ngoại tiếp;',
                  'đoạn thẳng · tia · đường thẳng, đường tròn và cung bằng compa, đa giác và phần bên trong;',
                  'dựng song song, vuông góc, phân giác, và quỹ tích (locus);',
                  'đo lường (độ dài, khoảng cách, góc, góc cung, bán kính, tỉ lệ) và phép tính; kết quả cập nhật khi kéo;',
                  'tham số, thanh trượt, nút lệnh Animate · Move · Hide/Show · Present, vệt trace;',
                  'chữ và nhãn có công thức LaTeX ($…$); đồ thị hàm số, đường tham số, điểm rời rạc, giá trị trên trục hoặc trên đường;',
                  'hệ tọa độ (kể cả do một đường tròn hay một độ dài khai sinh) và conic.',
                ]}
              />
              <Callout tone="warn">
                Một số mục trong trình đơn còn <K>đang phát triển</K>: Print…, Split/Merge, Edit Definition, Properties…,
                Define Derivative Function, Define Custom Transform, Iterate…, Tabulate, Plot Table Data, New View Window,
                Pen. Bấm vào, HeyGeo báo thẳng “Under Development. Please send a request to Nguyễn Đăng Minh Phúc.” thay vì
                âm thầm làm hỏng hình. Tính năng nào bạn cần, cứ nói (mục <A href="#contact">16</A>).
              </Callout>
            </Sub>

            <Sub id="design-draft" title="3.2 Nháp, lưu, xuất bản">
              <List
                items={[
                  <><K>Nháp tự động.</K> Bản đang soạn được cất vào <Code>localStorage</Code> của trình duyệt (chìa <Code>heygeo:design-draft:&lt;modelId hoặc new&gt;</Code>, ghi trễ 800&nbsp;ms). Mở lại <A href="/design">/design</A> sau khi mất mạng hay đóng nhầm tab, HeyGeo hỏi “Khôi phục bản nháp?”.</>,
                  <><K>Lưu.</K> <Code>Ctrl/Cmd + S</Code> hoặc hộp <K>Lưu mô hình</K> — mô hình thành bản nháp trong Dashboard, chưa ai thấy.</>,
                  <><K>Xuất bản.</K> File → <K>Publish to Web…</K> (hộp “Xuất bản lên Thư viện”). Xong, mô hình công khai và có liên kết <Code>/share/&lt;token&gt;</Code>.</>,
                  <><K>Xuất ra file.</K> JSON (mang sang app desktop), SVG, và File → Export To Image… (PNG/JPEG độ phân giải cao) để chèn vào giáo án.</>,
                  <><K>Nạp file vào.</K> File → Import… nhận <code>.json</code> (tài liệu HeyGeo) và <code>.gsp</code> (mục <A href="#gsp">6</A>).</>,
                ]}
              />
            </Sub>
          </Section>

          {/* ─── 4. Desktop ─── */}
          <Section
            num="4"
            id="desktop"
            title="HeyGeo Desktop và file .heyjson"
            lead="Ứng dụng để bàn (C++/Qt) cho Windows và macOS, chạy offline, và đẩy thẳng hình lên heygeo.pedu.vn."
          >
            <List
              items={[
                <>Tải bản mới nhất ở <A href="/release">/release</A>: macOS Apple Silicon, macOS Intel, Windows x64; Linux build từ mã nguồn.</>,
                <>Muốn có hình trên web: File → <K>Export to Web…</K>. Hộp thoại có tiêu đề, mô tả, hướng dẫn khảo sát, rồi hai nhánh: <K>Save as .heyjson file…</K> để giữ file trên máy, hoặc <K>Upload to heygeo.pedu.vn</K> để đăng luôn.</>,
                <>Lần đầu upload: vào <A href="/settings">Settings → API Tokens</A> tạo một token rồi dán vào hộp thoại. Token chỉ thay mặt tài khoản của bạn.</>,
                <>Upload xong hiện nút <K>View online</K> — chính là <Code>/share/&lt;token&gt;</Code>. Ảnh thu nhỏ là SVG do app dựng lúc xuất.</>,
                <>Chiều ngược lại: file <code>.heyjson</code> nạp bằng Dashboard → Tạo mô hình (loại <K>HeyGeo</K>) hoặc File → Import… trong /design.</>,
              ]}
            />
            <P>
              App desktop là bản anh em của /design: cùng hệ đo, cùng tên đối tượng, nên hình vẽ bằng desktop mở lại trong
              /design vẫn sửa được — và ngược lại.
            </P>
          </Section>

          {/* ─── 5. Web Sketchpad ─── */}
          <Section
            num="5"
            id="wsp"
            title="Web Sketchpad (/wsp)"
            lead="Trình soạn Web Sketchpad gốc (WSP 4.6.2, KCP Technologies) nằm trong HeyGeo, với đủ bộ công cụ Sketchpad."
          >
            <DemoWebSketchpad />
            <List
              items={[
                <>Bảng công cụ: nút <K>Cơ bản</K> nạp 17 nhóm dụng cụ (Point/Compass/Straightedge, Parallel &amp; Perpendicular, Arc, Animate Point, Construct Interior, Measure, Angle, Measure Area, Transformation Points &amp; Triangles, Coordinate, Calculation &amp; Graphing, Parameter, Regular Polygon, Conic Section, Caption…), nút <K>Hình học Hyperbolic</K> nạp bộ công cụ mặt phẳng hyperbolic.</>,
                <>Bên trái khung vẽ: <K>Cao/Rộng</K>, <K>Trang mới</K>, <K>Nhân trang</K>, <K>Xóa trang</K>, <K>Check Graph</K>, <K>Remove Hidden Labels</K>, <K>Sketch Prefs</K>. Phía dưới: <K>Widgets</K>, nút chuyển trang, Download/Upload.</>,
                <><K>Sketch nhiều trang</K> mở được như trong Web Sketchpad; việc chuyển trang làm bằng các nút ở dưới khung vẽ trong editor <A href="/wsp">/wsp</A>.</>,
                <><K>Lưu vào HeyGeo:</K> mở <Code>/wsp?id=&lt;modelId&gt;</Code> từ Dashboard, bấm <K>💾 Lưu vào HeyGeo</K> — sketch được ghi nguyên vẹn kèm ảnh PNG. Trong editor không có nút xuất bản; xuất bản ở Dashboard.</>,
                <><K>Nạp sketch có sẵn:</K> nút <K>Upload</K> trong editor nhận file sketch <code>.json</code>; Dashboard → Tạo mô hình nhận loại <K>Sketchpad</K> (<code>.json</code>) hoặc <K>Web Sketchpad</K> (<code>-json.js</code> do Sketchpad xuất — HeyGeo tự bóc phần JSON).</>,
              ]}
            />
            <Callout tone="info">
              <K>Không phải sửa gì cả.</K> Sketch là một khối JSON, giữ nguyên hai dấu <Code>{'{ }'}</Code> khi dán hay nạp:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-900 px-3 py-2 text-[12px] leading-relaxed text-stone-100"><code>{WSP_JSON_NOTE}</code></pre>
            </Callout>
          </Section>

          {/* ─── 6. GSP ─── */}
          <Section
            num="6"
            id="gsp"
            title="The Geometer’s Sketchpad (.gsp)"
            lead="HeyGeo đọc file .gsp nhị phân và chuyển thành mô hình HeyGeo sống — không phải một tấm ảnh chụp lại."
          >
            <P>
              Cách làm: <A href="/design">/design</A> → File → Import… chọn <code>.gsp</code>, hoặc Dashboard → Tạo mô hình
              → loại <K>Sketchpad</K>. Bộ đọc (<Code>lib/gsp</Code>) được kiểm chứng trên 23 cặp fixture{' '}
              <em>.gsp + bản export Web Sketchpad chính thức</em>, nên hình ra đúng vị trí, đúng màu, đúng nét.
            </P>
            <DocTable
              head={['Chuyển đổi tốt', 'Bị bỏ qua / suy giảm']}
              rows={[
                [
                  'Điểm tự do · trung điểm · giao điểm · điểm trượt trên đường (glide) • đoạn, tia, đường thẳng • đường tròn, cung • đa giác và phần bên trong • chữ/nhãn • tham số • nút lệnh Animate/Move/Hide-Show/Present • kết quả đo (độ dài, khoảng cách, góc, góc cung, bán kính, tỉ lệ) • phép tính từ công thức lưu trong file • phép biến hình kèm Mark (Mirror, Rotate, Dilate, Translate)',
                  'Trục tọa độ và điểm đơn vị của nó • quỹ tích (locus) • hàm số và đạo hàm định nghĩa bằng Define • Iterate • ảnh chèn trong sketch • vệt Trace (chỉ là phiên vẽ, không nằm trong file) • sketch nhiều trang: chỉ trang đầu • .gsp bản ZIP/nén của Sketchpad 5 hiện hành và file có mật khẩu',
                ],
              ]}
            />
            <P>
              Sau khi import, mô hình là tài liệu HeyGeo bình thường: sửa tiếp trong /design, lưu, xuất bản. Kết quả đo hiển
              thị theo đơn vị của trang vì <code>.gsp</code> không lưu đơn vị trong file.
            </P>
            <Callout tone="warn">
              <K>File không đọc được?</K> Nếu HeyGeo báo “Không đọc được đối tượng nào từ file .gsp này.” thì nhiều khả năng
              đó là <code>.gsp</code> dạng ZIP của Sketchpad 5 mới. Cách vòng: mở sketch bằng Web Sketchpad rồi export{' '}
              <code>.json</code> / <code>-json.js</code>, nạp theo mục <A href="#wsp">5</A>.
            </Callout>
            <Sub id="gsp-warn" title="6.1 Đọc bảng cảnh báo khi import">
              <P>
                HeyGeo luôn báo thật những gì chưa chuyển được, theo dạng “Chuyển trở thành N đối tượng; chưa chuyển được
                hoặc bị giả mũn: …”. Vài nhãn hay gặp (nguyên văn, không dấu vì chính mã nguồn ghi vậy):
              </P>
              <DocTable
                head={['Cảnh báo', 'Nghĩa là gì']}
                rows={[
                  ['diem trung hoa (cha khong hoat dong)', 'Điểm dựng bằng phép dựng mà HeyGeo chưa dựng lại được từ file.'],
                  ['giao diem (cha khong hoat dong)', 'Đối tượng cha của giao điểm chưa chuyển được, nên giao điểm mất theo.'],
                  ['doan thang / duong tron / cung tron / da giac / phan ben trong (cha khong hoat dong)', 'Đối tượng bị bỏ vì thiếu đối tượng cha hợp lệ.'],
                  ['nut Animate (khong co diem troi hay tham so)', 'Nút hoạt hình mất vì điểm/tham số nó chạy không chuyển được.'],
                  ['ket qua do (loai …)', 'Kiểu kết quả đo Sketchpad chưa có trong HeyGeo (đo trên trục, đơn vị lạ…).'],
                  ['doi tuong khac (truc, quy tich, ham, Iterate, anh)', 'Nhóm đối tượng chưa hỗ trợ — xem bảng ở trên.'],
                  ['ket qua do hien thi theo don vi cua trang', 'Không mất hình: chỉ là đơn vị hiển thị lấy theo trang.'],
                ]}
              />
            </Sub>
          </Section>

          {/* ─── 7. JSXGraph ─── */}
          <Section
            num="7"
            id="jsxgraph"
            title="JSXGraph Code Mode (/coding)"
            lead="Viết JavaScript JSXGraph thay vì kéo thả — dán được code copy từ jsxgraph.org/sandbox."
          >
            <CodeBlock label="javascript · dán vào /coding rồi bấm ▶ Run" code={JSXGRAPH_CODE_SAMPLE} />
            <DemoJsxGraphCode />
            <List
              items={[
                <><K>Có sẵn <Code>board</Code>.</K> Nếu code không gọi <Code>initBoard</Code>, HeyGeo tạo hộ bảng (boundingbox <Code>[-8,8,8,-8]</Code>, giữ tỉ lệ, có nút điều hướng), bạn chỉ việc <Code>board.create(...)</Code>.</>,
                <><K><Code>BOARDID</Code></K> là id của khung xem trước. Muốn tự đặt khung nhìn thì <Code>JXG.JSXGraph.initBoard(BOARDID, …)</Code>; viết <Code>'jxgbox'</Code> cũng chạy vì HeyGeo tự trỏ về đúng khung của mô hình.</>,
                <><K><Code>useMathJax: true</Code> tự đổi thành <Code>useKatex: true</Code>.</K> MathJax không được nạp, và JSXGraph ≥1.10 chờ MathJax là treo cả trang.</>,
                <><K>Chạy code:</K> tự chạy sau 1,2 giây bạn ngừng gõ, hoặc <Code>Ctrl/Cmd + Enter</Code>, hoặc nút <K>▶ Run</K>. Lỗi cú pháp gạch đỏ ngay trong editor; lỗi lúc chạy hiện banner <K>⚠ Runtime</K>.</>,
                <><K>Kho mẫu:</K> menu <K>Insert</K> có <Code>📐 Basic</Code>, <Code>∫ Functions</Code>, <Code>🧊 3D</Code> cùng các nhóm Point, Straight Edges, Circle &amp; Arc…; autocomplete gợi ý API của JSXGraph 1.12.2.</>,
                <><K>Gợi ý AI:</K> ghost-text dự đoán tiếp đoạn code theo ngữ cảnh (Groq), nhấn <K>Tab</K> để nhận, <K>Esc</K> để bỏ.</>,
                <><K>Lưu:</K> mô hình mang <Code>codeMode: true</Code> và code; ảnh thu nhỏ chụp từ SVG của bảng đang vẽ.</>,
                <><K>3D:</K> khối <Code>view3d</Code> xoay được bằng một ngón trên điện thoại vì HeyGeo bật <Code>trackball</Code> và tắt pan một ngón cho phần tử 3D.</>,
              ]}
            />
            <P>Cách viết gọn, dùng bảng tạo sẵn:</P>
            <CodeBlock label="javascript" code={JSXGRAPH_CODE_SIMPLE} />
          </Section>

          {/* ─── 8. CindyJS ─── */}
          <Section
            num="8"
            id="cindy"
            title="Cinderella & CindyJS (/cindy)"
            lead="CindyJS là engine JavaScript do Cinderella sinh ra. Trong HeyGeo bạn viết code CindyJS — không nạp file .cnd."
          >
            <CodeBlock label="javascript · dán vào /cindy" code={CINDY_CODE_SAMPLE} />
            <DemoCindy />
            <List
              items={[
                <>Hai chế độ tự nhận: code bắt đầu bằng thẻ HTML → <K>HTML mode</K> (dán nguyên phần body từ gallery CindyJS), còn lại → <K>JS mode</K> với biến <Code>BOARDID</Code> và <Code>CindyJS</Code>. Nhãn <K>HTML</K>/<K>JS</K> hiện ở góc editor.</>,
                <>Kích thước lấy từ chính <Code>{'ports: [{ id: BOARDID, width: …, height: … }]'}</Code> trong code của bạn; khung iframe tự co theo nội dung.</>,
                <>Menu mẫu: <Code>📐 CindyJS Basic</Code> (Canvas, Điểm, Đường, Hình tròn) và <Code>📜 Scripts</Code> (Init/Draw, Mouse/Tick, ví dụ đầy đủ).</>,
                <>Lưu: mô hình mang <Code>__type: 'cindy'</Code> và tự được gắn danh mục <K>CindyJS</K> trong Gallery.</>,
              ]}
            />
            <Callout tone="warn">
              <K>Cần internet khi xem.</K> Cindy.js v0.8 nạp từ <Code>cindyjs.org</Code>, nên phòng chiếu không mạng sẽ còn
              khung trắng. Muốn hình chạy offline thì dùng <A href="#jsxgraph">JSXGraph</A> hoặc{' '}
              <A href="#mathbox">MathBox</A> — cả hai đều tự host.
            </Callout>
          </Section>

          {/* ─── 9. MathBox ─── */}
          <Section
            num="9"
            id="mathbox"
            title="MathBox — Toán vẽ bằng GPU (/mathbox)"
            lead="Mặt cong 3D, trường vector, đồ thị hàng nghìn mẫu, đường tham số chạy theo thời gian — bằng WebGL."
          >
            <CodeBlock label="javascript · dán vào /mathbox" code={MATHBOX_CODE_SAMPLE} />
            <DemoMathbox />
            <List
              items={[
                <><K>Biến có sẵn:</K> <Code>element</Code> (chỗ gắn canvas WebGL), <Code>MathBox</Code>, <Code>THREE</Code>. Code phải có lời gọi khởi tạo <Code>{'MathBox.mathBox({ element, plugins: [\'core\',\'controls\',\'cursor\'] })'}</Code> — thiếu thì HeyGeo báo “Thiếu MathBox.mathBox(…).”.</>,
                <><K>Muốn xoay hình thì tự khai báo bộ điều khiển:</K> thêm <Code>'controls'</Code> vào <Code>plugins</Code> và <Code>{'controls: { klass: THREE.OrbitControls }'}</Code>. Kéo chuột để xoay, cuộn để phóng.</>,
                <><K>Bẫy số một:</K> <Code>expr</Code> không <em>return</em> giá trị mà <em>emit</em>: <Code>expr: (emit, x, i, t) =&gt; emit(x, Math.sin(x), 0)</Code>. Viết <Code>(t) =&gt; [t, t*t]</Code> thì lưới và trục vẫn hiện, đường thì mất.</>,
                <><K>Hai tầng toán tử:</K> tầng dữ liệu (<Code>interval</Code>, <Code>area</Code>, <Code>matrix</Code>) sinh mẫu; tầng hình thức (<Code>line</Code>, <Code>point</Code>, <Code>surface</Code>) đặt nét, màu, độ dày ngay phía sau.</>,
                <><K>Tên thuộc tính phải đúng MathBox 2.3.1:</K> engine ném lỗi với thuộc tính lạ; không có toán tử <Code>curve</Code>; <Code>grid</Code> dùng <Code>divideX</Code>/<Code>divideY</Code>; màu nên là số hex kiểu <Code>0x0ea5e9</Code> thay vì chuỗi CSS.</>,
                <><K><Code>range</Code> luôn ánh xạ về một ô vuông</K>, nên khung ngang phải kéo rộng bằng <Code>scale</Code>, ví dụ <Code>scale: [2, 1, 1]</Code>.</>,
                <><K>Máy quay:</K> MathBox để camera ngay gốc <Code>[0,0,0]</Code> — cảnh không đặt camera thì vẽ mà không thấy gì; chủ động gọi <Code>three.camera.position.set(…)</Code>.</>,
                <><K>Không cần escape</K> <Code>&lt;</Code> hay <Code>&amp;</Code>; code chạy trong iframe sandbox nên không đụng tới trang.</>,
                <><K>Máy yếu hoặc cũ:</K> HeyGeo dò float texture của WebGL; không có thì lùi half-float, rồi thử WebGL2 (three.js ≥165 bỏ half-float nên thứ tự là WebGL1 → WebGL2). Hết cách mới báo “Trình duyệt này không hỗ trợ WebGL…”.</>,
                <>Kho mẫu: <Code>🧊 MathBox Basic</Code> (Khởi tạo, Trục &amp; Lưới, Đường &amp; Điểm, Bề mặt) và <Code>📚 Ví dụ</Code> (Khối đa diện, Khối tròn xoay, Giải tích &amp; bề mặt, Đường tham số, Hình phẳng &amp; Conic, Điểm · mũi tên · chuyển động).</>,
              ]}
            />
            <P>Mặt sinh bởi <Code>area</Code> + <Code>surface</Code> — khuôn hay dùng nhất cho chương trình Toán phổ thông:</P>
            <CodeBlock label="javascript" code={MATHBOX_SURFACE_SAMPLE} />
          </Section>

          {/* ─── 10. GeoGebra ─── */}
          <Section
            num="10"
            id="geogebra"
            title="GeoGebra (.ggb và /geogebra)"
            lead="Giữ nguyên hình GeoGebra trong thư viện HeyGeo, và sửa tiếp bằng đúng giao diện GeoGebra."
          >
            <List
              items={[
                <><K>Tải lên:</K> Dashboard → Tạo mô hình → loại <K>GeoGebra</K>, chọn <code>.ggb</code>. HeyGeo lưu file dạng base64 trong mô hình — không cần tài khoản GeoGebra, không cần dán link.</>,
                <><K>Tự nhận 3D:</K> HeyGeo quét đầu và cuối file (định dạng ZIP) tìm <Code>geogebra3d.xml</Code>; thấy thì đặt cờ <Code>is3d</Code> để trang xem mở đúng phối cảnh 3D.</>,
                <><K>Sửa tiếp:</K> mở <Code>/geogebra?id=&lt;modelId&gt;</Code> — applet GeoGebra Classic hiện đủ thanh công cụ, trình đơn, dòng nhập đại số, giao diện tiếng Việt. Bấm <K>💾 Lưu vào HeyGeo</K>: applet xuất base64 mới và chụp ảnh PNG làm thu nhỏ.</>,
                <>Nếu chưa lưu từ /geogebra, ảnh thu nhỏ trong Gallery là hình minh họa 2D/3D dựng sẵn, vì applet chỉ chụp được khi đang chạy.</>,
              ]}
            />
            <Callout tone="warn">
              Applet đến từ <Code>cdn.geogebra.org</Code>, nên trang xem <K>cần internet</K>. Bài trình chiếu ở nơi không
              mạng thì chọn <A href="#jsxgraph">JSXGraph</A> hoặc <A href="#mathbox">MathBox</A>.
            </Callout>
          </Section>

          {/* ─── 11. Geometry Expressions ─── */}
          <Section
            num="11"
            id="gx"
            title="Geometry Expressions và trang HTML tự viết (.html)"
            lead="HeyGeo giữ nguyên trang HTML bạn tải lên và nhốt vào iframe an toàn — dù trang đó do Geometry Expressions xuất hay do bạn tự viết."
          >
            <List
              items={[
                <><K>Tải lên:</K> Dashboard → Tạo mô hình → loại <K>Geometry Expressions</K>, chọn file <code>.html</code> mà GE xuất. Tiêu đề mô hình tự lấy từ <Code>&lt;title&gt;</Code> hoặc <Code>&lt;h1&gt;</Code> trong file.</>,
                <><K>Trang bạn tự viết:</K> chọn loại <K>HTML tự chứa</K> thay vì Geometry Expressions. Cách chạy y hệt nhau, chỉ khác nhãn — mô hình sẽ mang danh mục <K>HTML</K> trong Gallery chứ không bị gán cho Geometry Expressions.</>,
                <>Toàn bộ HTML được lưu trong mô hình; khi xem, HeyGeo đặt vào <Code>&lt;iframe sandbox="allow-scripts"&gt;</Code> — runtime của GE dùng <Code>eval()</Code> nên cần <Code>allow-scripts</Code>, và không cấp <Code>allow-same-origin</Code> để file nạp không đụng cookie của bạn.</>,
                <>Kéo điểm, đổi tham số trong hình là do chính trang HTML đó, không phải HeyGeo.</>,
                <><K>Ảnh cho thẻ mô hình:</K> nút <K>📷 Chụp preview</K> trong <Code>/html</Code> lấy đúng khung hình đang chạy (duyệt hỏi phép chia sẻ màn hình, bạn chọn <K>This tab</K>), HeyGeo tự cắt theo khung preview và nén thành WebP tối đa 640×360, dưới 150 KB. Có thể <K>…</K> để chọn một ảnh có sẵn; trang tải lên HTML cũng có ô <K>Ảnh xem trước</K>.</>,
                <><K>Sửa:</K> nút <K>✏️ Sửa HTML</K> mở <Code>/html?id=…</Code> — editor CodeMirror bên trái, iframe preview bên phải, ngừng gõ 1,2 giây là trang chạy lại, <K>Ctrl+Enter</K> chạy ngay, <K>Ctrl+S</K> lưu. Lưu chỉ thay <Code>htmlContent</Code> và ảnh xem trước, giữ nguyên danh mục và nhãn của mô hình.</>,
                <><K>Hoặc làm việc với file:</K> <K>📥 Tải xuống HTML</K> rồi sửa bằng trợ lý AI của bạn và <K>🔄 Thay thế file</K>; mở <Code>/html</Code> không kèm <Code>id</Code> để bắt đầu một trang trống.</>,
              ]}
            />
          </Section>

          {/* ─── 12. Share ─── */}
          <Section
            num="12"
            id="share"
            title="Gallery, liên kết chia sẻ và tương tác"
            lead="Đích của mọi dòng mô hình: một đường dẫn đưa được cho học sinh, không ai phải cài gì."
          >
            <List
              items={[
                <><K>Liên kết.</K> Mô hình công khai có URL <Code>{BASE}/share/&lt;token&gt;</Code>. Người xem không cần tài khoản, không cần đăng nhập.</>,
                <><K>Bố cục hai khung.</K> Trái là hình chạy được (kéo điểm, bấm nút, đổi tham số; khung kéo nới được trên điện thoại), phải là thông tin và bình luận.</>,
                <><K>Mô tả &amp; Hướng dẫn khảo sát.</K> Hai trường này hiển thị ở khung phải và <K>hiểu được công thức LaTeX</K>: <Code>$…$</Code> trong dòng, <Code>$$…$$</Code> thành khối.</>,
                <><K>Reaction.</K> 👍 Hay · ❤️ Thích · 😲 Tuyệt vời · 🤔 Khó hiểu (cần đăng nhập). Bình luận cũng render được LaTeX, và mỗi bình luận thích được.</>,
                <><K>Ghi nguồn tự động.</K> Chân trang đề “Được tạo bằng HeyGeo &amp; JSXGraph / Sketchpad / Web Sketchpad / GeoGebra / CindyJS / MathBox / Geometry Expressions” theo đúng nhãn mô hình.</>,
                <><K>Gallery.</K> <A href="/gallery">/gallery</A> lọc theo danh mục và theo từ trong tiêu đề/mô tả, 12 mô hình một trang, xếp theo ngày xuất bản (mới nhất trước).</>,
                <><K>Trang tác giả.</K> Bấm tên người vẽ để mở <Code>/&lt;username&gt;</Code> — liệt kê mọi mô hình công khai của người đó.</>,
              ]}
            />
          </Section>

          {/* ─── 13. Account ─── */}
          <Section
            num="13"
            id="account"
            title="Tài khoản, Dashboard và các giới hạn"
            lead="Tài khoản miễn phí để chứa và xuất bản mô hình. Người xem thì không cần tài khoản nào cả."
          >
            <List
              items={[
                <><K>Tạo mô hình.</K> Dashboard → <K>Tạo mô hình</K> (<A href="/models/new">/models/new</A>): chọn loại tệp (HeyGeo · Sketchpad · Web Sketchpad · GeoGebra · Geometry Expressions), kéo-thả hoặc chọn file, rồi đặt tiêu đề, mô tả, hướng dẫn khảo sát.</>,
                <><K>Trang chi tiết mô hình</K> (<Code>/models/&lt;id&gt;</Code>): sửa tiêu đề/mô tả/hướng dẫn, danh mục, nút <K>🌐 Công khai</K> / <K>🔒 Riêng tư</K>, <K>🔗 Sao chép link</K>, <K>🔄 Thay thế JSON</K> (nạp <code>.heyjson</code> khác đè lên cùng liên kết); với Geometry Expressions là <K>📥 Tải xuống HTML</K> và <K>🔄 Thay thế file</K>.</>,
                <><K>Xoá là vĩnh viễn.</K> Không có thùng rác cho mô hình — HeyGeo hỏi lại “Bạn có chắc muốn xoá mô hình này không?” trước khi xoá cả bản nháp lẫn bản công khai.</>,
                <><K>API Tokens</K> ở <A href="/settings">Settings</A>: để app desktop upload, và là cách để một chương trình ngoài thay mặt bạn đăng mô hình.</>,
                <><K>Giới hạn.</K> Không có hạn mức số mô hình theo quyền; giới hạn hiện thời là chống lạm dụng: 30 lượt tạo/sửa mô hình mỗi phút (“Quá nhiều yêu cầu, vui lòng thử lại sau.”), 5 lượt đăng ký mỗi giờ, 20 lượt đăng nhập mỗi phút, ảnh đại diện ≤ 2&nbsp;MB. Quản trị viên sửa được mọi mô hình.</>,
              ]}
            />
          </Section>

          {/* ─── 14. FAQ ─── */}
          <Section num="14" id="faq" title="Câu hỏi thường gặp">
            <List
              items={[
                <><K>Tôi cần tài khoản để xem một hình không?</K> Không. <Code>/share/&lt;token&gt;</Code> mở thẳng; chỉ khi bình luận hay cho reaction mới cần đăng nhập.</>,
                <><K>Nên dùng dòng nào cho tiết học?</K> Kéo thả → <A href="#design">/design</A>. Đã có file Sketchpad cũ → <A href="#gsp">.gsp</A> (sửa được tiếp) hoặc <A href="#wsp">Web Sketchpad</A>. Đã có code JSXGraph trên mạng → <A href="#jsxgraph">/coding</A>. Cần 3D/GPU → <A href="#mathbox">/mathbox</A>. Cần đại số và hình cùng lúc → <A href="#geogebra">GeoGebra</A>.</>,
                <><K>Hình có chạy khi mất mạng?</K> Xem mục <A href="#formats-online">2.2</A>. An toàn nhất là JSXGraph, Web Sketchpad, MathBox.</>,
                <><K>Sửa được mô hình GeoGebra / Geometry Expressions ngay trong HeyGeo?</K> GeoGebra: được, qua <Code>/geogebra?id=</Code>. Geometry Expressions: không, chỉ xem — sửa trong GE rồi thay file.</>,
                <><K>Import <code>.gsp</code> có mất đo lường và ảnh không?</K> Ảnh, trục, quỹ tích, Iterate thì chắc chắn chưa chuyển được; kết quả đo và phép tính thì đa số file chuyển tốt — bảng đầy đủ ở mục <A href="#gsp">6</A>.</>,
                <><K>Viết code mà sợ sai?</K> /coding, /cindy, /mathbox đều chạy lại khi bạn ngừng gõ và hiện lỗi trong banner <K>⚠ Runtime</K>, nên bạn biết lỗi ở đâu thay vì thấy khung trắng.</>,
                <><K>Có AI giúp không?</K> Có: ghost-text gợi ý tiếp code trong /coding (Groq), nhận bằng phím <K>Tab</K>.</>,
                <><K>Làm sao để mô hình của bạn hữu ích thật?</K> Viết <K>Hướng dẫn khảo sát</K> — học sinh là người cần nó nhất, và nó hiện ngay cạnh hình.</>,
              ]}
            />
          </Section>

          {/* ─── 15. Troubleshooting ─── */}
          <Section
            num="15"
            id="fix"
            title="Khắc phục sự cố"
            lead="Gặp một trong các thông báo dưới đây, nguyên nhân và cách xử lý đã có sẵn."
          >
            <DocTable
              head={['Bạn thấy', 'Nguyên nhân', 'Cách xử lý']}
              rows={[
                ['Không đọc được đối tượng nào từ file .gsp này.', '.gsp dạng ZIP/nén của Sketchpad 5 mới, hoặc file có mật khẩu.', 'Export .json / -json.js từ Web Sketchpad rồi nạp theo mục 5.'],
                ['Khung xem trắng với mô hình CindyJS.', 'Không vào được cindyjs.org (mất mạng, chặn CDN).', 'Kiểm tra mạng, hoặc chuyển sang JSXGraph / MathBox (mục 2.2).'],
                ['Khung trắng với mô hình GeoGebra.', 'cdn.geogebra.org không tải được.', 'Mở lại khi có mạng; buổi offline thì dùng JSXGraph hoặc MathBox.'],
                ['Không thể tải engine JSXGraph. Kiểm tra kết nối mạng.', 'File /vendor/jsxgraph bị chặn hoặc chưa đồng bộ lên máy chủ.', 'Tải lại trang; quản trị kiểm tra public/vendor/jsxgraph.'],
                ['Banner ⚠ Runtime trong editor code.', 'Code ném lỗi khi chạy (thiếu biến, sai tên toán tử).', 'Đọc đúng dòng lỗi; với MathBox nhớ emit() và plugins + controls (mục 9).'],
                ['Thiếu MathBox.mathBox(…).', 'Code /mathbox không có lời gọi khởi tạo.', 'Lấy mẫu 🧊 MathBox Basic → ⚙️ Khởi tạo rồi viết tiếp.'],
                ['Lưới và trục hiện, đường thì mất.', 'expr viết kiểu return thay vì emit.', 'expr: (emit, x, i, t) => emit(x, f(x), 0).'],
                ['Nhãn LaTeX hiện nguyên mã \\text{…}.', 'Bảng chưa bật KaTeX.', 'board.options.text.useKatex = true (JSXGraph), hoặc $…$ trong Mô tả / Hướng dẫn khảo sát.'],
                ['Bạn chưa lưu. Nhập tệp mới sẽ mất dữ liệu hiện tại. Tiếp tục?', 'File Import sẽ đè hình đang soạn.', 'Lưu hoặc copy hình đang làm trước khi bấm Tiếp tục.'],
                ['Quá nhiều yêu cầu, vui lòng thử lại sau.', 'Vượt giới hạn 30 lượt tạo/sửa mô hình mỗi phút.', 'Chờ một phút; tránh lưu quá dày.'],
                ['Hình trong Gallery là ảnh minh họa chung.', 'Mô hình GeoGebra chưa có ảnh chụp từ editor.', 'Mở /geogebra?id= và lưu một lần để HeyGeo chụp thu nhỏ.'],
              ]}
            />
          </Section>

          {/* ─── 16. Contact ─── */}
          <Section
            num="16"
            id="contact"
            title="Liên hệ & đóng góp"
            lead="HeyGeo là dự án cá nhân, phi lợi nhuận, tự host — mọi góp ý đều được trân trọng."
          >
            <div className="my-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-extrabold text-brand-900">
                MP
              </div>
              <div className="min-w-0">
                <div className="font-bold text-gray-900">Nguyễn Đăng Minh Phúc</div>
                <div className="text-sm text-gray-500">
                  Tác giả HeyGeo · <A href="https://www.ganjingworld.com/@ndmphuc">ganjingworld.com/@ndmphuc</A> ·{' '}
                  <A href="https://signal.me/#p/+84979555375">Signal +84 979 555 375</A>
                </div>
              </div>
            </div>
            <List
              items={[
                <><K>Dùng và chia sẻ.</K> Xuất bản hình của bạn và gửi link — mỗi mô hình trong Gallery là một lời giới thiệu.</>,
                <><K>Báo lỗi / xin tính năng.</K> Bình luận ngay dưới mô hình liên quan, hoặc nhắn Signal; mô tả cụ thể (bước thao tác, điều mong đợi, mô hình kèm theo) thì dễ xử lý nhất. Danh sách mục “đang phát triển” ở 3.1 cũng lớn lên nhờ yêu cầu của người dùng.</>,
                <><K>Chia sẻ mẫu đẹp.</K> Một sketch Web Sketchpad, một cảnh MathBox hay một bộ phiếu JSXGraph bạn dựng được — cứ xuất bản; tác giả có thể đưa vào trang Help này kèm tên bạn.</>,
                <><K>Ý tưởng nội dung.</K> Đề xuất ví dụ, snippet, hoặc mục hướng dẫn còn thiếu trong trang này.</>,
              ]}
            />
            <Callout tone="info">
              HeyGeo chạy trên hạ tầng cá nhân nên tài nguyên có hạn — xin dùng hợp lý và không đăng nội dung vi phạm pháp
              luật hoặc bản quyền người khác.
            </Callout>
          </Section>

          {/* ─── 17. Changelog ─── */}
          <Section
            num="17"
            id="changelog"
            title="Cập nhật gần đây"
            lead="Những thay đổi đáng chú ý của HeyGeo Web, mới nhất trước."
          >
            <List
              items={[
                <><K>11/2026 — MathBox:</K> có code mode ở <A href="/mathbox">/mathbox</A> (three.js + MathBox 2.3.1 chạy trong iframe sandbox, thư viện tự host), kèm kho mẫu 🧊 Basic và 📚 Ví dụ.</>,
                <><K>11/2026 — MathBox:</K> đường và mặt không còn mất trên máy WebGL yếu: HeyGeo dò float texture, lùi sang half-float, rồi thử WebGL2 (three.js ≥165 bỏ half-float nên thứ tự là WebGL1 → WebGL2).</>,
                <><K>11/2026 — Settings:</K> tách thành nhiều tab, trình duyệt giữ bản sao cấu hình riêng.</>,
                <><K>11/2026 — Design:</K> Plot a value on a path giữ đúng số nó được vẽ từ; một đường tròn hay một độ dài khai sinh được hệ tọa độ; menu Graph theo khuôn Sketchpad và một sketch mang nhiều hệ tọa độ; lưới vẽ bằng dòng hoặc bằng chấm; Shift để ẩn hệ.</>,
                <><K>11/2026 — Design:</K> khung hình giữ hình dạng dưới con trỏ, hai điểm gốc gọi tên O và 1; tham số hành xử như số, thanh trượt mang caption riêng.</>,
                <><K>11/2026 — Sketchpad:</K> mở sketch <code>.gsp</code> ngay trong HeyGeo (mục 6) và nút của sketch bấm chạy thật.</>,
                <><K>10/2026 — Design:</K> giữ bản chưa lưu trong trình duyệt và hỏi khôi phục khi mở lại; File → Export To Image… ra PNG/JPEG; Measure đọc khoảng cách hai điểm trong hệ được đánh dấu; Transform → Mark Ratio nuôi Dilate; vẽ đa giác khép bằng một cú kéo trên điện thoại.</>,
                <><K>10/2026 — Nền tảng:</K> nâng Next.js lên bản 16 cho các cảnh báo bảo mật mà 15.5 không đóng được; Edit → Preferences đúng ba mục như bản desktop.</>,
              ]}
            />
            <P>
              Bản desktop (Windows/macOS) tải ở <A href="/release">/release</A>; mỗi file <code>.zip</code> mang ngày build
              trong tên và tự hiện là bản mới nhất của nền tảng đó.
            </P>
          </Section>
        </main>
      </div>

      <footer className="border-t border-gray-200 bg-brand-900 px-6 py-6 text-center text-sm text-amber-200">
        © {new Date().getFullYear()} HeyGeo ·{' '}
        <a href="https://www.ganjingworld.com/@ndmphuc" target="_blank" rel="noopener noreferrer" className="underline">
          Nguyễn Đăng Minh Phúc
        </a>{' '}
        · <a href="/" className="underline">Trang chủ</a>{' '}
        · <a href="#about" className="underline">Về đầu trang</a>
      </footer>
    </div>
  );
}
