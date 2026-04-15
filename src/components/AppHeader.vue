<template>
  <div class="app-header">
    <div class="app-logo">JTS</div>
    <div class="app-info">
      <span class="app-name">JTS Photo</span>
      <span class="app-meta">v{{ version }} · build {{ buildN }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const version = __APP_VERSION__
const buildN = __BUILD_N__
</script>

<style scoped>
.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: calc(52px + var(--safe-top));
  padding-top: var(--safe-top);
  padding-left: 16px;
  padding-right: 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-logo {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  background: var(--color-accent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #fff;
}

.app-info {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.app-name {
  font-size: 15px;
  font-weight: 700;
}

.app-meta {
  font-size: 10px;
  color: var(--color-text-dim);
}
</style>
