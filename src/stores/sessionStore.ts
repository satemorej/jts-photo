import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  saveSession,
  getSession,
  getAllSessions,
  deleteSession,
  generateId,
  generateThumbnail
} from '@/services/db'
import type { Session, Photo, PhotoNote } from '@/services/db'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const currentSession = ref<Session | null>(null)
  const loading = ref(false)

  const activeSessions = computed(() =>
    sessions.value.filter(s => s.status !== 'done')
  )

  const currentPhotos = computed(() => currentSession.value?.photos ?? [])

  async function loadSessions() {
    loading.value = true
    try {
      sessions.value = await getAllSessions()
      sessions.value.sort((a, b) => b.createdAt - a.createdAt)
    } finally {
      loading.value = false
    }
  }

  async function createSession(chantierName: string): Promise<Session> {
    const now = Date.now()
    const session: Session = {
      id: generateId(),
      date: new Date().toISOString(),
      chantierName: chantierName.trim(),
      photos: [],
      status: 'active',
      createdAt: now
    }
    await saveSession(session)
    sessions.value.unshift(session)
    currentSession.value = session
    return session
  }

  async function loadSession(id: string) {
    const s = await getSession(id)
    if (s) {
      currentSession.value = s
      // Update in list
      const idx = sessions.value.findIndex(x => x.id === id)
      if (idx >= 0) sessions.value[idx] = s
      else sessions.value.unshift(s)
    }
    return s
  }

  async function addPhoto(dataUrl: string, mediaType: 'photo' | 'video' = 'photo'): Promise<Photo> {
    if (!currentSession.value) throw new Error('Pas de session active')

    const [thumbnail, coords] = await Promise.all([
      mediaType === 'photo' ? generateThumbnail(dataUrl) : Promise.resolve(''),
      captureCoords()
    ])

    const photo: Photo = {
      id: generateId(),
      dataUrl,
      thumbnail,
      notes: [],
      createdAt: Date.now(),
      uploaded: false,
      mediaType,
      ...(coords ? { coords } : {})
    }

    currentSession.value.photos.push(photo)
    updateSessionLocation(currentSession.value)
    await saveSession(currentSession.value)
    return photo
  }

  function captureCoords(): Promise<{ lat: number; lng: number } | null> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()  => resolve(null),
        { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
      )
    })
  }

  function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  function updateSessionLocation(session: Session): void {
    if (session.location?.address) return  // déjà résolu, on ne recalcule pas
    const withCoords = session.photos
      .filter(p => p.coords)
      .slice(0, 3)
    if (withCoords.length === 0) return
    const lat = median(withCoords.map(p => p.coords!.lat))
    const lng = median(withCoords.map(p => p.coords!.lng))
    session.location = { ...session.location, lat, lng }
  }

  async function addNoteToPhoto(photoId: string, text: string): Promise<void> {
    if (!currentSession.value) return

    const photo = currentSession.value.photos.find(p => p.id === photoId)
    if (!photo) return

    const note: PhotoNote = {
      id: generateId(),
      text: text.trim(),
      createdAt: Date.now()
    }
    photo.notes.push(note)
    await saveSession(currentSession.value)
  }

  async function updateNoteInPhoto(photoId: string, noteId: string, text: string): Promise<void> {
    if (!currentSession.value) return
    const photo = currentSession.value.photos.find(p => p.id === photoId)
    if (!photo) return
    const note = photo.notes.find(n => n.id === noteId)
    if (note) {
      note.text = text.trim()
      await saveSession(currentSession.value)
    }
  }

  async function deleteNoteFromPhoto(photoId: string, noteId: string): Promise<void> {
    if (!currentSession.value) return
    const photo = currentSession.value.photos.find(p => p.id === photoId)
    if (!photo) return
    photo.notes = photo.notes.filter(n => n.id !== noteId)
    await saveSession(currentSession.value)
  }

  async function deletePhoto(photoId: string): Promise<void> {
    if (!currentSession.value) return
    currentSession.value.photos = currentSession.value.photos.filter(p => p.id !== photoId)
    await saveSession(currentSession.value)
  }

  async function markPhotoUploaded(photoId: string): Promise<void> {
    if (!currentSession.value) return
    const photo = currentSession.value.photos.find(p => p.id === photoId)
    if (photo) {
      photo.uploaded = true
      await saveSession(currentSession.value)
    }
  }

  async function markPhotoFailed(photoId: string): Promise<void> {
    if (!currentSession.value) return
    const photo = currentSession.value.photos.find(p => p.id === photoId)
    if (photo) {
      photo.uploadFailed = true
      await saveSession(currentSession.value)
    }
  }

  async function setSessionStatus(status: Session['status']): Promise<void> {
    if (!currentSession.value) return
    currentSession.value.status = status
    await saveSession(currentSession.value)
    const idx = sessions.value.findIndex(s => s.id === currentSession.value!.id)
    if (idx >= 0) sessions.value[idx] = { ...currentSession.value }
  }

  async function removeSession(id: string): Promise<void> {
    await deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSession.value?.id === id) currentSession.value = null
  }

  return {
    sessions,
    currentSession,
    loading,
    activeSessions,
    currentPhotos,
    loadSessions,
    createSession,
    loadSession,
    addPhoto,
    addNoteToPhoto,
    updateNoteInPhoto,
    deleteNoteFromPhoto,
    deletePhoto,
    markPhotoUploaded,
    markPhotoFailed,
    setSessionStatus,
    removeSession
  }
})
