#!/usr/bin/env zsh
# Wrapper khởi động Next.js standalone server với biến môi trường từ .env
# Được gọi bởi launchd (com.heygeo.app)

set -euo pipefail

# Resolve the project root (parent of the scripts/ directory)
# Using CDPATH-free cd to avoid relying on zsh-only ${0:A:h:h} expansion
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Load .env
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -o allexport
  source "$ROOT_DIR/.env"
  set +o allexport
fi

export NODE_ENV="production"
export PORT="${PORT:-3535}"
export HOSTNAME="127.0.0.1"

# Bắt buộc phải có biến này
: "${DATABASE_URL:?Thiếu DATABASE_URL trong .env}"
: "${JWT_SECRET:?Thiếu JWT_SECRET trong .env}"

# Đợi PostgreSQL sẵn sàng (tối đa 90 giây)
# Dùng symlink stable của Homebrew, không hardcode version (tránh break khi update PG)
PG_READY="/opt/homebrew/opt/postgresql@17/bin/pg_isready"
# Fallback: dùng pg_isready trong PATH nếu symlink chưa tồn tại
if [[ ! -x "$PG_READY" ]]; then
  PG_READY=$(command -v pg_isready 2>/dev/null || true)
fi

if [[ -x "$PG_READY" ]]; then
  echo "Waiting for PostgreSQL..."
  _pg_ready=false
  for i in $(seq 1 30); do
    if "$PG_READY" -h localhost -q 2>/dev/null; then
      _pg_ready=true
      break
    fi
    echo "  PostgreSQL not ready yet (attempt $i/30)..."
    sleep 3
  done
  if [[ "$_pg_ready" != "true" ]]; then
    echo "ERROR: PostgreSQL not ready after 90s – exiting so launchd can retry." >&2
    exit 1
  fi
  echo "PostgreSQL is ready."
else
  echo "WARNING: pg_isready not found, skipping DB wait." >&2
fi

export UPLOAD_DIR="$ROOT_DIR/uploads"
mkdir -p "$UPLOAD_DIR/avatars"

# Thư mục chứa file .zip bản phát hành Desktop
export RELEASE_DIR="$ROOT_DIR/release"
mkdir -p "$RELEASE_DIR"

# Di chuyển avatar cũ (từ thời standalone/public) sang thư mục mới
_old="$ROOT_DIR/.next/standalone/public/avatars"
if [[ -d "$_old" ]]; then
  cp -n "$_old/"* "$UPLOAD_DIR/avatars/" 2>/dev/null || true
fi
unset _old

mkdir -p "$ROOT_DIR/logs"

exec /opt/homebrew/bin/node "$ROOT_DIR/.next/standalone/server.js"
