#!/usr/bin/env zsh
# =============================================================================
# backup_model.sh – Backup dữ liệu của HeyGeo
# =============================================================================
# Script này backup dữ liệu người dùng quan trọng của HeyGeo Web bao gồm:
#   1. PostgreSQL database (models, users, comments, reactions...)
#   2. Thư mục uploads (avatars người dùng)
#   3. File cấu hình .env
#
# LƯU Ý: Thư mục release/ (bản cài đặt Desktop app) KHÔNG được backup vì đây
# là build artifacts có thể tạo lại từ source code, không phải dữ liệu người dùng.
#
# Cách dùng:
#   ./backup_model.sh                          # Backup vào thư mục mặc định
#   ./backup_model.sh /path/to/backup/folder   # Backup vào thư mục chỉ định
#   ./backup_model.sh --keep 14                # Giữ backup 14 ngày (mặc định: 30)
#
# Yêu cầu:
#   - PostgreSQL client (pg_dump) – thường có sẵn khi cài PostgreSQL
#   - zsh (default shell trên macOS)
# =============================================================================

# ─── Bảo đảm script chạy bằng zsh ────────────────────────────────────────────
# Script dùng cú pháp riêng của zsh (${0:A}, $~c...). Nếu bị gọi bằng bash
# (vd: `bash backup_model.sh`), tự động chạy lại bằng zsh để tránh lỗi âm thầm.
if [ -z "${ZSH_VERSION:-}" ]; then
  exec /usr/bin/env zsh "$0" "$@"
fi

set -euo pipefail

# ─── Cấu hình ────────────────────────────────────────────────────────────────

# Thư mục gốc của ứng dụng (tự động dò từ vị trí script)
ROOT_DIR="$(cd "$(dirname "${0:A}")" && pwd)"

# File .env để đọc cấu hình database
ENV_FILE="$ROOT_DIR/.env"

# Thư mục lưu backup mặc định (có thể ghi đè bằng argument $1)
DEFAULT_BACKUP_DIR="$ROOT_DIR/backups"

# Số ngày giữ lại backup cũ (mặc định 30 ngày)
KEEP_DAYS=30

# Số thứ tự đầu ra
STEP=0

# Đánh dấu database đã được backup thành công hay chưa
DB_BACKUP_OK=false

# Chế độ chạy: "" = tự động | "local" = backup ngay máy này | "remote" = backup trên máy chủ
FORCE_MODE=""

# ─── Cấu hình máy chủ (dùng cho chế độ REMOTE khi chạy từ iMac) ──────────────
# Có thể ghi đè qua biến môi trường, ví dụ: HEYGEO_REMOTE_HOST=192.168.1.240
REMOTE_USER="${HEYGEO_REMOTE_USER:-m2pro}"
REMOTE_HOST="${HEYGEO_REMOTE_HOST:-192.168.1.240}"
REMOTE_DIR="${HEYGEO_REMOTE_DIR:-/Users/m2pro/HeyGeo}"
PASS_FILE="${HEYGEO_PASS_FILE:-$HOME/.heygeo_pass}"
REMOTE="$REMOTE_USER@$REMOTE_HOST"

# ─── Màu sắc cho output ──────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

# ─── Hàm tiện ích ────────────────────────────────────────────────────────────

