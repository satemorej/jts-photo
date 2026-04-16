<template>
  <div id="app-root">
    <AppHeader />
    <RouterView />
    <NetBar />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import NetBar from '@/components/NetBar.vue'
</script>
