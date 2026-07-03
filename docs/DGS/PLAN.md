# PLAN.md — Kế hoạch biên soạn sách
# "Khám phá Toán học với HeyGeo"

---

## 1. Thông tin tổng quan

| Trường              | Nội dung                                                                 |
|---------------------|--------------------------------------------------------------------------|
| **Tiêu đề**         | Khám phá Toán học với HeyGeo                                             |
| **Phụ đề**          | Hướng dẫn toàn diện phần mềm Hình học Động HeyGeo Desktop & Web          |
| **Ngôn ngữ**        | Tiếng Việt (thuật ngữ kỹ thuật có thể giữ tiếng Anh)                     |
| **Hệ soạn thảo**    | XeLaTeX (engine: `xelatex`)                                              |
| **Phông chữ**       | `fontspec` + Times New Roman / TeX Gyre Termes                           |
| **Sản phẩm chính**  | HeyGeo Desktop (Qt 6 / C++17) + HeyGeo Web — https://heygeo.pedu.vn      |
| **Đối tượng**       | GV phổ thông, SV sư phạm, học sinh yêu Toán                              |
| **Phiên bản**       | v0.1 (bản nháp đầu)                                                      |
| **Ngày lập kế hoạch** | 2026-04-02                                                             |

> **Lưu ý định hướng:**  
> HeyGeo là hệ sinh thái gồm **hai thành phần** phối hợp chặt chẽ:  
> - **HeyGeo Desktop** — ứng dụng Hình học Động mạnh mẽ cho macOS/Windows (Qt 6), fork của KSEG.  
> - **HeyGeo Web** (heygeo.pedu.vn) — nền tảng web (Next.js 14 + PostgreSQL + JSXGraph) gồm Web Design, Web Coding, các Viewer đa định dạng, và cộng đồng chia sẻ mô hình.  
> Sách này hướng dẫn **toàn bộ hệ sinh thái HeyGeo**, trong đó HeyGeo Desktop là xương sống và HeyGeo Web là cánh tay nối dài ra cộng đồng. Sketchpad, GeoGebra và các công cụ khác được đề cập như đối chiếu hoặc qua tính năng Viewer của HeyGeo Web.

---

## 2. Cấu trúc thư mục dự án

```
heygeo-book/
├── main.tex                  % File chính, nạp tất cả các phần
├── preamble.tex              % Khai báo gói, font, màu, lệnh tuỳ chỉnh
├── metadata.tex              % Tiêu đề, tác giả, bản quyền
├── PLAN.md                   % File kế hoạch này
│
├── front/
│   ├── cover.tex             % Bìa sách
│   ├── titlepage.tex         % Trang tựa đề
│   ├── preface.tex           % Lời nói đầu
│   ├── howto.tex             % Hướng dẫn sử dụng sách
│   └── toc.tex               % Mục lục (tự sinh)
│
├── parts/
│   ├── part1/                % Phần I
│   │   ├── part1_intro.tex
│   │   ├── ch01/
│   │   ├── ch02/
│   │   └── ch03/
│   ├── part2/                % Phần II
│   │   ├── part2_intro.tex
│   │   ├── ch04/
│   │   ├── ch05/
│   │   └── ch06/
│   ├── part3/                % Phần III
│   │   ├── part3_intro.tex
│   │   ├── ch07/
│   │   ├── ch08/
│   │   └── ch09/
│   └── part4/                % Phần IV
│       ├── part4_intro.tex
│       ├── ch10/
│       ├── ch11/
│       └── ch12/
│
├── back/
│   ├── appendix_a.tex        % Phụ lục A: Danh sách lệnh / shortcut
│   ├── appendix_b.tex        % Phụ lục B: Bảng tra nhanh công thức
│   ├── appendix_c.tex        % Phụ lục C: Tài nguyên & liên kết
│   ├── glossary.tex          % Bảng thuật ngữ Anh–Việt
│   ├── bibliography.bib      % Tài liệu tham khảo (BibLaTeX)
│   └── index.tex             % Chỉ mục từ khoá (makeindex / xindy)
│
├── figures/
│   ├── screenshots/          % Ảnh chụp màn hình HeyGeo, GeoGebra…
│   ├── tikz/                 % Hình vẽ TikZ/PGF
│   ├── exported/             % SVG/PDF xuất từ các phần mềm
│   └── placeholders/         % Hình giữ chỗ (placeholder)
│       └── placeholder.pdf   % Hình giữ chỗ mặc định
│
├── code/
│   ├── sketchpad/            % File .gsp / script Sketchpad
│   ├── websketchpad/         % JSON / embed links Web Sketchpad
│   ├── jsxgraph/             % File .html / .js JSXGraph
│   └── geogebra/             % File .ggb / embed links GeoGebra
│
├── styles/
│   ├── heygeo-book.sty       % Style tuỳ chỉnh tổng thể
│   ├── colors.tex            % Bảng màu nhất quán
│   └── environments.tex      % Định nghĩa môi trường (theorem, note…)
│
└── scripts/
    ├── build.sh              % Script biên dịch (xelatex + biber + makeindex)
    └── clean.sh              % Dọn file phụ
```

