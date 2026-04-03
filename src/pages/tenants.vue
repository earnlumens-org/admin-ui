<template>
  <v-container fluid class="pa-4 pa-sm-6">
    <v-breadcrumbs :items="[{ title: 'earnlumens', disabled: true }, { title: 'tenants', disabled: true }]" class="px-0 pt-0" />

    <div class="text-h6 mb-1">Tenants</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Manage platform tenants
    </div>

    <v-divider class="mb-4" />

    <v-card variant="tonal" class="pa-8 text-center">
      <v-icon size="48" color="medium-emphasis">mdi-domain</v-icon>
      <div class="text-body-1 mt-4">No tenants yet</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Tenants will appear here once users create them from the storefront.
      </div>
    </v-card>
  </v-container>
</template>
