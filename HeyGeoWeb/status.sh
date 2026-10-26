#!/usr/bin/env zsh
# HeyGeo – status.sh
# Hiển thị trạng thái chi tiết của tất cả thành phần HeyGeo.
# Không cần sudo.

set -uo pipefail

ROOT_DIR="${0:A:h}"
DAEMON_DIR="/Library/LaunchDaemons"

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; CYAN="\033[36m"; RESET="\033[0m"
OK="${GREEN}●${RESET}"; FAIL="${RED}✗${RESET}"; WARN="${YELLOW}○${RESET}"

echo -e "${BOLD}── HeyGeo Status ──${RESET}"
echo ""

# ── 1. Next.js App ────────────────────────────────────────────
# Next.js đổi tên process thành "next-server (...)" nên dùng lsof :3535 thay vì pgrep
NEXTJS_PID=$(lsof -ti :3535 2>/dev/null | head -1 || true)
if [[ -n "$NEXTJS_PID" ]]; then
  if curl -sf --max-time 3 http://127.0.0.1:3535/ -o /dev/null 2>/dev/null \
     || curl -sf --max-time 3 http://127.0.0.1:3535/api/auth/me -o /dev/null 2>/dev/null; then
    echo -e "  Next.js app   ${OK} running  (PID $NEXTJS_PID, :3535 OK)"
  else
    echo -e "  Next.js app   ${WARN} process up (PID $NEXTJS_PID) nhưng :3535 chưa sẵn sàng"
  fi
else
  echo -e "  Next.js app   ${FAIL} not running (port 3535 trống)"
fi

# ── 2. Cloudflare Tunnel ──────────────────────────────────────
# Chỉ lấy tunnel heygeo, không nhầm với heyseen-tunnel
CF_PIDS=$(pgrep -f "cloudflared.*config.*heygeo" 2>/dev/null | tr '\n' ',' | sed 's/,$//' || true)
if [[ -n "$CF_PIDS" ]]; then
  echo -e "  CF Tunnel     ${OK} running  (PID $CF_PIDS)"
else
  echo -e "  CF Tunnel     ${FAIL} not running"
fi

# ── 3. PostgreSQL ─────────────────────────────────────────────
PG_BIN="/opt/homebrew/opt/postgresql@17/bin"
if "$PG_BIN/pg_isready" -q 2>/dev/null; then
  PG_PID=$(pgrep -f "postgresql@17/bin/postgres" 2>/dev/null | head -1 || true)
  echo -e "  PostgreSQL    ${OK} running  (PID ${PG_PID:-?})"
else
  echo -e "  PostgreSQL    ${FAIL} not running"
fi

# ── 4. LaunchDaemon status ────────────────────────────────────
echo ""
echo -e "${CYAN}  LaunchDaemon (system):${RESET}"

for svc in com.heygeo.postgres com.heygeo.app com.heygeo.tunnel; do
  plist_file="$DAEMON_DIR/$svc.plist"
  if [[ ! -f "$plist_file" ]]; then
    echo -e "    $svc  ${FAIL} chưa cài vào $DAEMON_DIR"
    echo -e "      → Chạy: ${BOLD}sudo $ROOT_DIR/start.sh${RESET}"
    continue
  fi

  # Thử list không cần sudo (đọc được trong system domain trên macOS 11+)
  # launchctl list <svc> trả về dict: "PID" = 12345; hoặc không có PID nếu không chạy
  LD_INFO=$(sudo launchctl list "$svc" 2>/dev/null || true)

  if [[ -z "$LD_INFO" ]]; then
    echo -e "    $svc  ${WARN} plist đã cài nhưng chưa load"
    echo -e "      → Chạy: ${BOLD}sudo $ROOT_DIR/start.sh${RESET}"
  else
    LD_PID=$(echo "$LD_INFO" | grep '"PID"' | grep -oE '[0-9]+' | head -1 || true)
    LD_EXIT=$(echo "$LD_INFO" | grep '"LastExitStatus"' | grep -oE '[0-9]+' | head -1 || true)
    if [[ -n "$LD_PID" ]]; then
      echo -e "    $svc  ${OK} loaded, running (PID $LD_PID)"
    else
      echo -e "    $svc  ${WARN} loaded, not running (LastExitStatus: ${LD_EXIT:-?})"
      echo -e "      → KeepAlive đang chờ restart, hoặc chạy: ${BOLD}sudo $ROOT_DIR/restart.sh${RESET}"
    fi
  fi
done

# ── 5. Log gần nhất ──────────────────────────────────────────
echo ""
echo -e "${CYAN}  Log gần nhất (app):${RESET}"
tail -3 "$ROOT_DIR/logs/app.log" 2>/dev/null | sed 's/^/    /' || echo "    (chưa có log)"

# ── 6. Summary ───────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}🌐  https://heygeo.pedu.vn${RESET}"
echo -e "  🖥️   http://localhost:3535"
echo ""
echo -e "  ${CYAN}Lệnh quản lý:${RESET}"
echo -e "    sudo $ROOT_DIR/start.sh    # Cài & khởi động"
echo -e "    sudo $ROOT_DIR/stop.sh     # Dừng"
echo -e "    sudo $ROOT_DIR/restart.sh  # Khởi động lại"
echo -e "         $ROOT_DIR/status.sh   # Trạng thái (script này)"
echo ""