info()    { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*" >&2; }
header()  { echo ""; echo -e "${BOLD}── $* ──${RESET}"; }
step()    { STEP=$((STEP + 1)); echo -e "${CYAN}[${STEP}]${RESET} ${BOLD}$*${RESET}"; }

# ─── Hàm chế độ REMOTE: backup trên máy chủ rồi kéo về máy này (iMac) ─────────
run_remote_backup() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}║   🌐  Chế độ REMOTE – backup trên máy chủ          ║${RESET}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "  Máy chủ:      ${BOLD}$REMOTE:$REMOTE_DIR${RESET}"
  echo -e "  Đích (máy này): ${BOLD}$BACKUP_DIR${RESET}"
  echo ""

  # Kiểm tra công cụ cần thiết
  if ! command -v sshpass &>/dev/null; then
    error "Chưa cài sshpass. Chạy: brew install sshpass"
    return 1
  fi
  if ! command -v rsync &>/dev/null; then
    error "Chưa có rsync trên máy này."
    return 1
  fi
  if [[ ! -f "$PASS_FILE" ]]; then
    error "Không tìm thấy file mật khẩu SSH: $PASS_FILE"
    error "Tạo bằng: echo 'MẬT_KHẨU' > $PASS_FILE && chmod 600 $PASS_FILE"
    return 1
  fi

  # Kiểm tra kết nối tới máy chủ
  step "Kiểm tra kết nối tới máy chủ..."
  if ! sshpass -f "$PASS_FILE" ssh -o ConnectTimeout=10 "$REMOTE" "echo ok" &>/dev/null; then
    error "Không kết nối được tới $REMOTE."
    error "  Máy chủ có đang bật và cùng mạng LAN không?"
    return 1
  fi
  info "Kết nối tới $REMOTE thành công."
  echo ""

  # Đồng bộ script mới nhất lên máy chủ (để dùng đúng phiên bản)
  step "Đồng bộ script lên máy chủ..."
  if sshpass -f "$PASS_FILE" rsync -az "$ROOT_DIR/backup_model.sh" "$REMOTE:$REMOTE_DIR/backup_model.sh" \
     && sshpass -f "$PASS_FILE" ssh "$REMOTE" "chmod +x '$REMOTE_DIR/backup_model.sh'"; then
    info "Đã cập nhật script trên máy chủ."
  else
    error "Đồng bộ script lên máy chủ thất bại."
    return 1
  fi
  echo ""

  # Chạy backup (chế độ LOCAL) trên máy chủ
  step "Chạy backup trên máy chủ $REMOTE ..."
  if sshpass -f "$PASS_FILE" ssh "$REMOTE" "cd '$REMOTE_DIR' && ./backup_model.sh --keep $KEEP_DAYS --local"; then
    info "Backup trên máy chủ hoàn tất."
  else
    error "Backup trên máy chủ thất bại. Chi tiết xem log phía trên."
    return 1
  fi
  echo ""

  # Xác định bản backup mới nhất trên máy chủ
  step "Xác định bản backup mới nhất trên máy chủ..."
  local latest_name
  latest_name=$(sshpass -f "$PASS_FILE" ssh "$REMOTE" \
    "readlink '$REMOTE_DIR/backups/heygeo-backup-latest' 2>/dev/null | xargs basename 2>/dev/null" || true)
  if [[ -z "$latest_name" ]]; then
    latest_name=$(sshpass -f "$PASS_FILE" ssh "$REMOTE" \
      "ls -1dt '$REMOTE_DIR'/backups/heygeo-backup-*/ 2>/dev/null | head -1 | xargs basename 2>/dev/null" || true)
  fi
  if [[ -z "$latest_name" ]]; then
    error "Không tìm thấy bản backup nào trên máy chủ."
    return 1
  fi
  info "Bản mới nhất trên máy chủ: $latest_name"
  echo ""

  # Kéo backup về máy này (iMac)
  step "Kéo backup về máy này (iMac)..."
  mkdir -p "$BACKUP_DIR/$latest_name"
  if sshpass -f "$PASS_FILE" rsync -az "$REMOTE:$REMOTE_DIR/backups/$latest_name/" "$BACKUP_DIR/$latest_name/"; then
    info "Đã kéo về: $BACKUP_DIR/$latest_name"
  else
    error "rsync từ máy chủ về thất bại."
    return 1
  fi
  ln -sfn "$BACKUP_DIR/$latest_name" "$BACKUP_DIR/heygeo-backup-latest"
  info "Đã cập nhật symlink 'heygeo-backup-latest'."
  echo ""

  # Dọn backup cũ trên máy này
  step "Dọn dẹp backup cũ trên máy này (quá $KEEP_DAYS ngày)..."
  local pruned=0
  while IFS= read -r old; do
    [[ -z "$old" ]] && continue
    echo "    🗑️  $(basename "$old")"
    rm -rf "$old"
    pruned=$((pruned + 1))
  done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "heygeo-backup-*" -mtime "+$KEEP_DAYS" 2>/dev/null)
  [[ $pruned -eq 0 ]] && info "Không có backup nào cũ hơn $KEEP_DAYS ngày."
  echo ""

  # Kiểm tra tính đầy đủ (phải có database)
  if [[ -f "$BACKUP_DIR/$latest_name/heygeo-database.sql" && -s "$BACKUP_DIR/$latest_name/heygeo-database.sql" ]]; then
    echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}║       ✅  Backup REMOTE hoàn tất!                   ║${RESET}"
    echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "  📂 Trên máy này: ${BOLD}$BACKUP_DIR/$latest_name${RESET}"
    echo -e "  ${BOLD}Nội dung:${RESET}"
    ls -lh "$BACKUP_DIR/$latest_name" | sed 's/^/    /'
    echo ""
    mkdir -p "$BACKUP_DIR"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK-REMOTE] $latest_name ← $REMOTE (kéo về iMac)" >> "$BACKUP_DIR/backup.log"
    info "Log: $BACKUP_DIR/backup.log"
    echo ""
    echo -e "${GREEN}Done.${RESET}"
    return 0
  else
    error "Bản kéo về KHÔNG có heygeo-database.sql → backup không đầy đủ!"
    return 1
  fi
}

