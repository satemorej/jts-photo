<template>
  <div id="app-root">
    <AppHeader />
    <StatusBar />
    <RouterView />
    <NetBar />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import StatusBar from '@/components/StatusBar.vue'
import NetBar from '@/components/NetBar.vue'
</script>
