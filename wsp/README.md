WebSketchpad (WSP) - Tóm tắt dự án
=================================

Mô tả ngắn
----------
Bộ source này chứa một bản phân phối của WebSketchpad (WSP) — một bộ công cụ/tiện ích JavaScript để tạo các hình vẽ hình học tương tác trên web (widgets, runner, exporter, và tập JSON mô tả công cụ).

Điểm nổi bật
-----------
- Thư viện chính: `js/wsp.js`, `js/wsp-runner.js`
- Widget và giao diện: thư mục `widgets/` (CSS, HTML, JS)
- Bộ công cụ mẫu: `basic/` chứa nhiều file JSON mô tả công cụ (tools)
- Công cụ xuất: `exporter/` (bao gồm PHP và script xuất)
- Hỗ trợ đa ngôn ngữ: `locales/`

Cách chạy
---------
- Mở `index.html` hoặc `index.shtml` trong trình duyệt (có thể chạy trực tiếp file HTML trên máy, hoặc phục vụ qua web server).
- Nếu muốn sử dụng phần xuất (exporter), chạy trên một web server có PHP và mở `exporter/index.php`.

Phát triển
---------
- Các thay đổi về logic chính thường nằm ở `js/wsp.js`, `js/wsp-runner.js`, và `widgets/widgets.js`.
- Các công cụ/định nghĩa hình học được lưu dưới dạng JSON trong `basic/` và `hyperbolic/` — chỉnh sửa/bổ sung ở đó.
- Thư viện jQuery (2.1.0) đã được đưa vào cùng repo trong `js/`.

Cấu trúc chính (tóm tắt)
------------------------
- `index.html`, `index.shtml` — trang demo/khởi động.
- `js/` — mã JavaScript chính (wsp, runner, helper).
- `widgets/` — code widget, CSS, HTML cho UI.
- `basic/`, `hyperbolic/` — tập JSON định nghĩa công cụ và ví dụ.
- `exporter/` — công cụ xuất sang trang web và tập tin liên quan.

Phụ thuộc
---------
- Trình duyệt hiện đại (Chrome/Firefox/Safari)
- jQuery (đã có trong `js/`)
- Nếu dùng `exporter/`: PHP và web server để chạy `index.php`.

Góp ý & Bổ sung
---------------
- Không thấy thông tin license trong repo — nếu dùng/chia sẻ công khai, bổ sung file `LICENSE` hoặc thông tin tác giả.
- Nếu muốn, tôi có thể giúp bổ sung phần hướng dẫn phát triển chi tiết hơn hoặc tài liệu API nội bộ.

Vị trí file README
------------------
Xem file này: [README.md](README.md)
