<template>
  <div class="screen">
<main class="screen-body">

      <!-- ── Connexion NAS ───────────────────────────────────── -->
      <section class="section-block">
        <div class="section-header">
          <span class="section-title">Connexion NAS</span>
        </div>

        <button class="conn-btn" :class="statusClass" :disabled="testing" @click="testConnection">
          <span class="conn-dot" :class="{ 'dot-spin': testing }" />
          <div class="conn-info">
            <span class="conn-label">{{ testing ? 'Test en cours…' : statusText }}</span>
            <span class="conn-sub">
              <template v-if="lastChecked">{{ lastChecked }}</template>
              <template v-else>Appuyer pour tester</template>
              <span v-if="latencyMs !== null" class="latency-inline">· {{ latencyMs }} ms</span>
            </span>
          </div>
          <svg class="conn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 6s4-4 11-4 11 4 11 4"/>
            <path d="M1 12s4-4 11-4 11 4 11 4"/>
            <circle cx="12" cy="20" r="1"/>
          </svg>
        </button>
      </section>

      <!-- ── File d'attente ─────────────────────────────────── -->
      <section class="section-block">
        <div class="section-header">
          <span class="section-title">File d'attente</span>
          <span class="section-count" :class="queueStore.pendingCount ? 'count-warn' : 'count-ok'">
            {{ queueStore.pendingCount }} fichier{{ queueStore.pendingCount !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="queue-section" :class="queueStore.pendingCount ? 'queue-active' : 'queue-empty'">

        <!-- Contrôles -->
        <div class="queue-controls">
          <button
            class="btn btn-primary"
            style="flex:1"
            :disabled="!queueStore.retryableItems.length || queueStore.isRetrying"
            @click="retryAll"
          >
            {{ queueStore.isRetrying ? `Envoi en cours…` : `Tout relancer (${queueStore.retryableItems.length})` }}
          </button>

          <button
            class="btn toggle-btn"
            :class="queueStore.autoRetryEnabled ? 'toggle-on' : 'toggle-off'"
            @click="queueStore.toggleAutoRetry(!queueStore.autoRetryEnabled)"
          >
            <span class="toggle-track"><span class="toggle-thumb" /></span>
            Auto
          </button>
        </div>

        <p v-if="queueStore.autoRetryEnabled" class="auto-hint">
          ↺ Retry automatique actif — déclenché à la reconnexion ou au retour dans l'app
        </p>

        <!-- Items -->
        <div v-if="!queueStore.hasItems" class="empty-state">
          <div class="empty-icon">✓</div>
          <p>File vide — tout est transféré</p>
        </div>

        <div v-else class="queue-list">
          <div v-for="item in queueStore.items" :key="item.id" class="queue-card">
            <!-- Aperçu -->
            <div class="item-preview">
              <img v-if="item.type === 'photo'" :src="item.dataUrl" class="item-thumb" alt="" />
              <div v-else-if="item.type === 'video'" class="item-icon-box item-video">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <span>VID</span>
              </div>
              <div v-else class="item-icon-box item-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="12" y2="17"/>
                </svg>
                <span>TXT</span>
              </div>
            </div>

            <!-- Infos -->
            <div class="item-body">
              <div class="item-top">
                <span class="item-type-badge" :class="item.type === 'photo' ? 'badge-photo' : item.type === 'video' ? 'badge-video' : 'badge-note'">
                  {{ item.type === 'photo' ? 'Photo' : item.type === 'video' ? 'Vidéo' : 'Note' }}
                </span>
                <span class="item-chantier">{{ item.chantierName }}</span>
              </div>
              <div class="item-retry-row">
                <span class="retry-count" :class="item.retryCount >= 5 ? 'retry-max' : ''">
                  {{ item.retryCount }}/{{ MAX_RETRY }} tentatives
                </span>
                <span v-if="item.lastAttempt" class="last-attempt">
                  · {{ formatTime(item.lastAttempt) }}
                </span>
              </div>
              <p v-if="item.lastError" class="item-error">⚠ {{ item.lastError }}</p>
            </div>

            <!-- Actions -->
            <div class="item-actions">
              <button
                v-if="item.retryCount < MAX_RETRY"
                class="btn btn-secondary item-btn"
                :disabled="queueStore.isRetrying"
                @click="retryOne(item.id)"
              >
                ↑
              </button>
              <button class="btn btn-danger item-btn" @click="removeItem(item.id)">✕</button>
            </div>
          </div>
        </div>

        </div><!-- /queue-section -->
      </section>

      <!-- ── Historique ─────────────────────────────────────── -->
      <section class="section-block">
        <div class="section-header">
          <span class="section-title">Historique</span>
          <button v-if="history.length" class="link-btn" @click="clearHistory">Effacer</button>
        </div>

        <div v-if="!history.length" class="empty-state">
          <div class="empty-icon">🕐</div>
          <p>Aucun transfert enregistré</p>
        </div>

        <div v-else class="history-list">
          <div v-for="entry in history" :key="entry.id" class="history-row">
            <div class="h-icon" :class="entry.type === 'photo' ? 'h-photo' : entry.type === 'video' ? 'h-video' : entry.type === 'report' ? 'h-report' : 'h-note'">
              <svg v-if="entry.type === 'photo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <svg v-else-if="entry.type === 'video'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              <svg v-else-if="entry.type === 'report'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
                <line x1="8" y1="9" x2="10" y2="9"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="h-body">
              <span class="h-name">{{ entry.filename }}</span>
              <span class="h-meta">{{ entry.chantierName }} · {{ formatDateTime(entry.transferredAt) }}</span>
            </div>
            <div class="h-check">✓</div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQueueStore, getTransferHistory, clearTransferHistory } from '@/stores/queueStore'
import { useUiStore } from '@/stores/uiStore'
import { checkHealthLatency } from '@/services/api'
import type { HistoryEntry } from '@/services/db'

const MAX_RETRY = 5

const queueStore = useQueueStore()
const uiStore    = useUiStore()

// ── Connexion ─────────────────────────────────────────────────
const testing     = ref(false)
const latencyMs   = ref<number | null>(null)
const lastChecked = ref<string | null>(null)

const statusClass = computed(() =>
  !uiStore.isOnline ? 'conn-err' : !uiStore.backendOk ? 'conn-warn' : 'conn-online'
)
const statusText = computed(() =>
  !uiStore.isOnline ? 'Hors ligne' : !uiStore.backendOk ? 'NAS inaccessible' : 'En ligne'
)

const latencyClass = ref<'lat-ok' | 'lat-warn' | 'lat-bad'>('lat-ok')

async function testConnection() {
  testing.value = true
  const { ok, latencyMs: ms } = await checkHealthLatency()
  testing.value = false

  latencyMs.value   = ms
  lastChecked.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  uiStore.backendOk = ok

  if (ms === null) latencyClass.value = 'lat-bad'
  else if (ms < 200) latencyClass.value = 'lat-ok'
  else if (ms < 800) latencyClass.value = 'lat-warn'
  else latencyClass.value = 'lat-bad'
}

// ── Queue ─────────────────────────────────────────────────────
async function retryAll() {
  const { success, failed } = await queueStore.retryAll()
  uiStore.showToast(`${success} transféré(s), ${failed} échec(s)`, success > 0 ? 'success' : 'error')
  refreshHistory()
}

async function retryOne(id: string) {
  const ok = await queueStore.retryItem(id)
  uiStore.showToast(ok ? 'Transféré ✓' : 'Échec — réessayez', ok ? 'success' : 'error')
  refreshHistory()
}

async function removeItem(id: string) {
  await queueStore.removeItem(id)
  uiStore.showToast('Retiré de la file', 'info')
}

// ── Historique ────────────────────────────────────────────────
const history = ref<HistoryEntry[]>([])

function refreshHistory() {
  history.value = getTransferHistory()
}

function clearHistory() {
  clearTransferHistory()
  history.value = []
}

// ── Utils ─────────────────────────────────────────────────────
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Init ──────────────────────────────────────────────────────
onMounted(async () => {
  await queueStore.loadQueue()
  refreshHistory()
})
</script>

<style scoped>
/* Sections */
.section-block {
  margin-bottom: 24px;
}

.queue-section {
  border-radius: var(--radius-md);
  padding: 14px;
  border: 1px solid transparent;
  transition: border-color 0.2s, background 0.2s;
}
.queue-empty {
  border-color: var(--color-border);
  background: var(--color-surface);
}
.queue-active {
  border-color: rgba(255, 159, 10, 0.55);
  background: rgba(255, 159, 10, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-dim);
}

.section-count {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.count-ok   { background: rgba(48,209,88,0.14);  color: var(--color-success); }
.count-warn { background: rgba(255,214,10,0.14); color: var(--color-warning); }

/* Connexion — bouton fusionné */
.conn-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: opacity 0.12s ease, transform 0.1s ease;
  text-align: left;
}
.conn-btn:active { opacity: 0.75; transform: scale(0.985); }
.conn-btn:disabled { opacity: 0.6; pointer-events: none; }

.conn-online { background: rgba(48,209,88,0.1);  color: var(--color-success); border-color: rgba(48,209,88,0.25); }
.conn-warn   { background: rgba(255,214,10,0.1); color: var(--color-warning); border-color: rgba(255,214,10,0.25); }
.conn-err    { background: rgba(255,69,58,0.1);  color: var(--color-danger);  border-color: rgba(255,69,58,0.25); }

.conn-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
.dot-spin { animation: pulse 0.9s ease infinite; }

.conn-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.conn-label { font-size: 15px; font-weight: 700; }
.conn-sub   { font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 4px; }

.latency-inline {
  font-weight: 700;
  opacity: 1;
}

.conn-arrow {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  opacity: 0.5;
}

/* Queue controls */
.queue-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

/* Toggle auto-retry */
.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
}
.toggle-on  { background: rgba(48,209,88,0.15); color: var(--color-success); border-color: var(--color-success); }
.toggle-off { background: var(--color-surface-2); color: var(--color-text-dim); }

