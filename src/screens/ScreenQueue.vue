<template>
  <div class="screen">
    <header class="screen-header">
      <button class="btn btn-icon" @click="router.back()">‹</button>
      <h1>File d'attente</h1>
      <span v-if="queueStore.hasItems" class="badge badge-danger">
        {{ queueStore.pendingCount }}
      </span>
    </header>

    <main class="screen-body">
      <div v-if="!queueStore.hasItems" class="empty-state">
        <p class="empty-icon">✅</p>
        <p>File d'attente vide</p>
        <p class="empty-sub">Tous les fichiers ont été envoyés</p>
      </div>

      <div v-else class="queue-list">
        <div
          v-for="item in queueStore.items"
          :key="item.id"
          class="queue-item card"
        >
          <div class="item-icon">{{ item.type === 'photo' ? '📷' : '📝' }}</div>
          <div class="item-info">
            <p class="item-name">{{ item.chantierName }}</p>
            <p class="item-meta">
              {{ item.type === 'photo' ? 'Photo' : 'Note' }} ·
              Tentatives : {{ item.retryCount }}
              <span v-if="item.lastAttempt"> · {{ timeAgo(item.lastAttempt) }}</span>
            </p>
            <p v-if="item.retryCount >= 5" class="item-warn">Max tentatives atteint</p>
          </div>
          <button class="btn btn-icon item-del" @click="removeItem(item.id)">✕</button>
        </div>
      </div>
    </main>

    <footer class="screen-footer">
      <button
        class="btn btn-secondary"
        style="flex:1"
        :disabled="!queueStore.hasItems"
        @click="clearAll"
      >
        Vider
      </button>
      <button
        class="btn btn-primary"
        style="flex:2"
        :disabled="!queueStore.hasItems || queueStore.isRetrying || !uiStore.isOnline"
        @click="retry"
      >
        {{ queueStore.isRetrying ? 'En cours…' : '🔄 Réessayer tout' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueStore } from '@/stores/queueStore'
import { useUiStore } from '@/stores/uiStore'

const router = useRouter()
const queueStore = useQueueStore()
const uiStore = useUiStore()

onMounted(() => queueStore.loadQueue())

async function retry() {
  const result = await queueStore.retryAll()
  if (result.success > 0) {
    uiStore.showToast(`${result.success} envoyé(s)`, 'success')
  }
  if (result.failed > 0) {
    uiStore.showToast(`${result.failed} échec(s)`, 'error')
  }
}

async function removeItem(id: string) {
  await queueStore.removeItem(id)
}

async function clearAll() {
  for (const item of [...queueStore.items]) {
    await queueStore.removeItem(item.id)
  }
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  return `il y a ${h}h`
}
</script>

<style scoped>
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 60px 20px;
  text-align: center; color: var(--color-text-dim);
}
.empty-icon { font-size: 48px; }
.empty-sub { font-size: 13px; }

.queue-list { display: flex; flex-direction: column; gap: 10px; }

.queue-item {
  display: flex; align-items: center; gap: 10px;
}
.item-icon { font-size: 24px; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { font-size: 11px; color: var(--color-text-dim); margin-top: 2px; }
.item-warn { font-size: 11px; color: var(--color-danger); margin-top: 2px; }

.item-del {
  flex-shrink: 0;
  background: transparent;
  color: var(--color-text-dim);
  font-size: 14px;
}
</style>
