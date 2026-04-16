<template>
  <Transition name="toast">
    <div v-if="uiStore.toastMessage" class="toast" :class="`toast-${uiStore.toastType}`">
      {{ uiStore.toastMessage }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useQueueStore } from '@/stores/queueStore'

const uiStore    = useUiStore()
const queueStore = useQueueStore()

onMounted(() => {
  uiStore.initNetworkListeners()
  queueStore.setupAutoRetry()
})
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: calc(var(--footer-height) + var(--safe-bottom) + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  max-width: 90vw;
  text-overflow: ellipsis;
  overflow: hidden;
}
.toast-info    { background: var(--color-surface-2); color: var(--color-text); border: 1px solid var(--color-border); }
.toast-success { background: var(--color-success); color: #fff; }
.toast-error   { background: var(--color-danger); color: #fff; }

.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
