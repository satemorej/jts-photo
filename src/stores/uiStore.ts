import { defineStore } from 'pinia'
import { ref } from 'vue'
import { checkHealth } from '@/services/api'

export const useUiStore = defineStore('ui', () => {
  const isOnline = ref(navigator.onLine)
  const backendOk = ref(false)
  const toastMessage = ref<string | null>(null)
  const toastType = ref<'info' | 'success' | 'error'>('info')
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) {
    if (toastTimer) clearTimeout(toastTimer)
    toastMessage.value = msg
    toastType.value = type
    toastTimer = setTimeout(() => { toastMessage.value = null }, duration)
  }

  async function pingBackend() {
    backendOk.value = await checkHealth()
  }

  function initNetworkListeners() {
    window.addEventListener('online', () => {
      isOnline.value = true
      pingBackend()
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
      backendOk.value = false
    })
    // Initial check
    pingBackend()
    // Poll every 30s
    setInterval(pingBackend, 30_000)
  }

  return {
    isOnline,
    backendOk,
    toastMessage,
    toastType,
    showToast,
    pingBackend,
    initNetworkListeners
  }
})
