<template>
  <v-container fluid class="pa-4 pa-sm-6">
    <v-breadcrumbs :items="[{ title: 'earnlumens', disabled: true }, { title: 'settings', disabled: true }]" class="px-0 pt-0" />

    <div class="text-h6 mb-1">Settings</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Tenant configuration
    </div>

    <v-divider class="mb-4" />

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>General</v-card-title>
            <v-card-subtitle>Display name and description</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <v-text-field label="Tenant name" disabled placeholder="earnlumens" />
            <v-textarea label="Description" disabled placeholder="Tenant description" rows="3" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>Subdomain</v-card-title>
            <v-card-subtitle>Immutable after creation</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <v-text-field label="URL" disabled model-value="earnlumens.org" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>Branding</v-card-title>
            <v-card-subtitle>Logo and visual identity</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <v-file-input label="Logo" disabled accept="image/*" prepend-icon="mdi-image" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>Wallet</v-card-title>
            <v-card-subtitle>Stellar wallet for receiving payments</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <v-text-field label="Stellar wallet address" disabled placeholder="G..." />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
