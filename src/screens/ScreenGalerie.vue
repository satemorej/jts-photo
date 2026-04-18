<template>
  <div class="screen">
    <nav class="screen-nav nav-galerie">
      <h2>
        {{ session?.chantierName ?? '…' }}
        <span v-if="session" class="nav-counter">({{ uploadedCount }}T / {{ session.photos.length }}P<template v-if="queueStore.pendingCount"> / {{ queueStore.pendingCount }}F</template>)</span>
      </h2>
      <button class="nav-home-btn" @click="router.push('/')" title="Accueil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>
    </nav>

    <main class="screen-body">
      <div v-if="!session" class="loading-state">Chargement…</div>

      <template v-else>
        <div v-if="session.photos.length === 0" class="empty-state">
          <div class="empty-icon">📷</div>
          <p>Aucune photo</p>
          <p class="empty-sub">Appuyez sur Photo pour commencer</p>
        </div>

        <div v-else class="photo-grid">
          <div
            v-for="photo in session.photos"
            :key="photo.id"
            class="thumb-wrap"
            :class="{ 'is-selected': selectedIds.has(photo.id), 'is-uploaded': photo.uploaded, 'is-queued': queuedPhotoIds.has(photo.id), 'is-failed': photo.uploadFailed && !photo.uploaded && !queuedPhotoIds.has(photo.id) }"
            @click="openViewer(photo.id)"
          >
            <img v-if="photo.mediaType !== 'video'" :src="photo.thumbnail" class="thumb-img" :alt="'Photo'" />
            <div v-else class="thumb-video-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
            </div>

            <!-- Badge vidéo -->
            <div v-if="photo.mediaType === 'video'" class="video-badge">🎥</div>

            <!-- Badge note -->
            <div v-if="photo.notes.length > 0" class="note-badge">
              🗒 {{ photo.notes.length }}
            </div>

            <!-- Badge transférée -->
            <div v-if="photo.uploaded" class="uploaded-badge">✓</div>

            <!-- Badge file d'attente -->
            <div v-else-if="queuedPhotoIds.has(photo.id)" class="queued-badge">⏳</div>

            <!-- Checkbox sélection (photos non transférées et non en file uniquement) -->
            <div v-if="!photo.uploaded && !queuedPhotoIds.has(photo.id)" class="sel-check" :class="{ checked: selectedIds.has(photo.id), failed: photo.uploadFailed }" @click.stop="toggleSelect(photo.id)">
              <span v-if="selectedIds.has(photo.id)">✓</span>
            </div>
          </div>
        </div>

        <!-- Progression transfert -->
        <div v-if="transferring" class="transfer-progress">
          <div class="spinner-sm" />
          <span>{{ transferDone }} / {{ transferTotal }} envoyé(s)…</span>
        </div>
      </template>
    </main>

    <!-- Barre flottante contextuelle (sélection active) -->
    <Transition name="float-bar">
      <div v-if="selectedIds.size > 0" class="float-bar">
        <!-- Sélectionner tout / aucun -->
        <button class="fbar-btn" @click="toggleSelectAll" title="Tout sélectionner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <polyline v-if="allSelected" points="9 12 11 14 15 10"/>
          </svg>
        </button>
        <!-- Note (1 photo sélectionnée) -->
        <button
          class="fbar-btn"
          :disabled="selectedIds.size !== 1 || transferring"
          @click="openViewer([...selectedIds][0])"
          title="Ajouter note"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
        <!-- Transférer -->
        <button
          class="fbar-btn fbar-btn-accent"
          :disabled="!selectedPending.length || transferring"
          @click="transferSelected"
          title="Transférer"
        >
          <span class="icon-badge-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            <span v-if="transferring" class="icon-badge badge-spin">…</span>
            <span v-else-if="selectedPending.length" class="icon-badge">{{ selectedPending.length }}</span>
          </span>
        </button>
        <!-- Supprimer -->
        <button
          class="fbar-btn fbar-btn-danger"
          :disabled="!selectedIds.size || transferring"
          @click="showDeleteConfirm = true"
          title="Supprimer"
        >
          <span class="icon-badge-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            <span v-if="selectedIds.size" class="icon-badge">{{ selectedIds.size }}</span>
          </span>
        </button>
      </div>
    </Transition>

    <!-- Footer fixe : capture + clore -->
    <footer class="screen-footer footer-galerie">
      <!-- Clore -->
      <button class="footer-btn footer-btn-clore" :disabled="closing" @click="confirmClore" title="Clore le chantier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
          <line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
        <span>{{ closing ? '…' : 'Clore' }}</span>
      </button>
      <!-- Capture vidéo -->
      <button class="footer-btn footer-btn-video" @click="triggerVideo" :disabled="!session" title="Vidéo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2"/>
        </svg>
      </button>
      <!-- Capture photo (bouton principal, centre) -->
      <button class="footer-btn footer-btn-photo" @click="triggerPhoto" :disabled="!session" title="Photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    </footer>

    <!-- Inputs caméra cachés -->
    <input
      ref="photoInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display:none"
      @change="onFileSelected('photo', $event)"
    />
    <input
      ref="videoInput"
      type="file"
      accept="video/*"
      capture="environment"
      style="display:none"
      @change="onFileSelected('video', $event)"
    />

    <!-- Overlay review post-capture -->
    <Transition name="sheet">
      <div v-if="showReview" class="review-backdrop">
        <div class="review-sheet">
          <div class="review-preview">
            <img v-if="!reviewIsVideo" :src="reviewPhotoUrl" class="review-img" alt="Nouvelle capture" />
            <div v-else class="review-video-placeholder">🎥</div>
            <div class="review-label">{{ reviewIsVideo ? 'Vidéo ajoutée' : 'Photo ajoutée' }}</div>
          </div>

          <div class="note-area">
            <p class="note-prompt">Ajouter une note ?</p>
            <div class="note-input-row">
              <textarea
                ref="noteTextarea"
                v-model="noteText"
                class="note-textarea"
                placeholder="Tapez une note…"
                rows="3"
              />
              <button
                class="btn btn-icon mic-btn"
                :class="{ 'mic-active': listening }"
                @click="toggleReviewDictation"
                title="Dictée vocale"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            </div>
            <p v-if="listening" class="dictation-status">Dictée en cours… parlez</p>
          </div>

          <div class="review-actions">
            <button class="btn btn-secondary" style="flex:1" @click="skipNote">Ignorer</button>
            <button class="btn btn-primary" style="flex:2" @click="saveNote">
              {{ noteText.trim() ? 'Valider la note' : 'Continuer' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Viewer photo : plein format + notes + ajout/édition -->
    <Transition name="sheet">
      <div v-if="showViewer" class="viewer-backdrop">
        <div class="viewer-sheet">
          <!-- En-tête -->
          <div class="viewer-header">
            <button class="viewer-close" @click="closeViewer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <span class="viewer-title">Photo</span>
            <button class="viewer-fullscreen-btn" @click="showFullscreen = true" title="Plein écran">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>

          <!-- Photo + boutons action à droite -->
          <div class="viewer-photo-row">
            <div class="viewer-photo-wrap" @click="showFullscreen = true">
              <img v-if="viewerPhoto" :src="viewerPhoto.dataUrl" class="viewer-img" alt="Photo" />
            </div>
            <div v-if="!viewerPhoto?.uploaded && !queuedPhotoIds.has(viewerPhoto?.id ?? '')" class="viewer-photo-actions">
              <button
                class="btn btn-primary viewer-action-btn"
                :disabled="!viewerNewNote.trim()"
                @click="saveViewerNote"
              >Ajouter</button>
              <button
                class="btn btn-icon mic-btn"
                :class="{ 'mic-active': listening }"
                @click="toggleViewerDictation"
                title="Dictée vocale"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Textarea pleine largeur + statut dictée (photos non transférées et non en file uniquement) -->
          <div v-if="!viewerPhoto?.uploaded && !queuedPhotoIds.has(viewerPhoto?.id ?? '')" class="viewer-add-note">
            <textarea
              v-model="viewerNewNote"
              class="note-textarea"
              placeholder="Nouvelle note…"
              rows="2"
            />
            <p v-if="listening" class="dictation-status">Dictée en cours… parlez</p>
          </div>

          <!-- Notes existantes (plus récente en haut, plus ancienne en bas) -->
          <div v-if="viewerPhoto?.notes.length" class="viewer-notes-section">
            <p class="viewer-section-label">
              {{ viewerPhoto.notes.length }} note{{ viewerPhoto.notes.length > 1 ? 's' : '' }}
            </p>
            <div
              v-for="note in [...(viewerPhoto?.notes ?? [])].reverse()"
              :key="note.id"
              class="viewer-note-item"
              @touchstart="onNoteSwipeStart"
              @touchend="onNoteSwipeEnd(note.id, $event)"
            >
              <template v-if="editingNoteId === note.id">
                <div class="note-edit-block">
                  <textarea
                    v-model="editingNoteText"
                    class="note-textarea"
                    rows="3"
                    @keydown.escape="cancelEditNote"
                  />
                  <div class="viewer-note-edit-actions">
                    <button class="btn btn-secondary" style="flex:1" @click="cancelEditNote">Annuler</button>
                    <button class="btn btn-primary" style="flex:2" :disabled="!editingNoteText.trim()" @click="saveEditNote(note.id)">OK</button>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="note-slide-inner" :class="{ 'is-open': swipedNoteId === note.id }">
                  <div class="note-card-body" @click="swipedNoteId === note.id ? closeSwiped() : undefined">
                    <p class="viewer-note-text">{{ note.text }}</p>
                  </div>
                  <div class="note-swipe-actions">
                    <button class="note-swipe-btn note-swipe-edit" @click.stop="startEditNote(note)" title="Modifier">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="note-swipe-btn note-swipe-delete" @click.stop="deleteNote(note.id)" title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Plein écran -->
    <Transition name="fade">
      <div v-if="showFullscreen" class="fullscreen-overlay" @click="showFullscreen = false">
        <img v-if="viewerPhoto" :src="viewerPhoto.dataUrl" class="fullscreen-img" alt="Photo plein écran" />
        <button class="fullscreen-close" @click.stop="showFullscreen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Modal CLORE -->
    <Transition name="modal">
      <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false">
        <div class="modal-box">
          <p class="modal-title">Clore le chantier ?</p>
          <p class="modal-sub">
            Les photos, notes et rapport seront envoyés, puis le chantier sera supprimé.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" style="flex:1" @click="showConfirm = false">Annuler</button>
            <button class="btn btn-danger" style="flex:1" @click="clore">Confirmer</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal SUPPRIMER -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
        <div class="modal-box">
          <p class="modal-title">Supprimer {{ selectedIds.size }} photo{{ selectedIds.size !== 1 ? 's' : '' }} ?</p>
          <p class="modal-sub">
            Les notes associées seront aussi supprimées. Cette action est irréversible.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" style="flex:1" @click="showDeleteConfirm = false">Annuler</button>
            <button class="btn btn-danger" style="flex:1" @click="deleteSelected">Supprimer</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import { uploadPhoto, uploadVideo, uploadThumbnail, uploadNote, uploadReport, formatNotes } from '@/services/api'
import { useQueueStore, recordTransfer } from '@/stores/queueStore'
import { generateSessionReportBlob } from '@/services/pdfReport'
import type { PhotoNote } from '@/services/db'

const props = defineProps<{ id: string }>()
const route  = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const queueStore   = useQueueStore()
const uiStore = useUiStore()

const sessionId = computed(() => props.id ?? (route.params.id as string))
const session   = computed(() => sessionStore.currentSession)

// ── Sélection ────────────────────────────────────────────────
const selectedIds       = ref(new Set<string>())
const showDeleteConfirm = ref(false)

const uploadedCount = computed(() =>
  session.value?.photos.filter(p => p.uploaded).length ?? 0
)
const selectedPending = computed(() =>
  session.value?.photos.filter(p => selectedIds.value.has(p.id) && !p.uploaded) ?? []
)
const allSelected = computed(() =>
  !!session.value?.photos.length &&
  session.value.photos.every(p => selectedIds.value.has(p.id))
)

// ── Clore ────────────────────────────────────────────────────
const closing     = ref(false)
const showConfirm = ref(false)

// ── Transfert ────────────────────────────────────────────────
const transferring = ref(false)
const transferDone  = ref(0)
const transferTotal = ref(0)

// ── Capture ──────────────────────────────────────────────────
const photoInput = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)

// ── Review post-capture ───────────────────────────────────────
const showReview     = ref(false)
const reviewPhotoId  = ref<string | null>(null)
const reviewPhotoUrl = ref<string | undefined>(undefined)
const reviewIsVideo  = ref(false)
const noteText       = ref('')
const noteTextarea   = ref<HTMLTextAreaElement | null>(null)

// ── Viewer photo ──────────────────────────────────────────────
const showViewer        = ref(false)
const showFullscreen    = ref(false)
const viewerPhotoId     = ref<string | null>(null)
const viewerNewNote     = ref('')
const editingNoteId     = ref<string | null>(null)
const editingNoteText   = ref('')

const viewerPhoto = computed(() =>
  viewerPhotoId.value ? session.value?.photos.find(p => p.id === viewerPhotoId.value) ?? null : null
)

// IDs des photos dont l'upload est en attente dans la queue
const queuedPhotoIds = computed(() =>
  new Set(
    queueStore.items
      .filter(i => i.type === 'photo' && i.photoId)
      .map(i => i.photoId as string)
  )
)

// ── Swipe notes ───────────────────────────────────────────────
const swipedNoteId = ref<string | null>(null)
let swipeStartX = 0
let swipeStartY = 0

function onNoteSwipeStart(e: TouchEvent) {
  swipeStartX = e.touches[0].clientX
  swipeStartY = e.touches[0].clientY
}

function onNoteSwipeEnd(noteId: string, e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - swipeStartX
  const dy = e.changedTouches[0].clientY - swipeStartY
  if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) {
    swipedNoteId.value = noteId
  } else if (swipedNoteId.value === noteId) {
    swipedNoteId.value = null
  }
}