---

## 3. Cấu hình XeLaTeX — `preamble.tex` (định hướng)

```latex
% ===== ENGINE & ENCODING =====
\usepackage{fontspec}
\setmainfont{TeX Gyre Termes}        % Hoặc Times New Roman nếu có
\setsansfont{TeX Gyre Heros}
\setmonofont{JuliaMono}[Scale=0.88]

% ===== TIẾNG VIỆT =====
\usepackage{polyglossia}
\setmainlanguage{vietnamese}
\setotherlanguage{english}

% ===== LAYOUT =====
\usepackage[a4paper, margin=2.5cm, bindingoffset=1cm]{geometry}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{titletoc}

% ===== TOÁN HỌC =====
\usepackage{amsmath, amssymb, amsthm}
\usepackage{mathtools}
\usepackage{unicode-math}
\setmathfont{TeX Gyre Termes Math}

% ===== HÌNH ẢNH & MÀU SẮC =====
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{tikz}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}

% ===== MÔI TRƯỜNG ĐẶC BIỆT =====
\usepackage{tcolorbox}
\tcbuselibrary{most}
\usepackage{mdframed}

% ===== CODE & LISTING =====
\usepackage{listings}
\usepackage{minted}              % Cần -shell-escape

% ===== HYPERLINK & PDF =====
\usepackage[colorlinks=true, linkcolor=hgblue, urlcolor=hggreen]{hyperref}
\usepackage{qrcode}              % QR code liên kết tới HeyGeo

% ===== TÀI LIỆU THAM KHẢO =====
\usepackage[backend=biber, style=authoryear]{biblatex}
\addbibresource{back/bibliography.bib}

% ===== CHỈ MỤC =====
\usepackage{imakeidx}
\makeindex[columns=2, title=Chỉ mục]
```

---

## 4. Môi trường và lệnh tuỳ chỉnh (định hướng)

| Tên môi trường / lệnh   | Mục đích                                                          |
|-------------------------|-------------------------------------------------------------------|
| `\begin{hgdesktop}`     | Khung hướng dẫn thực hành trên **HeyGeo Desktop**                 |
| `\begin{hgweb}`         | Khung hướng dẫn thực hành trên **HeyGeo Web** (Design / Viewer)   |
| `\begin{hgcoding}`      | Khung code JSXGraph trong **HeyGeo Web Coding**                   |
| `\begin{wspviewer}`     | Ghi chú về Viewer Web Sketchpad trên HeyGeo Web                   |
| `\begin{ggbviewer}`     | Ghi chú về Viewer GeoGebra trên HeyGeo Web                        |
| `\begin{dgnote}`        | Ghi chú về Dynamic Geometry (lý thuyết, so sánh)                  |
| `\begin{theorem}`       | Định lý                                                           |
| `\begin{proof}`         | Chứng minh                                                        |
| `\begin{example}`       | Ví dụ có lời giải                                                 |
| `\begin{exercise}`      | Bài tập tự luyện                                                  |
| `\begin{challenge}`     | Bài toán thách thức / mở rộng                                     |
| `\begin{keyidea}`       | Ý tưởng chính cần ghi nhớ                                         |
| `\placeholder{caption}` | Hình giữ chỗ (in hộp xám + chú thích)                             |
| `\heygeolink{url}`      | In URL + QR code liên kết mô hình trên HeyGeo Web                 |
| `\appicon{ten-app}`     | Icon nhỏ nhận diện ứng dụng / công cụ                             |
| `\segfile{ten.seg}`     | Tham chiếu file ví dụ HeyGeo (`.seg` / `.sec`)                    |
| `\hgjson{...}`          | Hiện khối JSON định dạng `HeyGeoData`                             |

---

## 5. Cấu trúc nội dung sách

---

### PHẦN MỞ ĐẦU (Front Matter)

- Bìa sách
- Trang tựa đề
- Lời nói đầu — mục tiêu, đối tượng, nguồn gốc HeyGeo (fork từ KSEG), triết lý phát triển
- Hướng dẫn đọc sách — ký hiệu, quy ước, cách dùng QR code, cách đọc code JSXGraph
- Mục lục

---

### PHẦN I — NỀN TẢNG: HÌNH HỌC ĐỘNG VÀ HỆ SINH THÁI HEYGEO (2 chương)

**Mục tiêu:** Xây dựng tư duy Hình học Động và giới thiệu toàn cảnh hệ sinh thái HeyGeo.

#### Chương 1 — Hình học Động: Khái niệm và Lịch sử
- 1.1 Hình học tĩnh vs. Hình học Động — sự khác biệt căn bản
- 1.2 Lịch sử phát triển: Cabri, Geometer's Sketchpad (1991), KSEG (1999), GeoGebra, JSXGraph…
- 1.3 HeyGeo: từ KSEG đến Qt 6 — câu chuyện kế thừa và hiện đại hoá
- 1.4 Triết lý học qua khám phá (Discovery Learning) và vai trò của DGS
- 1.5 Hình học Động trong chương trình phổ thông Việt Nam
- `[PLACEHOLDER: Bản đồ tiến trình lịch sử phần mềm DG từ 1990 đến 2026]`

