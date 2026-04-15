<template>
  <div class="gallery-grid">
    <button
      v-for="photo in photos"
      :key="photo.id"
      class="gallery-thumb"
      @click="emit('select', photo.id)"
    >
      <img :src="photo.thumbnail" :alt="`Photo`" loading="lazy" />
      <div v-if="photo.notes.length" class="thumb-notes">
        <span class="badge">{{ photo.notes.length }}</span>
      </div>
      <div v-if="photo.uploaded" class="thumb-uploaded" title="Uploadée">✓</div>
    </button>

    <!-- Add photo button -->
    <button class="gallery-add" @click="emit('add')" aria-label="Prendre une photo">
      <span class="add-icon">📷</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '@/services/db'

defineProps<{ photos: Photo[] }>()
const emit = defineEmits<{
  select: [id: string]
  add: []
}>()
</script>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
}

.gallery-thumb {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--color-surface-2);
  border: none;
  cursor: pointer;
  padding: 0;
  touch-action: manipulation;
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-thumb:active {
  opacity: 0.75;
}

.thumb-notes {
  position: absolute;
  top: 4px;
  right: 4px;
}

.thumb-uploaded {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-success);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.gallery-add {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-2);
  border: 2px dashed var(--color-border);
  cursor: pointer;
  touch-action: manipulation;
}

.gallery-add:active {
  background: var(--color-surface);
}

.add-icon {
  font-size: 28px;
}
</style>