function closeSwiped() {
  swipedNoteId.value = null
}

// ── Dictée (partagée) ────────────────────────────────────────
const listening = ref(false)
let   recognition: any = null

onMounted(async () => {
  await sessionStore.loadSession(sessionId.value)
})

// ── Capture ──────────────────────────────────────────────────
function triggerPhoto() { photoInput.value?.click() }
function triggerVideo() { videoInput.value?.click() }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(type: 'photo' | 'video', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''

  try {
    const dataUrl = await fileToDataUrl(file)
    const photo   = await sessionStore.addPhoto(dataUrl, type)
    reviewPhotoId.value  = photo.id
    reviewPhotoUrl.value = type === 'photo' ? photo.thumbnail : undefined
    reviewIsVideo.value  = type === 'video'
    noteText.value = ''
    showReview.value = true
    await nextTick()
    noteTextarea.value?.focus()
  } catch (err: any) {
    uiStore.showToast(err?.message ?? 'Erreur lors de la capture', 'error')
  }
}

// ── Review ───────────────────────────────────────────────────
async function saveNote() {
  const photoId = reviewPhotoId.value
  const text    = noteText.value.trim()
  closeReview()
  triggerPhoto()   // synchrone dans le geste utilisateur (iOS)
  if (photoId && text) {
    await sessionStore.addNoteToPhoto(photoId, text)
    uiStore.showToast('Note enregistrée', 'success')
  }
}

