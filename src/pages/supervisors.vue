<template>
  <v-container fluid class="pa-4 pa-sm-6">
    <v-breadcrumbs :items="[{ title: 'earnlumens', disabled: true }, { title: 'supervisors', disabled: true }]" class="px-0 pt-0" />

    <div class="text-h6 mb-1">Supervisors</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Assign and manage platform supervisors
    </div>

    <v-divider class="mb-4" />

    <v-card variant="tonal" class="pa-8 text-center">
      <v-icon size="48" color="medium-emphasis">mdi-shield-account-outline</v-icon>
      <div class="text-body-1 mt-4">No supervisors assigned</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Supervisors monitor all tenants and intervene when policies are violated.
      </div>
    </v-card>
  </v-container>
</template>
