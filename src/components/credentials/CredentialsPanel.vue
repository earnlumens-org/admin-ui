<template>
  <div>
    <!-- SUPERADMIN tenant picker: SUPERADMIN does not own a tenant in their
         JWT, so the global TenantSwitcher hides itself for them. We surface a
         scoped picker here so they can grant Gold on any tenant without
         leaving the page. Tenant admins continue to use the top-bar
         switcher and never see this control. -->
    <v-card v-if="isSuperadmin" border class="mb-4" variant="flat">
      <v-card-text class="d-flex align-center ga-3 flex-wrap">
        <v-icon color="medium-emphasis">mdi-domain</v-icon>
        <div class="text-body-2 text-medium-emphasis">Tenant context</div>
        <v-select
          v-model="superadminTenant"
          density="comfortable"
          :disabled="loadingTenants"
          hide-details
          :items="tenantItems"
          item-title="title"
          item-value="value"
          :loading="loadingTenants"
          :menu-props="{ maxHeight: 360 }"
          placeholder="Select a tenant…"
          style="max-width: 360px;"
          variant="outlined"
        />
        <v-btn
          v-if="tenantsError"
          size="small"
          variant="text"
          @click="loadTenants"
        >
          Retry
        </v-btn>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="!effectiveTenantId"
      border="start"
      class="mb-4"
      type="info"
      variant="tonal"
    >
      <template v-if="isSuperadmin">
        Pick a tenant above to manage credentials.
      </template>
      <template v-else>
        Select a tenant from the switcher to manage credentials.
      </template>
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
            :tenant-id="effectiveTenantId"
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
            :tenant-id="effectiveTenantId"
          />
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { listAllTenants, type TenantSummary } from '@/api/tenants'
  import { useAuthStore } from '@/stores/auth'
  import CredentialList from './CredentialList.vue'

  const props = defineProps<{
    /** Active tenant id from the auth store (null for SUPERADMIN). */
    tenantId: string | null
  }>()

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  /**
   * Synthetic id of the platform-root tenant. Mirrors the backend default
   * {@code admin.platform.default-tenant-id=earnlumens}; this tenant is not
   * stored in the `tenants` collection, so {@code /api/tenants/admin} never
   * returns it. SUPERADMIN can still operate on it because credential
   * endpoints bypass {@code assertOwnership} for SUPERADMIN.
   */
  const PLATFORM_TENANT_ID = 'earnlumens'

  const subTab = ref<'gold' | 'blue'>('gold')

  // ---- SUPERADMIN-only tenant picker ----
  const tenants = ref<TenantSummary[]>([])
  const loadingTenants = ref(false)
  const tenantsError = ref<string | null>(null)
  const superadminTenant = ref<string | null>(null)

  const tenantItems = computed(() => {
    const items = tenants.value.map(t => ({
      title: `${t.title} (${t.subdomain})`,
      value: t.id,
    }))
    // The "earnlumens" platform tenant is not a row in the `tenants`
    // collection (it is the synthetic id from admin.platform.default-tenant-id
    // and is the scope for Blue credentials and platform-wide moderation).
    // Surface it here so SUPERADMIN can grant Gold on the root context too.
    items.unshift({
      title: 'earnlumens (platform root)',
      value: PLATFORM_TENANT_ID,
    })
    return items
  })

  /** What we actually pass down to the lists. */
  const effectiveTenantId = computed<string | null>(() => {
    if (isSuperadmin.value) return superadminTenant.value
    return props.tenantId
  })

  async function loadTenants (): Promise<void> {
    if (!isSuperadmin.value) return
    loadingTenants.value = true
    tenantsError.value = null
    try {
      tenants.value = await listAllTenants()
      // Auto-pick the platform root so the panel is immediately useful;
      // SUPERADMIN can switch to any other tenant from the dropdown.
      if (!superadminTenant.value) {
        superadminTenant.value = PLATFORM_TENANT_ID
      }
    } catch (e: unknown) {
      tenantsError.value = (e as Error)?.message ?? 'Failed to load tenants'
    } finally {
      loadingTenants.value = false
    }
  }

  onMounted(() => {
    if (isSuperadmin.value) loadTenants()
  })

  // Re-load if the role flips at runtime (defensive — should not happen).
  watch(isSuperadmin, value => {
    if (value && tenants.value.length === 0) loadTenants()
  })
</script>
