<template>
  <div>
    <v-alert
      v-if="!tenantId"
      border="start"
      class="mb-4"
      type="info"
      variant="tonal"
    >
      Select a tenant from the switcher to manage credentials.
    </v-alert>

    <template v-else>
      <v-tabs v-model="subTab" class="mb-4" color="amber-darken-3" density="compact">
        <v-tab value="gold">
          <v-icon color="amber-darken-2" start>mdi-shield-star</v-icon>
          Verified Gold
        </v-tab>
        <v-tab value="blue">
          <v-icon color="blue" start>mdi-shield-check</v-icon>
          Verified Blue
        </v-tab>
      </v-tabs>

      <v-window v-model="subTab">
        <v-window-item value="gold">
          <CredentialList
            badge-type="U2"
            :can-grant="true"
            :can-revoke="true"
            empty-icon="mdi-shield-star-outline"
            empty-title="No Verified Gold users yet"
            :empty-subtitle="`Grant Gold to a creator so they can publish in spaces restricted to Verified Gold.`"
            grant-label="Grant Gold"
            help-text="Verified Gold is granted manually by tenant admins. It is required to publish in spaces marked “Verified Gold only”. Holders keep their badge until you revoke it."
            list-title="Verified Gold holders"
            :tenant-id="tenantId!"
          />
        </v-window-item>

        <v-window-item value="blue">
          <CredentialList
            badge-type="U1"
            :can-grant="false"
            :can-revoke="false"
            empty-icon="mdi-shield-outline"
            empty-title="No Verified Blue users yet"
            :empty-subtitle="`Blue badges are self-claimed by users on the public site.`"
            help-text="Verified Blue is the community badge users claim themselves on the public site. This list is read-only; revoking is handled by the platform sweeper when badges expire."
            list-title="Verified Blue holders"
            :tenant-id="tenantId!"
          />
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import CredentialList from './CredentialList.vue'

  defineProps<{
    /** Active tenant id from the auth store. */
    tenantId: string | null
  }>()

  const subTab = ref<'gold' | 'blue'>('gold')
</script>
