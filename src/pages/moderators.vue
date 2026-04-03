<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'moderators', disabled: true }]" />

    <div class="text-h6 mb-1">Moderators</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Invite and manage tenant moderators
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="active">Active</v-tab>
      <v-tab value="pending">Pending Invitations</v-tab>
    </v-tabs>

    <v-card class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-account-badge-outline</v-icon>
      <div class="text-body-1 mt-4">No moderators</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Invite moderators by their exact username to help review content.
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const tab = ref('active')
</script>