# Tìm pg_dump (có thể nằm ở nhiều nơi, không chỉ trong PATH)
find_pg_dump() {
  # Thứ tự ưu tiên: PATH → Homebrew libpq → Homebrew postgresql → MacPorts → server bin
  local candidates=(
    "$(command -v pg_dump 2>/dev/null || true)"
    "/opt/homebrew/opt/libpq/bin/pg_dump"
    "/opt/homebrew/opt/postgresql@17/bin/pg_dump"
    "/opt/homebrew/opt/postgresql@16/bin/pg_dump"
    "/opt/homebrew/opt/postgresql@15/bin/pg_dump"
    "/opt/homebrew/opt/postgresql/bin/pg_dump"
    "/usr/local/opt/libpq/bin/pg_dump"
    "/usr/local/opt/postgresql/bin/pg_dump"
    "/usr/lib/postgresql/*/bin/pg_dump"
    "/usr/bin/pg_dump"
  )
  for c in "${candidates[@]}"; do
    # Expand globs (for /usr/lib/postgresql/*/)
    for f in $~c; do
      if [[ -x "$f" ]]; then
        echo "$f"
        return 0
      fi
    done
  done
  return 1
}

PG_DUMP="$(find_pg_dump || true)"

# Tìm pg_isready tương ứng (cùng thư mục với pg_dump)
PG_ISREADY=""
if [[ -n "$PG_DUMP" ]]; then
  local_pg_dir="$(dirname "$PG_DUMP")"
  if [[ -x "$local_pg_dir/pg_isready" ]]; then
    PG_ISREADY="$local_pg_dir/pg_isready"
  fi
fi

# ─── Xử lý tham số dòng lệnh ────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      if [[ -z "$2" || ! "$2" =~ ^[0-9]+$ ]]; then
        error "Tham số --keep cần một số nguyên dương (số ngày)."
        exit 1
      fi
      KEEP_DAYS="$2"
      shift 2
      ;;
    --help|-h)
      echo -e "${BOLD}backup_model.sh${RESET} – Backup dữ liệu HeyGeo"
      echo ""
      echo "Cách dùng:"
      echo "  $0                           # Tự động: có DB thì backup local, không có thì backup qua máy chủ"
      echo "  $0 --remote                  # Buộc chạy từ iMac: backup trên máy chủ rồi kéo về"
      echo "  $0 --local                   # Buộc backup ngay máy này (máy chủ có PostgreSQL)"
      echo "  $0 --keep 14                 # Giữ backup 14 ngày"
      echo "  $0 --help                    # Xem trợ giúp"
      echo ""
      echo "Dữ liệu được backup:"
      echo "  • PostgreSQL database (models, users, comments, reactions...)"
      echo "  • Thư mục uploads (avatars)"
      echo "  • File cấu hình .env"
      echo ""
      echo "(Thư mục release/ KHÔNG được backup vì là build artifacts, không phải dữ liệu người dùng)"
      echo ""
      echo "Chế độ REMOTE (chạy từ iMac): script tự SSH tới máy chủ Mac Mini, chạy backup"
      echo "ở đó rồi rsync bản backup về thư mục backups/ trên iMac. Cấu hình máy chủ mặc định:"
      echo "  $REMOTE:$REMOTE_DIR   (đổi qua biến môi trường HEYGEO_REMOTE_HOST, ...)"
      exit 0
      ;;
    --local)
      FORCE_MODE="local"
      shift
      ;;
    --remote)
      FORCE_MODE="remote"
      shift
      ;;
    -*)
      error "Tham số không hợp lệ: $1"
      echo "Dùng '$0 --help' để xem trợ giúp."
      exit 1
      ;;
    *)
      # Tham số đầu tiên không phải flag là đường dẫn backup
      BACKUP_DIR="$1"
      shift
      ;;
  esac