function skipNote() {
  closeReview()
  triggerPhoto()   // synchrone dans le geste utilisateur (iOS)
}

function closeReview() {
  stopDictation()
  showReview.value     = false
  reviewPhotoId.value  = null
  reviewPhotoUrl.value = undefined
  reviewIsVideo.value  = false
  noteText.value = ''
}

// ── Dictée ───────────────────────────────────────────────────
function toggleDictation(target: Ref<string>) {
  listening.value ? stopDictation() : startDictation(target)
}
// Wrappers appelés depuis le template (les refs sont auto-unwrappées en template)
function toggleReviewDictation() { toggleDictation(noteText) }
function toggleViewerDictation() { toggleDictation(viewerNewNote) }

function startDictation(target: Ref<string>) {
  const w = window as any
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition

  if (!SR) {
    const isHttps = location.protocol === 'https:'
    uiStore.showToast(
      isHttps
        ? 'Dictée non supportée sur ce navigateur'
        : 'Dictée indisponible — connexion HTTPS requise',
      'error',
      5000
    )
    return
  }

  try {
    // Texte présent avant le début de la dictée — ne sera jamais écrasé
    const baseText = target.value

    recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e: any) => {
      // Reconstruire depuis tous les résultats disponibles
      let finals  = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finals  += e.results[i][0].transcript
        else                      interim += e.results[i][0].transcript
      }
      const spoken = (finals + interim).trim()
      target.value = baseText
        ? spoken ? baseText + ' ' + spoken : baseText
        : spoken
    }
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') uiStore.showToast('Permission micro refusée', 'error')
      else if (e.error === 'network') uiStore.showToast('Réseau requis pour la dictée', 'error')
      else if (e.error !== 'no-speech' && e.error !== 'audio-capture') {
        uiStore.showToast(`Erreur dictée : ${e.error}`, 'error')
      }
      listening.value = false
    }
    recognition.onend = () => { listening.value = false }
    recognition.start()
    listening.value = true
  } catch (err: any) {
    uiStore.showToast(`Erreur démarrage : ${err?.message ?? err}`, 'error')
  }
}

