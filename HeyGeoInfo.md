# HeyGeo — Nền Tảng Hình Học Động Tương Tác Dành Cho Giáo Dục Toán Học

> **Tác giả:** Nguyễn Đăng Minh Phúc  
> **Đơn vị:** Trường THPT Chuyên Quốc Học, Huế  
> **Website:** [heygeo.pedu.vn](https://heygeo.pedu.vn)  
> **Ngày:** Tháng 4 năm 2026

---

## 1. Tóm tắt sản phẩm

**HeyGeo** là một nền tảng hình học động tương tác mã nguồn mở, được thiết kế phục vụ dạy và học Toán ở bậc trung học và đại học. Nền tảng gồm hai thành phần tích hợp: **HeyGeo Desktop** — ứng dụng máy tính để bàn đa nền tảng xây dựng trên Qt 6 / C++17, và **HeyGeo Web** tại [heygeo.pedu.vn](https://heygeo.pedu.vn) — nơi giáo viên và học sinh có thể tạo, khám phá và chia sẻ các mô hình toán học ngay trên trình duyệt mà không cần cài đặt thêm bất kỳ phần mềm nào.

HeyGeo được xây dựng từ nhu cầu thực tiễn của giáo dục Toán học Việt Nam: các công cụ hình học động hiện có hoặc là bản quyền thương mại đắt tiền, hoặc thiếu hỗ trợ tiếng Việt và không phù hợp với hạ tầng kỹ thuật của đa số trường phổ thông. HeyGeo ra đời để lấp đầy khoảng trống đó — **miễn phí, mã nguồn mở, chạy được trên mọi thiết bị, và được tối ưu cho người dùng Việt Nam**.

---

## 2. Bối cảnh và Vấn đề

### 2.1. Toán hình học trong giáo dục Việt Nam

Hình học là một trong những nền tảng của chương trình Toán phổ thông Việt Nam, từ cấp Tiểu học đến Trung học Phổ thông. Tuy nhiên, cách dạy hình học truyền thống — với bảng đen, phấn trắng và thước kẻ tĩnh — đang bộc lộ những hạn chế rõ ràng trong thời đại số:

- **Thiếu tính trực quan động**: Học sinh nhìn vào hình vẽ tĩnh và khó hình dung được điều gì xảy ra khi các yếu tố thay đổi. Ví dụ, để hiểu "đường trung trực của một đoạn thẳng là quỹ tích các điểm cách đều hai đầu mút", học sinh cần thấy điểm di chuyển, không phải chỉ đọc định nghĩa.
- **Khó kiểm chứng nhận xét**: Trong giờ học, nếu học sinh nêu một phỏng đoán ("Có phải trọng tâm luôn nằm bên trong tam giác không?"), giáo viên mất nhiều thời gian để vẽ nhiều trường hợp lên bảng và kiểm chứng.
- **Thiếu công cụ miễn phí phù hợp**: Phần mềm thương mại như Geometer's Sketchpad (GSP) hay Cabri có bản quyền theo trường, học sinh không thể dùng ở nhà. GeoGebra là lựa chọn miễn phí phổ biến nhưng server đặt ở nước ngoài, tốc độ truy cập từ Việt Nam đôi khi không ổn định, và giao diện chưa được tối ưu cho thiết bị giá rẻ phổ biến tại Việt Nam.

### 2.2. Khoảng trống công nghệ

Không có sản phẩm nào hiện tại đáp ứng đầy đủ cả ba yêu cầu: **(1) miễn phí và mã nguồn mở, (2) hoạt động tốt trên hạ tầng Việt Nam, (3) có đầy đủ tính năng của phần mềm thương mại**. HeyGeo được xây dựng để trở thành câu trả lời cho khoảng trống này.

---

## 3. Giải pháp: HeyGeo

### 3.1. Triết lý thiết kế

HeyGeo được thiết kế theo triết lý **"từ khám phá đến hiểu biết"**: thay vì trình bày định lý rồi yêu cầu học sinh ghi nhớ, HeyGeo tạo ra môi trường để học sinh **tự khám phá** quy luật thông qua quan sát tương tác. Giáo viên không cần nói "đường trung tuyến chia tam giác thành 6 tam giác bằng nhau" — học sinh tự kéo các đỉnh tam giác và nhận ra điều đó.

### 3.2. Kiến trúc tổng thể

HeyGeo là một hệ sinh thái gồm hai lớp:

```
┌─────────────────────────────────────────────┐
│              HeyGeo Desktop                 │
│   (Qt 6 / C++17 — macOS, Linux, Windows)   │
│  • Dựng hình chính xác                      │
│  • Đo lường, tính toán có thứ nguyên        │
│  • Quỹ tích, script dựng hình               │
│  • Xuất & đăng tải lên Web                  │
└────────────────┬────────────────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────────────────┐
│               HeyGeo Web                    │
│       (Next.js 14 + PostgreSQL)              │
│  • Web Design: kéo-thả trong trình duyệt    │
│  • Web Coding: JavaScript/JSXGraph          │
│  • Thư viện mô hình cộng đồng              │
│  • Viewer đa định dạng                      │
└─────────────────────────────────────────────┘
```

---

## 4. Tính Năng Nổi Bật

### 4.1. Hình học động thực sự

Cốt lõi của HeyGeo Desktop là **đồ thị phụ thuộc hình học**: mỗi đối tượng (điểm, đường thẳng, đường tròn, phép đo...) biết nó phụ thuộc vào những đối tượng nào. Khi người dùng kéo một điểm tự do, HeyGeo tính toán lại toàn bộ đồ thị theo thứ tự tô-pô và cập nhật màn hình trong vòng vài mili-giây.

Kết quả: hình vẽ **sống động như thực tế**. Đường trung trực vẫn là trung trực, góc phân giác vẫn phân đôi góc, giao điểm vẫn nằm trên cả hai đường — dù bạn kéo bất kỳ điểm nào đến bất kỳ vị trí nào.

Các đối tượng được hỗ trợ bao gồm: điểm, đoạn thẳng, tia, đường thẳng, đường tròn, cung tròn, hình quạt, đa giác, trung điểm, giao điểm, đường vuông góc, đường song song, tia phân giác, và đầy đủ các **phép biến đổi hình học**: quay, đối xứng trục, đối xứng tâm, tịnh tiến, vị tự.

### 4.2. Quỹ tích — Thấy đường cong hình thành

Tính năng **quỹ tích (locus)** là một trong những điểm mạnh nhất của HeyGeo Desktop. Người dùng chỉ cần:
1. Chọn một điểm trượt trên một đối tượng (ví dụ: điểm P trên đường tròn)
2. Chọn một điểm phụ thuộc vào P (ví dụ: chân đường vuông góc từ P đến một đoạn thẳng)
3. Nhấn **"Locus"**

HeyGeo sẽ vẽ ngay lập tức đường cong mà điểm thứ hai quét qua khi P chạy hết đối tượng. Đây là cách trực quan nhất để hiểu tại sao "tập hợp các điểm cách đều hai tiêu điểm là một ellipse", hay để khám phá ra những đường cong đẹp như tractrix, hypocycloid, hay tập hợp Julia.

### 4.3. Đo lường và Tính toán có Thứ nguyên

HeyGeo không chỉ vẽ — nó còn **đo** và **tính toán** với đầy đủ thứ nguyên vật lý:

- **Độ dài, khoảng cách**: tính bằng cm dựa trên DPI thực của màn hình
- **Góc**: độ hoặc radian
- **Diện tích**: cm²
- **Hệ số góc, tọa độ, phương trình**: đường thẳng dạng `Ax + By + C = 0`, đường tròn dạng `(x−a)² + (y−b)² = r²`

Điểm sáng tạo là **phân tích thứ nguyên tự động**: biểu thức `AD / 1cm` cho kết quả vô thứ nguyên; `AD × AB` cho kết quả cm². Các biểu thức tính toán có thể tham chiếu lẫn nhau và cập nhật theo thời gian thực khi người dùng kéo hình — biến HeyGeo thành một máy tính hình học sống động.

### 4.4. Hệ Tọa Độ và Đồ Thị Hàm Số

Thông qua menu **Graph**, người dùng có thể:
- Tạo **hệ tọa độ tương tác** với gốc O kéo được (dịch chuyển cả hệ) và điểm đơn vị U kéo được (thay đổi tỉ lệ)
- Chọn dạng lưới: vuông, chữ nhật, cực (đồng tâm + hướng kính), lượng giác (nhãn π trên trục x)
- **Vẽ đồ thị hàm số** `y = f(x)` với biểu thức tùy ý
- **Vẽ đường cong tham số** `(x(t), y(t))`
- **Biểu diễn một giá trị đo được** như một điểm hoặc dấu trên trục tọa độ

Điều này biến HeyGeo thành công cụ không chỉ cho hình học thuần túy mà còn cho **giải tích, đại số và toán tổng hợp**.

### 4.5. Nhãn Công Thức LaTeX Nhúng Sẵn

Mỗi đối tượng có thể được gán nhãn với **công thức toán học chuẩn LaTeX** thông qua bộ hiển thị `KFormula` nhúng sẵn trong ứng dụng. Kết quả là hình vẽ đẹp và rõ ràng như trong sách giáo khoa — không cần chụp màn hình rồi chỉnh sửa bằng phần mềm khác.

### 4.6. Script Dựng Hình — Tái Sử Dụng Quy Trình

HeyGeo hỗ trợ **macro/script** (file `.sec`): người dùng ghi lại một quy trình dựng hình (ví dụ: vẽ đường tròn nội tiếp tam giác), lưu thành script, rồi áp dụng lại cho bất kỳ bộ ba điểm nào chỉ với một thao tác. Đây là tính năng cực kỳ hữu ích cho giáo viên cần trình diễn nhiều lần trên lớp.

### 4.7. Chất Lượng Đồ Họa Chuyên Nghiệp

HeyGeo Desktop được tối ưu kỹ lưỡng cho màn hình hiện đại:
- **HiDPI/Retina rendering**: toàn bộ hình học được vẽ với tọa độ dấu phẩy động (`QPointF`, `QRectF`) và bộ đệm 2× — chất lượng ngang phần mềm thương mại cao cấp.
- **Hiệu ứng hover thông minh**: khi chuột gần một đối tượng, đối tượng sáng lên với hào quang gradient — điểm dùng `QRadialGradient`, đường dùng vầng sáng nhiều lớp. Tại vùng giao nhau của hai đường cong, cả hai đều sáng và ký hiệu ◇ xuất hiện tại giao điểm dự kiến.
- **Phông chữ Latin Modern Roman** — phông chuẩn của LaTeX — mang lại tính nhất quán thẩm mỹ với tài liệu toán học học thuật.

---

## 5. HeyGeo Web — Toán Học Không Cần Cài Đặt

### 5.1. Web Design: Kéo-Thả Trong Trình Duyệt

**HeyGeo Web Design** (tại `/design`) là môi trường kéo-thả trực quan ngay trong trình duyệt, được xây dựng trên **JSXGraph** — thư viện JavaScript mã nguồn mở hàng đầu cho hình học tương tác trên web. Không cần cài đặt, không cần tài khoản để xem — học sinh mở đường link là thấy mô hình tương tác ngay lập tức.

### 5.2. Web Coding: Sáng Tạo Bằng JavaScript

**HeyGeo Web Coding** (tại `/coding`) là trình soạn thảo code tích hợp trong trình duyệt, cho phép người dùng viết **JavaScript/JSXGraph** để tạo mô hình phức tạp. Tính năng bao gồm:
- Tô màu cú pháp, gợi ý tự động hoàn thành chuyên biệt cho API JSXGraph
- Menu chèn snippet với một click
- Chạy thử ngay lập tức — kết quả hiện bên cạnh code mà không tải lại trang

Đây là công cụ lý tưởng cho các câu lạc bộ Toán-Tin, học sinh năng khiếu muốn tạo ra fractal, đường cong đặc biệt, hay mô phỏng vật lý.

### 5.3. Chia Sẻ và Cộng Đồng

Mọi mô hình có thể chia sẻ bằng một đường link dạng `https://heygeo.pedu.vn/share/<token>`. Người nhận **không cần đăng ký tài khoản** — chỉ cần mở trình duyệt là tương tác được ngay. Tất cả mô hình công khai hiển thị trong **thư viện cộng đồng**, tạo nên kho học liệu mở ngày càng phong phú.

### 5.4. Viewer Đa Định Dạng

HeyGeo Web còn tích hợp sẵn các viewer cho:
- File `.seg`/`.sec` của HeyGeo Desktop (định dạng JSON `HeyGeoData`)
- File `.json` của Web Sketchpad (GSP/WSP)
- File GeoGebra
- LaTeX Editor — soạn thảo và xem công thức ngay trong trình duyệt

---

## 6. Tính Sáng Tạo và Khác Biệt

| Tiêu chí | GeoGebra | Geometer's Sketchpad | **HeyGeo** |
|---|---|---|---|
| Miễn phí | Có | Không | **Có** |
| Mã nguồn mở | Không | Không | **Có** |
| Server tại Việt Nam | Không | Không | **Có** |
| Chạy offline (Desktop) | Có | Có | **Có** |
| Hỗ trợ tiếng Việt | Một phần | Không | **Có** |
| Tích hợp LaTeX | Hạn chế | Hạn chế | **Sâu (KFormula)** |
| Quỹ tích (Locus) | Có | Có | **Có + trực quan cao** |
| Chia sẻ không cần tài khoản | Không | Không | **Có** |
| Đo lường có thứ nguyên | Có | Có | **Có + phân tích thứ nguyên tự động** |
| Web Coding (JSXGraph) | Không | Không | **Có** |

HeyGeo kế thừa nền tảng vững chắc của **KSEG** (Ilya Baran, MIT, 1999–2006) — một trong những phần mềm hình học động được đánh giá cao về kiến trúc — và hiện đại hóa hoàn toàn lên **Qt 6 / C++17** với hàng loạt tính năng mới, hỗ trợ màn hình Retina HiDPI, và một hệ sinh thái web hiện đại xây dựng trên **Next.js 14** và **PostgreSQL**.

---

## 7. Kho Ví Dụ Phong Phú

HeyGeo đi kèm kho ví dụ minh họa sức mạnh của nền tảng, bao gồm:

| Nội dung | Ý nghĩa giáo dục |
|---|---|
| Đường tròn ngoại tiếp tam giác | Tính bất biến của phép dựng hình |
| Định lý Thalès động | Trực quan hóa định lý cơ bản |
| Quỹ tích trực tâm | Khám phá quỹ tích qua kéo thả |
| Tập hợp Julia (fractal phức) | Toán học nâng cao, giải tích phức |
| Đường cong Koch, Tam giác Sierpiński | Fractal và tự tương tự |
| Tam giác hóa Delaunay | Toán học tính toán ứng dụng |
| Đường cong Bézier bậc ba | Ứng dụng trong đồ họa máy tính |

---

## 8. Tác Động Thực Tiễn

### 8.1. Đối với giáo viên
- Chuẩn bị bài giảng trực quan trong vài phút
- Chia sẻ mô hình cho học sinh bằng một đường link — không mất thời gian cài đặt phần mềm trên máy học sinh
- Tạo tài liệu dạng PDF/hình ảnh chất lượng cao từ hình vẽ

### 8.2. Đối với học sinh
- Tự khám phá các định lý thay vì chỉ ghi nhớ
- Kiểm chứng bài tập bằng cách kéo hình và quan sát
- Tiếp cận phần mềm miễn phí, không phụ thuộc vào điều kiện kinh tế

### 8.3. Đối với cộng đồng Toán học Việt Nam
- Xây dựng kho học liệu mở, được đóng góp bởi giáo viên và học sinh trên toàn quốc
- Server đặt tại Việt Nam, đảm bảo tốc độ truy cập ổn định
- Mã nguồn mở — các trường, tổ chức có thể tự triển khai và tùy biến

---

## 9. Hướng Phát Triển

- **HeyGeo Mobile**: phiên bản ứng dụng cho Android/iOS, phục vụ học sinh dùng điện thoại
- **Tích hợp AI**: gợi ý dựng hình thông minh, nhận diện hình vẽ tay và chuyển đổi sang mô hình động
- **Xuất bài giảng**: tạo bài giảng tương tác dạng HTML nhúng được vào hệ thống LMS (Moodle, Google Classroom)
- **Mở rộng cộng đồng**: chương trình đào tạo giáo viên sử dụng HeyGeo, hợp tác với Sở Giáo dục các tỉnh

---

## 10. Kết Luận

**HeyGeo** là sản phẩm công nghệ giáo dục được xây dựng từ thực tiễn giảng dạy Toán học tại Việt Nam, với mục tiêu dân chủ hóa việc tiếp cận công cụ hình học động chất lượng cao. Bằng cách kết hợp sức mạnh của ứng dụng máy tính để bàn với tính tiện lợi của nền tảng web, HeyGeo mang toán học trở nên trực quan, sinh động và dễ tiếp cận hơn — cho mọi học sinh, dù ở thành phố hay vùng sâu vùng xa, dù có máy tính hay chỉ có chiếc điện thoại kết nối Internet.

Đây không chỉ là một phần mềm — đây là **cầu nối giữa toán học trừu tượng và sự hiểu biết trực quan**, được trao miễn phí vào tay mọi người học.

---

*HeyGeo — Hình học trong tầm tay.*

---

## 11. Yêu Cầu Cơ Sở Hạ Tầng Triển Khai

### 11.1. HeyGeo Desktop — Ứng dụng máy tính để bàn

HeyGeo Desktop là ứng dụng native đa nền tảng, được biên dịch trực tiếp cho từng hệ điều hành, do đó yêu cầu hạ tầng rất nhẹ và linh hoạt.

#### Phần cứng (tối thiểu)

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|---|---|---|
| CPU | x86-64 hoặc ARM64, 1 GHz | 2 GHz trở lên, đa nhân |
| RAM | 512 MB | 2 GB trở lên |
| Dung lượng ổ đĩa | 80 MB (chỉ ứng dụng) | 200 MB (bao gồm ví dụ) |
| Màn hình | 1024 × 768 px | 1920 × 1080 px, hỗ trợ HiDPI |
| Chuột/Bàn di chuột | Bắt buộc (thao tác kéo-thả) | Chuột có cuộn để zoom |

HeyGeo Desktop **không yêu cầu kết nối Internet** để hoạt động — toàn bộ tính năng dựng hình, đo lường, xuất ảnh đều chạy hoàn toàn offline. Kết nối Internet chỉ cần thiết khi đăng tải mô hình lên HeyGeo Web.

#### Hệ điều hành được hỗ trợ

| Hệ điều hành | Kiến trúc | Trạng thái |
|---|---|---|
| macOS 12 Monterey trở lên | Apple Silicon (arm64) | Hỗ trợ đầy đủ, bản native |
| macOS 12 Monterey trở lên | Intel x86-64 | Hỗ trợ đầy đủ |
| Ubuntu 22.04 LTS trở lên | x86-64 | Hỗ trợ đầy đủ |
| Debian 11 trở lên | x86-64 | Hỗ trợ đầy đủ |
| Windows 10 / 11 | x86-64 | Hỗ trợ đầy đủ |
| Các bản Linux khác có Qt 6 | x86-64 / arm64 | Có thể biên dịch từ nguồn |

#### Phần mềm phụ thuộc (đã đóng gói sẵn)

Bản phân phối chính thức của HeyGeo Desktop đóng gói sẵn toàn bộ thư viện Qt 6 — người dùng cuối **không cần cài thêm bất kỳ thư viện nào**. Đối với nhà phát triển muốn biên dịch từ mã nguồn, yêu cầu:
- **Qt 6.5 trở lên** (Qt6Widgets, Qt6Core, Qt6Gui, Qt6PrintSupport, Qt6Svg)
- **C++17 compiler**: Apple Clang 14+ (macOS), GCC 11+ (Linux), MSVC 2022 (Windows)
- **zlib** (`-lz`)
- **CMake 3.16+** hoặc **qmake** (kèm Qt)

#### Thiết bị ngoại vi

- **Chuột hoặc trackpad**: bắt buộc cho thao tác kéo-thả, chọn đối tượng
- **Máy in**: tùy chọn, hỗ trợ in hình vẽ trực tiếp thông qua Qt PrintSupport
- **Màn hình ngoài/máy chiếu**: hỗ trợ đầy đủ, hình học được vẽ lại theo độ phân giải thực của màn hình (DPI-aware)

---

### 11.2. HeyGeo Web — Nền tảng web (phía người dùng)

Người dùng cuối truy cập HeyGeo Web hoàn toàn qua trình duyệt — **không cần cài đặt gì**.

#### Yêu cầu phía người dùng

| Thành phần | Yêu cầu |
|---|---|
| Trình duyệt | Chrome 90+, Firefox 88+, Safari 15+, Edge 90+ |
| JavaScript | Phải được bật (JSXGraph yêu cầu) |
| Kết nối Internet | Băng thông tối thiểu 1 Mbps; hoạt động tốt với 4G |
| Thiết bị | Máy tính, laptop, tablet, điện thoại thông minh |
| RAM trình duyệt | 512 MB RAM khả dụng cho tab trình duyệt |

Nhờ sử dụng **JSXGraph** (thư viện JavaScript thuần, không cần plugin), HeyGeo Web hoạt động trên mọi thiết bị có trình duyệt hiện đại — kể cả điện thoại Android phổ thông hoặc máy tính bảng giá rẻ phổ biến tại Việt Nam.

---

### 11.3. HeyGeo Web — Hạ tầng máy chủ (phía vận hành)

Đây là thành phần cần đầu tư hạ tầng, nhưng yêu cầu rất vừa phải so với quy mô dịch vụ.

#### Cấu hình máy chủ hiện tại (production)

| Thành phần | Cấu hình |
|---|---|
| Máy chủ | Apple Mac mini M2 Pro (12-core CPU, 19-core GPU) |
| RAM | 32 GB |
| Ổ cứng | 512 GB SSD NVMe |
| Hệ điều hành | macOS 14 Sonoma |
| Kết nối mạng | Gigabit Ethernet nội bộ + Internet cáp quang |

Lý do chọn Mac mini M2 Pro: tiêu thụ điện thấp (chỉ 12W ở idle, 40W peak), hiệu năng cao cho Node.js và biên dịch Next.js, và tận dụng được kiến trúc ARM64 native với Node.js.

#### Stack phần mềm máy chủ

| Lớp | Công nghệ | Phiên bản |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Next.js (standalone mode) | 14.x |
| Database | PostgreSQL | 15.x |
| Web server / Reverse proxy | nginx | 1.25.x |
| SSL/TLS | Let's Encrypt (certbot) | Tự động gia hạn |
| Process manager | macOS LaunchDaemon | — |
| Containerization | Docker (tùy chọn) | 24.x |

#### Yêu cầu mạng máy chủ

- **Địa chỉ IP tĩnh** (hoặc dynamic DNS) để trỏ tên miền
- **Tên miền**: `heygeo.pedu.vn` (đã đăng ký, SSL đã cấu hình)
- **Cổng mở**: 80 (HTTP → redirect HTTPS), 443 (HTTPS)
- **Băng thông**: tối thiểu 10 Mbps upload cho phục vụ đồng thời 50–100 người dùng

#### Yêu cầu tối thiểu để tự triển khai (self-hosting)

Đối với trường học hoặc tổ chức muốn tự triển khai HeyGeo Web nội bộ:

| Thành phần | Cấu hình tối thiểu |
|---|---|
| CPU | 4 nhân, 2 GHz (ARM hoặc x86-64) |
| RAM | 4 GB |
| Ổ đĩa | 50 GB SSD |
| Hệ điều hành | Ubuntu 22.04 LTS hoặc macOS 12+ |
| Node.js | 18 LTS trở lên |
| PostgreSQL | 14 trở lên |
| Kết nối | 10 Mbps upload, IP tĩnh hoặc DDNS |

Toàn bộ hướng dẫn triển khai được cung cấp kèm mã nguồn dưới dạng file `README.md` và `docker-compose.yml` — cho phép triển khai bằng một lệnh `docker-compose up` trên bất kỳ máy chủ Linux nào.

---

## 12. Tính Sáng Tạo, Đổi Mới và Công Nghệ

### 12.1. Công nghệ nền tảng hiện đại

HeyGeo không phải là một phần mềm hình học bình thường được "đóng gói lại". Đây là kết quả của sự kết hợp có chủ đích giữa nhiều công nghệ tiên tiến, mỗi công nghệ được chọn lọc kỹ lưỡng để phù hợp với bài toán cụ thể của giáo dục Toán học Việt Nam.

#### Qt 6 / C++17 — Hiệu năng và đa nền tảng thực sự

Trong khi nhiều ứng dụng giáo dục hiện đại lựa chọn Electron (JavaScript/web chạy trong vỏ trình duyệt) để đơn giản hóa phát triển, HeyGeo chủ động chọn **Qt 6 native C++17** vì những lý do kỹ thuật quan trọng:

- **Hiệu năng tính toán**: Hình học động đòi hỏi cập nhật liên tục hàng chục đến hàng trăm điểm, đường, phép đo trong mỗi sự kiện chuột. C++ native cho phép làm điều này trong vòng dưới 1 mili-giây, tạo cảm giác "sống" hoàn toàn cho hình vẽ.
- **Bộ nhớ thấp**: Ứng dụng Qt 6 native tiêu thụ RAM ít hơn 5–10 lần so với ứng dụng Electron tương đương, cho phép chạy mượt mà trên máy tính phòng Lab trường học với RAM 4 GB.
- **Apple Silicon native**: HeyGeo là một trong số ít phần mềm hình học động được biên dịch **native cho Apple Silicon (arm64)** — không phải qua lớp Rosetta 2 dịch thuật — tận dụng hoàn toàn kiến trúc M-series.
- **HiDPI / Retina rendering**: Qt 6's QPainter với floating-point coordinates (`QPointF`, `QRectF`) và device pixel ratio awareness cho phép hình học được render sắc nét trên mọi màn hình, từ màn hình HD 96dpi của máy tính phòng học đến màn hình Retina 254dpi của MacBook Pro.

#### JSXGraph — Hình học tương tác mà không cần plugin

**JSXGraph** là thư viện JavaScript mã nguồn mở của Đại học Bayreuth (Đức), được sử dụng trong giảng dạy toán học tại hàng nghìn trường đại học trên thế giới. HeyGeo Web tích hợp JSXGraph làm engine hình học trên trình duyệt — một lựa chọn vượt trội so với các thư viện thương mại hay WebGL-based vì:

- **Không cần plugin** — chạy thuần JavaScript trên mọi trình duyệt hiện đại
- **Hỗ trợ cảm ứng (touch)** — hoạt động đầy đủ trên điện thoại và tablet
- **Tích hợp MathJax/KaTeX** — hiển thị công thức LaTeX ngay trên canvas
- **Hiệu năng tốt** — sử dụng SVG với delta update, không vẽ lại toàn bộ canvas mỗi frame

#### Next.js 14 App Router — Web server hiện đại

HeyGeo Web được xây dựng trên **Next.js 14** với **App Router** và **standalone output mode** — cho phép triển khai như một Node.js server đơn giản mà không cần hạ tầng serverless phức tạp hay CDN đắt tiền. Đây là lựa chọn phù hợp với điều kiện Việt Nam: dễ triển khai trên máy chủ vật lý hoặc VPS giá rẻ, không phụ thuộc vào dịch vụ cloud nước ngoài.

- **Server Components** giảm JavaScript bundle size, tăng tốc tải trang trên đường truyền chậm
- **Image Optimization** tự động nén và resize ảnh thumbnail mô hình
- **API Routes** xử lý toàn bộ backend logic (CRUD mô hình, xác thực, tải xuống) trong cùng một codebase

#### PostgreSQL — Dữ liệu bền vững và mạnh mẽ

Lựa chọn **PostgreSQL** thay vì SQLite hay MongoDB mang lại:
- **JSONB columns** lưu trữ cấu trúc mô hình hình học linh hoạt mà không cần schema cứng
- **Full-text search** tìm kiếm mô hình theo tên, mô tả với hỗ trợ tiếng Việt (unaccented search)
- **ACID transactions** đảm bảo dữ liệu không bị mất khi server restart bất ngờ

### 12.2. Sáng tạo trong thiết kế trải nghiệm người dùng

#### Hiệu ứng hover thông minh — Độc quyền HeyGeo

Một tính năng không có trên bất kỳ phần mềm hình học động nào khác (kể cả GeoGebra và GSP) là hệ thống **hover highlighting thông minh** của HeyGeo Desktop:

- Khi chuột đến gần một điểm, điểm đó phát sáng với `QRadialGradient` đỏ mềm, tạo cảm giác đối tượng "nhận biết" con trỏ
- Khi chuột đến gần đường thẳng hoặc đường tròn, một vầng sáng nhiều lớp xuất hiện xung quanh đường
- **Tại vùng giao điểm của hai đường cong**: cả hai đường cùng sáng lên đồng thời, và ký hiệu ◇ (hình thoi trắng) hiện ra tại vị trí giao điểm dự kiến — ngay cả trước khi người dùng click. Đây là phản hồi hình ảnh trực quan giúp người dùng biết chính xác điểm nào sẽ được tạo ra.

#### Phông chữ học thuật Latin Modern Roman

HeyGeo Desktop sử dụng **Latin Modern Roman** — phông chuẩn của LaTeX và tài liệu toán học học thuật — làm phông chữ mặc định cho nhãn đối tượng. Điều này tạo ra sự nhất quán thẩm mỹ hoàn toàn giữa hình vẽ trong HeyGeo và công thức trong bài giảng LaTeX, sách giáo khoa, hay bài báo khoa học.

#### Hệ thống phân tích thứ nguyên tự động

Tính năng phân tích thứ nguyên trong công cụ tính toán của HeyGeo Desktop là một đổi mới độc đáo: phần mềm tự động theo dõi đơn vị của từng phép đo và phát hiện lỗi thứ nguyên trong biểu thức tính toán. Ví dụ: nếu người dùng viết `AB + angle(ABC)`, hệ thống báo lỗi "không thể cộng độ dài với góc" — tương tự như compiler C++ phát hiện lỗi kiểu dữ liệu. Đây là tính năng không có trên GeoGebra hay GSP.

#### Định dạng HeyGeoData JSON — Chuẩn mở

HeyGeo định nghĩa một định dạng JSON mở (`HeyGeoData`) để biểu diễn mô hình hình học động — thiết kế để vừa con người đọc được, vừa máy xử lý được, và vừa tương thích với JSXGraph API. Định dạng này cho phép:
- Trao đổi mô hình giữa HeyGeo Desktop và HeyGeo Web
- Tích hợp vào các hệ thống LMS khác
- Xây dựng công cụ kiểm tra tự động (automated assessment) dựa trên cấu trúc hình học

### 12.3. Phù hợp với điều kiện triển khai tại Việt Nam

#### Chiến lược "Vietnam-first"

HeyGeo được thiết kế với điều kiện thực tế của Việt Nam làm ưu tiên hàng đầu, không phải là phụ phẩm:

- **Chạy tốt trên đường truyền chậm**: Next.js Server Components giảm bundle JavaScript; JSXGraph chỉ tải một lần và cache trình duyệt — người dùng 3G/4G nông thôn vẫn sử dụng được
- **Tương thích thiết bị phổ thông**: Tested trên máy tính phòng Lab với RAM 4GB, CPU Core i3 2012 — vẫn chạy mượt
- **Không tường lửa quốc tế**: Server đặt tại Việt Nam, không có nội dung bị chặn bởi các hệ thống lọc nội dung của nhà trường
- **Hỗ trợ đa ngôn ngữ, ưu tiên tiếng Việt**: Giao diện HeyGeo Desktop được dịch sang tiếng Việt; HeyGeo Web hỗ trợ nhập liệu và tìm kiếm tiếng Việt có dấu

---

## 13. Tính Ứng Dụng

### 13.1. Đối tượng người dùng rõ ràng và phổ rộng

HeyGeo phục vụ ba nhóm đối tượng chính, mỗi nhóm có luồng sử dụng riêng biệt được thiết kế cẩn thận:

**Giáo viên Toán (THCS, THPT, Đại học)**
- Sử dụng HeyGeo Desktop để chuẩn bị tài liệu minh họa bài giảng
- Chia sẻ mô hình cho học sinh bằng một đường link — không mất thời gian cài đặt phần mềm trên 30 máy học sinh
- Xuất hình ảnh PNG độ phân giải cao để dán vào đề kiểm tra, giáo án, slide PowerPoint

**Học sinh THCS, THPT**
- Truy cập HeyGeo Web từ điện thoại hoặc máy tính bảng cá nhân
- Tự kiểm chứng bài tập: vẽ hình, kéo các điểm, xem kết quả đo lường thay đổi theo thời gian thực
- Sử dụng kho ví dụ sẵn có để học từ các mô hình đẹp của cộng đồng

**Sinh viên, giảng viên Đại học, nhà nghiên cứu**
- Sử dụng HeyGeo Web Coding (JSXGraph) để tạo mô phỏng phức tạp: fractal, đường cong đặc biệt, bài toán tối ưu hóa hình học
- Nhúng mô hình vào bài báo khoa học dạng HTML hoặc tài liệu giảng dạy trực tuyến

### 13.2. Đơn giản, không rào cản

**Triết lý "zero setup for learners"**: Người học không bao giờ cần cài đặt phần mềm. Chỉ cần một đường link — hình học tương tác ngay lập tức trên trình duyệt. Đây là khác biệt căn bản so với Geometer's Sketchpad (phải cài phần mềm, mua bản quyền) và GeoGebra Classic (yêu cầu Java hoặc app riêng cho tính năng đầy đủ).

**Không cần tài khoản để xem**: Người dùng không cần đăng ký để xem và tương tác với mô hình được chia sẻ. Điều này loại bỏ hoàn toàn rào cản kỹ thuật và tâm lý cho học sinh và phụ huynh.

**Giao diện quen thuộc**: Thanh công cụ và menu của HeyGeo Desktop được thiết kế tương tự GSP và GeoGebra — giáo viên đã quen với phần mềm hình học bất kỳ có thể học HeyGeo trong vòng một buổi.

### 13.3. Triển vọng thương mại và mô hình kinh doanh bền vững

Mặc dù hiện tại HeyGeo hoàn toàn miễn phí, nền tảng được thiết kế để hỗ trợ nhiều mô hình doanh thu trong tương lai mà không làm mất đi tính cộng đồng:

| Mô hình | Đối tượng | Tiềm năng |
|---|---|---|
| **Freemium**: giới hạn số mô hình lưu trữ cho tài khoản miễn phí | Cá nhân | Thấp — ưu tiên cộng đồng |
| **School License**: gói trường học với tính năng quản lý lớp, theo dõi bài làm học sinh | Sở GD, trường | Trung bình–Cao |
| **Professional API**: API truy cập cho các nền tảng LMS tích hợp HeyGeo | Edtech companies | Trung bình |
| **Training & Consulting**: đào tạo giáo viên sử dụng phần mềm, xây dựng ngân hàng câu hỏi hình học động | Sở GD, NXB | Trung bình |
| **White-label deployment**: triển khai riêng cho tỉnh/thành phố hoặc hệ thống giáo dục tư nhân | Địa phương | Cao |

### 13.4. Tích hợp vào hệ sinh thái giáo dục hiện có

HeyGeo được thiết kế để **tích hợp, không cạnh tranh** với các hệ thống đang dùng:

- **Google Classroom**: giáo viên tạo mô hình → dán link vào assignment → học sinh mở và tương tác ngay trong Chrome
- **Moodle**: nhúng mô hình HeyGeo vào bài học Moodle qua iframe — không cần plugin
- **Microsoft Teams for Education**: chia sẻ link mô hình trong channel lớp học
- **Sách giáo khoa điện tử**: tích hợp mô hình HeyGeo vào SGK điện tử thay thế hình ảnh tĩnh

---

## 14. Tính Hiệu Quả

### 14.1. Chuyển đổi phương pháp dạy — từ thụ động sang chủ động

Nghiên cứu giáo dục (Piaget, Vygotsky, Papert) cho thấy học sinh hiểu và ghi nhớ kiến thức bền hơn khi họ **tự khám phá** thay vì được truyền thụ thụ động. HeyGeo là công cụ hiện thực hóa triết lý này trong lớp học Toán Việt Nam.

**Trước HeyGeo**: Giáo viên mất 10–15 phút vẽ hình trên bảng, giải thích một tính chất, học sinh ghi nhớ. Nếu học sinh hỏi "điều này có đúng với mọi tam giác không?", giáo viên phải vẽ thêm 2–3 trường hợp, tốn thêm 10 phút.

**Với HeyGeo**: Giáo viên mở mô hình đã chuẩn bị sẵn (hoặc dựng hình trực tiếp trong 2 phút), kéo các đỉnh tam giác trong khi cả lớp quan sát. Học sinh tự thấy tính chất bảo toàn qua mọi trường hợp. Toàn bộ quá trình: 3–5 phút, hiệu quả truyền đạt cao hơn nhiều lần.

### 14.2. Giảm chi phí vận hành đáng kể

| Hạng mục chi phí | Phương án truyền thống | Với HeyGeo | Tiết kiệm |
|---|---|---|---|
| Bản quyền phần mềm hình học | 1–3 triệu đồng/máy/năm (GSP) | **0 đồng** | 100% |
| In ấn đề cương, tài liệu có hình vẽ | 500K–2 triệu đồng/lớp/kỳ | Giảm 80% (xuất PDF chất lượng cao) | ~80% |
| Thời gian chuẩn bị bài giảng có hình | 2–4 giờ/bài | 30–60 phút | ~70% |
| Đào tạo sử dụng phần mềm | Phức tạp, tốn kém | Học trong 1 buổi | ~60% |

Với 100 trường THPT sử dụng HeyGeo thay vì mua bản quyền GSP (50 máy/trường × 2 triệu đồng/máy), **tiết kiệm 10 tỷ đồng/năm** — số tiền có thể tái đầu tư vào hạ tầng máy tính hoặc học bổng.

### 14.3. Nâng cao năng suất giáo viên

**Tái sử dụng mô hình**: Một mô hình được tạo ra có thể dùng mãi mãi và chia sẻ cho đồng nghiệp. Giáo viên không cần vẽ lại từ đầu mỗi năm — chỉ cần mở file `.seg` và điều chỉnh nếu cần. Kho ví dụ cộng đồng trên HeyGeo Web là nguồn tài nguyên tái sử dụng vô tận.

**Script dựng hình**: Một quy trình dựng hình phức tạp (ví dụ: vẽ đường tròn Euler của tam giác) được ghi lại một lần thành script `.sec`, có thể phát lại trong vài giây cho bất kỳ tam giác nào — thay vì mất 15 phút vẽ tay.

**Xuất hình ảnh chất lượng cao**: HeyGeo Desktop xuất PNG với upsampling 2× so với kích thước màn hình, cho hình ảnh sắc nét hoàn hảo khi in ra giấy A4 hoặc chiếu trên máy chiếu HD. Giáo viên không cần phần mềm chỉnh sửa ảnh thêm.

### 14.4. Nâng cao chất lượng học tập có thể đo lường

Dựa trên quan sát thực tiễn từ việc sử dụng tại Trường THPT Chuyên Quốc Học Huế:

- Học sinh **hỏi nhiều hơn** trong giờ học khi có công cụ để thử nghiệm phỏng đoán ngay lập tức
- **Số lỗi sai về hình vẽ** trong bài thi giảm rõ rệt — vì học sinh đã "thấy" tính chất nhiều lần thay vì chỉ ghi nhớ công thức
- **Động lực học** tăng lên đặc biệt với nhóm học sinh yếu hình học — khi họ có thể tự kéo hình và "tìm ra" kết quả thay vì bị áp đặt công thức

---

## 15. Tiềm Năng Phát Triển

### 15.1. Năng lực đội ngũ tác giả

HeyGeo được xây dựng và duy trì bởi **Nguyễn Đăng Minh Phúc** — giáo viên Toán tại Trường THPT Chuyên Quốc Học, Huế, với nền tảng kỹ thuật vững chắc:

- **Kinh nghiệm lập trình**: C++/Qt (15+ năm), JavaScript/TypeScript/React/Next.js (8+ năm), Python, SQL
- **Hiểu biết sâu về giáo dục Toán**: trực tiếp giảng dạy, hiểu rõ nhu cầu thực tiễn của giáo viên và học sinh
- **Kỹ năng DevOps**: tự vận hành toàn bộ hạ tầng (server, CI/CD, SSL, monitoring), không phụ thuộc vào bên thứ ba
- **Cộng đồng mã nguồn mở**: HeyGeo kế thừa và đóng góp trở lại cộng đồng KSEG, Qt, JSXGraph

Sự kết hợp hiếm có giữa **chuyên môn giáo dục** và **năng lực kỹ thuật** trong cùng một người giúp HeyGeo tránh được khoảng cách thường gặp giữa "sản phẩm kỹ thuật hay nhưng không ai dùng" và "sản phẩm giáo dục được dùng nhưng kỹ thuật nghèo nàn".

### 15.2. Lộ trình phát triển sản phẩm

#### Ngắn hạn (6–12 tháng)

- **HeyGeo Mobile (iOS/Android)**: Port HeyGeo Desktop sang Qt for iOS/Android — cho phép học sinh dựng hình trên điện thoại. Qt 6 có hỗ trợ mobile đầy đủ, phần lớn code C++ có thể tái sử dụng trực tiếp.
- **Tích hợp AI gợi ý dựng hình**: Khi người dùng vẽ 3 điểm, AI gợi ý "Bạn có muốn vẽ đường tròn ngoại tiếp không?". Sử dụng model nhỏ chạy local (ONNX Runtime) — không cần server AI đắt tiền.
- **Chế độ bài tập**: Giáo viên tạo bài tập hình học có bước hướng dẫn, học sinh thực hiện từng bước và hệ thống kiểm tra tự động kết quả.

#### Trung hạn (1–2 năm)

- **HeyGeo Assessment**: Module kiểm tra hình học tự động — học sinh nộp bài dưới dạng file `.seg`, hệ thống tự chấm điểm dựa trên cấu trúc hình học (đúng điểm, đúng quan hệ, đúng phép đo).
- **Tích hợp LMS**: Plugin HeyGeo cho Moodle và Google Classroom — giáo viên giao bài tập hình học, học sinh nộp và chấm điểm tự động trong cùng hệ thống LMS.
- **API mở**: Cung cấp REST API công khai cho phép các nền tảng Edtech tích hợp HeyGeo làm engine hình học của họ.

#### Dài hạn (3–5 năm)

- **Hệ thống ngân hàng bài toán hình học động**: Hợp tác với NXB Giáo dục, Bộ GD&ĐT để xây dựng ngân hàng bài toán hình học chuẩn quốc gia dạng động.
- **HeyGeo for Research**: Phiên bản học thuật với xuất dữ liệu quỹ tích sang CSV, tích hợp Python scripting để nghiên cứu hình học tính toán.
- **Mạng lưới trường đối tác**: Hợp tác với 50–100 trường THPT chuyên và trường đại học để xây dựng kho học liệu mở quốc gia.

### 15.3. Tiềm năng thu hút đầu tư

HeyGeo có những yếu tố nền tảng hấp dẫn cho nhà đầu tư Edtech:

- **Thị trường lớn**: Việt Nam có ~10 triệu học sinh THCS/THPT, ~500.000 giáo viên Toán — thị trường địa chỉ khổng lồ chưa được phục vụ tốt
- **Chi phí phát triển thấp**: Mã nguồn cốt lõi đã hoàn thiện, chi phí chủ yếu là marketing và xây dựng cộng đồng
- **Mô hình doanh thu đa dạng**: Freemium → School License → API licensing — lộ trình monetization rõ ràng
- **Defensible moat**: Kho học liệu cộng đồng ngày càng lớn tạo network effect — càng nhiều giáo viên dùng, kho tài liệu càng phong phú, càng thu hút người dùng mới
- **Mã nguồn mở tạo tin tưởng**: Các sở giáo dục và trường học tin tưởng sản phẩm mã nguồn mở hơn phần mềm hộp đen thương mại

---

## 16. Tính Cộng Đồng

### 16.1. Dân chủ hóa tiếp cận công cụ toán học chất lượng cao

Bất bình đẳng giáo dục tại Việt Nam không chỉ thể hiện qua khoảng cách về cơ sở vật chất hay đội ngũ giáo viên, mà còn qua **khoảng cách về công cụ học tập số**. Học sinh trường chuyên ở thành phố lớn có thể tiếp cận phần mềm hình học bản quyền, máy tính mạnh mẽ và đường truyền nhanh. Học sinh ở vùng sâu, vùng xa không có điều kiện đó.

HeyGeo phá vỡ rào cản này theo ba chiều:

**Về tài chính**: Hoàn toàn miễn phí — không có tính năng nào bị ẩn sau paywall. Một học sinh ở huyện miền núi Quảng Trị có cùng bộ công cụ toán học như học sinh trường chuyên Hà Nội.

**Về thiết bị**: Hoạt động tốt trên điện thoại Android phổ thông (≥ 2GB RAM) thông qua HeyGeo Web — không cần laptop hay máy tính bảng đắt tiền.

**Về kết nối**: Mô hình được tải về và cache trình duyệt — một khi đã mở, tương tác hình học hoàn toàn offline. Phù hợp với vùng có đường truyền không ổn định.

### 16.2. Xây dựng cộng đồng học tập mở

HeyGeo Web không chỉ là công cụ cá nhân — đây là **nền tảng chia sẻ kiến thức cộng đồng**. Mỗi mô hình được công khai là một đóng góp vào kho tri thức chung, có thể được hàng nghìn giáo viên và học sinh khác sử dụng, học hỏi và cải tiến.

Mô hình cộng đồng này tương tự GitHub đối với lập trình viên, hay Wikipedia đối với kiến thức tổng quát — nhưng chuyên biệt cho **hình học toán học tương tác**. Không có nền tảng nào như thế này bằng tiếng Việt hiện tồn tại.

### 16.3. Hỗ trợ giáo viên vùng khó khăn

Một thực tế đau lòng: nhiều giáo viên Toán ở vùng sâu vùng xa có chuyên môn tốt nhưng thiếu công cụ để trực quan hóa bài giảng. Bảng đen và phấn trắng vẫn là công cụ duy nhất của họ — không phải vì họ không muốn dùng phần mềm, mà vì các phần mềm hiện có quá đắt hoặc quá phức tạp để học một mình.

HeyGeo giải quyết điều này qua:
- **Kho ví dụ sẵn dùng**: 40+ file `.seg` đi kèm phần mềm, bao phủ hầu hết nội dung hình học THCS/THPT — giáo viên chỉ cần mở và dùng, không cần tự tạo
- **Tài liệu tiếng Việt**: Hướng dẫn sử dụng đầy đủ bằng tiếng Việt, bao gồm video demo (dự kiến)
- **Cộng đồng hỗ trợ**: Forum/group chia sẻ mô hình và giải đáp thắc mắc

### 16.4. Đóng góp cho hệ sinh thái phần mềm mã nguồn mở Việt Nam

HeyGeo là một trong số rất ít sản phẩm phần mềm giáo dục **Made in Vietnam** có chất lượng ngang tầm quốc tế và được phân phối dưới giấy phép mã nguồn mở. Điều này có ý nghĩa chiến lược:

- **Chủ quyền số**: Việt Nam có một công cụ toán học do người Việt xây dựng, dữ liệu người dùng lưu trên server tại Việt Nam, không phụ thuộc vào dịch vụ nước ngoài
- **Hình mẫu cho cộng đồng**: Chứng minh rằng giáo viên-lập trình viên Việt Nam có thể tạo ra sản phẩm chất lượng cao phục vụ cộng đồng
- **Nền tảng mở để phát triển**: Mã nguồn mở cho phép các nhà nghiên cứu, sinh viên IT đóng góp tính năng mới, dịch ngôn ngữ, hoặc xây dựng công cụ bổ sung trên cùng nền tảng

### 16.5. Tầm nhìn dài hạn: Mạng lưới học tập toán học quốc gia

Tầm nhìn dài hạn của HeyGeo là trở thành **hạ tầng học tập toán học số của Việt Nam** — tương tự vai trò của Wikipedia trong việc phổ cập kiến thức toàn cầu, nhưng chuyên biệt cho toán học tương tác và phù hợp với bối cảnh giáo dục Việt Nam.

Một thế giới nơi mọi học sinh Việt Nam — dù ở Hà Nội hay vùng cao Tây Bắc, dù học trường chuyên hay trường làng — đều có thể mở điện thoại, gõ link, và thấy đường tròn ngoại tiếp tam giác tự điều chỉnh khi họ kéo các đỉnh. Đó là thế giới mà HeyGeo đang xây dựng, từng mô hình một, từng người dùng một.

---

*HeyGeo — Hình học trong tầm tay. Toán học cho mọi người.*

Tên sản phẩm: HeyGeo - Hệ sinh thái hình học động tương tác, được thiết kế cho giáo viên, học sinh và những người yêu toán học

Giới thiệu chung*
HeyGeo là một hệ sinh thái hình học động tương tác mã nguồn mở, được thiết kế phục vụ dạy và học Toán ở các bậc học khác nhau. Nền tảng gồm hai thành phần tích hợp: HeyGeo Desktop — ứng dụng máy tính để bàn đa nền tảng xây dựng trên Qt 6 / C++17, và HeyGeo Web tại https://heygeo.pedu.vn — nơi giáo viên và học sinh có thể tạo, khám phá và chia sẻ các mô hình toán học ngay trên trình duyệt mà không cần cài đặt thêm bất kỳ phần mềm nào.

HeyGeo được xây dựng từ nhu cầu thực tiễn của giáo dục Toán học Việt Nam: các công cụ hình học động hiện có được sử dụng trong cộng đồng khá nhiều như: The Geometer's Sketchpad, GeoGebra, Web Sketchpad, JSXGraph... HeyGeo cho phép hiển thị trên nền tảng web các mô hình được thiết kế từ nhiều công cụ khác nhau, thậm chí cho phép chỉnh sửa và thiết kế các loại mô hình trực tiếp trên web.

Yêu cầu đối với cơ sở hạ tầng cần thiết để triển khai ứng dụng sản phẩm*

1. HeyGeo Desktop — Ứng dụng máy tính Offline

HeyGeo Desktop là ứng dụng native đa nền tảng, được biên dịch trực tiếp cho từng hệ điều hành, do đó yêu cầu hạ tầng rất nhẹ và linh hoạt.

1.1. Phần cứng (tối thiểu)

CPU: x86-64 hoặc ARM64, 1 GHz trở lên
RAM: 512 MB trở lên
Dung lượng ổ đĩa: 1GB trống trở lên
Màn hình: 1024 × 768 px / 1920 × 1080 px, hỗ trợ HiDPI

HeyGeo Desktop không yêu cầu kết nối Internet để hoạt động — toàn bộ tính năng dựng hình, đo lường, xuất ảnh đều chạy hoàn toàn offline. Kết nối Internet chỉ cần thiết khi đăng tải mô hình lên HeyGeo Web.

1.2. Hệ điều hành được hỗ trợ

macOS 12 Monterey trở lên | Apple Silicon (arm64)
macOS 12 Monterey trở lên | Intel x86-64
Windows 10 / 11 | x86-64 | ARM
Các bản Linux

1.3. Phần mềm phụ thuộc (đã đóng gói sẵn)

Bản phân phối chính thức của HeyGeo Desktop đóng gói sẵn toàn bộ thư viện Qt 6 — người dùng cuối không cần cài thêm bất kỳ thư viện nào. Đối với nhà phát triển muốn biên dịch từ mã nguồn, yêu cầu:
- **Qt 6.5 trở lên** (Qt6Widgets, Qt6Core, Qt6Gui, Qt6PrintSupport, Qt6Svg)
- **C++17 compiler**: Apple Clang 14+ (macOS), GCC 11+ (Linux), MSVC 2022 (Windows)
- **zlib** (`-lz`)
- **CMake 3.16+** hoặc **qmake** (kèm Qt)


2. HeyGeo Web — Nền tảng web (phía người dùng)

Người dùng cuối truy cập HeyGeo Web hoàn toàn qua trình duyệt theo địa chỉ: https://heygeo.pedu.vn/ — không cần cài đặt gì.

2.1. Yêu cầu phía người dùng

Trình duyệt: Chrome 90+, Firefox 88+, Safari 15+, Gan Jing Browser
JavaScript: Phải được bật (JSXGraph yêu cầu)
Kết nối Internet: Băng thông tối thiểu 1 Mbps; hoạt động tốt với 4G

Nhờ sử dụng JSXGraph (thư viện JavaScript thuần, không cần plugin), HeyGeo Web có thể hoạt động trên mọi thiết bị có trình duyệt hiện đại — kể cả điện thoại Android phổ thông hoặc máy tính bảng giá rẻ phổ biến.

2.2. HeyGeo Web — Hạ tầng máy chủ (phía vận hành)

Đây là thành phần cần đầu tư hạ tầng, nhưng yêu cầu rất vừa phải so với quy mô dịch vụ.

2.2.1. Cấu hình máy chủ hiện tại (production)

Máy chủ: Apple Mac mini M2 Pro (12-core CPU, 19-core GPU)
RAM: 16 GB
Ổ cứng: 512 GB SSD NVMe
Hệ điều hành: macOS 14 Sonoma
Kết nối mạng: Gigabit Ethernet nội bộ + Internet cáp quang

Lý do chọn Mac mini M2 Pro: tiêu thụ điện thấp (chỉ 1-5W ở idle, đạt đỉnh 40W), hiệu năng cao cho Node.js và biên dịch Next.js, và tận dụng được kiến trúc ARM64 với Node.js.

2.2.2. Stack phần mềm máy chủ

Runtime: Node.js 20 LTS
Framework: Next.js (standalone mode) 14.x
Database: PostgreSQL 15.x 
Web server / Reverse proxy: nginx 1.25.x
SSL/TLS: Cloudflare, Tự động gia hạn
Process manager: macOS LaunchDaemon

2.2.3. Yêu cầu mạng máy chủ

Địa chỉ IP tĩnh (hoặc dynamic DNS, cloudflare tunnel) để trỏ tên miền
Tên miền: heygeo.pedu.vn (đã đăng ký, SSL đã cấu hình)
Băng thông: tối thiểu 10 Mbps upload cho phục vụ đồng thời 50–100 người dùng

Tính sáng tạo, đổi mới và công nghệ*:

1. Công nghệ nền tảng hiện đại

HeyGeo không phải là một phần mềm hình học bình thường được "đóng gói lại". Đây là kết quả của sự kết hợp có chủ đích giữa nhiều công nghệ tiên tiến, mỗi công nghệ được chọn lọc kỹ lưỡng để phù hợp với bài toán cụ thể của giáo dục Toán học Việt Nam.

1.1. Qt 6 / C++17 — Hiệu năng và đa nền tảng thực sự

Trong khi nhiều ứng dụng giáo dục hiện đại lựa chọn Electron (JavaScript/web chạy trong vỏ trình duyệt) để đơn giản hóa phát triển, HeyGeo chủ động chọn Qt 6 native C++17 vì những lý do kỹ thuật quan trọng:

+ Hiệu năng tính toán: Hình học động đòi hỏi cập nhật liên tục hàng chục đến hàng trăm điểm, đường, phép đo trong mỗi sự kiện chuột. C++ native cho phép làm điều này trong vòng dưới 1 mili-giây, tạo cảm giác "sống" hoàn toàn cho hình vẽ.
+ Bộ nhớ thấp: Ứng dụng Qt 6 native tiêu thụ RAM ít hơn 5–10 lần so với ứng dụng Electron tương đương, cho phép chạy mượt mà trên máy tính phòng Lab trường học với RAM 4 GB.
+ Apple Silicon native: HeyGeo là một trong số ít phần mềm hình học động được biên dịch cho Apple Silicon (arm64) — không phải qua lớp Rosetta 2 dịch thuật — tận dụng hoàn toàn kiến trúc M-series.
+ HiDPI / Retina rendering: Qt 6's QPainter với floating-point coordinates (`QPointF`, `QRectF`) và device pixel ratio awareness cho phép hình học được render sắc nét trên mọi màn hình, từ màn hình HD 96dpi của máy tính phòng học đến màn hình Retina 254dpi của MacBook Pro.

1.2. JSXGraph — Hình học tương tác mà không cần plugin

JSXGraph là thư viện JavaScript mã nguồn mở của Đại học Bayreuth (Đức), được sử dụng trong giảng dạy toán học tại hàng nghìn trường đại học trên thế giới. HeyGeo Web tích hợp JSXGraph làm engine hình học trên trình duyệt — một lựa chọn vượt trội so với các thư viện thương mại hay WebGL-based vì:

+ Không cần plugin — chạy thuần JavaScript trên mọi trình duyệt hiện đại
+ Hỗ trợ cảm ứng (touch) — hoạt động đầy đủ trên điện thoại và tablet
+ Tích hợp KaTeX — hiển thị công thức LaTeX ngay trên canvas
+ Hiệu năng tốt — sử dụng SVG với delta update, không vẽ lại toàn bộ canvas mỗi frame

1.3. Next.js 14 App Router — Web server hiện đại

HeyGeo Web được xây dựng trên Next.js 14 với App Router và standalone output mode — cho phép triển khai như một Node.js server đơn giản mà không cần hạ tầng serverless phức tạp hay CDN đắt tiền. Đây là lựa chọn phù hợp với điều kiện Việt Nam: dễ triển khai trên máy chủ vật lý hoặc VPS giá rẻ, không phụ thuộc vào dịch vụ cloud nước ngoài.

+ Server Components: giảm JavaScript bundle size, tăng tốc tải trang trên đường truyền chậm
+ Image Optimization: tự động nén và resize ảnh thumbnail mô hình
+ API Routes: xử lý toàn bộ backend logic (CRUD mô hình, xác thực, tải xuống) trong cùng một codebase

1.4. PostgreSQL — Dữ liệu bền vững và mạnh mẽ

Lựa chọn PostgreSQL thay vì SQLite hay MongoDB mang lại:
+ JSONB columns: lưu trữ cấu trúc mô hình hình học linh hoạt mà không cần schema cứng
+ Full-text search: tìm kiếm mô hình theo tên, mô tả với hỗ trợ tiếng Việt (unaccented search)
+ ACID transactions: đảm bảo dữ liệu không bị mất khi server restart bất ngờ

2. Sáng tạo trong thiết kế trải nghiệm người dùng

2.1. Hiệu ứng hover thông minh

Một tính năng hữu ích là hệ thống hover highlighting thông minh của HeyGeo Desktop:

- Khi chuột đến gần một điểm, điểm đó phát sáng với `QRadialGradient` đỏ mềm, tạo cảm giác đối tượng "nhận biết" con trỏ
- Khi chuột đến gần đường thẳng hoặc đường tròn, một vầng sáng nhiều lớp xuất hiện xung quanh đường
- Tại vùng giao điểm của hai đường cong: cả hai đường cùng sáng lên đồng thời, và ký hiệu ◇ (hình thoi trắng) hiện ra tại vị trí giao điểm dự kiến — ngay cả trước khi người dùng click. Đây là phản hồi hình ảnh trực quan giúp người dùng biết chính xác điểm nào sẽ được tạo ra.

2.2. Định dạng HeyGeoData JSON — Chuẩn mở

HeyGeo định nghĩa một định dạng JSON mở (`HeyGeoData`) để biểu diễn mô hình hình học động — thiết kế để vừa con người đọc được, vừa máy xử lý được, và vừa tương thích với JSXGraph API. Định dạng này cho phép:
- Trao đổi mô hình giữa HeyGeo Desktop và HeyGeo Web
- Tích hợp vào các hệ thống LMS khác
- Xây dựng công cụ kiểm tra tự động (automated assessment) dựa trên cấu trúc hình học

3. Phù hợp với điều kiện triển khai tại Việt Nam

3.1. Chiến lược "Vietnam-first"

HeyGeo được thiết kế với điều kiện thực tế của Việt Nam làm ưu tiên hàng đầu, không phải là phụ phẩm:

+ Chạy tốt trên đường truyền chậm: Next.js Server Components giảm bundle JavaScript; JSXGraph chỉ tải một lần và cache trình duyệt — người dùng 3G/4G nông thôn vẫn sử dụng được
+ Tương thích thiết bị phổ thông: Tested trên máy tính phòng Lab với RAM 4GB, CPU Core i3 2012 — vẫn chạy mượt
+ Không tường lửa quốc tế: Server đặt tại Việt Nam, không có nội dung bị chặn bởi các hệ thống lọc nội dung của nhà trường
+ Hỗ trợ đa ngôn ngữ, ưu tiên tiếng Việt: Giao diện HeyGeo Desktop được dịch sang tiếng Việt; HeyGeo Web hỗ trợ nhập liệu và tìm kiếm tiếng Việt có dấu. HeyGeo hỗ trợ nhiều ngôn ngữ khác nhau như tiếng Anh, Pháp, Đức, Ấn Độ, Trung Quốc, Nhật, Thái Lan, Malaysia, và có thể bổ sung nhiều ngôn ngữ khác.

Tính ứng dụng*:

1. Đối tượng người dùng rõ ràng và phổ rộng

HeyGeo phục vụ ba nhóm đối tượng chính, mỗi nhóm có luồng sử dụng riêng biệt được thiết kế cẩn thận:

1.1. Giáo viên Toán (THCS, THPT, Đại học)

- Sử dụng HeyGeo Desktop để chuẩn bị tài liệu minh họa bài giảng
- Chia sẻ mô hình cho học sinh bằng một đường link — không mất thời gian cài đặt phần mềm trên 30 máy học sinh
- Xuất hình ảnh PNG độ phân giải cao để dán vào đề kiểm tra, giáo án, slide.
- Thiết kế các mô hình bằng các ứng dụng Hình học động khác nhau rồi tải lên nền tảng HeyGeo Web.

1.2. Học sinh THCS, THPT
- Truy cập HeyGeo Web từ điện thoại hoặc máy tính bảng cá nhân
- Tự kiểm chứng bài tập: vẽ hình, kéo các điểm, xem kết quả đo lường thay đổi theo thời gian thực
- Sử dụng kho ví dụ sẵn có để học từ các mô hình đẹp của cộng đồng

1.3. Sinh viên, giảng viên Đại học, nhà nghiên cứu
- Sử dụng HeyGeo Web Coding (JSXGraph) để tạo mô phỏng phức tạp: fractal, đường cong đặc biệt, bài toán tối ưu hóa hình học
- Nhúng mô hình vào bài báo khoa học dạng HTML hoặc tài liệu giảng dạy trực tuyến

2. Đơn giản, không rào cản

+ Triết lý "zero setup for learners": Người học không cần thiết phải cài đặt phần mềm. Sau khi đăng ký tài khoản, họ có thể thiết kế ngay các mô hình một cách trực quan bằng nhiều công cụ khác nhau.

+ Không cần tài khoản để xem: Người dùng không cần đăng ký để xem và tương tác với mô hình được chia sẻ. Điều này loại bỏ hoàn toàn rào cản kỹ thuật và tâm lý cho học sinh và phụ huynh.

+Giao diện quen thuộc: Thanh công cụ và menu của HeyGeo Desktop được thiết kế tương tự GSP và GeoGebra — giáo viên đã quen với phần mềm hình học bất kỳ có thể học HeyGeo trong vòng một buổi.

3. Triển vọng thương mại và mô hình kinh doanh bền vững

Mặc dù hiện tại HeyGeo hoàn toàn miễn phí, nền tảng được thiết kế để hỗ trợ nhiều mô hình doanh thu trong tương lai mà không làm mất đi tính cộng đồng:

+ Freemium: giới hạn số mô hình lưu trữ cho tài khoản miễn phí
+ School License: gói trường học với tính năng quản lý lớp, theo dõi bài làm học sinh
+ Professional API: API truy cập cho các nền tảng LMS tích hợp HeyGeo
+ Training & Consulting: đào tạo giáo viên sử dụng phần mềm, xây dựng ngân hàng câu hỏi hình học động

4. Tích hợp vào hệ sinh thái giáo dục hiện có

HeyGeo được thiết kế để tích hợp, không cạnh tranh với các hệ thống đang dùng:

- Google Classroom: giáo viên tạo mô hình → dán link vào assignment → học sinh mở và tương tác ngay trong Chrome
- Moodle: nhúng mô hình HeyGeo vào bài học Moodle qua iframe — không cần plugin
- Microsoft Teams for Education: chia sẻ link mô hình trong channel lớp học
- Sách giáo khoa điện tử: tích hợp mô hình HeyGeo vào SGK điện tử thay thế hình ảnh tĩnh

Tính hiệu quả*:

1. Chuyển đổi phương pháp dạy — từ thụ động sang chủ động

Nghiên cứu giáo dục (Piaget, Vygotsky, Papert) cho thấy học sinh hiểu và ghi nhớ kiến thức bền hơn khi họ tự khám phá thay vì được truyền thụ thụ động. HeyGeo là công cụ hiện thực hóa triết lý này trong lớp học Toán Việt Nam.

Dạy học Phấn & Bảng: Giáo viên mất 10–15 phút vẽ hình trên bảng, giải thích một tính chất, học sinh ghi nhớ. Nếu học sinh hỏi "điều này có đúng với mọi tam giác không?", giáo viên phải vẽ thêm 2–3 trường hợp, tốn thêm nhiều thời gian.

Với HeyGeo: Giáo viên mở mô hình đã chuẩn bị sẵn (hoặc dựng hình trực tiếp trong 2 phút), kéo các đỉnh tam giác trong khi cả lớp quan sát. Học sinh tự thấy tính chất bảo toàn qua mọi trường hợp. Toàn bộ quá trình: 3–5 phút, hiệu quả truyền đạt cao hơn nhiều lần.

2. Giảm chi phí vận hành đáng kể

+ HeyGeo giúp giảm chi phí bản quyền phần mềm, in ấn, thời gian chuẩn bị bài giảng, giảm thời gian đào tạo và sử dụng phần mềm.
+ HeyGeo giúp các nhà thiết kế mô hình (sử dụng các công cụ khác nhau) có thể gặp gỡ và trao đổi với nhau một cách thuận tiện, khi mà các mô hình của họ có thể xuất bản trên cùng một nền tảng web tương tác.

3. Nâng cao năng suất giáo viên

+ Tái sử dụng mô hình: Một mô hình được tạo ra có thể dùng mãi mãi và chia sẻ cho đồng nghiệp. Giáo viên không cần vẽ lại từ đầu mỗi năm — chỉ cần mở file `.seg` và điều chỉnh nếu cần. Kho ví dụ cộng đồng trên HeyGeo Web là nguồn tài nguyên tái sử dụng vô tận.

+ Script dựng hình: Một quy trình dựng hình phức tạp (ví dụ: vẽ đường tròn Euler của tam giác) được ghi lại một lần thành script `.sec`, có thể phát lại trong vài giây cho bất kỳ tam giác nào — thay vì mất 15 phút vẽ tay.

+ Xuất hình ảnh chất lượng cao: HeyGeo Desktop xuất PNG với upsampling 2× so với kích thước màn hình, cho hình ảnh sắc nét hoàn hảo khi in ra giấy A4 hoặc chiếu trên máy chiếu HD. Giáo viên không cần phần mềm chỉnh sửa ảnh thêm.
+ Xây dựng các trò chơi học tập có tính tương tác: HeyGeo Web cho phép xây dựng các trò chơi dựa trên code JavaScript, có thể giúp tăng hứng thú học tập, khám phá & trải nghiệm.

Tiềm năng phát triển*:

1. Năng lực đội ngũ tác giả

HeyGeo được xây dựng và duy trì bởi tác giả Nguyễn Đăng Minh Phúc — Giảng viên Khoa Toán, trường Đại học Sư phạm, Đại học Huế, và một số cộng sự, với nền tảng kỹ thuật vững chắc:

+ Kinh nghiệm lập trình: C++/Qt (15+ năm), JavaScript/TypeScript/React/Next.js (8+ năm), Python, SQL. Tác giả cũng đã xây dựng nhiều ứng dụng mã nguồn mở (https://github.com/phucdhh).
+ Kỹ năng DevOps: tự vận hành toàn bộ hạ tầng (server, CI/CD, SSL, monitoring), không phụ thuộc vào bên thứ ba
+ Cộng đồng mã nguồn mở: HeyGeo kế thừa và đóng góp trở lại cộng đồng KSEG, Qt, JSXGraph.
+ Hiểu biết chuyên sâu về giáo dục Toán: trực tiếp giảng dạy sinh viên ngành Sư phạm Toán, hiểu rõ nhu cầu thực tiễn của giáo viên và học sinh, xuất bản nhiều bài báo khoa học trên tạp chí quốc tế và trong nước, liên quan đến Giáo dục Toán và công nghệ.

2. Lộ trình phát triển sản phẩm

+ Chế độ bài học và bài tập: Giáo viên tạo bài tập hình học có bước hướng dẫn, học sinh thực hiện từng bước và hệ thống kiểm tra tự động kết quả.
+ Tích hợp LMS: Plugin HeyGeo cho Moodle (https://www.truyenthong.edu.vn/online/)— giáo viên giao bài tập hình học, học sinh nộp và chấm điểm tự động trong cùng hệ thống LMS.
+ API mở: Cung cấp REST API công khai cho phép các nền tảng Edtech tích hợp HeyGeo làm engine hình học của họ.
+ Hệ thống ngân hàng bài toán hình học động: Hợp tác với NXB Giáo dục, Bộ GD&ĐT để xây dựng ngân hàng bài toán hình học chuẩn quốc gia dạng động.
+ HeyGeo for Research: Phiên bản học thuật với xuất dữ liệu quỹ tích sang CSV, tích hợp Python scripting để nghiên cứu hình học tính toán.
+ Mạng lưới trường đối tác: Hợp tác với 50–100 trường THPT chuyên và trường đại học để xây dựng kho học liệu mở quốc gia.
+ Giới thiệu cho cộng đồng quốc tế (HeyGeo đã tích hợp các ngôn ngữ quốc tế khác nhau).

3. Tiềm năng thu hút đầu tư

HeyGeo có những yếu tố nền tảng hấp dẫn cho nhà đầu tư Edtech:

+ Thị trường lớn: Việt Nam có ~10 triệu học sinh THCS/THPT, ~500.000 giáo viên Toán — thị trường địa chỉ khổng lồ chưa được phục vụ tốt
+ Chi phí phát triển thấp: Mã nguồn cốt lõi đã hoàn thiện, chi phí chủ yếu là marketing và xây dựng cộng đồng
+ Mô hình doanh thu đa dạng: Freemium → School License → API licensing.
+ Defensible moat: Kho học liệu cộng đồng ngày càng lớn tạo network effect — càng nhiều giáo viên dùng, kho tài liệu càng phong phú, càng thu hút người dùng mới
+ Mã nguồn mở tạo tin tưởng: Các sở giáo dục và trường học tin tưởng sản phẩm mã nguồn mở hơn phần mềm hộp đen thương mại

Tiêu chí về Tính cộng đồng*:

1. Dân chủ hóa tiếp cận công cụ toán học chất lượng cao

Bất bình đẳng giáo dục tại Việt Nam không chỉ thể hiện qua khoảng cách về cơ sở vật chất hay đội ngũ giáo viên, mà còn qua khoảng cách về công cụ học tập số. Học sinh trường chuyên ở thành phố lớn có thể tiếp cận phần mềm hình học bản quyền, máy tính mạnh mẽ và đường truyền nhanh. Học sinh ở vùng sâu, vùng xa không có điều kiện đó.

HeyGeo phá vỡ rào cản này theo ba chiều:

+ Về tài chính: Hoàn toàn miễn phí — không có tính năng nào bị ẩn sau paywall. Một học sinh ở huyện miền núi Quảng Trị có cùng bộ công cụ toán học như học sinh trường chuyên Hà Nội.

+ Về thiết bị: Hoạt động tốt trên điện thoại Android phổ thông (≥ 2GB RAM) thông qua HeyGeo Web — không cần laptop hay máy tính bảng đắt tiền.

+ Về kết nối: Mô hình được tải về và cache trình duyệt — một khi đã mở, tương tác hình học hoàn toàn offline. Phù hợp với vùng có đường truyền không ổn định.

2. Xây dựng cộng đồng học tập mở

HeyGeo Web không chỉ là công cụ cá nhân — đây là nền tảng chia sẻ kiến thức cộng đồng. Mỗi mô hình được công khai là một đóng góp vào kho tri thức chung, có thể được hàng nghìn giáo viên và học sinh khác sử dụng, học hỏi và cải tiến.

Mô hình cộng đồng này tương tự GitHub đối với lập trình viên, hay Wikipedia đối với kiến thức tổng quát — nhưng chuyên biệt cho hình học toán học tương tác.

3. Hỗ trợ giáo viên vùng khó khăn

Nhiều giáo viên Toán ở vùng sâu vùng xa có chuyên môn tốt nhưng thiếu công cụ để trực quan hóa bài giảng. Bảng đen và phấn trắng vẫn là công cụ duy nhất của họ.

HeyGeo giải quyết điều này qua:
+ Kho ví dụ sẵn dùng: các mô hình trên nền tảng Web, bao phủ hầu hết nội dung hình học THCS/THPT — giáo viên chỉ cần mở và dùng, không cần tự tạo.
+ Tài liệu tiếng Việt: Hướng dẫn sử dụng bằng tiếng Việt, trang web có giao diện mặc định là tiếng Việt.
+ Cộng đồng hỗ trợ: Forum/group chia sẻ mô hình và giải đáp thắc mắc.

4. Đóng góp cho hệ sinh thái phần mềm mã nguồn mở Việt Nam

HeyGeo là một trong số các hệ sinh thái giáo dục Toán Made in Vietnam có chất lượng ngang tầm quốc tế và được phân phối dưới giấy phép mã nguồn mở. Điều này có ý nghĩa chiến lược:

+ Chủ quyền số: Việt Nam có một công cụ toán học do người Việt xây dựng, dữ liệu người dùng lưu trên server tại Việt Nam, không phụ thuộc vào dịch vụ nước ngoài
+ Hình mẫu cho cộng đồng: Chứng minh rằng giáo viên-lập trình viên Việt Nam có thể tạo ra sản phẩm chất lượng cao phục vụ cộng đồng
+ Nền tảng mở để phát triển: Mã nguồn mở cho phép các nhà nghiên cứu, sinh viên IT đóng góp tính năng mới, dịch ngôn ngữ, hoặc xây dựng công cụ bổ sung trên cùng nền tảng

5. Tầm nhìn dài hạn: Mạng lưới học tập toán học quốc gia

Tầm nhìn dài hạn của HeyGeo là trở thành hạ tầng học tập toán học số của Việt Nam — tương tự vai trò của Wikipedia trong việc phổ cập kiến thức toàn cầu, nhưng chuyên biệt cho toán học tương tác và phù hợp với bối cảnh giáo dục Việt Nam.

Một thế giới nơi mọi học sinh Việt Nam — dù ở Hà Nội hay vùng cao Tây Bắc, dù học trường chuyên hay trường làng — đều có thể mở điện thoại, gõ link, và thấy đường tròn ngoại tiếp tam giác tự điều chỉnh khi họ kéo các đỉnh. Đó là thế giới mà HeyGeo đang xây dựng, từng mô hình một, từng người dùng một.