# HeyGeo — Hướng dẫn Build & Deploy

## Cấu trúc scripts

| Script | Mục đích | Chạy trên |
|---|---|---|
| `rebuild.sh` | Build Debug cho Mac Apple Silicon | M1/M2/M3/M4/M5 Mac |
| `rebuild-x86.sh` | Build Debug cho Mac Intel (x86_64) | M1 Mac + Rosetta |
| `rebuild-win.sh` | Build Debug cho Windows | Windows (Git Bash / MSYS2) |
| `deploy-mac-arm.sh` | Release + đóng gói cho Mac ARM | M1/M2/M3/M4/M5 Mac |
| `deploy-mac-intel.sh` | Release + đóng gói cho Mac Intel | M1 Mac + Rosetta |
| `deploy-win.sh` | Release + đóng gói cho Windows | Windows (Git Bash) |

---

## 1. Build Debug (Mac ARM)

```bash
./rebuild.sh          # build thông thường
./rebuild.sh clean    # xoá build cũ rồi build lại
```

**Yêu cầu:** Qt ARM cài qua Homebrew:
```bash
brew install qt
```

Output: `heygeo.app` tại thư mục gốc.

---

## 2. Build Debug (Mac Intel — trên M1 qua Rosetta)

```bash
./rebuild-x86.sh
./rebuild-x86.sh clean
```

**Yêu cầu:** Qt Intel cài qua Rosetta Homebrew:
```bash
# Cài Homebrew Intel (lần đầu)
arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Cài Qt Intel
arch -x86_64 /usr/local/bin/brew install qt
```

Nếu Qt Intel đặt ở đường dẫn khác, đặt biến môi trường trước khi chạy:
```bash
export QT_X86=/path/to/x86_64-qt
./rebuild-x86.sh
```

Output: `heygeo-x86.app` tại thư mục gốc.

---

## 3. Build Debug (Windows — trên máy Windows)

Mở **Git Bash** hoặc **MSYS2** trong thư mục gốc HeyGeo:

```bash
./rebuild-win.sh
./rebuild-win.sh clean
```

**Yêu cầu:**
- Git for Windows (có Git Bash): <https://git-scm.com/download/win>
- Qt MinGW 64-bit + MinGW toolchain

### Cài Qt nhanh bằng `aqtinstall` (không cần GUI, khuyên dùng)

`aqtinstall` là công cụ cài Qt tự động qua command line (thay cho Qt Online Installer).
Yêu cầu Python + pip có sẵn trên Windows.

```powershell
# Bước 1: Cài aqtinstall
pip install aqtinstall

# Bước 2: Xem danh sách Qt versions có sẵn
aqt list-qt windows desktop

# Bước 3: Cài Qt 6.8.3 với MinGW (vào C:\Qt) — ~500MB
aqt install-qt windows desktop 6.8.3 win64_mingw -O C:\Qt

# Bước 4: Cài MinGW 13.1.0 toolchain (g++, mingw32-make)
aqt install-tool windows desktop tools_mingw1310 -O C:\Qt
```

Sau khi cài, cấu trúc:
```
C:\Qt\
  6.8.3\mingw_64\      ← Qt libs, qmake.exe, windeployqt.exe
  Tools\mingw1310_64\  ← g++.exe, mingw32-make.exe
```

