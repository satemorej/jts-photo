<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="modal-box">
        <h2 class="modal-title">Ajouter une note</h2>
        <div class="field">
          <textarea
            ref="ta"
            v-model="text"
            class="note-textarea"
            placeholder="Votre note…"
            rows="4"
            maxlength="500"
            @keydown.enter.ctrl="confirm"
          />
          <div class="char-count">{{ text.length }} / 500</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancel">Annuler</button>
          <button class="btn btn-primary" :disabled="!text.trim()" @click="confirm">Enregistrer</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  confirm: [text: string]
  cancel: []
}>()

const text = ref('')
const ta = ref<HTMLTextAreaElement | null>(null)

watch(() => props.visible, async (v) => {
  if (v) {
    text.value = ''
    await nextTick()
    ta.value?.focus()
  }
})

function confirm() {
  if (!text.value.trim()) return
  emit('confirm', text.value.trim())
  text.value = ''
}

function cancel() {
  text.value = ''
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  padding-bottom: var(--safe-bottom);
}

.modal-box {
  width: 100%;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-radius: 20px 20px 0 0;
  padding: 20px 16px;
  padding-bottom: max(20px, var(--safe-bottom));
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
}

.note-textarea {
  width: 100%;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  color: var(--color-text);
  font-size: 16px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}
.note-textarea:focus { border-color: var(--color-accent); }

.char-count {
  text-align: right;
  font-size: 11px;
  color: var(--color-text-dim);
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.modal-actions .btn { flex: 1; }
</style>
