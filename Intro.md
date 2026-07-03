# HeyGeo — Nền Tảng Hình Học Động Tương Tác

> *Từ phòng học đến cộng đồng toán học — xây dựng, khám phá và chia sẻ hình học theo cách của bạn.*

---

## HeyGeo là gì?

**HeyGeo** là một nền tảng hình học động tương tác được thiết kế cho giáo viên, học sinh và những người yêu toán học. Nền tảng gồm hai phần tích hợp chặt chẽ với nhau: **HeyGeo Desktop** — ứng dụng máy tính để bàn mạnh mẽ giúp xây dựng và khám phá các hình vẽ hình học — và **HeyGeo Web** tại [heygeo.pedu.vn](https://heygeo.pedu.vn) — nơi mọi người có thể tạo, xem, và chia sẻ các mô hình toán học với cộng đồng ngay trên trình duyệt, không cần cài đặt thêm bất cứ thứ gì.

HeyGeo được xây dựng trên nền tảng của phần mềm hình học kinh điển **KSEG** (do Ilya Baran, MIT, 1999–2006 phát triển), sau đó được modernize hoàn toàn lên **Qt 6 / C++17** với hàng loạt tính năng mới, giao diện mượt mà, hỗ trợ màn hình Retina HiDPI và một hệ sinh thái web hiện đại.

---

## HeyGeo Desktop

*Công cụ xây dựng hình học chính xác trên máy tính của bạn.*

### Dựng hình động — như trên giấy, nhưng sống động hơn

HeyGeo Desktop là một phần mềm hình học động, có nghĩa là mọi đối tượng bạn vẽ đều được liên kết với nhau theo quan hệ hình học thực sự. Khi bạn kéo một điểm, toàn bộ hình vẽ tự điều chỉnh theo — đường trung trực vẫn là trung trực, góc phân giác vẫn phân đôi góc, đường tròn ngoại tiếp vẫn đi qua ba đỉnh tam giác.

Các đối tượng được hỗ trợ bao gồm:

- **Điểm, đoạn thẳng, tia, đường thẳng**
- **Đường tròn, cung tròn, hình quạt, đoạn cung**
- **Đa giác và phần trong đường tròn**
- **Trung điểm, giao điểm, đường vuông góc, đường song song, tia phân giác**
- **Các phép biến đổi:** quay, đối xứng, tịnh tiến, vị tự

### Quỹ tích — chứng kiến đường cong hình thành

Một trong những tính năng đặc trưng nhất của HeyGeo Desktop là công cụ **quỹ tích (locus)**. Khi bạn cho một điểm di chuyển trên một đối tượng và theo dõi vết của một điểm khác phụ thuộc vào nó, HeyGeo vẽ ngay lập tức đường cong mà điểm đó quét qua. Đây là cách trực quan nhất để hiểu tại sao "tập hợp các điểm cách đều hai tiêu điểm F₁, F₂ là một ellipse".

### Đo lường và tính toán có thứ nguyên

HeyGeo không chỉ vẽ — nó còn **đo** và **tính**. Hệ thống đo lường hỗ trợ:

- **Độ dài, khoảng cách, bán kính** (đơn vị: cm, tính từ DPI thực của màn hình)
- **Góc** (độ, radian)
- **Diện tích** (cm²)
- **Hệ số góc** của đường thẳng
- **Tọa độ** điểm, **tung độ**, **hoành độ** (tính theo hệ tọa độ tự định nghĩa)
- **Phương trình** đường thẳng (`Ax + By + C = 0`) hoặc đường tròn

Điều thú vị là HeyGeo có **phân tích thứ nguyên tự động**: `AD / 1cm` cho một số vô thứ nguyên; `AD × AB` cho một giá trị cm². Các biểu thức tính toán có thể tham chiếu lẫn nhau, tạo thành một chuỗi tính toán sống động thay đổi khi bạn kéo hình.

### Hệ tọa độ và đồ thị hàm số

Thông qua **menu Graph**, bạn có thể:

- Tạo **hệ tọa độ tương tác** với điểm gốc O (kéo để dịch chuyển cả hệ) và điểm đơn vị U (kéo để co dãn tỉ lệ)
- Chọn các dạng lưới: vuông, chữ nhật (tỉ lệ X/Y độc lập), cực (đồng tâm + hướng kính), lượng giác (nhãn π trên trục x)
- **Vẽ đồ thị hàm số** `y = f(x)`
- **Vẽ đường cong tham số** `(x(t), y(t))`
- **Biểu diễn giá trị đo được** như một điểm hoặc một dấu trên trục tọa độ

Điều này biến HeyGeo Desktop thành một công cụ không chỉ cho hình học thuần túy mà còn cho cả **giải tích, đại số và toán học tổng hợp**.

### Nhãn công thức LaTeX

Mỗi đối tượng có thể được gán nhãn với **công thức toán học kiểu LaTeX** thông qua bộ hiển thị công thức nhúng sẵn (`KFormula`). Điều này giúp hình vẽ của bạn trở nên chuyên nghiệp và rõ ràng như trong sách giáo khoa.

### Script dựng hình (Construction Scripts)

HeyGeo hỗ trợ các file **macro/script** (`.sec`) — những kịch bản dựng hình có thể phát lại từng bước một. Bạn có thể ghi lại một quy trình dựng hình (ví dụ: vẽ tam giác nội tiếp đường tròn), lưu thành script, rồi áp dụng lại cho bất kỳ bộ ba điểm nào bằng một thao tác.

### Giao diện mượt mà — chất lượng xuất bản

HeyGeo Desktop được tối ưu kỹ lưỡng cho màn hình hiện đại:

- **HiDPI / Retina rendering**: toàn bộ hình học được vẽ với tọa độ dấu phẩy động (`QRectF`, `QPointF`) và bộ đệm 2× trên màn hình Retina — chất lượng hình ảnh ngang tầm phần mềm thương mại như Geometer's Sketchpad.
- **Hiệu ứng hover**: khi bạn đưa chuột lại gần một đối tượng trong khi dùng công cụ dựng hình, đối tượng đó sáng lên với hiệu ứng hào quang (halo) màu đỏ mềm mại — điểm thì có `QRadialGradient`, đường và đường tròn thì có vầng sáng nhiều lớp. Khi chuột ở gần giao điểm của hai đường cong, cả hai đều sáng lên và một ký hiệu ◇ xuất hiện tại vị trí giao điểm dự kiến.
- **Phông chữ học thuật**: mặc định dùng Latin Modern Roman — phông chuẩn của LaTeX — tạo sự nhất quán về mặt thẩm mỹ với tài liệu toán học.

### Xuất và chia sẻ

Từ HeyGeo Desktop, bạn có thể:

- **Xuất hình ảnh** (PNG, JPEG, BMP) ở độ phân giải cao
- **Đăng tải lên HeyGeo Web** thông qua API token — hình vẽ của bạn tức thì có thể chia sẻ cho cả thế giới bằng một đường link

---

## HeyGeo Web

*Toán học trong tầm tay — mọi lúc, mọi nơi, trên mọi thiết bị.*

HeyGeo Web tại [heygeo.pedu.vn](https://heygeo.pedu.vn) là nơi hội tụ của cộng đồng HeyGeo. Được xây dựng trên **Next.js 14**, **PostgreSQL**, và sử dụng **JSXGraph** làm engine hiển thị toán học trong trình duyệt, nền tảng web cung cấp ba trải nghiệm khác nhau cho ba kiểu người dùng khác nhau.

### HeyGeo Web Design — Dựng hình không cần code

**HeyGeo Web Design** (tại `/design`) là môi trường kéo-thả trực quan ngay trong trình duyệt. Không cần cài đặt gì, không cần biết lập trình — bạn chỉ cần mở trình duyệt, chọn công cụ và bắt đầu vẽ.

Giao diện được thiết kế quen thuộc với người đã dùng phần mềm hình học:

- **Thanh công cụ** bên trái với các công cụ dựng hình
- **Canvas tương tác** ở giữa — tất cả đối tượng đều kéo được, thay đổi được theo thời gian thực
- **Bảng thuộc tính** bên phải để chỉnh sửa màu sắc, kiểu đường, kích thước
- **Thanh menu** cho các thao tác file, chỉnh sửa, và chia sẻ
- **Dialog lưu/công bố** để đặt tên, thêm mô tả và chuyển mô hình sang chế độ công khai

HeyGeo Web Design phù hợp với giáo viên muốn chuẩn bị tài liệu minh họa nhanh chóng ngay trên máy tính hoặc tablet, hoặc học sinh muốn khám phá ý tưởng mà không cần cài phần mềm.

### HeyGeo Web Coding — Tạo mô hình bằng lập trình JSXGraph

**HeyGeo Web Coding** (tại `/coding`) dành cho người muốn kiểm soát hoàn toàn. Đây là một trình soạn thảo code tích hợp sẵn trong trình duyệt, cho phép bạn viết trực tiếp **JavaScript JSXGraph** để tạo ra các mô hình hình học động phức tạp.

JSXGraph là một thư viện JavaScript mã nguồn mở, cực kỳ mạnh mẽ cho hình học tương tác trên web. Với HeyGeo Web Coding, bạn có:

- **Trình soạn thảo code** với tô màu cú pháp và gợi ý tự động hoàn thành (autocomplete) chuyên biệt cho các API của JSXGraph
- **Menu chèn snippet** — chèn mã mẫu cho các đối tượng thông dụng (điểm, đường thẳng, đường tròn, hàm số, đường cong tham số...) chỉ với một click
- **Chạy thử ngay lập tức** — kết quả hiện ra trực tiếp bên cạnh code mà không cần tải lại trang
- **Lưu và chia sẻ** — mô hình hoàn thành có thể lưu vào tài khoản và chia sẻ bằng link công khai

HeyGeo Web Coding là lựa chọn lý tưởng cho những ai muốn tạo ra các mô hình phức tạp: đường cong đặc biệt, fractal, mô phỏng vật lý, hay tích hợp các tính năng tương tác tùy chỉnh — tất cả đều được viết bằng JavaScript thuần.

```js
// Ví dụ: vẽ đường tròn ngoại tiếp tam giác trong JSXGraph
const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 5, 5, -5], axis: true
});
const A = board.create('point', [-2, -1], {name: 'A'});
const B = board.create('point', [2, -1],  {name: 'B'});
const C = board.create('point', [0,  3],  {name: 'C'});
const circle = board.create('circumcircle', [A, B, C], {
    strokeColor: '#e74c3c', strokeWidth: 2
});
```

### Trình xem mô hình đa dạng

Ngoài hai môi trường tạo mô hình, HeyGeo Web còn cung cấp các **viewer** cho nhiều định dạng toán học:

- **HeyGeo Viewer** — xem các mô hình được xuất từ HeyGeo Desktop (định dạng `HeyGeoData` JSON)
- **Web Sketchpad Viewer** — xem các file `.json` của Geometer's Sketchpad (GSP/WSP)
- **GeoGebra Viewer** — xem các file GeoGebra trực tiếp trên nền tảng
- **LaTeX Editor** — soạn thảo và hiển thị công thức toán học

---

## Cộng Đồng — Xem, Chia Sẻ và Khám Phá

HeyGeo không chỉ là công cụ cá nhân — nó là một **cộng đồng chia sẻ kiến thức toán học**.

### Đăng tải và chia sẻ chỉ trong vài giây

Dù bạn tạo mô hình từ HeyGeo Desktop, Web Design hay Web Coding, quy trình chia sẻ đều giống nhau và cực kỳ đơn giản:

1. **Đặt tên** và viết mô tả cho mô hình (hỗ trợ Markdown)
2. Thêm **hướng dẫn khám phá** — ví dụ: *"Kéo điểm C để quan sát sự thay đổi của đường trung trực"*
3. Bật chế độ **Công khai** để tạo link chia sẻ
4. Gửi link dạng `https://heygeo.pedu.vn/share/<token>` cho học sinh, đồng nghiệp, hoặc đăng lên mạng xã hội

Người nhận link không cần đăng ký tài khoản — họ chỉ cần mở trình duyệt là thấy mô hình tương tác ngay lập tức.

### Thư viện mô hình công khai

Tất cả mô hình được công khai đều hiển thị trong **thư viện công cộng** của HeyGeo Web. Đây là nơi bạn có thể:

- **Duyệt** các mô hình từ cộng đồng để lấy cảm hứng và học hỏi
- **Khám phá** các hình học thú vị mà bạn chưa từng nghĩ đến
- **Tái sử dụng** ý tưởng — mở một mô hình, chỉnh sửa và tạo ra phiên bản của riêng bạn

### Luồng làm việc Desktop → Web

Đối với người dùng nâng cao, HeyGeo cung cấp một luồng làm việc liền mạch:

```
HeyGeo Desktop                 HeyGeo Web
─────────────────              ──────────────────
Dựng hình phức tạp    ──▶     Chia sẻ với cộng đồng
Đo lường, tính toán   ──▶     Xem tương tác trên mọi thiết bị
Xuất SVG thumbnail    ──▶     Ảnh thu nhỏ đẹp trên thư viện
```

Kết nối giữa Desktop và Web thực hiện qua **API token** bảo mật — bạn tạo token một lần trong phần Cài đặt tài khoản, sau đó HeyGeo Desktop dùng token đó để đăng tải tự động. Không cần nhập lại mật khẩu, không lo lộ thông tin.

---

## Ví Dụ Nổi Bật

Kho ví dụ đi kèm HeyGeo minh họa sức mạnh của nền tảng:

| Tên file | Nội dung |
|---|---|
| `circumcircle.seg` | Đường tròn ngoại tiếp tam giác — bất biến khi kéo ba đỉnh |
| `HeyGeo_dinhlyThales.seg` | Định lý Thalès động |
| `HeyGeo_QuytichTructam.seg` | Quỹ tích trực tâm tam giác |
| `locus.seg`, `prettylocus.seg` | Các đường cong quỹ tích đẹp mắt |
| `julia.seg` / `julia.sec` | Tập hợp Julia (fractal phức) |
| `koch.sec` | Đường cong Koch (fractal tuyết) |
| `sierp.sec` | Tam giác Sierpiński |
| `tractix.seg` | Đường tractrix (đường kéo) |
| `isogonal.sec` | Liên hợp đẳng giác trong tam giác |
| `kiepert.sec` | Hyperbola Kiepert |
| `radicalaxis.sec` | Trục đẳng phương của hai đường tròn |
| `delaunay.seg` | Tam giác hóa Delaunay |
| `bezier-cubic.seg` | Đường cong Bézier bậc ba |

Từ những bài toán hình học cơ bản của chương trình phổ thông đến các đường fractal phức tạp — HeyGeo sẵn sàng cho tất cả.

---

## Dành Cho Ai?

**Giáo viên toán học** sẽ thấy HeyGeo là công cụ chuẩn bị bài giảng lý tưởng: dựng hình chính xác, minh họa tức thì, chia sẻ cho học sinh bằng một link. Không còn phải vẽ tay lên bảng rồi tẩy đi khi muốn thay đổi.

**Học sinh và sinh viên** có thể tự khám phá toán học theo cách chủ động: thay vì đọc định lý rồi ghi nhớ, hãy kéo một điểm và tự mình chứng kiến định lý hoạt động như thế nào.

**Người yêu toán học và lập trình** sẽ thích HeyGeo Web Coding — nơi bạn có thể tạo ra những mô hình tương tác phức tạp bằng JavaScript, từ đường cong đặc biệt đến mô phỏng hình học xạ ảnh.

**Nhà nghiên cứu và giảng viên đại học** có thể khai thác các tính năng nâng cao: quỹ tích, đường bao, hệ tọa độ tùy chỉnh, phân tích thứ nguyên, và tích hợp với LaTeX — tất cả trong một công cụ duy nhất.

---

## Bắt Đầu Ngay

| Bạn muốn... | Hãy dùng... |
|---|---|
| Dựng hình chính xác trên máy tính | [HeyGeo Desktop](https://heygeo.pedu.vn) |
| Vẽ nhanh trên trình duyệt | [Web Design](https://heygeo.pedu.vn/design) |
| Tạo mô hình bằng code JSXGraph | [Web Coding](https://heygeo.pedu.vn/coding) |
| Xem và khám phá mô hình của cộng đồng | [Thư viện công khai](https://heygeo.pedu.vn) |

---

HeyGeo được phát triển với niềm tin rằng toán học trở nên dễ hiểu và thú vị hơn khi bạn có thể **nhìn thấy** nó chuyển động — không chỉ đọc về nó. Mỗi hình vẽ động là một lời mời khám phá; mỗi mô hình được chia sẻ là một đóng góp cho cộng đồng học toán.

*Hãy bắt đầu xây dựng mô hình đầu tiên của bạn tại [heygeo.pedu.vn](https://heygeo.pedu.vn).*
