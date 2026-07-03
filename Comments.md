# Hệ thống Bình luận HeyGeo — Tài liệu Kỹ thuật

> Cập nhật: 2026-04-02 (hoàn thành toàn bộ kế hoạch)

---

## 1. Tổng quan Kiến trúc Hiện tại

Hệ thống bình luận được triển khai trong ứng dụng **Next.js 15** (`HeyGeoWeb/`) với **Prisma + PostgreSQL** làm backend. Các thành phần chính:

| File | Vai trò |
|---|---|
| `components/CommentsSection.tsx` | UI component — form nhập, danh sách bình luận, phản hồi |
| `components/LatexRenderer.tsx` | Render nội dung có `$...$` / `$$...$$` bằng KaTeX |
| `app/api/models/[id]/comments/route.ts` | GET (lấy danh sách) + POST (tạo bình luận) |
| `app/api/comments/[id]/route.ts` | PATCH (edit) + DELETE (soft-delete) |
| `app/api/comments/[id]/verify/route.ts` | POST — toggle Verified Answer |
| `app/api/comments/[id]/reactions/route.ts` | POST — toggle reaction (👍❓💡) |
| `prisma/schema.prisma` — model `Comment` | Schema cơ sở dữ liệu |

---

## 2. Trạng thái Triển khai Hiện tại

### ✅ Đã hoàn thành (tất cả)

- **Threaded replies (1 cấp):** Người dùng có thể trả lời bình luận gốc; phản hồi hiển thị thụt lề và có form inline.
- **Visibility control:** Mỗi bình luận/phản hồi có thể chọn `🌐 Công khai` hoặc `🔒 Chỉ thành viên`. API tự lọc theo quyền của người đọc.
- **Soft-delete:** Bình luận bị xóa vẫn giữ record trong DB, hiển thị `[đã xóa]`. Chỉ chủ nhân hoặc ADMIN được xóa.
- **Auth-gate:** Chỉ người dùng đã đăng nhập (`getAuthUser`) mới POST được bình luận.
- **Avatar + initials fallback:** Ảnh đại diện từ profile, fallback sang 2 chữ cái đầu.
- **Relative timestamps:** "vừa xong", "5 phút trước", "3 ngày trước"…
- **Content validation:** Server-side — không trống, tối đa 2 000 ký tự, nesting tối đa 1 cấp.
- **KaTeX render:** Nội dung bình luận render qua `LatexRenderer` — hỗ trợ `$...$` (inline) và `$$...$$` (display).
- **Live preview:** Tab Soạn thảo / Xem trước trong form nhập.
- **Math toolbar:** 18 nút chèn ký hiệu nhanh (hình học, phân số, căn, tích phân, chữ Hy Lạp). Chèn đúng vị trí con trỏ.
- **Edit bình luận:** Chỉnh sửa trong vòng 15 phút, hiện label *(đã sửa)*. `PATCH /api/comments/:id`.
- **Verified Answer:** Toggle xác nhận (model owner/ADMIN), badge xanh, viền trái xanh. `POST /api/comments/:id/verify`.
- **Reactions 👍❓💡:** Optimistic update, toggle. `POST /api/comments/:id/reactions`.
- **Cursor-based pagination:** GET trả về `{ comments, nextCursor }`, nút "Tải thêm bình luận".
- **Rate limiting:** Tối đa 5 bình luận/phút/user (DB-based), trả về `429`.
- **Skeleton loader:** 3 card animation khi đang tải.
- **Notifications:** Gửi thông báo (fire-and-forget, không tự thông báo cho chính mình) khi:
  - Ai đó reply → chủ bình luận nhận `REPLY_ON_COMMENT`
  - Bình luận được verify → tác giả nhận `COMMENT_VERIFIED`
  - Ai đó react → chủ bình luận nhận `COMMENT_REACTION`

---

## 3. Kế hoạch Nâng cấp

### Giai đoạn 1 — KaTeX & Math UX *(ưu tiên cao, không cần thay đổi DB)*

#### 3.1 Render KaTeX trong bình luận

**Thay đổi:** `CommentsSection.tsx` — thay `<p className="text-sm ...">` bằng component `<LatexRenderer>`.

```tsx
// TRƯỚC
<p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.content}</p>

// SAU
import LatexRenderer from './LatexRenderer';
// ...
<LatexRenderer className="text-sm text-gray-700 break-words">{item.content}</LatexRenderer>
```

> `LatexRenderer` đã escape HTML thuần (tránh XSS) và xử lý `$...$` / `$$...$$` qua KaTeX — không cần thêm thư viện nào.

#### 3.2 Live Preview

Thêm toggle "Xem trước" ngay trong form nhập:

- Mặc định: chỉ hiện textarea.
- Khi người dùng dùng `$`, tự động hiện tab "Xem trước" bên cạnh tab "Soạn thảo".
- Debounce 300 ms để tránh render liên tục khi gõ.
- Dùng lại `LatexRenderer` cho phần preview.

#### 3.3 Math Toolbar

Thanh công cụ nhỏ nằm trên textarea, ẩn cho đến khi textarea được focus:

