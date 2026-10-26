# HeyGeo

Nền tảng chia sẻ mô hình hình học động, tích hợp với ứng dụng desktop HeyGeo (Qt).  
Triển khai tại **heygeo.pedu.vn** · Engine: [JSXGraph](https://jsxgraph.uni-bayreuth.de)

---

## Cấu trúc dự án

```
HeyGeo/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/             # Login / Register (URL: /login, /register)
│   ├── (main)/             # Authenticated pages (Dashboard, Models, Settings)
│   ├── share/[token]/      # Trang xem công khai (không cần đăng nhập)
│   └── api/                # REST API
│       ├── auth/           # login, register, logout, me
│       ├── models/         # CRUD + publish toggle
│       └── tokens/         # API token management
├── components/             # React components
│   ├── JSXGraphViewer.tsx  # Renders HeyGeo JSON with JSXGraph
│   ├── ModelCard.tsx
│   └── Navigation.tsx
├── lib/                    # Shared utilities
│   ├── auth.ts             # JWT (jose) + bcrypt
│   ├── api-auth.ts         # Auth from cookie/header
│   └── prisma.ts
├── prisma/schema.prisma    # DB schema (User, Model, ApiToken)
├── middleware.ts            # Route protection
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## Cài đặt môi trường phát triển

### 1. Clone & cài phụ thuộc
```bash
git clone <repo-url> heygeo
cd heygeo
npm install
```

### 2. Cấu hình môi trường
```bash
cp .env.example .env
# Chỉnh sửa .env:
#   DATABASE_URL – kết nối PostgreSQL
#   JWT_SECRET   – chuỗi ngẫu nhiên >= 32 ký tự
#   NEXT_PUBLIC_BASE_URL – URL của site
```

Tạo JWT secret ngẫu nhiên:
```bash
openssl rand -hex 32
```

### 3. Khởi tạo database
```bash
# Với PostgreSQL đang chạy:
npm run db:push      # Tạo bảng từ schema
npm run db:generate  # Generate Prisma client
```

### 4. Chạy development server
```bash
npm run dev
# → http://localhost:3000
```

---

## Triển khai lên Mac Mini M2 Pro (native – không cần Docker)

### Yêu cầu
- macOS 13+ (Ventura)
- [Homebrew](https://brew.sh) đã cài
- Tài khoản Cloudflare quản lý `pedu.vn`

### 1. Cài đặt tự động (một lần duy nhất)

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Script sẽ tự động:
1. Cài **Node.js 22**, **PostgreSQL 16**, **cloudflared** (nếu chưa có)
2. Tạo file `.env` với secret ngẫu nhiên
3. Chạy `npm install` → `prisma generate` → `prisma db push` → `next build`
4. Đăng nhập Cloudflare, **tạo tunnel mới tên `heygeo`** (tránh xung đột)
5. Thêm DNS record `heygeo.pedu.vn` → tunnel
6. Cài 2 **launchd services** tự động khởi động cùng macOS:
   - `com.heygeo.app` – Next.js production server (port 3000)
   - `com.heygeo.tunnel` – cloudflared tunnel → heygeo.pedu.vn

### 2. Cloudflare Tunnel – chi tiết

Tunnel `heygeo` được tạo độc lập, **không đụng** đến các tunnel khác trên Cloudflare. Config của tunnel nằm tại `cloudflared/config.yml` và được chỉ định tường minh bằng `--config`, nên cloudflared sẽ không đọc `~/.cloudflared/config.yml`.

```
heygeo.pedu.vn  ──Cloudflare Edge──► cloudflared tunnel ──► localhost:3000
```

TLS do Cloudflare xử lý hoàn toàn — không cần nginx, không cần mở port trên Mac Mini.

### 3. Quản lý service

```bash
./scripts/status.sh    # Xem trạng thái
./scripts/restart.sh   # Khởi động lại
./scripts/stop.sh      # Dừng tất cả
./scripts/deploy.sh    # Deploy code mới (build + restart app, không restart tunnel)
```

Xem log:
```bash
tail -f logs/app.log          # Next.js stdout
tail -f logs/app-error.log    # Next.js stderr
tail -f logs/tunnel.log       # cloudflared tunnel
```

### 4. Deploy code mới (sau khi sửa code)

```bash
git pull
./scripts/deploy.sh
```

### 5. Cấu hình Cloudflare

DNS record được `setup.sh` tự tạo. Kiểm tra lại trong Cloudflare Dashboard:

| Type | Name   | Content              | Proxy |
|------|--------|----------------------|-------|
| CNAME | heygeo | `<TUNNEL_ID>.cfargotunnel.com` | ✅ Proxied |

**SSL/TLS Mode**: Cloudflare → SSL/TLS → **Full** (không cần Origin Certificate vì traffic chỉ đi qua tunnel nội bộ).


---

## Định dạng file JSON (HeyGeo Export)

File JSON được tạo bởi ứng dụng HeyGeo Qt rồi upload lên site, hoặc gửi qua API.

```json
{
  "version": "1.0",
  "title": "Tên mô hình",
  "boundingbox": [-5, 5, 5, -5],
  "axis": true,
  "grid": false,
  "elements": [
    {
      "type": "point",
      "id": "A",
      "parents": [0, 0],
      "attrs": { "name": "A", "size": 4, "fixed": false }
    },
    {
      "type": "point",
      "id": "B",
      "parents": [3, 0],
      "attrs": { "name": "B" }
    },
    {
      "type": "segment",
      "id": "seg_AB",
      "parents": ["A", "B"],
      "attrs": { "strokeColor": "#333" }
    }
  ]
}
```

- `type` – bất kỳ loại element JSXGraph: `point`, `segment`, `line`, `circle`, `polygon`, `angle`, `text`, v.v.
- `parents` – giá trị số hoặc `id` của phần tử đã khai báo trước.
- `attrs` – đối số thứ 3 của `board.create()`, xem [JSXGraph docs](https://jsxgraph.uni-bayreuth.de/docs/).

---

## REST API (dùng cho ứng dụng Qt)

Base URL: `https://heygeo.pedu.vn/api`

### Xác thực

Mọi request cần header:
```
Authorization: Bearer <token>
```

`<token>` là **JWT** (nhận sau login) hoặc **API Token** (tạo trong Settings → API Tokens).

---

### Auth

#### `POST /api/auth/login`
Đăng nhập, nhận JWT token.
```json
// Body
{ "email": "user@example.com", "password": "matkhau123" }

// Response 200
{ "user": { "id": "...", "email": "...", "name": "..." }, "token": "<jwt>" }
```

#### `POST /api/auth/register`
Tạo tài khoản mới.
```json
// Body
{ "email": "user@example.com", "password": "matkhau123", "name": "Nguyễn A" }

// Response 201
{ "user": { ... }, "token": "<jwt>" }
```

#### `GET /api/auth/me`
Lấy thông tin tài khoản đang đăng nhập.
```json
// Response 200
{ "user": { "id": "...", "email": "...", "name": "...", "createdAt": "..." } }
```

---

### Models

#### `GET /api/models`
Lấy danh sách mô hình của user.

#### `POST /api/models`
Tạo mô hình mới (upload JSON từ Qt app).
```json
// Body
{
  "title": "Định lý Pythagore",
  "description": "Minh hoạ động định lý Pythagore",
  "guide": "Kéo điểm C để thay đổi tam giác và quan sát...",
  "jsonData": { /* HeyGeo JSON */ }
}

// Response 201
{ "model": { "id": "...", "title": "...", ... } }
```

#### `PUT /api/models/:id`
Cập nhật mô hình (title, description, guide, jsonData, isPublic).

#### `DELETE /api/models/:id`
Xoá mô hình.

#### `POST /api/models/:id/publish`
Toggle công khai / riêng tư.
```json
// Response 200
{ "model": { ... }, "shareUrl": "https://heygeo.pedu.vn/share/abc123" }
```

---

### API Tokens

#### `GET /api/tokens`
Lấy danh sách API tokens (không lấy giá trị token thực).

#### `POST /api/tokens`
Tạo API token mới (giá trị chỉ trả về **một lần**).
```json
// Body
{ "name": "HeyGeo Desktop – MacBook Pro" }

// Response 201
{
  "token": { "id": "...", "name": "...", "createdAt": "..." },
  "value": "abc123..."   // Lưu ngay! Sẽ không hiển thị lại
}
```

#### `DELETE /api/tokens/:id`
Xoá API token.

---

## Workflow tích hợp Qt App

```
1. POST /api/auth/login  →  nhận JWT (hoặc dùng API Token)
2. Thiết kế mô hình trong HeyGeo Qt
3. Export → JSON file
4. POST /api/models  (attach JSON vào body.jsonData)  →  nhận model.id
5. POST /api/models/:id/publish  →  nhận shareUrl (nếu bật công khai)
6. Mở shareUrl trong browser hoặc chia sẻ
```

---

## License

MIT © HeyGeo / pedu.vn
