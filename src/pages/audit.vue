<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'audit log', disabled: true }]" />

    <div class="text-h6 mb-1">Audit Log</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Track all administrative actions
    </div>

    <v-divider class="mb-4" />

    <v-card class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-history</v-icon>
      <div class="text-body-1 mt-4">No actions recorded</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        All moderation actions, blocks, and role changes will be logged here with justifications.
      </div>
    </v-card>
  </v-container>
</template>