.toggle-track {
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: currentColor;
  opacity: 0.3;
  position: relative;
  flex-shrink: 0;
  display: none; /* simplifié : juste la couleur suffit */
}

.auto-hint {
  font-size: 11px;
  color: var(--color-success);
  margin-bottom: 10px;
  opacity: 0.8;
}

/* Queue items */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
}

.item-preview { flex-shrink: 0; }

.item-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 8px;
}

.item-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.item-icon-box svg { width: 22px; height: 22px; }
.item-note  { background: rgba(255,214,10,0.12); color: var(--color-warning); }
.item-video { background: rgba(191,90,242,0.12); color: #bf5af2; }

.item-body { flex: 1; min-width: 0; }

.item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.item-type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-photo { background: rgba(10,132,255,0.15);  color: var(--color-accent); }
.badge-note  { background: rgba(255,214,10,0.15);  color: var(--color-warning); }
.badge-video { background: rgba(191,90,242,0.15);  color: #bf5af2; }

.item-chantier {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-retry-row {
  font-size: 11px;
  color: var(--color-text-dim);
}
.retry-count { font-weight: 600; }
.retry-max   { color: var(--color-danger); }
.last-attempt { opacity: 0.7; }

.item-error {
  font-size: 11px;
  color: var(--color-danger);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.item-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 14px;
  border-radius: 10px;
  min-height: unset;
}

/* Historique */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}

.h-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.h-icon svg { width: 18px; height: 18px; }
.h-photo  { background: rgba(10,132,255,0.12);  color: var(--color-accent); }
.h-note   { background: rgba(255,214,10,0.12);  color: var(--color-warning); }
.h-report { background: rgba(255,69,58,0.12);   color: var(--color-danger); }
.h-video  { background: rgba(191,90,242,0.12);  color: #bf5af2; }

.h-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.h-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.h-meta {
  font-size: 11px;
  color: var(--color-text-dim);
}

.h-check {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-success);
  flex-shrink: 0;
}

/* Misc */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 20px;
  color: var(--color-text-dim);
  font-size: 13px;
  text-align: center;
}
.empty-icon { font-size: 32px; }

.queue-section .empty-state {
  flex-direction: row;
  gap: 8px;
  padding: 10px 14px;
}
.queue-section .empty-icon { font-size: 18px; }


.link-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
}
</style>