#### Chương 2 — Hệ sinh thái HeyGeo: Tổng quan
- 2.1 Kiến trúc tổng thể: Desktop ↔ Web ↔ Cộng đồng
- 2.2 HeyGeo Desktop — ứng dụng bàn làm việc (macOS, Linux)
- 2.3 HeyGeo Web — nền tảng web: Web Design, Web Coding, Viewer đa định dạng
- 2.4 Luồng làm việc tiêu biểu: dựng hình → upload → chia sẻ → học sinh khám phá
- 2.5 Định dạng file: `.seg` (bản vẽ), `.sec` (script), `HeyGeoData` JSON
- 2.6 Tài khoản, API Token và bảo mật
- `[PLACEHOLDER: Sơ đồ kiến trúc hệ sinh thái HeyGeo Desktop + Web + Community]`
- `[PLACEHOLDER: Ảnh chụp — luồng Desktop → Web với mũi tên chú thích]`

---

### PHẦN II — HEYGEO DESKTOP (7 chương)

**Mục tiêu:** Sử dụng thành thạo HeyGeo Desktop — từ dựng hình cơ bản đến các tính năng nâng cao.

#### Chương 3 — Bắt đầu với HeyGeo Desktop
- 3.1 Cài đặt trên macOS (Homebrew Qt) và Linux (apt)
- 3.2 Giao diện: thanh công cụ, canvas, thanh trạng thái, menu
- 3.3 Mở file mẫu đi kèm (`examples/`) — khám phá ngay từ đầu
- 3.4 Thao tác chuột cơ bản: click dựng → kéo khám phá → chọn nhóm
- 3.5 Lưu, mở file `.seg`; xuất ảnh PNG/JPEG
- 3.6 Cấu hình: phông chữ, màu nền, đơn vị đo
- `[PLACEHOLDER: Ảnh chụp giao diện HeyGeo Desktop — chú thích từng vùng]`

#### Chương 4 — Dựng hình cơ bản
- 4.1 Điểm tự do (`Point`) và điểm trên đối tượng (`Point on Object`)
- 4.2 Đoạn thẳng, Tia, Đường thẳng
- 4.3 Đường tròn: qua tâm–bán kính và qua tâm–điểm trên đường tròn
- 4.4 Cung tròn, Hình quạt (`Arc Sector`), Đoạn cung (`Arc Segment`)
- 4.5 Đa giác (`Polygon`) và phần trong đường tròn (`Circle Interior`)
- 4.6 Trung điểm, Giao điểm, Đường vuông góc, Đường song song, Tia phân giác
- 4.7 Hiệu ứng hover và nhận diện đối tượng khi dựng hình
- `[PLACEHOLDER: Hình minh hoạ — dựng tam giác ngoại tiếp đường tròn từng bước]`
- **Ví dụ mẫu:** `circumcircle.seg` — đường tròn ngoại tiếp; `HeyGeo_dinhlyThales.seg` — định lý Thalès

#### Chương 5 — Đo lường, Tính toán và Phân tích Thứ nguyên
- 5.1 Hệ thống đo lường: độ dài, khoảng cách, bán kính, góc, diện tích, hệ số góc
- 5.2 Tọa độ, tung độ, hoành độ — tính theo hệ tọa độ tự định nghĩa
- 5.3 Phương trình đường thẳng và đường tròn
- 5.4 Lệnh `Calculate` — xây dựng biểu thức toán từ các giá trị đo được
- 5.5 Phân tích thứ nguyên tự động: `AD/1cm` (vô thứ nguyên), `AD × AB` (cm²)
- 5.6 Chuỗi tính toán lồng nhau: dùng kết quả `Calculate` trong công thức mới
- 5.7 Biểu diễn giá trị đo như điểm trên trục tọa độ
- `[PLACEHOLDER: Hình minh hoạ — panel đo lường hiển thị AB, góc, diện tích]`
- `[PLACEHOLDER: Hình minh hoạ — chuỗi Calculate: AB→AB²→AB²+BC²→so sánh AC²]`
- **Ví dụ mẫu:** `HeyGeo_CoordinateDistance.seg`

#### Chương 6 — Phép biến đổi Hình học
- 6.1 Tịnh tiến (`Translate`) — theo vector véc-tơ tự do hoặc cố định
- 6.2 Đối xứng qua điểm (`Rotate 180°`) và đối xứng qua đường (`Reflect`)
- 6.3 Quay (`Rotate`) — góc cố định hoặc góc đo được từ hình
- 6.4 Vị tự (`Dilate`) — ảnh co giãn qua tâm với tỉ số
- 6.5 Tổng hợp nhiều phép biến đổi — chuỗi ánh xạ
- 6.6 Áp dụng phép biến đổi lên nhóm đối tượng
- `[PLACEHOLDER: Hình minh hoạ — tam giác và ảnh qua phép quay 60°]`
- **Ví dụ mẫu:** `HeyGeo_BT.PhepDoiXungTam.seg`, `HeyGeo_PhepTinhTien.seg`