| Nhóm | Ký hiệu |
|---|---|
| Hình học | `\triangle` `\angle` `\perp` `\parallel` `\cong` `\sim` `\overrightarrow{AB}` |
| Phân số / căn | `\frac{a}{b}` `\sqrt{x}` `\sqrt[n]{x}` |
| Tổng / tích phân | `\sum_{i=1}^{n}` `\int_{a}^{b}` |
| Chữ Hy Lạp | `\alpha` `\beta` `\gamma` `\theta` `\pi` `\Delta` |

Mỗi nút chèn chuỗi tương ứng vào vị trí con trỏ trong textarea (dùng `selectionStart` / `selectionEnd`).

---

### Giai đoạn 2 — Comment Management *(cần thay đổi nhỏ ở DB + API)*

#### 3.4 Chỉnh sửa bình luận

**Schema — thêm trường:**
```prisma
editedAt DateTime? // null nếu chưa chỉnh sửa
```

**API — thêm route:**
```
PATCH /api/comments/:id
Body: { content: string }
```
- Chỉ chủ nhân mới chỉnh sửa được.
- Không cho phép chỉnh sửa sau 15 phút (nhằm tránh thay đổi nội dung sau khi người khác đã đọc/reply).
- Giữ giới hạn 2 000 ký tự.
- UI: hiện label *(đã chỉnh sửa)* nếu `editedAt != null`.

#### 3.5 Verified Answer

**Mục đích:** Tác giả mô hình (hoặc ADMIN) đánh dấu một bình luận là câu trả lời/lời giải chính xác.

**Schema — thêm trường:**
```prisma
isVerified Boolean @default(false)
```

**API — thêm route:**
```
PATCH /api/comments/:id/verify
```
- Chỉ người dùng sở hữu mô hình hoặc ADMIN mới gọi được.
- Toggle: `true ↔ false`.

**UI:**
- Badge `✔ Đã xác nhận` màu xanh lá cạnh tên người dùng.
- Bình luận được verified tự động đẩy lên đầu danh sách (hoặc ghim nổi bật).

#### 3.6 Reactions

**Schema — bảng mới:**
```prisma
model CommentReaction {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // "like" | "question" | "insight"
  createdAt DateTime @default(now())

  @@unique([commentId, userId, type])
  @@index([commentId])
}
```

**API:**
```
POST   /api/comments/:id/reactions   { type: "like"|"question"|"insight" }
DELETE /api/comments/:id/reactions   { type: "like"|"question"|"insight" }
```

**UI:** Ba nút nhỏ cuối mỗi bình luận — `👍 N` `❓ N` `💡 N`. Toggle khi click; hiệu ứng optimistic update.

---

### Giai đoạn 3 — Advanced Features *(phức tạp, nên làm sau)*

#### 3.7 Phân trang / Load More

Hiện tại API trả về **toàn bộ** bình luận. Khi mô hình có > 50 bình luận sẽ chậm.

**Thay đổi API (GET):**
```
GET /api/models/:id/comments?cursor=<lastCommentId>&limit=20
Response: { comments, nextCursor }
```
**UI:** Nút "Tải thêm bình luận" cuối danh sách (infinite scroll hoặc button).

#### 3.8 Rate Limiting

Thêm middleware kiểm tra số lượng bình luận theo `userId` trong khoảng thời gian ngắn:
- Tối đa **5 bình luận / phút** mỗi user.
- Trả về `429 Too Many Requests` nếu vượt giới hạn.
- Có thể dùng Redis hoặc đơn giản hơn: lưu timestamp các lần POST trong memory / DB.

#### 3.9 Thông báo (Notifications)

Reuse bảng `Notification` đã có trong schema:

| Sự kiện | Loại thông báo |
|---|---|
| Ai đó reply bình luận của bạn | `REPLY_ON_COMMENT` (cần thêm vào enum `NotifType`) |
| Bình luận của bạn được Verified | `COMMENT_VERIFIED` |
| Ai đó react vào bình luận của bạn | `COMMENT_REACTION` |

**Lưu ý:** Thêm các giá trị enum mới vào `NotifType` trong `schema.prisma` và migration tương ứng.

---

## 4. Bảo mật

| Điểm kiểm tra | Trạng thái |
|---|---|
| Auth-gate POST | ✅ `getAuthUser` kiểm tra JWT |
| Chỉ chủ nhân / ADMIN xóa | ✅ Đã có trong `DELETE /api/comments/:id` |
| XSS — render HTML tự do | ✅ `LatexRenderer` chỉ escape HTML thuần; KaTeX chạy `throwOnError: false` |
| SQL Injection | ✅ Prisma ORM — không có raw SQL |
| Content length | ✅ Server validate ≤ 2 000 ký tự |
| Rate limiting | ✅ DB-based, tối đa 5 BL/phút/user, trả về `429` |
| Nesting vô hạn | ✅ API từ chối `parentId` nếu parent đã là reply |

> **Quan trọng:** Nếu sau này cho phép Markdown phong phú hơn (bold, link…) thì phải dùng `DOMPurify` trước khi `dangerouslySetInnerHTML`, vì `LatexRenderer` hiện chỉ escape plain text — chưa sanitize HTML tổng quát.

---

## 5. Trạng thái Hoàn thành

Toàn bộ kế hoạch nâng cấp (3.1 → 3.9) đã được triển khai và deploy lên production `heygeo.pedu.vn`.