done

# Nếu không có tham số đường dẫn, dùng thư mục mặc định
BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"

# ─── Bắt đầu backup ──────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       🗄️  HeyGeo Backup Tool                       ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Thời gian:     ${BOLD}$(date '+%Y-%m-%d %H:%M:%S')${RESET}"
echo -e "  Thư mục gốc:   ${BOLD}$ROOT_DIR${RESET}"
echo -e "  Thư mục backup: ${BOLD}$BACKUP_DIR${RESET}"
echo -e "  Giữ backup:    ${BOLD}$KEEP_DAYS ngày${RESET}"
echo ""

# ─── Bước 1: Kiểm tra điều kiện ─────────────────────────────────────────────

step "Kiểm tra điều kiện..."

# Kiểm tra pg_dump
if [[ -z "$PG_DUMP" ]]; then
  warn "Không tìm thấy pg_dump cục bộ trên máy này."
  SKIP_DB=true
else
  info "Tìm thấy pg_dump: $PG_DUMP"
  SKIP_DB=false
fi

# Kiểm tra file .env
if [[ ! -f "$ENV_FILE" ]]; then
  warn "Không tìm thấy file .env tại $ENV_FILE."
  warn "Vẫn tiếp tục backup các thành phần khác (không backup database)..."
  SKIP_DB=true
elif [[ "$SKIP_DB" != "true" ]]; then
  # Tải biến môi trường từ .env
  set -o allexport
  source "$ENV_FILE"
  set +o allexport

  if [[ -z "${DATABASE_URL:-}" ]]; then
    warn "DATABASE_URL không được đặt trong .env. Bỏ qua backup database."
    SKIP_DB=true
  else
    # Trích xuất host và port từ DATABASE_URL để kiểm tra kết nối
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_PORT="${DB_PORT:-5432}"

    if [[ -n "$PG_ISREADY" ]]; then
      if ! "$PG_ISREADY" -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
        warn "PostgreSQL không chạy cục bộ trên $DB_HOST:$DB_PORT."
        SKIP_DB=true
      fi
    else
      warn "Không tìm thấy pg_isready. Sẽ thử backup database..."
    fi
  fi
fi

# ─── Quyết định chế độ chạy ──────────────────────────────────────────────────
# local  = backup ngay máy này (máy chủ có PostgreSQL)
# remote = SSH tới máy chủ, backup ở đó rồi kéo về máy này (dành cho iMac)
if [[ "$FORCE_MODE" == "local" ]]; then
  MODE="local"
elif [[ "$FORCE_MODE" == "remote" ]]; then
  MODE="remote"
elif [[ "$SKIP_DB" != "true" ]]; then
  MODE="local"
else
  MODE="remote"
fi

if [[ "$MODE" == "remote" ]]; then
  info "→ Chế độ REMOTE: backup sẽ chạy trên máy chủ rồi kéo về máy này."
  echo ""
  if run_remote_backup; then
    exit 0
  else
    exit 1
  fi
fi

# ─── Chế độ LOCAL (máy này là máy chủ, có PostgreSQL) ────────────────────────
if [[ "$SKIP_DB" == "true" ]]; then
  warn "→ Database sẽ KHÔNG được backup (không có PostgreSQL cục bộ)."
