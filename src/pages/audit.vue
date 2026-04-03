<template>
  <v-container fluid class="pa-4 pa-sm-6">
    <v-breadcrumbs :items="[{ title: 'earnlumens', disabled: true }, { title: 'audit log', disabled: true }]" class="px-0 pt-0" />

    <div class="text-h6 mb-1">Audit Log</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Track all administrative actions
    </div>

    <v-divider class="mb-4" />

    <v-card variant="tonal" class="pa-8 text-center">
      <v-icon size="48" color="medium-emphasis">mdi-history</v-icon>
      <div class="text-body-1 mt-4">No actions recorded</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        All moderation actions, blocks, and role changes will be logged here with justifications.
      </div>
    </v-card>
  </v-container>
</template>
