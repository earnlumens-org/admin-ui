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
        <v-tab v-if="showAmbassadorTab" value="ambassador">
          <v-icon color="blue-grey" start>mdi-shield-account</v-icon>
          Ambassadors
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

        <v-window-item v-if="showAmbassadorTab" value="ambassador">
          <CredentialList
            badge-type="U3"
            :can-grant="true"
            :can-revoke="true"
            empty-icon="mdi-shield-account-outline"
            empty-title="No Stellar Ambassadors yet"
            :empty-subtitle="`Add an ambassador to give them the gray badge across every tenant.`"
            grant-label="Add Ambassador"
            help-text="The gray Ambassador badge is GLOBAL: it appears on the holder's profile and content across all tenants, and it outranks Gold and Blue. It never expires and can only be managed here, on the main tenant, by admins with the 'Manage ambassadors' permission."
            list-title="Stellar Ambassadors"
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
  import { useMyPermissionsStore } from '@/stores/myPermissions'
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

  const subTab = ref<'gold' | 'blue' | 'ambassador'>('gold')

  const permsStore = useMyPermissionsStore()

  /**
   * The Ambassador (gray, U3) credential is global but managed exclusively
   * from the main tenant, guarded by the separate canManageAmbassadors
   * permission (distinct from canVerifyCreators/Gold). The backend enforces
   * both rules; here we just avoid showing a tab that would 403.
   */
  const showAmbassadorTab = computed(() =>
    effectiveTenantId.value === PLATFORM_TENANT_ID
    && (isSuperadmin.value || permsStore.permissionsFor(PLATFORM_TENANT_ID).canManageAmbassadors),
  )

  // ---- SUPERADMIN-only tenant picker ----
  const tenants = ref<TenantSummary[]>([])
  const loadingTenants = ref(false)
  const tenantsError = ref<string | null>(null)
  const superadminTenant = ref<string | null>(null)

  const tenantItems = computed(() => {
    const items = tenants.value.map(t => ({
      title: `${t.title} (${t.subdomain})`,
      // The SUBDOMAIN is the canonical platform-wide tenantId — it is what
      // tenant-admin JWTs carry and what badge/entry documents are keyed
      // on. Sending the Mongo _id here made every superadmin listing come
      // back empty (and grants written under it were invisible to the
      // tenant admin and to media-store-api's publish gates).
      value: t.subdomain,
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

  // Fetch the ambassador permission when operating on the main tenant so
  // the tab appears/disappears without a reload. Cheap and cached by store.
  watch(effectiveTenantId, value => {
    if (value === PLATFORM_TENANT_ID && !isSuperadmin.value) {
      permsStore.loadFor(PLATFORM_TENANT_ID)
    }
  }, { immediate: true })

  // Never leave the window on a tab that just became unavailable.
  watch(showAmbassadorTab, visible => {
    if (!visible && subTab.value === 'ambassador') subTab.value = 'gold'
  })

  // Re-load if the role flips at runtime (defensive — should not happen).
  watch(isSuperadmin, value => {
    if (value && tenants.value.length === 0) loadTenants()
  })
</script>
