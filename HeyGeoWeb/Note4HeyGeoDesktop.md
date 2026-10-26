# HeyGeo Desktop – Tài liệu tích hợp Web API

> Dành cho **HeyGeo Desktop Developers Team**  
> Web platform: **https://heygeo.pedu.vn**  
> Ngày cập nhật: 2026-03-07

---

## 1. Định dạng file JSON (`HeyGeoData`)

Mỗi mô hình hình học động được biểu diễn bằng một file JSON với cấu trúc sau:

```json
{
  "version": "1.0",
  "title": "Tam giác ABC",
  "boundingbox": [-6, 6, 6, -6],
  "axis": true,
  "grid": false,
  "elements": [
    { "type": "point",   "id": "A", "parents": [-2, 0], "attrs": { "name": "A", "size": 3 } },
    { "type": "point",   "id": "B", "parents": [2,  0], "attrs": { "name": "B", "size": 3 } },
    { "type": "point",   "id": "C", "parents": [0,  3], "attrs": { "name": "C", "size": 3 } },
    { "type": "segment", "id": "AB", "parents": ["A", "B"], "attrs": { "strokeColor": "#2266aa" } },
    { "type": "segment", "id": "BC", "parents": ["B", "C"], "attrs": {} },
    { "type": "segment", "id": "CA", "parents": ["C", "A"], "attrs": {} }
  ]
}
```

### 1.1 Các trường ở cấp gốc

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `version` | `string` | Không | Phiên bản định dạng, hiện tại `"1.0"` |
| `title` | `string` | Không | Tên hiển thị của mô hình |
| `boundingbox` | `[x_min, y_max, x_max, y_min]` | Không | Vùng nhìn; mặc định `[-8, 8, 8, -8]` |
| `axis` | `boolean` | Không | Hiển thị trục tọa độ; mặc định `true` |
| `grid` | `boolean` | Không | Hiển thị lưới; mặc định `false` |
| `elements` | `HeyGeoElement[]` | **Có** | Danh sách các đối tượng hình học |

> **Lưu ý `boundingbox`:** thứ tự là `[x_min, y_max, x_max, y_min]` (khác với quy ước thông thường),  
> ví dụ `[-6, 6, 6, -6]` tạo cửa sổ nhìn từ -6 đến +6 theo cả hai trục.

### 1.2 Cấu trúc mỗi phần tử (`HeyGeoElement`)

```typescript
{
  "type":    string,                        // Loại đối tượng JSXGraph
  "id":      string,                        // ID duy nhất (để làm parents của phần tử khác)
  "parents": (string | number | boolean)[], // Tham số khởi tạo (số hoặc ID của phần tử đã khai báo trước)
  "attrs":   Record<string, unknown>        // Thuộc tính hiển thị của JSXGraph (có thể rỗng {})
}
```

#### Quy tắc `parents`
- **Số** (`number`): tọa độ, bán kính, góc...
- **Chuỗi** (`string`): ID của một phần tử đã khai báo **trước đó** trong mảng `elements`
- Engine sẽ giải tham chiếu theo thứ tự khai báo – phần tử phụ thuộc phải đứng **sau** phần tử gốc

### 1.3 Các loại phần tử thường dùng (JSXGraph types)

| `type` | `parents` ví dụ | Mô tả |
|--------|-----------------|-------|
| `"point"` | `[x, y]` | Điểm tọa độ cố định |
| `"point"` | `[x, y]` + `attrs.fixed=false` | Điểm kéo được (draggable) |
| `"segment"` | `["P1", "P2"]` | Đoạn thẳng qua 2 điểm |
| `"line"` | `["P1", "P2"]` | Đường thẳng qua 2 điểm |
| `"circle"` | `["Center", radius]` | Đường tròn tâm + bán kính |
| `"circle"` | `["Center", "OnCircle"]` | Đường tròn qua 2 điểm |
| `"polygon"` | `["A","B","C",...]` | Đa giác |
| `"angle"` | `["A","B","C"]` | Góc tại B, từ A đến C |
| `"midpoint"` | `["P1","P2"]` | Trung điểm |
| `"perpendicularsegment"` | `["Line","Point"]` | Đường vuông góc |
| `"intersection"` | `["obj1","obj2",0]` | Giao điểm (index 0 hoặc 1) |
| `"text"` | `[x, y, "nội dung"]` | Nhãn văn bản |
| `"functiongraph"` | `["x*x", -5, 5]` | Đồ thị hàm số (chuỗi ký hiệu toán học) |
| `"slider"` | `[[x,y],[x2,y2],[min,start,max]]` | Thanh trượt |
| `"glider"` | `[x, y, "obj"]` | Điểm trượt trên đối tượng |

