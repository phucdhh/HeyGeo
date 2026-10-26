#!/usr/bin/env zsh
# ──────────────────────────────────────────────────────────────
# HeyGeo – macOS native setup script
# Chạy một lần để cài đặt toàn bộ môi trường trên Mac Mini M2 Pro
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ──────────────────────────────────────────────────────────────
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

info()    { echo -e "${GREEN}[HeyGeo]${RESET} $*" }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*" }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1 }
section() { echo -e "\n${BOLD}── $* ──${RESET}" }

SCRIPT_DIR="${0:A:h}"
ROOT_DIR="${SCRIPT_DIR:h}"
cd "$ROOT_DIR"

# ─── 1. Kiểm tra Homebrew ─────────────────────────────────────
section "1. Homebrew"
if ! command -v brew &>/dev/null; then
  error "Homebrew chưa được cài. Xem https://brew.sh"
fi
info "Homebrew ✓ ($(brew --version | head -1))"

# ─── 2. Node.js ───────────────────────────────────────────────
section "2. Node.js"
if ! command -v node &>/dev/null; then
  info "Cài Node.js LTS..."
  brew install node@22
  brew link --force --overwrite node@22
fi
node_ver=$(node --version)
info "Node.js ✓ ($node_ver)"

# ─── 3. PostgreSQL ────────────────────────────────────────────
section "3. PostgreSQL"
if ! command -v psql &>/dev/null; then
  info "Cài PostgreSQL 16..."
  brew install postgresql@16
  brew link --force --overwrite postgresql@16
fi
# Start PostgreSQL nếu chưa chạy
if ! pg_isready -q 2>/dev/null; then
  info "Khởi động PostgreSQL..."
  brew services start postgresql@16
  sleep 2
fi
info "PostgreSQL ✓"

# Tạo user & database
info "Tạo user và database heygeo (nếu chưa có)..."
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='heygeo'" | grep -q 1 || \
  psql postgres -c "CREATE USER heygeo WITH PASSWORD '$(grep DB_PASSWORD .env 2>/dev/null | cut -d= -f2 || echo changeme)' CREATEDB;"
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='heygeo'" | grep -q 1 || \
  psql postgres -c "CREATE DATABASE heygeo OWNER heygeo;"
info "Database ✓"

# ─── 4. cloudflared ───────────────────────────────────────────
section "4. cloudflared"
if ! command -v cloudflared &>/dev/null; then
  info "Cài cloudflared..."
  brew install cloudflared
fi
cf_ver=$(cloudflared --version | head -1)
info "cloudflared ✓ ($cf_ver)"

# ─── 5. File .env ─────────────────────────────────────────────
section "5. Cấu hình môi trường (.env)"
if [[ ! -f .env ]]; then
  info "Tạo .env từ .env.example..."
  cp .env.example .env

  # Sinh JWT_SECRET ngẫu nhiên
  JWT=$(openssl rand -hex 32)
  sed -i '' "s|change-this-to-a-random-64-char-secret|$JWT|" .env

  # Sinh DB_PASSWORD ngẫu nhiên
  DB_PASS=$(openssl rand -hex 16)
  sed -i '' "s|password|$DB_PASS|" .env

  warn "⚠️  Đã tạo .env với JWT_SECRET và DB_PASSWORD ngẫu nhiên."
  warn "   Xem lại file .env trước khi tiếp tục nếu cần chỉnh sửa."
else
  info ".env đã tồn tại, bỏ qua."
fi

# Load env
source .env 2>/dev/null || true

# ─── 6. npm install ───────────────────────────────────────────
section "6. Cài npm packages"
npm install
npx prisma generate
info "npm packages ✓"

# ─── 7. Database migration ────────────────────────────────────
section "7. Prisma DB push"
npx prisma db push --accept-data-loss
info "Database schema ✓"

# ─── 8. Build Next.js ─────────────────────────────────────────
section "8. Build Next.js"
npm run build
info "Build ✓"

