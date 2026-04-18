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
    DEPLOY_DIR="${NAS_BASE}/dev/jts-photo"
    ;;
  prod)
    PORT=5657
    DEPLOY_DIR="${NAS_BASE}/production/jts-photo"
    ;;
  *)
    echo "Usage: $0 [dev|prod]" >&2
    exit 1
    ;;
esac

NAS_TARGET="${NAS_USER}@${NAS_HOST}"
SSH="ssh -p ${NAS_SSH_PORT}"
RSYNC="rsync -az --info=progress2 -e 'ssh -p ${NAS_SSH_PORT}'"
LOG_FILE="${DEPLOY_DIR}/app.log"
PID_FILE="${DEPLOY_DIR}/app.pid"

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

# ── 4. Remote: install deps + (re)start ──────────────────────
echo "▶ Remote setup & restart…"
$SSH -T "${NAS_TARGET}" bash <<REMOTE
set -euo pipefail
export PATH="/usr/local/bin:\$PATH"

cd "${DEPLOY_DIR}/backend"

# Install / update dependencies
npm install --omit=dev --silent

# Activate the right .env
cp ".env.${ENV}" .env

# Kill previous instance if running
if [ -f "${PID_FILE}" ]; then
  OLD_PID=\$(cat "${PID_FILE}")
  if kill -0 "\${OLD_PID}" 2>/dev/null; then
    kill "\${OLD_PID}"
    sleep 1
    echo "  stopped PID \${OLD_PID}"
  fi
  rm -f "${PID_FILE}"
fi

# Sécurité : tuer tout process node encore sur ce port (fuser absent sur Synology DSM)
LEFTOVER=\$(ps aux | grep '[s]erver.js' | awk 'NR==1{print \$2}' | head -1)
if [ -n "\${LEFTOVER}" ]; then
  kill "\${LEFTOVER}" 2>/dev/null || true
  sleep 1
fi

# Start
nohup node server.js >> "${LOG_FILE}" 2>&1 &
echo \$! > "${PID_FILE}"

sleep 1
if kill -0 \$(cat "${PID_FILE}") 2>/dev/null; then
  echo "  started PID \$(cat ${PID_FILE}) on port ${PORT}"
else
  echo "  ERROR: process failed to start — check ${LOG_FILE}" >&2
  exit 1
fi
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
