#!/usr/bin/env zsh
# setup-build-cache.sh – Chạy 1 lần trên mỗi máy mới (Mac).
# Dời .next/ và node_modules/ ra ngoài Google Drive rồi tạo symlink trỏ về,
# tránh Google Drive đồng bộ hàng nghìn file nhỏ sau mỗi lần build.
#
# Dùng:  cd HeyGeoWeb && chmod +x setup-build-cache.sh && ./setup-build-cache.sh
set -euo pipefail

GDRIVE_WEB="${0:A:h}"   # thư mục chứa script = HeyGeoWeb/
CACHE_BASE="$HOME/.heygeo_build_cache/HeyGeoWeb"

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"

setup_symlink() {
  local NAME="$1"
  local SRC="$GDRIVE_WEB/$NAME"
  local DST="$CACHE_BASE/$NAME"

  if [[ -L "$SRC" ]]; then
    echo -e "${YELLOW}⚠  $NAME đã là symlink (→ $(readlink "$SRC")) – bỏ qua${RESET}"
    return
  fi

  mkdir -p "$CACHE_BASE"

  if [[ -d "$SRC" ]]; then
    echo -e "${BOLD}▶  Dời $NAME ra ngoài GDrive...${RESET}"
    mv "$SRC" "$DST"
  else
    # Thư mục chưa tồn tại (máy mới chưa build lần nào)
    mkdir -p "$DST"
  fi

  ln -s "$DST" "$SRC"
  echo -e "${GREEN}✓  $NAME  →  $DST${RESET}"
}

echo -e "\n${BOLD}Thiết lập build cache ngoài Google Drive${RESET}"
echo    "Cache dir: $CACHE_BASE"

setup_symlink ".next"
setup_symlink "node_modules"

echo -e "\n${GREEN}Xong! Từ nay Google Drive sẽ không đồng bộ .next/ và node_modules/ nữa.${RESET}"
echo    "Chạy 'npm install' nếu đây là máy mới chưa có node_modules."
