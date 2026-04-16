import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getQueue, enqueue, dequeue, updateQueueItem, generateId } from '@/services/db'
import { uploadPhoto, uploadNote } from '@/services/api'
import type { QueueItem, HistoryEntry } from '@/services/db'

const MAX_RETRY = 5
const HISTORY_KEY = 'jts-transfer-history'
const MAX_HISTORY = 50

// ── Historique (localStorage) ─────────────────────────────────
function pushHistory(item: QueueItem) {
  recordTransfer(item.type, item.chantierName, item.baseName ?? item.photoId ?? item.id)
}

export function recordTransfer(
  type: HistoryEntry['type'],
  chantierName: string,
  filename: string
) {
  const list: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  list.unshift({ id: generateId(), type, chantierName, filename, transferredAt: Date.now() })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)))
}

export function getTransferHistory(): HistoryEntry[] {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
}

export function clearTransferHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ── Store ─────────────────────────────────────────────────────
export const useQueueStore = defineStore('queue', () => {
  const items        = ref<QueueItem[]>([])
  const isRetrying   = ref(false)
  const autoRetryEnabled = ref(localStorage.getItem('jts-auto-retry') === '1')

  const pendingCount  = computed(() => items.value.length)
  const hasItems      = computed(() => items.value.length > 0)
  const failedItems   = computed(() => items.value.filter(i => i.retryCount >= MAX_RETRY))
  const retryableItems = computed(() => items.value.filter(i => i.retryCount < MAX_RETRY))

  async function loadQueue() {
    items.value = await getQueue()
  }

  // ── Enqueue ──────────────────────────────────────────────────
  async function addPhotoToQueue(
    sessionId: string, chantierName: string, photoId: string, dataUrl: string
  ): Promise<void> {
    const item: QueueItem = {
      id: generateId(), sessionId, chantierName, photoId,
      dataUrl, type: 'photo', retryCount: 0, lastAttempt: 0, createdAt: Date.now()
    }
    await enqueue(item)
    items.value.push(item)
  }

  async function addNoteToQueue(
    sessionId: string, chantierName: string, photoId: string, noteText: string, baseName: string
  ): Promise<void> {
    const item: QueueItem = {
      id: generateId(), sessionId, chantierName, photoId,
      dataUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(noteText)}`,
      type: 'note', noteText, baseName, retryCount: 0, lastAttempt: 0, createdAt: Date.now()
    }
    await enqueue(item)
    items.value.push(item)
  }

  // ── Retry un seul item ────────────────────────────────────────
  async function retryItem(id: string): Promise<boolean> {
    const item = items.value.find(i => i.id === id)
    if (!item || item.retryCount >= MAX_RETRY) return false

    const meta = {
      sessionId: item.sessionId, chantierName: item.chantierName,
      timestamp: item.createdAt, photoId: item.photoId
    }
    try {
      const blob   = await fetch(item.dataUrl).then(r => r.blob())
      const result = item.type === 'photo'
        ? await uploadPhoto(blob, meta)
        : await uploadNote(item.noteText ?? '', item.baseName ?? '', meta)

      if (result.success) {
        pushHistory(item)
        await dequeue(item.id)
        items.value = items.value.filter(i => i.id !== id)
        return true
      }
      const updated = { ...item, retryCount: item.retryCount + 1, lastAttempt: Date.now(), lastError: result.error ?? 'Échec serveur' }
      await updateQueueItem(updated)
      items.value = items.value.map(i => i.id === id ? updated : i)
      return false
    } catch (e: any) {
      const updated = { ...item, retryCount: item.retryCount + 1, lastAttempt: Date.now(), lastError: e?.message ?? 'Erreur réseau' }
      await updateQueueItem(updated)
      items.value = items.value.map(i => i.id === id ? updated : i)
      return false
    }
  }

  // ── Retry tous ────────────────────────────────────────────────
  async function retryAll(): Promise<{ success: number; failed: number }> {
    if (isRetrying.value) return { success: 0, failed: 0 }
    isRetrying.value = true
    let success = 0, failed = 0

    for (const item of [...retryableItems.value]) {
      const ok = await retryItem(item.id)
      ok ? success++ : failed++
    }

    isRetrying.value = false
    return { success, failed }
  }

  // ── Suppression unitaire ──────────────────────────────────────
  async function removeItem(id: string): Promise<void> {
    await dequeue(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  // ── Auto-retry ────────────────────────────────────────────────
  function toggleAutoRetry(enabled: boolean) {
    autoRetryEnabled.value = enabled
    localStorage.setItem('jts-auto-retry', enabled ? '1' : '0')
  }

  function setupAutoRetry() {
    window.addEventListener('online', () => {
      if (autoRetryEnabled.value && hasItems.value && !isRetrying.value) {
        retryAll()
      }
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && autoRetryEnabled.value && hasItems.value && !isRetrying.value) {
        retryAll()
      }
    })
  }

  return {
    items, isRetrying, autoRetryEnabled,
    pendingCount, hasItems, failedItems, retryableItems,
    loadQueue,
    addPhotoToQueue, addNoteToQueue,
    retryItem, retryAll, removeItem,
    toggleAutoRetry, setupAutoRetry
  }
})
