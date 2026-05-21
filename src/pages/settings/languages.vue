<!--
  /settings/languages — superadmin-only i18n catalogue editor.

  Wraps the existing <SettingsLanguages /> component. A non-superadmin
  reaching this URL is redirected back to the hub instead of seeing an
  empty page.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'languages', disabled: true },
      ]"
    />

    <div class="d-flex align-center mb-1">
      <v-btn
        class="me-2"
        icon="mdi-arrow-left"
        size="small"
        to="/settings"
        variant="text"
      />

      <div class="text-h6">Languages</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Global i18n catalogue. Changes apply to every tenant.
    </div>

    <v-divider class="mb-4" />

    <SettingsLanguages @notify="onNotify" />

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'

  import SettingsLanguages from '@/components/SettingsLanguages.vue'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  // Defensive client-side gate. The real authority is the API; this just
  // avoids rendering a useless empty editor to a regular owner who typed
  // the URL by hand.
  onMounted(() => {
    if (!isSuperadmin.value) router.replace('/settings')
  })

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('')

  function onNotify (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }
</script>