#### Chương 7 — Quỹ tích và Script Dựng hình
- 7.1 Quỹ tích (`Locus`) — nguyên lý và cách dùng
- 7.2 Điểm kéo trên đối tượng (`Point on Object`) — điểm dẫn quỹ tích
- 7.3 Vẽ quỹ tích: từ trực quan đến định nghĩa toán học
- 7.4 Script dựng hình (`.sec`) — ghi lại quy trình dựng hình
- 7.5 Phát lại script từng bước (`Quick Play`)
- 7.6 Áp dụng script cho nhiều bộ điểm đầu vào khác nhau
- `[PLACEHOLDER: Hình minh hoạ — quỹ tích trực tâm tam giác khi kéo đỉnh]`
- `[PLACEHOLDER: Hình minh hoạ — fractal Koch vẽ bằng script .sec]`
- **Ví dụ mẫu:** `HeyGeo_QuytichTructam.seg`, `locus.seg`, `prettylocus.seg`, `tractix.seg`, `julia.sec`, `koch.sec`, `sierp.sec`, `isogonal.sec`, `kiepert.sec`

#### Chương 8 — Hệ tọa độ, Đồ thị Hàm số và Đường cong Tham số
- 8.1 Tạo hệ tọa độ tương tác — điểm gốc O và điểm đơn vị U
- 8.2 Các kiểu lưới: vuông, chữ nhật, cực, lượng giác
- 8.3 Vẽ đồ thị hàm số `y = f(x)` — cú pháp biểu thức
- 8.4 Vẽ đường cong tham số `(x(t), y(t))`
- 8.5 Liên kết giá trị đo lường với trục tọa độ — trực quan hoá động
- 8.6 Kết hợp hình học phẳng và đồ thị — ứng dụng giải tích
- `[PLACEHOLDER: Hình minh hoạ — đồ thị y=sin(x) + điểm liên kết từ giá trị đo góc]`
- **Ví dụ mẫu:** `HeyGeo_dothiHS.seg`, `HeyGeo_DothiHS_phanthuc.seg`, `bezier-cubic.seg`, `sinus.seg`

#### Chương 9 — Nhãn LaTeX, Xuất và Đăng tải lên HeyGeo Web
- 9.1 Nhãn công thức LaTeX trên đối tượng — bộ hiển thị `KFormula` tích hợp
- 9.2 Tuỳ chỉnh phông chữ, màu sắc, kích thước nhãn
- 9.3 Xuất hình ảnh PNG/JPEG/BMP ở độ phân giải HiDPI/Retina
- 9.4 Định dạng `HeyGeoData` JSON — cấu trúc và vai trò cầu nối Desktop↔Web
- 9.5 Tạo API Token trên HeyGeo Web
- 9.6 Đăng tải mô hình lên HeyGeo Web — tiêu đề, mô tả, hướng dẫn khám phá, trạng thái công khai
- 9.7 Kiểm tra và cập nhật mô hình đã đăng
- `[PLACEHOLDER: Ảnh chụp — dialog "Đăng lên HeyGeo Web" trong Desktop]`
- `[PLACEHOLDER: Ảnh chụp — trang mô hình trên heygeo.pedu.vn sau khi upload]`

---

### PHẦN III — HEYGEO WEB (5 chương)

**Mục tiêu:** Khai thác đầy đủ nền tảng HeyGeo Web — dựng hình, lập trình, xem đa định dạng và tham gia cộng đồng.

#### Chương 10 — HeyGeo Web Design: Dựng hình không cần cài đặt
- 10.1 Truy cập Web Design tại `/design` — không cần tài khoản để thử
- 10.2 Giao diện: thanh công cụ trái, canvas giữa, bảng thuộc tính phải
- 10.3 Dựng hình cơ bản trên trình duyệt — điểm, đoạn, đường tròn, đa giác…
- 10.4 Tuỳ chỉnh màu sắc, kiểu đường, nhãn trong bảng thuộc tính
- 10.5 Lưu lên tài khoản, công bố mô hình và tạo link chia sẻ
- 10.6 So sánh HeyGeo Desktop ↔ Web Design — khi nào dùng cái nào?
- `[PLACEHOLDER: Ảnh chụp giao diện HeyGeo Web Design — chú thích từng vùng]`

#### Chương 11 — HeyGeo Web Coding: Lập trình JSXGraph cơ bản
- 11.1 Truy cập Web Coding tại `/coding` — trình soạn thảo code tích hợp
- 11.2 Cấu trúc board JSXGraph: `JXG.JSXGraph.initBoard`, `boundingbox`, `axis`
- 11.3 Dựng điểm, đoạn thẳng, đường tròn, đa giác qua API
- 11.4 Thuộc tính đối tượng: `strokeColor`, `fillColor`, `dash`, `size`, `name`…
- 11.5 Snippet menu — chèn mã mẫu một click; autocomplete chuyên biệt JSXGraph
- 11.6 Chạy thử ngay lập tức — xem kết quả bên cạnh code
- 11.7 Lưu và công bố mô hình từ Web Coding
- `[PLACEHOLDER: Ảnh chụp Web Coding — code bên trái, canvas bên phải]`

