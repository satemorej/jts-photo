import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getQueue, enqueue, dequeue, updateQueueItem, generateId } from '@/services/db'
import { uploadPhoto, uploadNote } from '@/services/api'
import type { QueueItem } from '@/services/db'

const MAX_RETRY = 5

export const useQueueStore = defineStore('queue', () => {
  const items = ref<QueueItem[]>([])
  const isRetrying = ref(false)

  const pendingCount = computed(() => items.value.length)
  const hasItems = computed(() => items.value.length > 0)

  async function loadQueue() {
    items.value = await getQueue()
  }

  async function addPhotoToQueue(
    sessionId: string,
    chantierName: string,
    photoId: string,
    dataUrl: string
  ): Promise<void> {
    const item: QueueItem = {
      id: generateId(),
      sessionId,
      chantierName,
      photoId,
      dataUrl,
      type: 'photo',
      retryCount: 0,
      lastAttempt: 0,
      createdAt: Date.now()
    }
    await enqueue(item)
    items.value.push(item)
  }

  async function addNoteToQueue(
    sessionId: string,
    chantierName: string,
    photoId: string,
    noteText: string,
    baseName: string
  ): Promise<void> {
    const item: QueueItem = {
      id: generateId(),
      sessionId,
      chantierName,
      photoId,
      dataUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(noteText)}`,
      type: 'note',
      noteText,
      baseName,
      retryCount: 0,
      lastAttempt: 0,
      createdAt: Date.now()
    }
    await enqueue(item)
    items.value.push(item)
  }

  async function retryAll(): Promise<{ success: number; failed: number }> {
    if (isRetrying.value) return { success: 0, failed: 0 }
    isRetrying.value = true

    let success = 0
    let failed = 0

    const batch = [...items.value]
    for (const item of batch) {
      if (item.retryCount >= MAX_RETRY) {
        failed++
        continue
      }

      try {
        const meta = {
          sessionId: item.sessionId,
          chantierName: item.chantierName,
          timestamp: item.createdAt,
          photoId: item.photoId
        }

        const blob = await fetch(item.dataUrl).then(r => r.blob())
        const result = item.type === 'photo'
          ? await uploadPhoto(blob, meta)
          : await uploadNote(item.noteText ?? '', item.baseName ?? '', meta)

        if (result.success) {
          await dequeue(item.id)
          items.value = items.value.filter(i => i.id !== item.id)
          success++
        } else {
          item.retryCount++
          item.lastAttempt = Date.now()
          await updateQueueItem(item)
          const idx = items.value.findIndex(i => i.id === item.id)
          if (idx >= 0) items.value[idx] = { ...item }
          failed++
        }
      } catch {
        item.retryCount++
        item.lastAttempt = Date.now()
        await updateQueueItem(item)
        failed++
      }
    }

    isRetrying.value = false
    return { success, failed }
  }

  async function removeItem(id: string): Promise<void> {
    await dequeue(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  return {
    items,
    isRetrying,
    pendingCount,
    hasItems,
    loadQueue,
    addPhotoToQueue,
    addNoteToQueue,
    retryAll,
    removeItem
  }
})