function stopDictation() {
  recognition?.stop()
  recognition = null
  listening.value = false
}

// ── Viewer ────────────────────────────────────────────────────
async function openViewer(photoId: string) {
  // Retirer le focus de tout élément actif pour éviter l'apparition du clavier iOS
  ;(document.activeElement as HTMLElement | null)?.blur()
  viewerPhotoId.value   = photoId
  viewerNewNote.value   = ''
  editingNoteId.value   = null
  editingNoteText.value = ''
  showViewer.value = true
}

function closeViewer() {
  stopDictation()
  swipedNoteId.value   = null
  showViewer.value    = false
  showFullscreen.value = false
  viewerPhotoId.value  = null
  viewerNewNote.value  = ''
  editingNoteId.value  = null
}

async function saveViewerNote() {
  if (!viewerPhotoId.value || !viewerNewNote.value.trim()) return
  await sessionStore.addNoteToPhoto(viewerPhotoId.value, viewerNewNote.value)
  uiStore.showToast('Note ajoutée', 'success')
  viewerNewNote.value = ''
}

function startEditNote(note: PhotoNote) {
  swipedNoteId.value    = null
  editingNoteId.value   = note.id
  editingNoteText.value = note.text
}

async function saveEditNote(noteId: string) {
  if (!viewerPhotoId.value || !editingNoteText.value.trim()) return
  await sessionStore.updateNoteInPhoto(viewerPhotoId.value, noteId, editingNoteText.value)
  uiStore.showToast('Note modifiée', 'success')
  editingNoteId.value   = null
  editingNoteText.value = ''
}

