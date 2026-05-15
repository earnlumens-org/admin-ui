<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'audit log', disabled: true }]" />

    <div class="text-h6 mb-1">Audit Log</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Every moderation action that touches a user's sanction state — warnings, strikes, bans and unblocks. Rows are immutable.
    </div>

    <v-divider class="mb-4" />

    <!-- Filters: tenant scope (SUPERADMIN only) + action type. -->
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-autocomplete
        v-if="isSuperadmin"
        v-model="tenantFilter"
        clearable
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="tenantOptions"
        label="Tenant"
        :loading="tenantsLoading"
        :menu-props="{ maxHeight: 360 }"
        style="min-width: 240px; max-width: 320px"
        variant="outlined"
        @click:clear="tenantFilter = '_all'"
      />
      <v-select
        v-model="typeFilter"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="typeOptions"
        label="Action"
        style="max-width: 220px"
        variant="outlined"
      />
      <v-spacer />
      <v-btn :disabled="loading" prepend-icon="mdi-refresh" variant="text" @click="reload">
        Refresh
      </v-btn>
    </div>

    <v-card variant="outlined">
      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <v-card v-if="!loading && rows.length === 0" class="pa-8 text-center" flat>
        <v-icon color="medium-emphasis" size="48">mdi-history</v-icon>
        <div class="text-body-1 mt-4">No actions recorded</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          As moderators issue warnings, strikes or bans, every action will appear here with its justification.
        </div>
      </v-card>

      <v-list v-else density="comfortable" lines="three">
        <template v-for="(row, index) in rows" :key="row.id">
          <v-divider v-if="index > 0" />
          <v-list-item
            :prepend-icon="iconFor(row.type)"
            @click="goToUser(row)"
          >
            <template #title>
              <div class="d-flex flex-wrap align-center ga-2">
                <v-chip
                  :color="colorFor(row.type)"
                  density="comfortable"
                  size="small"
                  variant="flat"
                >
                  {{ labelFor(row.type) }}
                </v-chip>
                <span class="text-body-2 font-weight-medium">@{{ row.username || row.userId }}</span>
                <span class="text-body-2 text-medium-emphasis">·</span>
                <span class="text-caption text-medium-emphasis">{{ row.tenantId }}</span>
                <span v-if="row.automatic" class="text-caption text-medium-emphasis">· auto</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">{{ formatDate(row.issuedAt) }}</span>
              </div>
            </template>

            <template #subtitle>
              <div class="text-body-2 mt-1">
                <span v-if="row.reason">{{ row.reason }}</span>
                <span v-else class="text-medium-emphasis">No reason recorded.</span>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                by @{{ row.issuedByUsername || row.issuedBy || 'system' }}
                <span v-if="row.expiresAt"> · until {{ formatDate(row.expiresAt) }}</span>
                <span v-if="row.strikeCountAfter != null"> · strikes after: {{ row.strikeCountAfter }}</span>
              </div>
            </template>
          </v-list-item>
        </template>
      </v-list>

      <div v-if="totalPages > 1" class="d-flex justify-center pa-3">
        <v-pagination
          v-model="pageOneBased"
          density="comfortable"
          :length="totalPages"
          :total-visible="6"
        />
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { listAudit } from '@/api/audit'
  import { listAllTenants, type TenantSummary } from '@/api/tenants'
  import type { SanctionType, UserSanctionDto } from '@/api/userModeration'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const activeTenantId = computed(() => authStore.activeTenantId)

  // SUPERADMIN sees the full tenant catalogue so the audit can be sliced
  // per-storefront (otherwise the cross-tenant feed becomes unreadable on
  // any platform with more than a handful of active tenants).
  const allTenants = ref<TenantSummary[]>([])
  const tenantsLoading = ref(false)

  // The root "earnlumens" tenant is a pseudo-tenant with no Mongo Tenant
  // document, so listAllTenants() never returns it. Inject it manually so
  // SUPERADMIN can still filter root-scoped audit rows.
  const ROOT_TENANT_ID = 'earnlumens'

  const tenantOptions = computed(() => {
    const list: { title: string, value: string }[] = []
    if (isSuperadmin.value) {
      list.push({ title: 'All tenants', value: '_all' })
      list.push({ title: 'earnlumens (root)', value: ROOT_TENANT_ID })
      for (const t of allTenants.value) {
        if (t.id === ROOT_TENANT_ID) continue
        list.push({
          title: t.title?.trim() || t.subdomain || t.id,
          value: t.id,
        })
      }
      // Keep the active tenant available even if the catalogue request
      // failed — better to fall back to a single option than to a blank
      // dropdown that hides the filter entirely.
      const active = activeTenantId.value
      if (active && !list.some(o => o.value === active)) {
        list.push({ title: active, value: active })
      }
      return list
    }
    const active = activeTenantId.value
    if (active) list.push({ title: active, value: active })
    return list
  })

  const typeOptions: { title: string, value: SanctionType | '' }[] = [
    { title: 'All actions', value: '' },
    { title: 'Warnings', value: 'WARNING' },
    { title: 'Strikes', value: 'STRIKE' },
    { title: 'Temporary bans', value: 'TEMP_BAN' },
    { title: 'Permanent bans', value: 'PERMA_BAN' },
    { title: 'Unblocks', value: 'UNBAN' },
  ]

  const tenantFilter = ref<string>(isSuperadmin.value ? '_all' : (activeTenantId.value || ''))
  const typeFilter = ref<SanctionType | ''>('')
  const pageOneBased = ref(1)
  const pageSize = 30
  const totalPages = ref(1)
  const rows = ref<UserSanctionDto[]>([])
  const loading = ref(false)

  async function load () {
    loading.value = true
    try {
      const result = await listAudit({
        tenantId: tenantFilter.value || null,
        type: typeFilter.value || null,
        page: Math.max(0, pageOneBased.value - 1),
        size: pageSize,
      })
      rows.value = result.content
      totalPages.value = Math.max(1, result.totalPages || 1)
    } catch {
      rows.value = []
      totalPages.value = 1
    } finally {
      loading.value = false
    }
  }

  function reload () {
    pageOneBased.value = 1
    load()
  }

  watch([tenantFilter, typeFilter], () => reload())
  watch(pageOneBased, () => load())

  async function loadTenants () {
    if (!isSuperadmin.value) return
    tenantsLoading.value = true
    try {
      allTenants.value = await listAllTenants()
    } catch {
      allTenants.value = []
    } finally {
      tenantsLoading.value = false
    }
  }

  onMounted(() => {
    loadTenants()
    load()
  })

  function goToUser (row: UserSanctionDto) {
    if (!row.userId) return
    const tenant = tenantFilter.value && tenantFilter.value !== '_all'
      ? tenantFilter.value
      : (row.tenantId || activeTenantId.value || 'earnlumens')
    router.push(`/users/${encodeURIComponent(row.userId)}?tenantId=${encodeURIComponent(tenant)}`)
  }

  function iconFor (type: SanctionType): string {
    switch (type) {
      case 'WARNING': return 'mdi-alert-outline'
      case 'STRIKE': return 'mdi-alert-decagram-outline'
      case 'TEMP_BAN': return 'mdi-account-clock-outline'
      case 'PERMA_BAN': return 'mdi-account-cancel-outline'
      case 'UNBAN': return 'mdi-account-check-outline'
      default: return 'mdi-history'
    }
  }

  function colorFor (type: SanctionType): string {
    switch (type) {
      case 'WARNING': return 'warning'
      case 'STRIKE': return 'orange'
      case 'TEMP_BAN': return 'deep-orange'
      case 'PERMA_BAN': return 'error'
      case 'UNBAN': return 'success'
      default: return 'grey'
    }
  }

  function labelFor (type: SanctionType): string {
    switch (type) {
      case 'WARNING': return 'Warning'
      case 'STRIKE': return 'Strike'
      case 'TEMP_BAN': return 'Temp ban'
      case 'PERMA_BAN': return 'Perma ban'
      case 'UNBAN': return 'Unblock'
      default: return type
    }
  }

  function formatDate (iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
  }
</script>

