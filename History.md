# Lịch sử phát triển HeyGeo

## Gốc rễ — KSEG (1999–2006)

**KSEG** là ứng dụng hình học động mã nguồn mở do **Ilya Baran** (MIT) viết, phát hành lần đầu năm 1999, dừng phát triển chính quanh năm 2006 ở phiên bản **0.403**. KSEG được xây dựng trên **Qt 3**, hoạt động tốt trên Linux thập niên 2000 nhưng dần không tương thích với các hệ điều hành và phiên bản Qt hiện đại.

Tính năng nổi bật của KSEG:
- Dựng hình tương tác: điểm, đoạn thẳng, tia, đường thẳng, đường tròn, cung tròn, đa giác
- Đo lường: khoảng cách, độ dài, diện tích, góc, hệ số, tỉ lệ
- Quỹ tích (locus)
- Phát lại bản dựng (script `.sec`)
- Giao diện đa ngôn ngữ (12+ ngôn ngữ)

---

## Giai đoạn 1 — Di chuyển sang Qt 6 & đổi tên thành HeyGeo

> **Thời điểm:** đầu năm 2026

Mã nguồn gốc của KSEG sử dụng nhiều API đã bị xóa hoàn toàn trong Qt 5 / Qt 6. Toàn bộ dự án được fork, nâng cấp, và đổi tên thành **HeyGeo** để phân biệt với bản gốc.

### Những việc đã làm

#### Build system
- Viết lại `heygeo.pro` — thay thế toàn bộ cú pháp Qt 3/4, thêm `QT += core gui widgets printsupport xml svg`, bật `CONFIG += c++17`
- Thêm script `rebuild.sh` để tự động chạy `qmake` + `make` + đóng gói `.app` trên macOS Apple Silicon (arm64)

#### API Qt đã bị xóa — thay thế toàn bộ
| API cũ (Qt 3/4) | API mới (Qt 6) |
|---|---|
| `Q3PtrList`, `Q3Dict` | `QList`, `QHash` |
| `QColor(r, g, b, QColor::Hsv)` | `QColor::fromHsv(h, s, v)` |
| `bitBlt(...)` | `QPainter::drawPixmap(...)` |
| `QPaintDevice::isExtDev()` | `dynamic_cast<QPrinter*>(p.device())` |
| `QPixmap::setOptimization(...)` | *(removed, không cần)* |
| `Q_SIGNALS` / `Q_SLOTS` cú pháp cũ | `connect(obj, &Class::signal, ...)` |
| `QApplication::setMainWidget(...)` | *(removed)* |
| `QDesktopWidget` | `QScreen` |

#### Các lỗi C++17 / LLVM Clang
- Loại bỏ `register` keyword (deprecated C++17)
- Sửa ambiguous overload cho `qAbs`, `qMax`, `qMin` với kiểu `double`
- Thay `std::hash_map` / `std::hash_set` (non-standard SGI) bằng `std::unordered_map` / `std::unordered_set` trong `my_hash_map.H`, `my_hash_set.H`
- Sửa toàn bộ include: `<qpainter.h>` → `<QPainter>`, v.v.

#### Formula editor
- Port `kformula.cpp` / `kformulaedit.cpp` sang Qt 6 (widget painting, font metrics, input handling)

#### Giao diện
- Thay `drawWinFocusRect(...)` bằng `QPainter::drawRect` với `Qt::DashLine` (selection rectangle)
- Cập nhật tất cả `QScrollBar` signal/slot sang cú pháp mới
- Đổi tên thương hiệu: "kseg" → "HeyGeo" trong title bar, file filter, About dialog
- Viết lại `README.md` bằng tiếng Anh, đầy đủ hướng dẫn build cho macOS và Linux

#### Kết quả
HeyGeo build thành công và chạy được trên **macOS 14+ Apple Silicon** với Qt 6.

---