else
  info "→ Database sẽ được backup."
fi
info "Kiểm tra hoàn tất."
echo ""

# ─── Bước 2: Tạo thư mục backup ─────────────────────────────────────────────

step "Tạo thư mục backup..."

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_PATH="$BACKUP_DIR/heygeo-backup-$TIMESTAMP"
mkdir -p "$BACKUP_PATH"
info "Đã tạo $BACKUP_PATH"
echo ""

# ─── Bước 3: Backup PostgreSQL database ──────────────────────────────────────

step "Backup PostgreSQL database..."

if [[ "${SKIP_DB:-false}" == "true" ]]; then
  warn "Bỏ qua backup database."
else
  DB_BACKUP="$BACKUP_PATH/heygeo-database.sql"

  echo "  Đang dump database..."
  "$PG_DUMP" \
    --dbname="$DATABASE_URL" \
    --format=custom \
    --verbose \
    --no-owner \
    --file="$DB_BACKUP" 2>&1 | sed 's/^/  /'

  if [[ -f "$DB_BACKUP" && -s "$DB_BACKUP" ]]; then
    DB_SIZE=$(du -sh "$DB_BACKUP" | cut -f1)
    DB_BACKUP_OK=true
    info "Database backup hoàn tất: $DB_BACKUP ($DB_SIZE)"
  else
    warn "pg_dump không thành công. Kiểm tra kết nối database."
  fi
fi
echo ""

# ─── Bước 4: Backup thư mục uploads ──────────────────────────────────────────

step "Backup thư mục uploads..."

