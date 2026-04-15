<template>
  <div class="status-bar" :class="barClass">
    <div class="status-left">
      <span class="status-dot" />
      <span>{{ statusText }}</span>
    </div>
    <div v-if="pendingCount > 0" class="status-right">
      <span class="pending-count">{{ pendingCount }}</span>
      <span>en attente</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useQueueStore } from '@/stores/queueStore'

const uiStore = useUiStore()
const queueStore = useQueueStore()

const pendingCount = computed(() => queueStore.pendingCount)

const barClass = computed(() => {
  if (!uiStore.isOnline) return 'bar-offline'
  if (!uiStore.backendOk) return 'bar-backend'
  return 'bar-online'
})

const statusText = computed(() => {
  if (!uiStore.isOnline) return 'Hors ligne'
  if (!uiStore.backendOk) return 'NAS inaccessible'
  return 'En ligne'
})
</script>

<style scoped>
.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.bar-online {
  background: rgba(76, 175, 80, 0.12);
  color: var(--color-success);
}

.bar-offline {
  background: rgba(224, 82, 82, 0.18);
  color: var(--color-danger);
}

.bar-backend {
  background: rgba(245, 166, 35, 0.15);
  color: var(--color-warning);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.pending-count {
  background: currentColor;
  color: var(--color-bg);
  border-radius: 10px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
}
</style>