## Giai đoạn 2 — Nâng cấp chất lượng hiển thị (Anti-aliasing & HiDPI)

> **Thời điểm:** 6 tháng 3, 2026

Quan sát thấy HeyGeo trên macOS trông thô hơn so với **The Geometer's Sketchpad (GSP)**: đường thẳng bị răng cưa, điểm bị vỡ pixel, hình tròn không mịn. Nguyên nhân được xác định là do ba vấn đề cốt lõi:

1. **Buffer render chỉ ở logical pixels** — trên màn hình Retina 2×, buffer 800×600 bị kéo giãn lên 1600×1200 khi hiển thị → mờ, ráp.
2. **Tọa độ vẽ bị làm tròn về số nguyên** — dù QPainter bật `Antialiasing`, các hàm `drawEllipse(int,int,int,int)` và `drawLine(QPoint,QPoint)` chỉ chấp nhận pixel nguyên, vô hiệu hóa sub-pixel anti-aliasing.
3. **Coordinate pre-transform** thay vì dùng world transform của QPainter — khiến Qt không thể tối ưu rendering theo transform.

### Các file đã sửa

#### `src/app/HeyGeoView.cpp` — HiDPI buffer
```cpp
// Trước:
buffer = QPixmap(width(), height());

// Sau:
qreal dpr = devicePixelRatio();
buffer = QPixmap(qRound(width() * dpr), qRound(height() * dpr));
buffer.setDevicePixelRatio(dpr);
```
Áp dụng cả trong constructor lẫn `resizeEvent()`. Trên Retina 2×, buffer nay render ở độ phân giải gốc thay vì bị upscale.

#### `src/geometry/G_point.H` — Thêm `toQPointF()`
```cpp
QPointF toQPointF() const { return QPointF(x, y); }
```

#### `src/geometry/G_point.cpp` — Dùng `QRectF` cho điểm
```cpp
// Trước:
p.drawEllipse(qRound(x - size), qRound(y - size), size * 2, size * 2);

// Sau:
p.drawEllipse(QRectF(x - size, y - size, size * 2., size * 2.));
```

#### `src/geometry/G_segment.cpp` — Dùng `QPointF` cho đoạn thẳng
```cpp
// Trước:
p.drawLine(tmp1.toQPoint(), tmp2.toQPoint());

// Sau:
p.drawLine(tmp1.toQPointF(), tmp2.toQPointF());
```

#### `src/geometry/G_circle.cpp` — Dùng `QRectF` cho đường tròn
```cpp
// Trước:
p.drawEllipse(ROUND(p1.getX() - r), ROUND(p1.getY() - r), ROUND(r * 2), ROUND(r * 2));

// Sau:
p.drawEllipse(QRectF(p1.getX() - r, p1.getY() - r, r * 2., r * 2.));
```

#### `src/geometry/G_arc.cpp` — Dùng `QRectF` cho cung tròn
```cpp
// Trước:
p.drawArc(ROUND(p1.getX() - r), ROUND(p1.getY() - r), ROUND(r * 2), ROUND(r * 2), ...);

// Sau:
p.drawArc(QRectF(p1.getX() - r, p1.getY() - r, r * 2., r * 2.), ...);
```

#### `src/geometry/G_polygon.cpp` — Dùng `QPolygonF` cho đa giác
```cpp
// Trước: QPolygon pts;  pts[i] = points[i].toQPoint();
// Sau:   QPolygonF pts; pts[i] = points[i].toQPointF();
```

### Kết quả
- Đường thẳng, đoạn thẳng: mịn với sub-pixel anti-aliasing
- Điểm: hình tròn trơn, không bị vỡ pixel ở cạnh
- Đường tròn / cung tròn: viền đều, không bị bậc thang
- Trên màn hình Retina: toàn bộ canvas render ở 2× resolution thực, sắc nét ngang ngửa GSP
- Build thành công, không có lỗi compile (chỉ có warnings về deprecated-copy vốn có từ trước)