> Danh sách đầy đủ: https://jsxgraph.uni-bayreuth.de/docs/

### 1.4 Thuộc tính `attrs` thường dùng

```json
{
  "name":        "A",          // Nhãn hiển thị (để "" để ẩn)
  "visible":     true,
  "fixed":       false,        // true = không kéo được
  "size":        3,            // Kích thước điểm (pixel)
  "strokeColor": "#c0392b",    // Màu viền (hex hoặc tên CSS)
  "fillColor":   "#e74c3c",    // Màu nền
  "strokeWidth": 2,
  "dash":        2,            // 0=liền, 1=chấm, 2=gạch
  "face":        "o",          // Hình dạng điểm: "o" tròn, "x", "+"
  "label":       { "fontSize": 14, "color": "#333" }
}
```

---

## 2. HeyGeo Web API

Base URL: `https://heygeo.pedu.vn`

### 2.1 Xác thực – API Token

Desktop app **không** dùng username/password; thay vào đó dùng **API Token** được tạo từ trang web:

1. Người dùng đăng nhập `https://heygeo.pedu.vn`
2. Vào **Settings → API Tokens → Tạo token mới**
3. Token chỉ hiện **một lần** – phải lưu ngay vào ứng dụng desktop

Gửi token trong header HTTP:

```
Authorization: Bearer <token_value>
```

---

### 2.2 Endpoint: Đăng mô hình mới