function cancelEditNote() {
  editingNoteId.value   = null
  editingNoteText.value = ''
}

async function deleteNote(noteId: string) {
  if (!viewerPhotoId.value) return
  await sessionStore.deleteNoteFromPhoto(viewerPhotoId.value, noteId)
  uiStore.showToast('Note supprimée', 'success')
}

// ── Sélection ─────────────────────────────────────────────────
function toggleSelect(photoId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(photoId)) next.delete(photoId)
  else next.add(photoId)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(session.value?.photos.map(p => p.id) ?? [])
  }
}

// ── Labels médias (basé sur l'ordre dans la session) ─────────
function buildMediaLabels(): Map<string, string> {
  const labels = new Map<string, string>()
  let photoIdx = 0, videoIdx = 0
  for (const p of session.value?.photos ?? []) {
    if (p.mediaType === 'video') labels.set(p.id, `video_${++videoIdx}`)
    else                         labels.set(p.id, `photo_${++photoIdx}`)
  }
  return labels
}

// ── Transfert ────────────────────────────────────────────────
async function transferSelected() {
  if (!session.value || transferring.value) return
  const photos = selectedPending.value
  if (!photos.length) return

  transferring.value = true
  transferDone.value  = 0
  transferTotal.value = photos.length

  const meta = {
    sessionId:    session.value.id,
    chantierName: session.value.chantierName,
    timestamp:    Date.now()
  }
  const labels = buildMediaLabels()

  let failed = 0
  for (const photo of photos) {
    const isVideo    = photo.mediaType === 'video'
    const mediaLabel = labels.get(photo.id)
    try {
      const blob = await fetch(photo.dataUrl).then(r => r.blob())
      const res  = isVideo
        ? await uploadVideo(blob, { ...meta, photoId: photo.id, mediaLabel })
        : await uploadPhoto(blob, { ...meta, photoId: photo.id, mediaLabel })
      if (res.success && res.baseName) {
        await sessionStore.markPhotoUploaded(photo.id)
        recordTransfer(isVideo ? 'video' : 'photo', session.value!.chantierName, res.baseName)
        if (!isVideo && photo.thumbnail) {
          const thumbBlob = await fetch(photo.thumbnail).then(r => r.blob())
          await uploadThumbnail(thumbBlob, res.baseName, { ...meta, photoId: photo.id })
        }
        if (photo.notes.length > 0) {
          const text = formatNotes(photo.notes.map(n => n.text))
          const nres = await uploadNote(text, res.baseName, { ...meta, photoId: photo.id })
          if (nres.success) recordTransfer('note', session.value!.chantierName, `${res.baseName}_notes`)
          else await queueStore.addNoteToQueue(session.value!.id, session.value!.chantierName, photo.id, text, res.baseName)
        }
      } else {
        await queueStore.addPhotoToQueue(session.value!.id, session.value!.chantierName, photo.id, photo.dataUrl, isVideo ? 'video' : 'photo', mediaLabel)
        await sessionStore.markPhotoFailed(photo.id)
        failed++
      }
    } catch {
      await queueStore.addPhotoToQueue(session.value!.id, session.value!.chantierName, photo.id, photo.dataUrl, isVideo ? 'video' : 'photo', mediaLabel)
      await sessionStore.markPhotoFailed(photo.id)
      failed++
    }
    transferDone.value++
  }

  transferring.value = false
  const done = photos.length - failed
  if (done > 0 && failed > 0)
    uiStore.showToast(`${done} transférée(s), ${failed} en file d'attente`, 'info')
  else if (done > 0)
    uiStore.showToast(`${done} photo${done !== 1 ? 's' : ''} transférée${done !== 1 ? 's' : ''}`, 'success')
  else
    uiStore.showToast(`Échec — ${failed} photo${failed !== 1 ? 's' : ''} en file d'attente`, 'error')
  selectedIds.value = new Set()
}