```js
// Ví dụ khởi động: đường tròn ngoại tiếp tam giác
const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 5, 5, -5], axis: true
});
const A = board.create('point', [-2, -1], {name: 'A'});
const B = board.create('point', [ 2, -1], {name: 'B'});
const C = board.create('point', [ 0,  3], {name: 'C'});
board.create('circumcircle', [A, B, C], {strokeColor: '#e74c3c'});
```

#### Chương 12 — HeyGeo Web Coding: JSXGraph Nâng cao
- 12.1 Điểm kéo-thả (`fixed: false`) và điểm trượt trên đối tượng (`glider`)
- 12.2 Slider — `JXG.createElement('slider')`; liên kết với tham số hình học
- 12.3 Vẽ đồ thị hàm số: `functiongraph`, `curve` tham số
- 12.4 Hiển thị giá trị động: `text` với hàm callback
- 12.5 Sự kiện: `on('drag')`, `on('update')` — xử lý tương tác tùy chỉnh
- 12.6 Animation: `startAnimation`, `stopAnimation`
- 12.7 Các đối tượng đặc biệt: `angle`, `midpoint`, `perpendicularsegment`, `intersection`
- 12.8 Gỡ lỗi (debugging) JSXGraph trong DevTools trình duyệt
- `[PLACEHOLDER: Hình minh hoạ — y=a·sin(bx+c) điều khiển bằng 3 slider]`
- `[PLACEHOLDER: Hình minh hoạ — điểm glider trên đường tròn, quỹ tích JSXGraph]`

#### Chương 13 — Định dạng HeyGeoData JSON và Viewer
- 13.1 Cấu trúc `HeyGeoData` JSON: `version`, `boundingbox`, `axis`, `grid`, `elements`
- 13.2 Phần tử `HeyGeoElement`: `type`, `id`, `parents`, `attrs`
- 13.3 Quy tắc `parents`: số (tọa độ/bán kính) và chuỗi (ID tham chiếu), thứ tự khai báo
- 13.4 Bảng tra các `type` thường dùng — đối chiếu với HeyGeo Desktop

| `type` (JSON) | Tương đương Desktop | Chú thích |
|---|---|---|
| `"point"` | Point | `parents: [x, y]` |
| `"segment"` | Segment | `parents: ["P1","P2"]` |
| `"line"` | Line | `parents: ["P1","P2"]` |
| `"circle"` | Circle | tâm + bán kính hoặc điểm trên đường |
| `"polygon"` | Polygon | danh sách ID điểm |
| `"angle"` | Angle measure | `["A","B","C"]` — góc tại B |
| `"midpoint"` | Midpoint | `["P1","P2"]` |
| `"functiongraph"` | Graph `y=f(x)` | `["expr_str", x_min, x_max]` |
| `"slider"` | Parameter slider | `[[x,y],[x2,y2],[min,start,max]]` |
| `"glider"` | Point on Object | `[x, y, "obj_id"]` |
| `"intersection"` | Intersection | `["obj1","obj2", index]` |

- 13.5 HeyGeo Viewer — mở file JSON từ Desktop hoặc dán `HeyGeoData` trực tiếp
- 13.6 Web Sketchpad Viewer — xem file `.json` xuất từ Geometer's Sketchpad
- 13.7 GeoGebra Viewer — nhúng applet GeoGebra qua embed code
- 13.8 LaTeX Editor — soạn và hiển thị công thức trên HeyGeo Web
- `[PLACEHOLDER: Ảnh chụp HeyGeo Viewer với mô hình ngoại tiếp tam giác]`
- `[PLACEHOLDER: Ảnh chụp WSP Viewer với file GSP mẫu]`

#### Chương 14 — Cộng đồng HeyGeo: Chia sẻ và Khám phá
- 14.1 Tạo tài khoản, đăng nhập, trang cá nhân
- 14.2 Công bố mô hình: tiêu đề, mô tả Markdown, hướng dẫn khám phá, ảnh thumbnail (SVG từ Desktop)
- 14.3 Link chia sẻ `heygeo.pedu.vn/share/<token>` — học sinh không cần đăng ký
- 14.4 Thư viện công khai — duyệt, tìm kiếm, tái sử dụng mô hình cộng đồng
- 14.5 Quản lý bộ sưu tập cá nhân: sắp xếp, chỉnh sửa, ẩn/hiện mô hình
- 14.6 Gắn mô hình HeyGeo vào trang LMS (Moodle, Google Classroom…) qua iframe
- `[PLACEHOLDER: Ảnh chụp trang thư viện công khai HeyGeo Web]`
- `[PLACEHOLDER: Ảnh chụp trang chia sẻ mô hình — giao diện học sinh]`

---

