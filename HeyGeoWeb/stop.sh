#!/usr/bin/env zsh
# HeyGeo – stop.sh
# Dừng và gỡ đăng ký các LaunchDaemon HeyGeo (sẽ không tự restart).
# Để khởi động lại: sudo ./start.sh  hoặc  sudo ./restart.sh

set -uo pipefail

ROOT_DIR="${0:A:h}"
DAEMON_DIR="/Library/LaunchDaemons"
PLISTS=(com.heygeo.app com.heygeo.tunnel)

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"

echo -e "${BOLD}── HeyGeo Stop ──${RESET}"

if [[ $EUID -ne 0 ]]; then
  exec sudo zsh "$0" "$@"
fi

for name in $PLISTS; do
  plist_path="$DAEMON_DIR/$name.plist"

  if launchctl list "$name" &>/dev/null 2>&1; then
    if [[ -f "$plist_path" ]]; then
      launchctl bootout system "$plist_path" \
        && echo -e "  $name  ${GREEN}→ stopped${RESET}" \
        || echo -e "  $name  ${RED}→ lỗi khi dừng${RESET}"
    else
      # plist không còn trong /Library/LaunchDaemons → bootout bằng label
      launchctl bootout "system/$name" 2>/dev/null \
        && echo -e "  $name  ${GREEN}→ stopped${RESET}" \
        || echo -e "  $name  ${RED}→ lỗi khi dừng${RESET}"
    fi
  else
    echo -e "  $name  ${YELLOW}→ không chạy${RESET}"
  fi
done

echo ""
echo -e "${BOLD}HeyGeo đã dừng.${RESET}"
echo "(Để khởi động lại: sudo $ROOT_DIR/start.sh)"
