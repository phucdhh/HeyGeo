#!/usr/bin/env zsh
# Khởi động lại toàn bộ service HeyGeo
set -uo pipefail

echo "Đang khởi động lại HeyGeo..."

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

launchctl kickstart -k "gui/$(id -u)/com.heygeo.app"    2>/dev/null || \
  { launchctl unload "$LAUNCH_AGENTS/com.heygeo.app.plist" 2>/dev/null; \
    launchctl load   "$LAUNCH_AGENTS/com.heygeo.app.plist"; }

launchctl kickstart -k "gui/$(id -u)/com.heygeo.tunnel" 2>/dev/null || \
  { launchctl unload "$LAUNCH_AGENTS/com.heygeo.tunnel.plist" 2>/dev/null; \
    launchctl load   "$LAUNCH_AGENTS/com.heygeo.tunnel.plist"; }

echo "Đã khởi động lại. Kiểm tra trạng thái:"
sleep 2
"${0:A:h}/status.sh"
