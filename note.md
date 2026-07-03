# HeyGeo Web — Build & Deploy từ máy local (iMac → Mac mini M2 Pro server)
#
# Server: m2pro@192.168.1.240  (heygeo.pedu.vn)
# Remote path: /Users/m2pro/HeyGeo/
# Local path:  ./HeyGeoWeb/
# Password:    Lưu trong ~/.heygeo_pass (không commit file này)
#
# Tạo file password lần đầu:
#   echo 'MẬT_KHẨU' > ~/.heygeo_pass && chmod 600 ~/.heygeo_pass
# Cài sshpass nếu chưa có:
#   brew install sshpass

# ── 1. Kéo code từ server về local ──────────────────────
rsync -avzP m2pro@192.168.1.240:/Users/m2pro/HeyGeo/ "./HeyGeoWeb/"

# ── 2. Đẩy file đã sửa từ local lên server ──────────────
# (Ví dụ chỉ đẩy 1 file đã sửa)
sshpass -f ~/.heygeo_pass rsync -avzP \
  "./HeyGeoWeb/components/JSXGraphViewer.tsx" \
  m2pro@192.168.1.240:/Users/m2pro/HeyGeo/components/JSXGraphViewer.tsx

# Hoặc đẩy toàn bộ thư mục (loại trừ node_modules & .next):
sshpass -f ~/.heygeo_pass rsync -avzP \
  --exclude=node_modules --exclude=.next --exclude=logs \
  "./HeyGeoWeb/" m2pro@192.168.1.240:/Users/m2pro/HeyGeo/

# ── 3. Build trên server ─────────────────────────────────
sshpass -f ~/.heygeo_pass ssh m2pro@192.168.1.240 \
  "PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin && \
   cd /Users/m2pro/HeyGeo && \
   npm run build 2>&1 | tail -20"

# ── 4. Copy static files vào standalone & restart daemon ─
sshpass -f ~/.heygeo_pass ssh -tt m2pro@192.168.1.240 "
  cd /Users/m2pro/HeyGeo && \
  cp -r .next/static .next/standalone/.next/static && \
  cp -r public .next/standalone/public 2>/dev/null; \
  cat ~/.heygeo_pass | sudo -S launchctl kickstart -k system/com.heygeo.app && \
  sleep 3 && echo 'Server restarted OK'
"

# ── 5. Kiểm tra log sau restart ──────────────────────────
sshpass -f ~/.heygeo_pass ssh m2pro@192.168.1.240 \
  "tail -30 /Users/m2pro/HeyGeo/logs/app.log"

# ── QUICK DEPLOY (bước 2+3+4 gộp lại) ───────────────────
# Deploy 1 file và rebuild:
FILE="components/JSXGraphViewer.tsx" && \
sshpass -f ~/.heygeo_pass rsync -avzP "./HeyGeoWeb/$FILE" "m2pro@192.168.1.240:/Users/m2pro/HeyGeo/$FILE" && \
sshpass -f ~/.heygeo_pass ssh m2pro@192.168.1.240 \
  "PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin && \
   cd /Users/m2pro/HeyGeo && npm run build 2>&1 | tail -10 && \
   cp -r .next/static .next/standalone/.next/static && \
   cp -r public .next/standalone/public 2>/dev/null" && \
sshpass -f ~/.heygeo_pass ssh -tt m2pro@192.168.1.240 \
  "cat ~/.heygeo_pass | sudo -S launchctl kickstart -k system/com.heygeo.app && echo 'Done'"

# Một ví dụ khác, khi chỉ update file page.tsx
cd "/Users/imac/Library/CloudStorage/GoogleDrive-nguyendangminhphuc@dhsphue.edu.vn/My Drive/Projects/VibeCoding/Qtapps/HeyGeo" && \
FILE="app/release/page.tsx" && \
sshpass -f ~/.heygeo_pass rsync -avzP "./HeyGeoWeb/$FILE" "m2pro@192.168.1.240:/Users/m2pro/HeyGeo/$FILE" && \
sshpass -f ~/.heygeo_pass ssh m2pro@192.168.1.240 \
  "PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin && \
   cd /Users/m2pro/HeyGeo && npm run build 2>&1 | tail -15 && \
   cp -r .next/static .next/standalone/.next/static && \
   cp -r public .next/standalone/public 2>/dev/null; echo 'Static copied'" && \
sshpass -f ~/.heygeo_pass ssh -tt m2pro@192.168.1.240 \
  "cat ~/.heygeo_pass | sudo -S launchctl kickstart -k system/com.heygeo.app && sleep 3 && tail -5 /Users/m2pro/HeyGeo/logs/app.log"

# --- GitHub ---
git add -A && git commit -m "your message" && git push  