### PHẦN IV — ỨNG DỤNG: CÁC CHỦ ĐỀ TOÁN HỌC (5 chương)

**Mục tiêu:** Bài học mẫu hoàn chỉnh theo chủ đề — từ hình vẽ Desktop đến mô hình Web chia sẻ.

> Cấu trúc mỗi chương: Lý thuyết → Dựng hình Desktop từng bước → File mẫu → Upload Web → QR code

#### Chương 15 — Hình học phẳng
- 15.1 Tam giác: đường cao, đường trung tuyến, đường phân giác, đường trung trực
- 15.2 Đường tròn ngoại tiếp, nội tiếp, bàng tiếp
- 15.3 Tứ giác đặc biệt: hình bình hành, hình thoi, hình thang cân
- 15.4 Góc nội tiếp, góc tâm, định lý tiếp tuyến
- 15.5 Bài toán quỹ tích — khám phá bằng Locus
- `[PLACEHOLDER: Mô hình — trực tâm, trọng tâm, tâm ngoại tiếp trên cùng một hình]`
- **File mẫu đi kèm:** `circumcircle.seg`, `HeyGeo_QuytichTructam.seg`, `HeyGeo_Cung_day_cung.seg`, `HeyGeo_QuytichBaohinh.seg`, `radicalaxis.sec`

#### Chương 16 — Phép biến đổi và Đối xứng
- 16.1 Đối xứng trục, đối xứng tâm — trực quan hoá bằng kéo điểm
- 16.2 Phép tịnh tiến — vectơ tịnh tiến động
- 16.3 Phép quay — tâm quay, góc quay kết nối với phép đo
- 16.4 Phép vị tự — tỉ số động điều khiển bằng biểu thức
- 16.5 Tổng hợp phép biến đổi — phép đồng nhất, chu kỳ
- `[PLACEHOLDER: Hình minh hoạ — hoa văn tạo bởi phép quay lặp]`
- **File mẫu đi kèm:** `HeyGeo_BT.PhepDoiXungTam.seg`, `HeyGeo_PhepTinhTien.seg`, `HeyGeo_Tong3vectoTamgiac.seg`

#### Chương 17 — Đại số và Đồ thị Hàm số
- 17.1 Hàm bậc hai `y = ax² + bx + c` — slider a, b, c; dịch chuyển đồ thị
- 17.2 Hàm lượng giác — biên độ, chu kỳ, pha ban đầu bằng Web Coding
- 17.3 Hàm mũ và logarit — so sánh tốc độ tăng trưởng
- 17.4 Đồ thị hàm số phân thức — điểm gián đoạn, tiệm cận
- 17.5 Đường cong Bézier — điều khiển bằng điểm neo
- `[PLACEHOLDER: Đồ thị y=a·sin(bx+c) — 3 slider điều khiển trong Web Coding]`
- **File mẫu:** `HeyGeo_dothiHS.seg`, `HeyGeo_DothiHS_phanthuc.seg`, `bezier-cubic.seg`, `sinus.seg`

#### Chương 18 — Giải tích
- 18.1 Giới hạn — trực quan hoá ε–δ bằng hình học động
- 18.2 Đạo hàm — tiếp tuyến động, hệ số góc theo thời gian thực
- 18.3 Tích phân — diện tích dưới đồ thị, tổng Riemann bằng Web Coding (slider n)
- 18.4 Đường cong đặc biệt: tractrix, cycloid, cardioid từ quỹ tích
- `[PLACEHOLDER: Hình minh hoạ — tiếp tuyến di chuyển trên đồ thị y=sin(x)]`
- `[PLACEHOLDER: Hình minh hoạ — tổng Riemann n=5→50 bằng slider]`
- **File mẫu:** `tractix.seg`, `tractix.sec`, `prettylocusgenerator.sec`

#### Chương 19 — Hình học Không gian, Fractal và Bài toán Nâng cao
- 19.1 Hình học không gian 2D: thiết diện biểu diễn phẳng bằng phép chiếu
- 19.2 Fractal trên HeyGeo: Julia, Koch, Sierpiński bằng script `.sec`
- 19.3 Tam giác hóa Delaunay và bao lồi (`delaunay.seg`)
- 19.4 Các đường cong đặc biệt: liên hợp đẳng giác, Hyperbola Kiepert
- 19.5 Nhân bài toán lớn: locus phức, chi tiết nhiều lớp (large.seg, largelocus.seg)
- `[PLACEHOLDER: Hình minh hoạ — tập hợp Julia tạo bằng HeyGeo script]`
- `[PLACEHOLDER: Hình minh hoạ — đường cong Koch bước 5]`
- **File mẫu:** `julia.seg`, `julia.sec`, `koch.sec`, `sierp.sec`, `isogonal.sec`, `kiepert.sec`, `kiepert2.sec`, `kiepert3.sec`, `delaunay.seg`, `large.seg`, `largelocus.seg`, `20cell.seg`

---

### PHẦN V — THIẾT KẾ BÀI HỌC VÀ ĐÁNH GIÁ (3 chương)

