#!/usr/bin/env bash
# ============================================================
# deploy.sh — JTS Photo deployment script
# Usage: ./deploy.sh [dev|prod]
# ============================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────
NAS_HOST="nas-jts.persian-kelvin.ts.net"
NAS_USER="${NAS_USER:-Satemorej}"
NAS_SSH_PORT=3522
NAS_BASE="/volume1/homelab/apps"
# ─────────────────────────────────────────────────────────────

ENV="${1:-dev}"

case "$ENV" in
  dev)
    PORT=5656
    PM2_NAME="jts-photo-dev"
    DEPLOY_DIR="${NAS_BASE}/dev/jts-photo"
    ;;
  prod)
    PORT=5657
    PM2_NAME="jts-photo"
    DEPLOY_DIR="${NAS_BASE}/production/jts-photo"
    ;;
  *)
    echo "Usage: $0 [dev|prod]" >&2
    exit 1
    ;;
esac

NAS_TARGET="${NAS_USER}@${NAS_HOST}"
SSH="ssh -p ${NAS_SSH_PORT}"

echo ""
echo "  JTS Photo — deploy [${ENV}]"
echo "  Target : ${NAS_TARGET}:${DEPLOY_DIR}"
echo "  Port   : ${PORT}"
echo ""

# ── 1. Build frontend ─────────────────────────────────────────
echo "▶ Build frontend…"
VITE_API_URL="" VITE_APP_ENV="${ENV}" npm run build --silent
echo "  ✓ Build OK ($(du -sh dist | cut -f1))"

# ── 2. Sync frontend build ────────────────────────────────────
echo "▶ Sync frontend → NAS…"
$SSH "${NAS_TARGET}" "mkdir -p '${DEPLOY_DIR}/public'"
rsync -az --delete --info=progress2 \
  -e "ssh -p ${NAS_SSH_PORT}" \
  dist/ \
  "${NAS_TARGET}:${DEPLOY_DIR}/public/"
echo "  ✓ Frontend synced"

# ── 3. Sync backend ───────────────────────────────────────────
echo "▶ Sync backend → NAS…"
$SSH "${NAS_TARGET}" "mkdir -p '${DEPLOY_DIR}/backend'"
rsync -az --delete --info=progress2 \
  -e "ssh -p ${NAS_SSH_PORT}" \
  --exclude="node_modules/" \
  --exclude="uploads/" \
  --exclude=".env" \
  backend/ \
  "${NAS_TARGET}:${DEPLOY_DIR}/backend/"
echo "  ✓ Backend synced"

# ── 4. Remote: install deps + (re)start via PM2 ──────────────
echo "▶ Remote setup & restart…"
$SSH -p "${NAS_SSH_PORT}" -T "${NAS_TARGET}" bash -l <<REMOTE
set -euo pipefail

cd "${DEPLOY_DIR}/backend"

npm install --omit=dev --silent

cp ".env.${ENV}" .env

pm2 restart ${PM2_NAME} 2>/dev/null \
  || pm2 start server.js --name ${PM2_NAME}

pm2 save --force

echo "  ✓ PM2 (${PM2_NAME}) démarré"
REMOTE

# ── 5. Health check ───────────────────────────────────────────
echo "▶ Health check…"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
  "https://${NAS_HOST}:${PORT}/api/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ HTTPS OK (200) — Service Worker apte à s'enregistrer"
elif [ "$HTTP_CODE" = "000" ]; then
  echo "  ✗ Pas de réponse — certificat Tailscale généré ?"
  echo "    → ssh -p ${NAS_SSH_PORT} ${NAS_TARGET} 'sudo tailscale cert ${NAS_HOST}'"
else
  echo "  ⚠ HTTP ${HTTP_CODE} — vérifiez https://${NAS_HOST}:${PORT}/api/health"
fi

echo ""
echo "  ✅ Deploy [${ENV}] terminé"
echo "  URL : https://${NAS_HOST}:${PORT}"
echo ""