# ── Upload bản phát hành Desktop lên server ─────────────────
# Đặt file .zip vào HeyGeoWeb/release/ rồi chạy lệnh dưới (không cần rebuild)
cd "/Users/imac/Library/CloudStorage/GoogleDrive-nguyendangminhphuc@dhsphue.edu.vn/My Drive/Projects/VibeCoding/Qtapps/HeyGeo" && \
sshpass -f ~/.heygeo_pass rsync -avzP \
  ./HeyGeoWeb/release/ \
  m2pro@192.168.1.240:/Users/m2pro/HeyGeo/release/
# Không cần restart server – chỉ cần file có mặt trong thư mục là tải được ngay.


# ── Tránh Google Drive đồng bộ .next/ & node_modules/ (chạy 1 lần mỗi máy) ──
#
# Vấn đề: HeyGeoWeb/ nằm trong Google Drive → mỗi lần build Next.js sinh ra
#   hàng nghìn file nhỏ trong .next/ và node_modules/ → Drive đồng bộ liên tục,
#   làm chậm máy và tốn băng thông hoàn toàn vô ích.
#
# Giải pháp: dời 2 thư mục ra ngoài Drive, tạo symlink trỏ về → app/script
#   vẫn hoạt động bình thường, Drive không thấy gì thay đổi.
#
# ── macOS (Apple Silicon & Intel) ──────────────────────────────
# Chạy script có sẵn (1 lần):
cd "$(dirname <đường-dẫn-đến-HeyGeoWeb>)/HeyGeoWeb" && \
  chmod +x setup-build-cache.sh && ./setup-build-cache.sh
#
# Hoặc chạy tay:
GDRIVE_WEB="/Users/<username>/Library/CloudStorage/GoogleDrive-.../My Drive/Projects/VibeCoding/Qtapps/HeyGeo/HeyGeoWeb"
CACHE="$HOME/.heygeo_build_cache/HeyGeoWeb"
mkdir -p "$CACHE"
for DIR in .next node_modules; do
  [[ -L "$GDRIVE_WEB/$DIR" ]] && continue   # đã là symlink thì bỏ qua
  [[ -d "$GDRIVE_WEB/$DIR" ]] && mv "$GDRIVE_WEB/$DIR" "$CACHE/$DIR" || mkdir -p "$CACHE/$DIR"
  ln -s "$CACHE/$DIR" "$GDRIVE_WEB/$DIR"
done
# Sau đó chạy: npm install  (nếu là máy mới)
#
# ── Windows (PowerShell – chạy với quyền Admin) ────────────────
# $web = "G:\My Drive\Projects\VibeCoding\Qtapps\HeyGeo\HeyGeoWeb"
# $cache = "$env:USERPROFILE\.heygeo_build_cache\HeyGeoWeb"
# foreach ($dir in @('.next','node_modules')) {
#   $src = "$web\$dir"; $dst = "$cache\$dir"
#   New-Item -ItemType Directory -Force $dst | Out-Null
#   if (Test-Path $src) { Move-Item $src $dst -Force }
#   cmd /c "mklink /J `"$src`" `"$dst`""   # Junction = symlink cho thư mục
# }
# Sau đó chạy: npm install  (nếu là máy mới)
#
# Kiểm tra symlink đã đúng chưa:
#   ls -la HeyGeoWeb/.next HeyGeoWeb/node_modules   # macOS
#   dir HeyGeoWeb\.next HeyGeoWeb\node_modules       # Windows


# ── Rebuild và Deploy HeyGeo bản Web ───────────────────
# (Build local → rsync standalone → restart daemon)
# LƯU Ý: phải restart daemon sau rsync, nếu không server vẫn dùng chunk hash cũ → lỗi 400
cd "/Users/imac/Library/CloudStorage/GoogleDrive-nguyendangminhphuc@dhsphue.edu.vn/My Drive/Projects/VibeCoding/Qtapps/HeyGeo/HeyGeoWeb" && npm run build 2>&1 | tail -30 && \
sshpass -f ~/.heygeo_pass rsync -az --delete \
  "/Users/imac/Library/CloudStorage/GoogleDrive-nguyendangminhphuc@dhsphue.edu.vn/My Drive/Projects/VibeCoding/Qtapps/HeyGeo/HeyGeoWeb/.next/standalone/" \
  m2pro@192.168.1.240:/Users/m2pro/HeyGeo/.next/standalone/ && \
echo "rsync standalone OK" && \
sshpass -f ~/.heygeo_pass ssh -tt m2pro@192.168.1.240 \
  "cat ~/.heygeo_pass | sudo -S launchctl kickstart -k system/com.heygeo.app && sleep 3 && tail -5 /Users/m2pro/HeyGeo/logs/app.log && echo 'Server restarted OK'"