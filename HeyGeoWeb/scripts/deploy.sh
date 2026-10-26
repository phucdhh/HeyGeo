#!/usr/bin/env zsh
# Deploy: pull code mới → build → restart app (không restart tunnel)
# Usage: ./scripts/deploy.sh
set -euo pipefail

BOLD="\033[1m"; GREEN="\033[32m"; RESET="\033[0m"
info() { echo -e "${GREEN}[deploy]${RESET} $*" }

ROOT_DIR="${0:A:h:h}"
cd "$ROOT_DIR"

info "Cài npm packages..."
npm install --omit=dev

info "Tạo Prisma client..."
npx prisma generate

info "Migrate database..."
npx prisma db push --accept-data-loss

info "Build Next.js..."
npm run build

info "Copy static assets vào standalone..."
cp -r .next/static .next/standalone/.next/static
[[ -d public ]] && cp -r public .next/standalone/public || true

info "Khởi động lại Next.js app..."
launchctl kickstart -k "gui/$(id -u)/com.heygeo.app" 2>/dev/null || \
  bash "${ROOT_DIR}/scripts/restart.sh"

sleep 2
echo ""
echo -e "${BOLD}✅ Deploy hoàn tất${RESET}"
"${ROOT_DIR}/scripts/status.sh"
