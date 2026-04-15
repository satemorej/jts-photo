<template>
  <Teleport to="body">
    <div v-if="photo" class="viewer-overlay" @click.self="emit('close')">
      <div class="viewer-header">
        <button class="btn btn-icon" @click="emit('close')">✕</button>
        <span class="viewer-count">{{ photoIndex + 1 }} / {{ total }}</span>
        <button class="btn btn-icon" @click="emit('delete', photo.id)">🗑</button>
      </div>

      <!-- Image -->
      <div class="viewer-img-wrap" ref="imgWrap">
        <img
          class="viewer-img"
          :src="imgUrl"
          alt="Photo"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        />
      </div>

      <!-- Navigate -->
      <button
        v-if="photoIndex > 0"
        class="viewer-nav viewer-nav-prev"
        @click="emit('prev')"
      >‹</button>
      <button
        v-if="photoIndex < total - 1"
        class="viewer-nav viewer-nav-next"
        @click="emit('next')"
      >›</button>

      <!-- Notes -->
      <div class="viewer-notes">
        <div v-if="photo.notes.length === 0" class="no-notes">Aucune note</div>
        <div v-for="note in photo.notes" :key="note.id" class="note-chip">
          <span class="note-text">{{ note.text }}</span>
          <button class="note-del" @click="emit('deleteNote', photo.id, note.id)">✕</button>
        </div>

        <button class="btn btn-secondary" style="margin-top:8px" @click="emit('addNote', photo.id)">
          + Note
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Photo } from '@/services/db'

const props = defineProps<{
  photo: Photo | null
  photoIndex: number
  total: number
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
  addNote: [photoId: string]
  deleteNote: [photoId: string, noteId: string]
  delete: [photoId: string]
}>()

const imgUrl = computed(() => props.photo?.dataUrl ?? '')

// Swipe detection
let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) > 60) {
    if (dx < 0) emit('next')
    else emit('prev')
  }
}
</script>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  flex-shrink: 0;
}

.viewer-count {
  font-size: 14px;
  color: var(--color-text-dim);
}

.viewer-img-wrap {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  touch-action: pan-y;
}

.viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  font-size: 36px;
  line-height: 1;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 8px;
  touch-action: manipulation;
}
.viewer-nav-prev { left: 8px; }
.viewer-nav-next { right: 8px; }

.viewer-notes {
  flex-shrink: 0;
  padding: 10px 12px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-height: 160px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.no-notes {
  font-size: 13px;
  color: var(--color-text-dim);
}

.note-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 13px;
}

.note-text {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-del {
  background: none;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  line-height: 1;
}
</style>