Nếu Qt cài không ở `C:\Qt\`, đặt biến môi trường trước khi chạy script:
```bash
export QT_WIN=/c/Qt/6.8.3/mingw_64
export MAKE_WIN=/c/Qt/Tools/mingw1310_64/bin/mingw32-make
./rebuild-win.sh
```

> **Lần đầu build trên Windows mới:** cần thêm MinGW vào PATH của Git Bash:
> ```bash
> export PATH="/c/Qt/Tools/mingw1310_64/bin:/c/Qt/6.8.3/mingw_64/bin:$PATH"
> ```

---

## 4. Deploy — Mac ARM (`deploy-mac-arm.sh`)

```bash
./deploy-mac-arm.sh
./deploy-mac-arm.sh clean   # xoá build Release ARM rồi deploy lại
```

Quy trình bên trong:
1. Chạy `qmake` với `CONFIG+=release QMAKE_APPLE_DEVICE_ARCHS=arm64`
2. Build Release
3. Chạy `macdeployqt` → nhúng toàn bộ Qt frameworks vào `.app`
4. Lưu kết quả vào `HeyGeoWeb/release/`

Output ví dụ:
```
HeyGeoWeb/release/HeyGeo_Mac_Arm_2026-03-12-01-33.app
```

---

## 5. Deploy — Mac Intel (`deploy-mac-intel.sh`)

```bash
./deploy-mac-intel.sh
./deploy-mac-intel.sh clean
```

Tương tự deploy ARM nhưng dùng `arch -x86_64` và Qt Intel.  
**Yêu cầu:** đã cài Qt Intel (xem mục 2).

Output ví dụ:
```
HeyGeoWeb/release/HeyGeo_Mac_Intel_2026-03-12-01-33.app
```

---

## 6. Deploy — Windows (`deploy-win.sh`)

Chạy trong Git Bash / MSYS2 trên Windows:

```bash
./deploy-win.sh
./deploy-win.sh clean
```

Quy trình bên trong:
1. Chạy `qmake` với `CONFIG+=release`
2. Build Release
3. Chạy `windeployqt` → sao chép toàn bộ Qt DLLs vào thư mục
4. Nén thành `.zip` bằng PowerShell `Compress-Archive`
5. Lưu kết quả vào `HeyGeoWeb/release/`

Output ví dụ:
```
HeyGeoWeb/release/HeyGeo_Win_Intel_2026-03-12-13-10.zip
```

Giải nén `.zip` và chạy `heygeo.exe` là được (không cần cài Qt trên máy người dùng).
File `.zip` khoảng **15MB**, chứa `heygeo.exe` và đầy đủ Qt DLLs.

---

## Thư mục build

| Thư mục | Nội dung |
|---|---|
| `build/Qt6-Debug/` | Build Debug ARM (qua `rebuild.sh`) |
| `build/Qt6-Intel-Debug/` | Build Debug Intel (qua `rebuild-x86.sh`) |
| `build/Qt6-Win-Debug/` | Build Debug Windows (qua `rebuild-win.sh`) |
| `build/Qt6-Arm-Release/` | Build Release ARM (qua `deploy-mac-arm.sh`) |
| `build/Qt6-Intel-Release/` | Build Release Intel (qua `deploy-mac-intel.sh`) |
| `build/Qt6-Win-Release/` | Build Release Windows (qua `deploy-win.sh`) |
| `HeyGeoWeb/release/` | Các bản deploy đã đóng gói |

---

## Tương thích nền tảng — Thay đổi source code

Các thay đổi sau đã được thực hiện *(2026-03-12)* để code biên dịch được trên cả **macOS** và **Windows/Linux**:

### 1. `src/defs.H` — thay thế `arc4random()`

`arc4random()` là hàm của BSD/macOS, **không tồn tại** trên Windows (MinGW) và một số bản Linux.
Đã thêm compatibility shim ngay sau phần `#include`:

```cpp
// arc4random() compatibility: available on BSD/macOS, not on Windows/Linux
#ifndef arc4random
#  if defined(_WIN32) || defined(__linux__)
#    include <cstdlib>
     static inline unsigned int arc4random() { return (unsigned int)rand(); }
#  endif
#endif
```

> **Mac team:** không ảnh hưởng gì — macro `#ifndef arc4random` sẽ bị bỏ qua vì macOS đã có `arc4random` sẵn.

### 2. `src/app/HeyGeoSelectionGroup.H` — sửa `iterator` → `const_iterator`

Dòng typedef:
```cpp
// Trước (chỉ build được trên Apple Clang, lỗi trên GCC/MinGW):
typedef hash_set<G_ref *>::iterator iter;

// Sau (tương thích cả Clang lẫn GCC):
typedef hash_set<G_ref *>::const_iterator iter;
```

Nguyên nhân: trong các `const` method, `begin()`/`end()` trả về `const_iterator`.
Apple Clang cho phép convert ngầm, còn GCC/MinGW (tuân thủ chuẩn C++ nghiêm hơn) báo lỗi.

> **Mac team:** thay đổi này tương thích ngược hoàn toàn, không ảnh hưởng hành vi trên macOS.

---

## Ghi chú

- Tất cả scripts hỗ trợ tham số `clean` để xoá build cũ trước khi build lại.
- Phiên bản trong tên file deploy là **ngày giờ** lúc chạy script (không phải version code).
- Dự án đặt trên Google Drive → có thể build trên nhiều máy khác nhau mà không cần copy code.
- Khi mở `.app` Intel trên M1 Mac, macOS sẽ tự động chạy qua Rosetta 2.
- `aqtinstall` (Python) là cách cài Qt nhanh nhất cho CI/CD và máy mới trên Windows, không cần đăng nhập Qt Account.
