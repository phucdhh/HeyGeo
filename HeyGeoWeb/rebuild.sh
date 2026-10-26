#!/usr/bin/env zsh
# rebuild.sh – Build local, rsync standalone lên server Mac mini M2 Pro, restart
# Server: m2pro@192.168.1.240  (heygeo.pedu.vn)
# Remote: /Users/m2pro/HeyGeo/
# Dùng:   ./rebuild.sh
set -euo pipefail

ROOT_DIR="${0:A:h}"
cd "$ROOT_DIR"

REMOTE_USER="m2pro"
REMOTE_HOST="192.168.1.240"
REMOTE_DIR="/Users/m2pro/HeyGeo"
PASS_FILE="$HOME/.heygeo_pass"
REMOTE="$REMOTE_USER@$REMOTE_HOST"
# Dùng keg-link ổn định (không hardcode minor version như 17.9)
PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"
# DATABASE_URL lấy từ .env (không hardcode credential vào script – repo public)
DB_URL="$(sed -nE 's/^DATABASE_URL="?([^"]+)"?$/\1/p' .env)"
[[ -n "$DB_URL" ]] || fail "Không đọc được DATABASE_URL từ $ROOT_DIR/.env"

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"

step() { echo -e "\n${BOLD}▶ $1${RESET}" }
ok()   { echo -e "${GREEN}✓ $1${RESET}" }
fail() { echo -e "${RED}✗ $1${RESET}"; exit 1 }

[[ -f "$PASS_FILE" ]] || fail "Không tìm thấy $PASS_FILE. Tạo bằng: echo 'MẬT_KHẨU' > ~/.heygeo_pass && chmod 600 ~/.heygeo_pass"
command -v sshpass &>/dev/null || fail "sshpass chưa cài. Hãy chạy: brew install sshpass"

# ── 1. Build local ────────────────────────────────────────────
step "Build Next.js trên máy local..."
BUILD_LOG=$(mktemp)
if ! npm run build 2>&1 | tee "$BUILD_LOG" | tail -40; then
  echo -e "\n${RED}── Full build log ──${RESET}"
  cat "$BUILD_LOG"
  rm -f "$BUILD_LOG"
  fail "Build thất bại"
fi
rm -f "$BUILD_LOG"
ok "Build xong"

# ── 2. Rsync standalone lên server ───────────────────────────
step "Đẩy .next/standalone/ lên $REMOTE:$REMOTE_DIR/.next/standalone/ ..."
sshpass -f "$PASS_FILE" rsync -az --delete \
  "$ROOT_DIR/.next/standalone/" \
  "$REMOTE:$REMOTE_DIR/.next/standalone/" \
  || fail "rsync standalone thất bại"
ok "rsync standalone OK"

# ── 3. Rsync public/ vào standalone/public/ trên server ──────────────────────
# Next.js standalone serve static files từ .next/standalone/public/, không phải public/ gốc.
# Rsync local .next/standalone/public/ (đã được build copy vào) lên server.
step "Đẩy .next/standalone/public/ lên $REMOTE:$REMOTE_DIR/.next/standalone/public/ ..."
sshpass -f "$PASS_FILE" rsync -az --delete \
  "$ROOT_DIR/.next/standalone/public/" \
  "$REMOTE:$REMOTE_DIR/.next/standalone/public/" \
  || fail "rsync standalone/public/ thất bại"
ok "rsync standalone/public/ OK"

# ── 3b. Rsync thư mục release/ lên server (ngoài standalone) ─────
step "Đẩy release/ lên $REMOTE:$REMOTE_DIR/release/ ..."
sshpass -f "$PASS_FILE" rsync -az \
  "$ROOT_DIR/release/" \
  "$REMOTE:$REMOTE_DIR/release/" \
  || fail "rsync release/ thất bại"
ok "rsync release/ OK"

# ── 3b. Rsync prisma schema + scripts + generated client lên server ──────────────
step "Đẩy prisma/schema.prisma, scripts/ và Prisma client lên server..."
sshpass -f "$PASS_FILE" rsync -az \
  "$ROOT_DIR/prisma/" \
  "$REMOTE:$REMOTE_DIR/prisma/" \
  || fail "rsync prisma/ thất bại"
sshpass -f "$PASS_FILE" rsync -az \
  "$ROOT_DIR/scripts/" \
  "$REMOTE:$REMOTE_DIR/scripts/" \
  || fail "rsync scripts/ thất bại"
# Sync generated Prisma client (node_modules/.prisma/client/) để server có schema mới nhất
# Cần thiết vì node_modules trong standalone là symlink broken trỏ về máy local
sshpass -f "$PASS_FILE" rsync -az \
  "$ROOT_DIR/node_modules/.prisma/client/" \
  "$REMOTE:$REMOTE_DIR/node_modules/.prisma/client/" \
  || fail "rsync Prisma client thất bại"
ok "rsync prisma + scripts + Prisma client OK"

# ── 3b2. Rsync launchd plists + cài postgres daemon nếu chưa có ──────────────
step "Đẩy launchd/ lên server..."
sshpass -f "$PASS_FILE" rsync -az \
  "$ROOT_DIR/launchd/" \
  "$REMOTE:$REMOTE_DIR/launchd/" \
  || true
if ! sshpass -f "$PASS_FILE" ssh "$REMOTE" "[[ -f /Library/LaunchDaemons/com.heygeo.postgres.plist ]]" 2>/dev/null; then
  sshpass -f "$PASS_FILE" ssh "$REMOTE" \
    "cat ~/.heygeo_pass | sudo -S cp $REMOTE_DIR/launchd/com.heygeo.postgres.plist /Library/LaunchDaemons/ && sudo chown root:wheel /Library/LaunchDaemons/com.heygeo.postgres.plist && sudo chmod 644 /Library/LaunchDaemons/com.heygeo.postgres.plist && sudo launchctl bootstrap system /Library/LaunchDaemons/com.heygeo.postgres.plist 2>&1" \
    && ok "PostgreSQL daemon cài OK" || echo -e "${YELLOW}⚠ PostgreSQL daemon - kiểm tra thủ công${RESET}"
else
  ok "PostgreSQL daemon đã có sẵn"
fi

# ── 3c. Migration DB trên server (dùng file SQL, tránh lỗi escaping) ─────────
step "Chạy migration DB trên server..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-add-roles.sql 2>&1" \
  && ok "DB migration OK" || echo -e "${YELLOW}⚠ Migration - kiểm tra lỗi ở trên${RESET}"

# ── 3c2. Migration: bảng Comment ─────────────────────────────
step "Chạy migration bảng Comment..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-add-comments.sql 2>&1" \
  && ok "Comment migration OK" || echo -e "${YELLOW}⚠ Comment migration - có thể đã tồn tại${RESET}"

# ── 3c3. Migration: cột categories của Model ─────────────────
step "Chạy migration cột categories..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-add-categories.sql 2>&1" \
  && ok "Categories migration OK" || echo -e "${YELLOW}⚠ Categories migration - kiểm tra lỗi ở trên${RESET}"

# ── 3c4. Migration: cột username của User ─────────────────────
step "Chạy migration cột username..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-add-username.sql 2>&1" \
  && ok "Username migration OK" || echo -e "${YELLOW}⚠ Username migration - kiểm tra lỗi ở trên${RESET}"

# ── 3c5. Backfill tool categories cho các model đã có ─────────
step "Backfill tool categories (categories từ jsonData.__type)..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-backfill-tool-categories.sql 2>&1" \
  && ok "Tool categories backfill OK" || echo -e "${YELLOW}⚠ Tool categories backfill - kiểm tra lỗi ở trên${RESET}"

# ── 3c6. Migration: bảng ModelReaction ───────────────────────
step "Chạy migration bảng ModelReaction..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -f $REMOTE_DIR/scripts/migrate-add-model-reactions.sql 2>&1" \
  && ok "ModelReaction migration OK" || echo -e "${YELLOW}⚠ ModelReaction migration - kiểm tra lỗi ở trên${RESET}"

# ── 3d. Đặt admin ─────────────────────────────────────────────
step "Đảm bảo admin nguyendangminhphuc@dhsphue.edu.vn tồn tại..."
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "$PSQL '$DB_URL' -c \"UPDATE \\\"User\\\" SET role = 'ADMIN' WHERE email = 'nguyendangminhphuc@dhsphue.edu.vn';\" 2>&1" \
  && ok "Admin OK" || echo -e "${YELLOW}⚠ set-admin thất bại (có thể user chưa đăng ký)${RESET}"

# ── 4. Restart daemon (launchd) ───────────────────────────────
# LƯU Ý: phải restart daemon sau rsync, nếu không server vẫn dùng chunk hash cũ → lỗi 400
# Đọc password từ local rồi pipe qua sudo -S trên remote (không cần file pass trên server)
step "Khởi động lại server (launchd)..."
_PASS=$(cat "$PASS_FILE")
sshpass -f "$PASS_FILE" ssh -tt "$REMOTE" \
  "echo '$_PASS' | sudo -S launchctl kickstart -k system/com.heygeo.app && echo 'Restart OK'" \
  || fail "Restart thất bại"
ok "Đã gửi lệnh restart"
sleep 3

# ── 5. Chờ server phản hồi ────────────────────────────────────
step "Chờ server khởi động tại https://heygeo.pedu.vn ..."
for i in {1..20}; do
  sleep 3
  if sshpass -f "$PASS_FILE" ssh "$REMOTE" \
       "curl -sf http://127.0.0.1:3535/login > /dev/null 2>&1"; then
    ok "Server đang chạy tại https://heygeo.pedu.vn"
    break
  fi
  if [[ $i -eq 20 ]]; then
    echo -e "${YELLOW}⚠ Server chưa phản hồi sau 60 giây – xem log bên dưới${RESET}"
  fi
done

# ── 5. Hiển thị log ───────────────────────────────────────────
step "Log gần nhất:"
sshpass -f "$PASS_FILE" ssh "$REMOTE" \
  "tail -20 $REMOTE_DIR/logs/app.log 2>/dev/null || echo '(không tìm thấy logs/app.log)'"

echo -e "\n${BOLD}${GREEN}Rebuild hoàn tất!${RESET}"
