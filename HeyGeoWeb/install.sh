#!/usr/bin/env zsh
# install.sh – chạy `npm install` mà vẫn giữ node_modules nằm ngoài Google Drive.
#
# npm luôn unlink rồi tạo lại node_modules thành thư mục thật, nên symlink của
# setup-build-cache.sh bị phá mỗi lần cài gói. Script này hoàn tác bước đó sau
# khi cài xong: dời node_modules vào build cache và tạo lại symlink.
#
# Dùng:  ./install.sh                 (tương đương npm install)
#        ./install.sh -D vitest       (mọi tham số chuyển thẳng cho npm)

set -euo pipefail

ROOT_DIR="${0:A:h}"
CACHE_BASE="$HOME/.heygeo_build_cache/HeyGeoWeb"
NM="$ROOT_DIR/node_modules"

cd "$ROOT_DIR"

if [[ -L "$NM" ]]; then
  echo "▶ Bỏ symlink node_modules (npm sẽ tự tạo lại)..."
  rm "$NM"
fi

echo "▶ npm install $*"
npm install "$@"

[[ -d "$NM" ]] || { echo "✗ npm không để lại node_modules — kiểm tra lỗi ở trên"; exit 1; }

mkdir -p "$CACHE_BASE"
STALE="$CACHE_BASE/node_modules"
if [[ -d "$STALE" && ! -L "$STALE" ]]; then
  BACKUP="$STALE.old-$(date +%Y%m%d_%H%M%S)"
  echo "⚠  Dời cache cũ → ${BACKUP:t}"
  mv "$STALE" "$BACKUP"
fi

echo "▶ Dời node_modules ra ngoài Google Drive..."
mv "$NM" "$STALE"
ln -s "$STALE" "$NM"

# Giữ lại 2 bản .old gần nhất để khôi phục nếu cần, xoá phần cũ hơn
rm -rf "$CACHE_BASE"/node_modules.old-*(N[1,-3])

echo "✓ Xong. node_modules → $STALE"
