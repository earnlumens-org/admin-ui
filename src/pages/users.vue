<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'users', disabled: true }]" />

    <div class="text-h6 mb-1">Users</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Search users and manage block requests
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="search">Search</v-tab>
      <v-tab value="block-requests">Block Requests</v-tab>
    </v-tabs>

    <v-card class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-account-group-outline</v-icon>
      <div class="text-body-1 mt-4">Search for a user</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Enter a username to find and view user details.
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const tab = ref('search')
</script>