// ── Suppression ───────────────────────────────────────────────
async function deleteSelected() {
  showDeleteConfirm.value = false
  if (!session.value) return
  const ids = [...selectedIds.value]
  for (const id of ids) await sessionStore.deletePhoto(id)
  uiStore.showToast(`${ids.length} photo${ids.length !== 1 ? 's' : ''} supprimée${ids.length !== 1 ? 's' : ''}`, 'success')
  selectedIds.value = new Set()
}

// ── Clore ─────────────────────────────────────────────────────
function confirmClore() { showConfirm.value = true }

async function clore() {
  showConfirm.value = false
  closing.value = true
  try {
    if (!session.value) { router.push('/reseau'); return }

    const meta = {
      sessionId:    session.value.id,
      chantierName: session.value.chantierName,
      timestamp:    Date.now()
    }
    const labels = buildMediaLabels()

    // Upload toutes les photos/vidéos en attente
    for (const photo of session.value.photos.filter(p => !p.uploaded)) {
      const isVideo    = photo.mediaType === 'video'
      const mediaLabel = labels.get(photo.id)
      try {
        const blob = await fetch(photo.dataUrl).then(r => r.blob())
        const res  = isVideo
          ? await uploadVideo(blob, { ...meta, photoId: photo.id, mediaLabel })
          : await uploadPhoto(blob, { ...meta, photoId: photo.id, mediaLabel })
        if (res.success && res.baseName) {
          await sessionStore.markPhotoUploaded(photo.id)
          recordTransfer(isVideo ? 'video' : 'photo', session.value.chantierName, res.baseName)
          if (!isVideo && photo.thumbnail) {
            const thumbBlob = await fetch(photo.thumbnail).then(r => r.blob())
            await uploadThumbnail(thumbBlob, res.baseName, { ...meta, photoId: photo.id })
          }
          if (photo.notes.length > 0) {
            const text = formatNotes(photo.notes.map(n => n.text))
            const nres = await uploadNote(text, res.baseName, { ...meta, photoId: photo.id })
            if (nres.success) recordTransfer('note', session.value.chantierName, `${res.baseName}_notes`)
            else await queueStore.addNoteToQueue(session.value.id, session.value.chantierName, photo.id, text, res.baseName)
          }
        } else {
          await queueStore.addPhotoToQueue(session.value.id, session.value.chantierName, photo.id, photo.dataUrl, isVideo ? 'video' : 'photo', mediaLabel)
          await sessionStore.markPhotoFailed(photo.id)
        }
      } catch {
        await queueStore.addPhotoToQueue(session.value.id, session.value.chantierName, photo.id, photo.dataUrl, isVideo ? 'video' : 'photo', mediaLabel)
        await sessionStore.markPhotoFailed(photo.id)
      }
    }

    // Rapport PDF
    try {
      const pdfBlob = await generateSessionReportBlob(session.value)
      const rres    = await uploadReport(pdfBlob, meta)
      if (rres.success) recordTransfer('report', session.value.chantierName, `rapport_${session.value.chantierName}`)
    } catch { /* rapport non bloquant */ }

    // Supprimer la session si tout est transféré, sinon la marquer done
    if (session.value.photos.every(p => p.uploaded)) {
      await sessionStore.removeSession(session.value.id)
    } else {
      await sessionStore.setSessionStatus('done')
    }
  } finally {
    closing.value = false
  }
  router.push('/reseau')
}
</script>

