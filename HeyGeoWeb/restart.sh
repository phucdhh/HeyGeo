#!/usr/bin/env zsh
# HeyGeo – restart.sh
# Khởi động lại các daemon HeyGeo (kill process hiện tại → launchd tự restart).
# Nếu daemon chưa được cài, tự động chạy start.sh.

set -uo pipefail

ROOT_DIR="${0:A:h}"
DAEMON_DIR="/Library/LaunchDaemons"
PLISTS=(com.heygeo.postgres com.heygeo.app com.heygeo.tunnel)

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"

echo -e "${BOLD}── HeyGeo Restart ──${RESET}"

if [[ $EUID -ne 0 ]]; then
  exec sudo zsh "$0" "$@"
fi

_needs_install=false
for name in $PLISTS; do
  if ! launchctl list "$name" &>/dev/null 2>&1; then
    _needs_install=true
    break
  fi
done

if [[ "$_needs_install" == "true" ]]; then
  echo "Daemon chưa được cài, chạy start.sh..."
  exec "$ROOT_DIR/start.sh"
fi

for name in $PLISTS; do
  launchctl kickstart -k "system/$name" \
    && echo -e "  $name  ${GREEN}→ restarted${RESET}" \
    || echo -e "  $name  ${RED}→ lỗi${RESET}"
done

echo ""
sleep 2
exec "$ROOT_DIR/status.sh"
