<template>
  <div class="d-flex align-baseline ga-2 mb-2">
    <div class="text-subtitle-2 text-medium-emphasis">{{ title }}</div>
    <div v-if="hint" class="text-caption text-disabled">— {{ hint }}</div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    title: string
    hint?: string
  }>()
</script>