<style scoped>
.nav-galerie {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-home-btn {
  background: none;
  border: none;
  padding: 6px;
  color: var(--color-text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
.nav-home-btn svg { width: 22px; height: 22px; }
.nav-home-btn:active { opacity: 0.45; transform: scale(0.9); }

.nav-counter {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-dim);
  margin-left: 6px;
}

/* États vides / chargement */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-dim);
  background: var(--color-bg);
}
.empty-icon { font-size: 48px; }
.empty-sub  { font-size: 13px; }

/* Grille */
/* Étendre la grille jusqu'aux bords */
:deep(.screen-body) {
  padding: 0;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  background: #000;
}

.thumb-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: #000;
}
.thumb-wrap.is-selected { outline: 2px solid var(--color-accent); outline-offset: -2px; }
.thumb-wrap.is-uploaded { opacity: 0.82; }
.thumb-wrap.is-queued   { opacity: 0.6; }
.thumb-wrap.is-failed   { opacity: 0.85; }

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-video-placeholder {
  width: 100%;
  height: 100%;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.5);
}
.thumb-video-placeholder svg { width: 36px; height: 36px; }

.video-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 14px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));
}

/* Badge note */
.note-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  line-height: 14px;
}

/* Badge file d'attente */
.queued-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(255,159,10,0.85);
  color: #000;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

/* Badge transférée */
.uploaded-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--color-success);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

/* Checkbox sélection — zone de tap 44×44, cercle visuel 22×22 */
.sel-check {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 5px 5px 0 0;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}
.sel-check::after {
  content: '';
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.85);
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sel-check.checked::after {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
.sel-check.failed::after {
  border-color: var(--color-warning);
}
.sel-check.failed.checked::after {
  background: var(--color-warning);
  border-color: var(--color-warning);
}
.sel-check span {
  position: absolute;
  top: 9px;
  right: 9px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  pointer-events: none;
}

/* Progression transfert */
.transfer-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  font-size: 13px;
  color: var(--color-text-dim);
}
.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer fixe (glassy, flottant sur la galerie) ─────────── */
.footer-galerie {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.07) !important;
  padding: 6px 32px calc(6px + var(--safe-bottom)) !important;
  justify-content: space-between;
  gap: 0;
}

/* Espace sous le scroll pour que les dernières photos restent accessibles */
:deep(.screen-body) {
  padding: 0 0 calc(56px + var(--safe-bottom));
}

.footer-btn {
  background: none;
  border: none;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  touch-action: manipulation;
  min-width: 56px;
  min-height: 44px;
  justify-content: center;
  transition: opacity 0.12s, transform 0.1s;
  -webkit-user-select: none;
  user-select: none;
}
.footer-btn svg { width: 22px; height: 22px; }
.footer-btn span { font-size: 10px; font-weight: 600; letter-spacing: 0.02em; }
.footer-btn:active { opacity: 0.45; transform: scale(0.9); }
.footer-btn:disabled { opacity: 0.22; pointer-events: none; }

.footer-btn-photo {
  color: #fff;
}
.footer-btn-photo svg { width: 28px; height: 28px; }

.footer-btn-video {
  color: rgba(255,255,255,0.45);
}

.footer-btn-clore {
  color: var(--color-danger);
  opacity: 0.8;
}

/* ── Barre flottante contextuelle ──────────────────────────── */
.float-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(56px + var(--safe-bottom));
  z-index: 51;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255,255,255,0.08);
}

.fbar-btn {
  background: none;
  border: none;
  flex: 1;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.65);
  cursor: pointer;
  touch-action: manipulation;
  border-radius: 8px;
  transition: opacity 0.12s, transform 0.1s;
  -webkit-user-select: none;
  user-select: none;
}
.fbar-btn svg { width: 20px; height: 20px; }
.fbar-btn:active { opacity: 0.45; transform: scale(0.9); }
.fbar-btn:disabled { opacity: 0.2; pointer-events: none; }
.fbar-btn-accent { color: var(--color-accent); }
.fbar-btn-danger  { color: var(--color-danger); }

.float-bar-enter-active,
.float-bar-leave-active { transition: transform 0.18s ease, opacity 0.18s ease; }
.float-bar-enter-from,
.float-bar-leave-to     { transform: translateY(10px); opacity: 0; }

