#!/usr/bin/env zsh
# HeyGeo – start.sh
# Cài (nếu chưa có) và khởi động các LaunchDaemon của HeyGeo.
# LaunchDaemon chạy ở system level → tự restart sau crash và sau reboot.
#
# Lần đầu: sudo ./start.sh
# Các lần sau: sudo ./start.sh  (hoặc chỉ ./restart.sh nếu đã cài)

set -uo pipefail

ROOT_DIR="${0:A:h}"
DAEMON_DIR="/Library/LaunchDaemons"
PLISTS=(com.heygeo.postgres com.heygeo.app com.heygeo.tunnel)

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"

echo -e "${BOLD}── HeyGeo Start ──${RESET}"

# ── Yêu cầu sudo ──────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "Cần quyền sudo để quản lý LaunchDaemon."
  exec sudo zsh "$0" "$@"
fi

# ── Cài / cập nhật plists vào /Library/LaunchDaemons/ ─────────
_install_plist() {
  local name=$1
  local src="$ROOT_DIR/launchd/$name.plist"
  local dst="$DAEMON_DIR/$name.plist"

  if [[ ! -f "$src" ]]; then
    echo -e "  ${RED}Lỗi: không tìm thấy $src${RESET}"
    return 1
  fi

  if [[ ! -f "$dst" ]] || ! diff -q "$src" "$dst" &>/dev/null; then
    echo "  Cài $name.plist → $DAEMON_DIR/"
    cp "$src" "$dst"
    chown root:wheel "$dst"
    chmod 644 "$dst"
  fi
}

# ── Khởi động daemon ───────────────────────────────────────────
_start_daemon() {
  local name=$1
  local plist="$DAEMON_DIR/$name.plist"

  if launchctl list "$name" &>/dev/null 2>&1; then
    echo -e "  $name  ${YELLOW}đã load${RESET} – kickstart để làm mới"
    launchctl kickstart "system/$name" &>/dev/null || true
  else
    launchctl bootstrap system "$plist" \
      && echo -e "  $name  ${GREEN}→ started${RESET}" \
      || echo -e "  $name  ${RED}→ lỗi bootstrap${RESET}"
  fi
}

mkdir -p "$ROOT_DIR/logs"

for p in $PLISTS; do _install_plist "$p"; done
echo ""
for p in $PLISTS; do _start_daemon "$p"; done

echo ""
sleep 2
exec "$ROOT_DIR/status.sh"