**Mục tiêu:** Hướng dẫn GV thiết kế bài học DG hoàn chỉnh, tích hợp HeyGeo vào lớp học.

#### Chương 20 — Thiết kế bài học khám phá (Inquiry-Based Learning)
- 20.1 Mô hình GEM: Guided Exploration → Experiment → Make sense
- 20.2 Viết mục tiêu học tập gắn với hình học động
- 20.3 Thiết kế câu hỏi dẫn dắt (guiding questions) cho mô hình HeyGeo
- 20.4 Tích hợp HeyGeo vào tiến trình dạy học 5 bước: Khởi động → Hình thành → Luyện tập → Vận dụng → Tổng kết
- 20.5 Từ hình vẽ Desktop đến hoạt động học sinh trên Web — quy trình hoàn chỉnh
- `[PLACEHOLDER: Sơ đồ — quy trình GV thiết kế bài học với HeyGeo từ A đến Z]`

#### Chương 21 — Đánh giá trong môi trường Hình học Động
- 21.1 Rubric đánh giá kỹ năng sử dụng HeyGeo Desktop và Web
- 21.2 Câu hỏi nhúng và phiếu học tập tương tác gắn link HeyGeo Web
- 21.3 Theo dõi mô hình học sinh đăng tải — đánh giá sản phẩm số
- 21.4 Đánh giá đồng đẳng (peer assessment) qua thư viện mô hình HeyGeo Web

#### Chương 22 — Dự án và Kết nối Cộng đồng
- 22.1 Thiết kế dự án Toán học với HeyGeo (Project-Based Learning)
- 22.2 Gợi ý chủ đề dự án cấp THCS và THPT
- 22.3 Tổ chức cuộc thi thiết kế mô hình HeyGeo trong lớp học
- 22.4 Đóng góp mô hình lên thư viện cộng đồng HeyGeo Web
- 22.5 Liên kết mô hình HeyGeo với GeoGebra, Desmos, Wolfram Alpha

---

### PHẦN CUỐI (Back Matter)

- **Phụ lục A** — Bảng tra nhanh: phím tắt HeyGeo Desktop + menu chính
- **Phụ lục B** — Bảng tra `HeyGeoData` JSON: tất cả `type` và `attrs` thông dụng
- **Phụ lục C** — Danh sách file ví dụ (`examples/`) — nội dung và chủ đề toán
- **Phụ lục D** — API HeyGeo Web: endpoint, token, request/response mẫu
- **Phụ lục E** — Tài nguyên bổ sung: JSXGraph docs, cộng đồng, fontspec LaTeX
- **Bảng thuật ngữ** — Anh–Việt: Dynamic Geometry, Locus, Glider, Slider, Applet, HeyGeoData…
- **Tài liệu tham khảo** (BibLaTeX)
- **Chỉ mục** (Index)

---

## 6. Hệ thống Placeholder

Mọi hình minh hoạ chưa có sẽ sử dụng lệnh `\placeholder`:

```latex
% Định nghĩa trong environments.tex
\newcommand{\placeholder}[2][8cm]{%
  \begin{center}
    \fbox{%
      \begin{minipage}[c][4cm]{#1}
        \centering
        \textcolor{gray}{\Large\faImage}\\[0.5em]
        \textcolor{gray}{\small\itshape #2}
      \end{minipage}%
    }
  \end{center}
}
```

Dùng trong file `.tex`:
```latex
\placeholder[12cm]{Ảnh chụp màn hình: Slider điều khiển hàm sin trong GeoGebra}
\placeholder{Mô hình Sketchpad: Tam giác ABC kéo đỉnh A}
```

---

## 7. Hệ thống QR Code liên kết HeyGeo

Mỗi mô hình trực tuyến đều đi kèm QR code và URL rút gọn:

```latex
% Lệnh tuỳ chỉnh
\newcommand{\heygeolink}[2]{%
  \begin{tcolorbox}[colback=hgblue!5, colframe=hgblue, title={\faLink\ Xem trực tuyến trên HeyGeo}]
    \begin{minipage}{0.75\linewidth}
      \url{#1}\\[0.3em]
      \small #2
    \end{minipage}%
    \hfill
    \begin{minipage}{0.2\linewidth}
      \qrcode[height=1.8cm]{#1}
    \end{minipage}
  \end{tcolorbox}
}
```

---

## 8. Bảng màu sách (`colors.tex`)

