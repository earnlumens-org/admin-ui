<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'dashboard', disabled: true }]" />

    <div class="text-h6 mb-1">Dashboard</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Signed in as @{{ authStore.user?.username }}
    </div>

    <v-divider class="mb-4" />

    <!-- Revenue -->
    <div class="text-subtitle-2 text-medium-emphasis mb-2">Revenue</div>
    <v-row class="mb-2">
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">—</v-card-title>
            <v-card-subtitle>Total revenue (XLM)</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">—</v-card-title>
            <v-card-subtitle>Revenue this month</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">—</v-card-title>
            <v-card-subtitle>Top tenant revenue</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">—</v-card-title>
            <v-card-subtitle>Platform fees collected</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content & Moderation -->
    <div class="text-subtitle-2 text-medium-emphasis mb-2">Content &amp; Moderation</div>
    <v-row class="mb-2">
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Entries pending review</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Published entries</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Suspended entries</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Pending block requests</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!-- Platform -->
    <div class="text-subtitle-2 text-medium-emphasis mb-2">Platform</div>
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Active tenants</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Total users</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Transcoding queue</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <v-card>
          <v-card-item>
            <v-card-title class="text-h5">0</v-card-title>
            <v-card-subtitle>Failed jobs</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
</script>