/* Boutons icônes footer */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 52px;
  padding: 0;
}
.icon-btn svg {
  width: 24px;
  height: 24px;
}
.icon-btn-main {
  flex: 2;
}
.icon-btn-main svg {
  width: 28px;
  height: 28px;
}
.icon-btn-action {
  position: relative;
}

/* Badge sur icône */
.icon-badge-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-badge-wrap svg {
  width: 24px;
  height: 24px;
}
.icon-badge {
  position: absolute;
  top: -8px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #fff;
  color: #000;
  font-size: 10px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
}

/* Overlay review */
.review-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  align-items: flex-end;
  z-index: 400;
}

.review-sheet {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px calc(16px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 90vh;
  overflow-y: auto;
}

.review-preview {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  max-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.review-img {
  width: 100%;
  max-height: 40vh;
  object-fit: contain;
}
.review-video-placeholder {
  font-size: 64px;
  padding: 32px 0;
}
.review-label {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

/* ── Viewer ──────────────────────────────────────────────────── */
/* Viewer plein écran */
.viewer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
}

.viewer-sheet {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: calc(16px + var(--safe-bottom));
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + var(--safe-top)) 16px 8px;
  flex-shrink: 0;
  background: var(--color-bg);
}
.viewer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-dim);
}
.viewer-close,
.viewer-fullscreen-btn {
  background: none;
  border: none;
  padding: 6px;
  color: var(--color-text-dim);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-close svg,
.viewer-fullscreen-btn svg {
  width: 22px;
  height: 22px;
}
.viewer-close:active,
.viewer-fullscreen-btn:active { opacity: 0.5; }

/* Photo + boutons action côte à côte */
.viewer-photo-row {
  display: flex;
  align-items: stretch;
  width: 100%;
  flex-shrink: 0;
}
.viewer-photo-wrap {
  flex: 1;
  min-width: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 40vh;
  cursor: zoom-in;
  overflow: hidden;
}
.viewer-img {
  width: 100%;
  max-height: 40vh;
  object-fit: contain;
}
.viewer-photo-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  background: #111;
  flex-shrink: 0;
  width: 68px;
}
.viewer-action-btn {
  width: 56px;
  min-height: 44px;
  padding: 6px 4px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 10px;
  text-align: center;
  line-height: 1.2;
}

/* Textarea pleine largeur */
.viewer-add-note {
  padding: 10px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.viewer-notes-section {
  padding: 10px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.viewer-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

/* Cartouche note avec swipe */
.viewer-note-item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.note-slide-inner {
  display: flex;
  width: 100%;
  transition: transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  touch-action: pan-y;
}
.note-slide-inner.is-open {
  transform: translateX(-88px);
}

.note-card-body {
  flex: 0 0 100%;
  min-width: 0;
  padding: 8px 10px;
  background: var(--color-surface-2);
}

.viewer-note-text {
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  margin: 0;
}

.note-swipe-actions {
  flex: 0 0 88px;
  display: flex;
}
.note-swipe-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}
.note-swipe-edit  { background: var(--color-accent); color: #fff; }
.note-swipe-delete { background: var(--color-danger);  color: #fff; }
.note-swipe-btn:active { opacity: 0.75; }

.note-edit-block {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-surface-2);
}

.viewer-note-edit-actions {
  display: flex;
  gap: 8px;
}

/* ── Plein écran ─────────────────────────────────────────────── */
.fullscreen-overlay {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.fullscreen-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  touch-action: pinch-zoom;
}
.fullscreen-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top, 16px));
  right: 16px;
  background: rgba(0,0,0,0.6);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}
.fullscreen-close svg { width: 20px; height: 20px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

.note-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.note-prompt {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dim);
}
.note-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.note-textarea {
  flex: 1;
  min-height: 72px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--color-text);
  font-size: 16px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
}
.note-textarea:focus { border-color: var(--color-accent); }

.mic-btn {
  flex-shrink: 0;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-btn svg {
  width: 22px;
  height: 22px;
}
.mic-active {
  background: rgba(224,82,82,0.2);
  border-color: var(--color-danger);
}
.dictation-status {
  font-size: 12px;
  color: var(--color-danger);
  text-align: center;
}

.review-actions {
  display: flex;
  gap: 10px;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  z-index: 500;
}
.modal-box {
  width: 100%;
  background: var(--color-surface);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px calc(16px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-title {
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}
.modal-sub {
  font-size: 13px;
  color: var(--color-text-dim);
  text-align: center;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-from,  .sheet-leave-to      { opacity: 0; }
</style>