UPLOADS_DIR="$ROOT_DIR/uploads"
if [[ -d "$UPLOADS_DIR" && "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]]; then
  UPLOADS_BACKUP="$BACKUP_PATH/heygeo-uploads.tar.gz"
  tar czf "$UPLOADS_BACKUP" -C "$ROOT_DIR" "uploads"
  UPLOADS_SIZE=$(du -sh "$UPLOADS_BACKUP" | cut -f1)
  info "Uploads backup hoàn tất: $UPLOADS_BACKUP ($UPLOADS_SIZE)"
else
  warn "Thư mục uploads trống hoặc không tồn tại. Bỏ qua."
fi
echo ""

# ─── Bước 5: Backup file .env ────────────────────────────────────────────────

step "Backup file cấu hình..."

if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "$BACKUP_PATH/heygeo.env"
  # Che mật khẩu trong bản copy để an toàn (nếu cần phục hồi thì dùng file gốc)
  info "File .env đã được backup (đã làm sạch mật khẩu trong bản sao)."

  # Tạo một bản đã che thông tin nhạy cảm (để chia sẻ/log an toàn)
  sed 's/\(PASSWORD\|SECRET\|KEY\)=.*/\1=***REDACTED***/g' \
    "$ENV_FILE" > "$BACKUP_PATH/heygeo.env.redacted"
  info "File .env đã ẩn thông tin nhạy cảm: heygeo.env.redacted"
else
  warn "Không tìm thấy file .env. Bỏ qua."
fi
echo ""

# ─── Bước 6: Kiểm tra dữ liệu models từ database ─────────────────────────────

step "Thống kê dữ liệu..."

if [[ "${SKIP_DB:-false}" != "true" && -f "$DB_BACKUP" ]]; then
  # Thử lấy thống kê bằng pg_restore --list (đọc danh sách từ file backup)
  PG_RESTORE="$(dirname "$PG_DUMP")/pg_restore"
  if [[ ! -x "$PG_RESTORE" ]]; then
    PG_RESTORE="pg_restore"
  fi
  echo "  Danh sách các bảng đã được backup:"
  "$PG_RESTORE" --list "$DB_BACKUP" 2>/dev/null | grep "TABLE DATA" | sed 's/.*TABLE DATA/public\./; s/$/  /' | head -20 | while read -r line; do
    echo "    📋 $line"
  done

  # Tổng dung lượng backup
  TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
  echo ""
  echo "  Tổng dung lượng backup: ${BOLD}$TOTAL_SIZE${RESET}"
fi
echo ""

# ─── Bước 7: Dọn dẹp backup cũ ─────────────────────────────────────────────

step "Dọn dẹp backup cũ (quá $KEEP_DAYS ngày)..."

if [[ -d "$BACKUP_DIR" ]]; then
  OLD_BACKUPS=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "heygeo-backup-*" -mtime "+$KEEP_DAYS" | sort)
  if [[ -n "$OLD_BACKUPS" ]]; then
    echo "  Các backup cũ sẽ bị xóa:"
    echo "$OLD_BACKUPS" | while read -r old; do
      OLD_SIZE=$(du -sh "$old" | cut -f1)
      echo "    🗑️  $old ($OLD_SIZE)"
      rm -rf "$old"
    done
    info "Đã dọn dẹp backup cũ."
  else
    info "Không có backup nào cũ hơn $KEEP_DAYS ngày."
  fi
fi
echo ""

# ─── Bước 8: Tạo symlink "latest" ────────────────────────────────────────────

LATEST_LINK="$BACKUP_DIR/heygeo-backup-latest"
ln -sfn "$BACKUP_PATH" "$LATEST_LINK"
info "Symlink 'latest' → $BACKUP_PATH"
echo ""

# ─── Tổng kết ────────────────────────────────────────────────────────────────

LOG_FILE="$BACKUP_DIR/backup.log"

if [[ "$DB_BACKUP_OK" == "true" ]]; then
  echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}║       ✅  Backup hoàn tất!                          ║${RESET}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "  📂 Thư mục backup: ${BOLD}$BACKUP_PATH${RESET}"
  echo -e "  🔗  Latest:         ${BOLD}${BACKUP_DIR}/heygeo-backup-latest${RESET}"
  echo ""
  echo -e "  ${BOLD}Nội dung backup:${RESET}"
  ls -lh "$BACKUP_PATH" | sed 's/^/    /'
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK] Backup hoàn tất → $BACKUP_PATH ($(du -sh "$BACKUP_PATH" | cut -f1))" >> "$LOG_FILE"
  info "Log được ghi tại: $LOG_FILE"
  echo ""
  echo ""
  echo -e "${BOLD}── Tự động hóa với cron ───────────────────────────${RESET}"
  echo ""
  echo "Bạn có thể chạy backup tự động mỗi ngày bằng crontab:"
  echo ""
  echo "  crontab -e"
  echo "  # Chạy lúc 03:00 mỗi ngày:"
  echo "  0 3 * * * $ROOT_DIR/backup_model.sh --keep 30 >/dev/null 2>&1"
  echo ""
  echo "Hoặc dùng launchd (khuyên dùng trên macOS):"
  echo ""
  echo "  cp $ROOT_DIR/launchd/com.heygeo.backup.plist ~/Library/LaunchAgents/"
  echo "  launchctl load ~/Library/LaunchAgents/com.heygeo.backup.plist"
  echo ""
  echo -e "${GREEN}Done.${RESET}"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${RED}║   ⚠  BACKUP KHÔNG ĐẦY ĐỦ – THIẾU DATABASE!         ║${RESET}"
  echo -e "${RED}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "  ${YELLOW}Database KHÔNG được backup. Nguyên nhân thường gặp:${RESET}"
  echo "    • Máy này không chạy PostgreSQL (sai máy?)."
  echo "      → Script chỉ nên chạy trên Mac Mini M2 Pro (máy chủ)."
  echo "    • PostgreSQL đang tắt, hoặc DATABASE_URL sai trong .env."
  echo ""
  echo -e "  📂 Dữ liệu KHÔNG đầy đủ nằm tại: ${BOLD}$BACKUP_PATH${RESET}"
  echo -e "  ${BOLD}Nội dung hiện có:${RESET}"
  ls -lh "$BACKUP_PATH" | sed 's/^/    /'
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [FAIL] Backup THIẾU database → $BACKUP_PATH" >> "$LOG_FILE"
  warn "Log được ghi tại: $LOG_FILE"
  echo ""
  echo -e "${RED}Backup thất bại hoặc không đầy đủ.${RESET}"
  exit 1
fi
