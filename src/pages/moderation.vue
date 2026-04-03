<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'moderation', disabled: true }]" />

    <div class="text-h6 mb-1">Moderation</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Review and moderate content entries
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="in-review">In Review</v-tab>
      <v-tab value="all">All Entries</v-tab>
    </v-tabs>

    <v-card class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-file-check-outline</v-icon>
      <div class="text-body-1 mt-4">No entries to review</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Entries submitted for review will appear here.
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const tab = ref('in-review')
</script>