# ─── 9. Cloudflare Tunnel ─────────────────────────────────────
section "9. Cloudflare Tunnel"

# Kiểm tra đã login chưa
if [[ ! -f ~/.cloudflared/cert.pem ]]; then
  info "Đang mở trình duyệt để đăng nhập Cloudflare..."
  cloudflared tunnel login
fi

# Tạo tunnel mới tên "heygeo" (nếu chưa có)
EXISTING=$(cloudflared tunnel list --output json 2>/dev/null | \
  python3 -c "import sys,json; ts=[t for t in json.load(sys.stdin) if t.get('name')=='heygeo']; print(ts[0]['id'] if ts else '')" 2>/dev/null || echo "")

if [[ -z "$EXISTING" ]]; then
  info "Tạo tunnel mới: heygeo..."
  cloudflared tunnel create heygeo
  sleep 1
fi

# Lấy Tunnel ID
TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | \
  python3 -c "import sys,json; ts=[t for t in json.load(sys.stdin) if t.get('name')=='heygeo']; print(ts[0]['id'])")

if [[ -z "$TUNNEL_ID" ]]; then
  error "Không lấy được Tunnel ID. Chạy lại script sau khi đăng nhập Cloudflare."
fi

info "Tunnel ID: $TUNNEL_ID"

# Cập nhật credentials-file trong config
sed -i '' "s|TUNNEL_ID|$TUNNEL_ID|g" cloudflared/config.yml
info "cloudflared/config.yml đã được cập nhật ✓"

# Thêm DNS record heygeo.pedu.vn → tunnel (idempotent)
info "Thiết lập DNS: heygeo.pedu.vn → tunnel heygeo..."
cloudflared tunnel route dns --overwrite-dns heygeo heygeo.pedu.vn || \
  warn "DNS route đã tồn tại hoặc lỗi nhỏ, tiếp tục..."

# ─── 10. Cài launchd services ─────────────────────────────────
section "10. macOS launchd services"

# Xác định thư mục home và user
HOME_DIR="$HOME"
CURRENT_USER="$(whoami)"
APP_DIR="$ROOT_DIR"

# Điền biến vào plist
for plist in launchd/com.heygeo.app.plist launchd/com.heygeo.tunnel.plist; do
  sed -i '' \
    -e "s|HOME_DIR|$HOME_DIR|g" \
    -e "s|APP_DIR|$APP_DIR|g" \
    -e "s|CURRENT_USER|$CURRENT_USER|g" \
    -e "s|TUNNEL_ID|$TUNNEL_ID|g" \
    "$plist" 2>/dev/null || true
done

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENTS"

# Copy plists
cp launchd/com.heygeo.app.plist    "$LAUNCH_AGENTS/"
cp launchd/com.heygeo.tunnel.plist "$LAUNCH_AGENTS/"

# Load services
launchctl unload "$LAUNCH_AGENTS/com.heygeo.app.plist"    2>/dev/null || true
launchctl unload "$LAUNCH_AGENTS/com.heygeo.tunnel.plist" 2>/dev/null || true
launchctl load   "$LAUNCH_AGENTS/com.heygeo.app.plist"
launchctl load   "$LAUNCH_AGENTS/com.heygeo.tunnel.plist"

info "launchd services đã được cài và khởi động ✓"

# ─── Hoàn tất ─────────────────────────────────────────────────
section "✅ Cài đặt hoàn tất"
echo ""
echo "  🌐 Public URL: https://heygeo.pedu.vn"
echo "  🖥️  Local URL:  http://localhost:3535"
echo ""
echo "  Quản lý service:"
echo "    ./scripts/status.sh          – kiểm tra trạng thái"
echo "    ./scripts/restart.sh         – khởi động lại"
echo "    ./scripts/stop.sh            – dừng tất cả"
echo ""
echo "  Logs:"
echo "    tail -f logs/app.log         – Next.js app"
echo "    tail -f logs/tunnel.log      – cloudflared tunnel"
echo ""
