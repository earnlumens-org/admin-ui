<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'supervisors', disabled: true }]" />

    <div class="text-h6 mb-1">Supervisors</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Assign and manage platform supervisors
    </div>

    <v-divider class="mb-4" />

    <v-card class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-shield-account-outline</v-icon>
      <div class="text-body-1 mt-4">No supervisors assigned</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Supervisors monitor all tenants and intervene when policies are violated.
      </div>
    </v-card>
  </v-container>
</template>
