<template>
  <div class="app-header">
    <div class="app-logo" @click="router.push('/')">
      <span>JTS</span>
    </div>
    <div class="app-info">
      <span class="app-name">JTS Photo</span>
      <span class="app-meta">v{{ version }} · build {{ buildN }}</span>
    </div>
    <div class="app-status" :class="statusClass" @click="router.push('/reseau')">
      <span class="status-dot" />
      <div class="status-text-group">
        <span class="status-label">{{ statusText }}</span>
        <span v-if="pendingCount > 0" class="status-pending">{{ pendingCount }} att.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useQueueStore } from '@/stores/queueStore'

const router = useRouter()

const version    = __APP_VERSION__
const buildN     = __BUILD_N__
const uiStore    = useUiStore()
const queueStore = useQueueStore()

const pendingCount = computed(() => queueStore.pendingCount)

const statusClass = computed(() => {
  if (!uiStore.isOnline)  return 'status-err'
  if (!uiStore.backendOk) return 'status-warn'
  return 'status-ok'
})

const statusText = computed(() => {
  if (!uiStore.isOnline)  return 'Hors ligne'
  if (!uiStore.backendOk) return 'NAS indispo.'
  return 'En ligne'
})
</script>

<style scoped>
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  height: calc(54px + var(--safe-top));
  padding-top: var(--safe-top);
  padding-left: 16px;
  padding-right: 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-logo {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: linear-gradient(145deg, #1f8fff, #005ecb);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.35);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: opacity 0.12s ease, transform 0.1s ease;
}
.app-logo:active {
  opacity: 0.7;
  transform: scale(0.93);
}

.app-logo span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #fff;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.app-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.app-meta {
  font-size: 10px;
  color: var(--color-text-dim);
  letter-spacing: 0.02em;
}

/* Indicateur réseau — cliquable */
.app-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  transition: opacity 0.12s ease;
}
.app-status:active { opacity: 0.6; }

.status-ok   { background: rgba(48, 209, 88, 0.12);  color: var(--color-success); }
.status-warn { background: rgba(255, 214, 10, 0.14);  color: var(--color-warning); }
.status-err  { background: rgba(255, 69, 58, 0.14);   color: var(--color-danger); }

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.status-text-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.2;
}

.status-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.status-pending {
  font-size: 9px;
  font-weight: 600;
  opacity: 0.8;
  white-space: nowrap;
}
</style>