```latex
% ===== HEYGEO BRAND =====
\definecolor{hgblue}{HTML}{1A73E8}    % Màu chủ HeyGeo — link, tiêu đề
\definecolor{hggreen}{HTML}{34A853}   % Nhấn xanh lá — thành công, URL
\definecolor{hgorange}{HTML}{FA7B17}  % Cam — thách thức, cảnh báo
\definecolor{hgred}{HTML}{EA4335}     % Đỏ — lỗi, chú ý đặc biệt
\definecolor{hggray}{HTML}{5F6368}    % Xám — văn bản phụ, chú thích

% ===== HEYGEO COMPONENTS =====
\definecolor{desktopcolor}{HTML}{1A73E8}   % HeyGeo Desktop — xanh dương
\definecolor{webdesigncolor}{HTML}{34A853} % HeyGeo Web Design — xanh lá
\definecolor{codingcolor}{HTML}{FF6600}    % HeyGeo Web Coding — cam JSXGraph
\definecolor{viewercolor}{HTML}{9900CC}    % Viewer (WSP/GGb/LaTeX) — tím

% ===== EXTERNAL TOOLS (dùng trong Viewer chapters) =====
\definecolor{sketchcolor}{HTML}{0066CC}    % Web Sketchpad
\definecolor{geogebracolor}{HTML}{9900CC}  % GeoGebra
\definecolor{jsxcolor}{HTML}{FF6600}       % JSXGraph
```

---

## 9. Quy trình biên dịch (`build.sh`)

```bash
#!/bin/bash
# build.sh — Biên dịch sách XeLaTeX hoàn chỉnh
set -e
MAIN="main"

echo "=== Lần 1: xelatex ==="
xelatex -shell-escape -interaction=nonstopmode $MAIN.tex

echo "=== Biber (tài liệu tham khảo) ==="
biber $MAIN

echo "=== Makeindex (chỉ mục) ==="
makeindex $MAIN.idx

echo "=== Lần 2: xelatex ==="
xelatex -shell-escape -interaction=nonstopmode $MAIN.tex

echo "=== Lần 3: xelatex (hoàn chỉnh cross-references) ==="
xelatex -shell-escape -interaction=nonstopmode $MAIN.tex

echo "=== Hoàn thành: $MAIN.pdf ==="
```

---

## 10. Lịch trình biên soạn (đề xuất)

| Giai đoạn | Nội dung                                                          | Thời gian ước tính |
|-----------|-------------------------------------------------------------------|--------------------|
| **G1**    | Thiết lập cấu trúc dự án, preamble, styles, môi trường LaTeX     | 1–2 tuần            |
| **G2**    | Biên soạn Phần I (Ch 1–2): nền tảng DG + hệ sinh thái HeyGeo    | 2–3 tuần             |
| **G3**    | Biên soạn Phần II (Ch 3–6): HeyGeo Desktop cơ bản               | 4–5 tuần             |
| **G4**    | Biên soạn Phần II (Ch 7–9): Locus, Script, Đồ thị, Xuất/Upload  | 3–4 tuần             |
| **G5**    | Biên soạn Phần III (Ch 10–14): HeyGeo Web                       | 4–5 tuần             |
| **G6**    | Biên soạn Phần IV (Ch 15–19): Ứng dụng toán học                 | 5–7 tuần             |
| **G7**    | Biên soạn Phần V (Ch 20–22): Thiết kế bài học & Đánh giá        | 2–3 tuần             |
| **G8**    | Thu thập & chèn hình ảnh thực, thay placeholder                  | 2–3 tuần            |
| **G9**    | Phụ lục, Thuật ngữ, Tài liệu tham khảo, Index                   | 1–2 tuần             |
| **G10**   | Review nội bộ, hiệu đính, layout cuối                            | 2–3 tuần            |
| **G11**   | In thử, phản hồi beta, chỉnh sửa cuối                           | 2–4 tuần             |
| **TỔNG**  |                                                                   | **~7–10 tháng**    |

---

## 11. Gói LaTeX cần cài đặt (TeX Live / MiKTeX)

```
fontspec, polyglossia, geometry, fancyhdr, titlesec, titletoc,
amsmath, amssymb, amsthm, mathtools, unicode-math,
graphicx, xcolor, tikz, pgfplots, tcolorbox, mdframed,
listings, minted, hyperref, qrcode, biblatex, imakeidx,
fontawesome5, booktabs, longtable, array, multirow,
microtype, setspace, parskip, enumitem, caption, subcaption,
csquotes
```

> **Ghi chú:** `minted` yêu cầu Python + Pygments và flag `-shell-escape` khi biên dịch.  
> Dùng `listings` như fallback nếu môi trường không cho phép `-shell-escape`.

---

## 12. Đề xuất mở rộng trong tương lai

- [ ] **Phiên bản song ngữ** Anh–Việt (dùng `\iflanguage`)
- [ ] **Phiên bản e-book** (EPUB/HTML) từ nguồn LaTeX bằng `tex4ht` hoặc `lwarp`
- [ ] **Trang web đi kèm** (MkDocs / Quarto) với iframe nhúng mô hình HeyGeo live
- [ ] **Video hướng dẫn** liên kết QR từng chương (screencasts HeyGeo Desktop + Web)
- [ ] **Ngân hàng bài tập** xuất ra PDF riêng (exercise booklet)
- [ ] **Bộ đề kiểm tra** với đáp án ẩn (gói `answers`)
- [ ] **Tích hợp CI/CD** (GitHub Actions) tự động build PDF khi push code
- [ ] **Cập nhật liên tục** khi HeyGeo Desktop / Web ra tính năng mới

---

*Kế hoạch lập ngày 2026-04-02. Cập nhật theo tiến độ thực tế.*