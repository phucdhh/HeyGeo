#!/usr/bin/env zsh
# Dừng toàn bộ service HeyGeo
set -uo pipefail

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

echo "Đang dừng HeyGeo..."
launchctl unload "$LAUNCH_AGENTS/com.heygeo.app.plist"    2>/dev/null && echo "  Next.js app → stopped" || echo "  Next.js app → chưa chạy"
launchctl unload "$LAUNCH_AGENTS/com.heygeo.tunnel.plist" 2>/dev/null && echo "  CF Tunnel   → stopped" || echo "  CF Tunnel   → chưa chạy"
echo "Đã dừng."
