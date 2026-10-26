#!/usr/bin/env zsh
# Kiểm tra trạng thái các service HeyGeo
set -uo pipefail

BOLD="\033[1m"; GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"

echo -e "${BOLD}── HeyGeo Status ──${RESET}"

# Next.js app
if launchctl list com.heygeo.app &>/dev/null; then
  PID=$(launchctl list com.heygeo.app | awk 'NR==2{print $1}')
  if [[ "$PID" != "-" && -n "$PID" ]]; then
    echo -e "  Next.js app  ${GREEN}● running${RESET}  (PID $PID)"
  else
    echo -e "  Next.js app  ${YELLOW}○ stopped${RESET}"
  fi
else
  echo -e "  Next.js app  ${RED}✗ not loaded${RESET}"
fi

# Cloudflared tunnel
if launchctl list com.heygeo.tunnel &>/dev/null; then
  PID=$(launchctl list com.heygeo.tunnel | awk 'NR==2{print $1}')
  if [[ "$PID" != "-" && -n "$PID" ]]; then
    echo -e "  CF Tunnel    ${GREEN}● running${RESET}  (PID $PID)"
  else
    echo -e "  CF Tunnel    ${YELLOW}○ stopped${RESET}"
  fi
else
  echo -e "  CF Tunnel    ${RED}✗ not loaded${RESET}"
fi

# PostgreSQL
if pg_isready -q 2>/dev/null; then
  echo -e "  PostgreSQL   ${GREEN}● running${RESET}"
else
  echo -e "  PostgreSQL   ${RED}✗ not running${RESET}"
fi

echo ""
echo -e "  🌐 https://heygeo.pedu.vn"
echo -e "  🖥️  http://localhost:3535"
echo ""