```
POST /api/models
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**

```json
{
  "title":       "Tam giác vuông cân",
  "description": "Minh họa định lý Pythagorean",
  "guide":       "Kéo điểm C để thay đổi hình dạng. Quan sát...",
  "isPublic":    true,
  "jsonData": {
    "version": "1.0",
    "boundingbox": [-6, 6, 6, -6],
    "axis": true,
    "grid": false,
    "elements": [ ... ]
  }
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `title` | **Có** | Tiêu đề mô hình (hiển thị trên dashboard) |
| `description` | Không | Mô tả ngắn (markdown) |
| `guide` | Không | Hướng dẫn khảo sát (hiện bên cạnh viewer) |
| `isPublic` | Không | `true` = công khai ngay lúc tạo; mặc định `false` |
| `jsonData` | **Có** | Object JSON theo định dạng HeyGeoData |

> ⚠️ **Quan trọng:** Nếu không truyền `"isPublic": true`, mô hình sẽ ở chế độ **private** và link share sẽ trả về 404 khi truy cập. Desktop app nên luôn truyền `"isPublic": true` khi muốn cung cấp link cho người dùng.

**Response thành công (201):**

```json
{
  "model": {
    "id":          "clxyz123abc",
    "title":       "Tam giác vuông cân",
    "shareToken":  "tok_abcdef",
    "isPublic":    true,
    "createdAt":   "2026-03-07T10:00:00.000Z"
  },
  "shareUrl": "https://heygeo.pedu.vn/share/tok_abcdef"
}
```

> `shareUrl` chỉ có giá trị (không phải `null`) khi `isPublic: true`. Desktop app có thể dùng trực tiếp giá trị này để hiển thị cho người dùng — **không cần gọi thêm `/publish`**.

---

### 2.3 Endpoint: Cập nhật mô hình

```
PUT /api/models/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body** (gửi chỉ các trường cần sửa):

```json
{
  "title":    "Tên mới",
  "jsonData": { ... },
  "isPublic": true
}
```

---

### 2.4 Endpoint: Lấy danh sách mô hình của user

```
GET /api/models
Authorization: Bearer <token>
```

**Response:**

```json
{
  "models": [
    {
      "id":         "clxyz123abc",
      "title":      "Tam giác vuông cân",
      "isPublic":   false,
      "shareToken": "tok_abcdef",
      "viewCount":  12,
      "createdAt":  "2026-03-07T10:00:00.000Z",
      "updatedAt":  "2026-03-07T11:00:00.000Z"
    }
  ]
}
```

---

### 2.5 Endpoint: Bật/tắt công khai

```
POST /api/models/:id/publish
Authorization: Bearer <token>
```

**Response (khi bật public):**

```json
{
  "model":    { "id": "...", "isPublic": true, ... },
  "shareUrl": "https://heygeo.pedu.vn/share/tok_abcdef"
}
```

---

### 2.6 Endpoint: Xoá mô hình

```
DELETE /api/models/:id
Authorization: Bearer <token>
```

---

## 3. Luồng làm việc đề xuất cho HeyGeo Desktop

```
1. [Người dùng] Thiết kế mô hình trong Qt app
        ↓
2. [Qt app] Export sang HeyGeoData JSON (theo §1)
        ↓
3. [Qt app] Gọi POST /api/models với Authorization: Bearer <token>
        ↓
4. [Server] Trả về { model.id, model.shareToken }
        ↓
5. [Qt app] (Tùy chọn) Gọi POST /api/models/:id/publish để bật public
        ↓
6. [Qt app] Hiển thị shareUrl cho người dùng copy/chia sẻ
```

---

## 4. Ví dụ Qt/C++ (QNetworkAccessManager)

```cpp
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>

void HeyGeoApi::uploadModel(const QString& token,
                             const QJsonObject& modelJson,
                             const QString& title,
                             const QString& description)
{
    QNetworkAccessManager* manager = new QNetworkAccessManager(this);

    QNetworkRequest request(QUrl("https://heygeo.pedu.vn/api/models"));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setRawHeader("Authorization", ("Bearer " + token).toUtf8());

    QJsonObject body;
    body["title"]       = title;
    body["description"] = description;
    body["jsonData"]    = modelJson;   // HeyGeoData object

    QNetworkReply* reply = manager->post(request,
                                         QJsonDocument(body).toJson());

    connect(reply, &QNetworkReply::finished, this, [reply]() {
        if (reply->error() == QNetworkReply::NoError) {
            QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
            QString modelId = doc["model"]["id"].toString();
            qDebug() << "Uploaded, id:" << modelId;
        } else {
            qDebug() << "Upload error:" << reply->errorString();
        }
        reply->deleteLater();
    });
}
```

---

## 5. Mã lỗi HTTP

| Code | Ý nghĩa |
|------|---------|
| `200` | Thành công (GET, PUT) |
| `201` | Tạo mới thành công (POST) |
| `400` | Body không hợp lệ / thiếu trường bắt buộc |
| `401` | Token không hợp lệ hoặc hết hạn – kiểm tra lại token |
| `404` | Không tìm thấy model (sai id, hoặc không thuộc user) |
| `500` | Lỗi server – liên hệ admin |

---

## 6. Ghi chú

- Token **không có thời gian hết hạn** theo mặc định; người dùng có thể xoá token trên web bất cứ lúc nào.
- `jsonData` phải là **object JSON**, không phải chuỗi (không cần `JSON.stringify`).
- `elements` được render **theo thứ tự** – phần tử tham chiếu đến ID khác phải khai báo **sau** phần tử được tham chiếu.
- Mô hình mới tạo mặc định là **private** (`isPublic: false`); cần gọi `/publish` để chia sẻ.
- Share URL dạng: `https://heygeo.pedu.vn/share/<shareToken>` – không yêu cầu đăng nhập để xem.
