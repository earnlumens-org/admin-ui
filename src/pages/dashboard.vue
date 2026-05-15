<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'dashboard', disabled: true }]" />

    <div class="d-flex align-center flex-wrap ga-2 mb-1">
      <div class="text-h6">Dashboard</div>
      <v-chip
        v-if="roleChip"
        :color="roleChip.color"
        size="small"
        variant="tonal"
      >
        <v-icon class="me-1" :icon="roleChip.icon" size="14" />
        {{ roleChip.label }}
      </v-chip>
    </div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Signed in as @{{ authStore.user?.username }}
      <template v-if="activeTenantId">
        · context <strong>{{ activeTenantId }}</strong>
      </template>
    </div>

    <v-divider class="mb-4" />

    <v-alert
      v-if="pendingInvitationsCount > 0"
      class="mb-4"
      color="warning"
      icon="mdi-email-alert-outline"
      prominent
      variant="tonal"
    >
      <div class="text-subtitle-1 font-weight-medium">
        You have {{ pendingInvitationsCount }} pending moderator
        {{ pendingInvitationsCount === 1 ? 'invitation' : 'invitations' }}
      </div>
      <div class="text-body-2 mb-2">
        A tenant owner has invited you to moderate their content. Review and accept (or reject) from the invitations
        inbox.
      </div>
      <v-btn color="warning" :to="'/moderation/invitations'" variant="flat">
        Review invitations
      </v-btn>
    </v-alert>

    <v-alert
      v-if="showCreateTenantReminder"
      class="mb-4"
      closable
      color="primary"
      icon="mdi-domain-plus"
      prominent
      variant="tonal"
    >
      <div class="text-subtitle-1 font-weight-medium">Set up your tenant</div>
      <div class="text-body-2 mb-2">
        Your Blue Credential lets you launch your own tenant on earnlumens. You can do it whenever you're ready — this reminder will keep showing until your tenant is configured.
      </div>
      <v-btn color="primary" :to="'/tenants'" variant="flat">
        Configure tenant
      </v-btn>
    </v-alert>

    <!--
      Section visibility by effective role in the active tenant context:
        SUPERADMIN  → Platform + Revenue + Content & Moderation + Superadmin tools
        admin       → Revenue + Content & Moderation + Tenant admin tools
        moderator   → Content & Moderation + Moderator tools
    -->

    <!-- Platform overview (SUPERADMIN only) -->
    <template v-if="effectiveRole === 'SUPERADMIN'">
      <DashboardSectionHeader
        hint="Platform-wide health metrics across every tenant."
        title="Platform"
      />
      <v-row class="mb-2">
        <DashboardMetricCard
          action-to="/tenants"
          icon="mdi-domain"
          label="Active tenants"
          :loading="platformStatsLoading"
          :placeholder="platformStats?.activeTenants == null"
          :value="platformStats?.activeTenants"
        />
        <DashboardMetricCard
          action-to="/users"
          icon="mdi-account-group-outline"
          label="Total users"
          :loading="platformStatsLoading"
          :placeholder="platformStats?.totalUsers == null"
          :value="platformStats?.totalUsers"
        />
        <DashboardMetricCard
          icon="mdi-progress-clock"
          label="Transcoding queue"
          :loading="platformStatsLoading"
          :placeholder="platformStats?.transcodingQueue == null"
          :value="platformStats?.transcodingQueue"
        />
        <DashboardMetricCard
          color="error"
          icon="mdi-alert-circle-outline"
          label="Failed jobs"
          :loading="platformStatsLoading"
          :placeholder="platformStats?.failedJobs == null"
          :value="platformStats?.failedJobs"
        />      </v-row>
    </template>

    <!-- Revenue (SUPERADMIN + tenant admins) -->
    <template v-if="canSeeRevenue">
      <DashboardSectionHeader
        :hint="effectiveRole === 'SUPERADMIN'
          ? 'Aggregated revenue across the platform.'
          : 'Revenue for your tenant context.'"
        title="Revenue"
      />
      <v-row class="mb-2">
        <DashboardMetricCard
          icon="mdi-cash-multiple"
          label="Total revenue (XLM)"
          :loading="revenueLoading"
          :placeholder="!revenueStats || revenueStats.totalRevenueXlm == null"
          :value="formatXlm(revenueStats?.totalRevenueXlm)"
        />
        <DashboardMetricCard
          icon="mdi-calendar-month-outline"
          label="Revenue this month"
          :loading="revenueLoading"
          :placeholder="!revenueStats || revenueStats.monthRevenueXlm == null"
          :value="formatXlm(revenueStats?.monthRevenueXlm)"
        />
        <DashboardMetricCard
          :caption="revenueHighlightCaption"
          icon="mdi-trophy-outline"
          :label="effectiveRole === 'SUPERADMIN' ? 'Top tenant revenue' : 'Best-selling space'"
          :loading="revenueLoading"
          :placeholder="!revenueHighlight"
          :value="revenueHighlightValue"
        />
        <DashboardMetricCard
          color="primary"
          icon="mdi-bank-outline"
          label="Platform fees collected"
          :loading="revenueLoading"
          :placeholder="!revenueStats || revenueStats.platformFeesXlm == null"
          :value="formatXlm(revenueStats?.platformFeesXlm)"
        />
      </v-row>
    </template>

    <!-- Content & Moderation — visible to every signed-in user that can reach the dashboard -->
    <DashboardSectionHeader
      :hint="effectiveRole === 'moderator'
        ? 'Your moderation workload for the active tenant.'
        : 'Moderation pipeline for the active tenant.'"
      title="Content & Moderation"
    />
    <v-row class="mb-2">
      <DashboardMetricCard
        action-to="/moderation"
        color="warning"
        icon="mdi-clock-outline"
        label="Entries pending review"
        :loading="statsLoading"
        :value="stats?.inReview ?? inReviewCount"
      />
      <DashboardMetricCard
        icon="mdi-check-decagram-outline"
        label="Published entries"
        :loading="statsLoading"
        :placeholder="!stats"
        :value="stats?.published"
      />
      <DashboardMetricCard
        action-to="/moderation"
        icon="mdi-pause-octagon-outline"
        label="Suspended entries"
        :loading="statsLoading"
        :placeholder="!stats"
        :value="stats?.suspended"
      />
      <DashboardMetricCard
        action-to="/reports"
        color="error"
        icon="mdi-flag-outline"
        label="Open reports"
        :loading="statsLoading"
        :value="stats?.openReports ?? openReportsCount"
      />
    </v-row>

    <!-- Quick actions: tailored to the role -->
    <DashboardSectionHeader hint="Jump to the tools available in your context." title="Quick actions" />
    <v-row>
      <v-col v-for="action in quickActions" :key="action.to" cols="12" md="4" sm="6">
        <v-card
          class="h-100"
          link
          :to="action.to"
          variant="outlined"
        >
          <v-card-item>
            <template #prepend>
              <v-avatar :color="action.color" rounded size="40" variant="tonal">
                <v-icon :icon="action.icon" />
              </v-avatar>
            </template>
            <v-card-title class="text-body-1 font-weight-medium">{{ action.title }}</v-card-title>
            <v-card-subtitle class="text-wrap">{{ action.description }}</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!--
      Moderator capabilities panel. Without this, an opt-in flag granted by
      the tenant owner (e.g. canManualPermaBan) is invisible until the
      moderator stumbles into the right dialog. This block lists every flag
      the moderator currently holds and points them at the screen where the
      capability is exercised.
    -->
    <template v-if="effectiveRole === 'moderator' && capabilityItems.length">
      <DashboardSectionHeader
        class="mt-4"
        hint="Special permissions the tenant owner has granted you."
        title="Your capabilities"
      />
      <v-row>
        <v-col v-for="cap in capabilityItems" :key="cap.key" cols="12" md="6">
          <v-card class="h-100" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-avatar color="info" rounded size="40" variant="tonal">
                  <v-icon :icon="cap.icon" />
                </v-avatar>
              </template>
              <v-card-title class="text-body-1 font-weight-medium">{{ cap.title }}</v-card-title>
              <v-card-subtitle class="text-wrap">{{ cap.description }}</v-card-subtitle>
            </v-card-item>
            <v-card-actions v-if="cap.to">
              <v-btn :prepend-icon="cap.toIcon" :to="cap.to" variant="text">
                {{ cap.cta }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
  import type { ModerationStats } from '@/api/moderation'
  import type { PlatformStats } from '@/api/platform'
  import type { RevenueStats } from '@/api/revenue'

  import { computed, ref, watch } from 'vue'
  import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard.vue'
  import DashboardSectionHeader from '@/components/dashboard/DashboardSectionHeader.vue'
  import { fetchModerationStats } from '@/api/moderation'
  import { fetchPlatformStats } from '@/api/platform'
  import { fetchRevenueStats } from '@/api/revenue'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import {
    activeTenantRole,
    allUserTenants,
    useAuthStore,
  } from '@/stores/auth'
  import { useMyPermissionsStore } from '@/stores/myPermissions'

  interface QuickAction {
    title: string
    description: string
    icon: string
    color: string
    to: string
  }

  interface CapabilityItem {
    key: string
    title: string
    description: string
    icon: string
    cta?: string
    to?: string
    toIcon?: string
  }

  const authStore = useAuthStore()
  const permsStore = useMyPermissionsStore()
  const { inReviewCount, openReportsCount, pendingInvitationsCount } = useSidebarBadges()

  const activeTenantId = computed(() => authStore.activeTenantId)

  /**
   * Effective role for the user in the *active* tenant context. SUPERADMIN
   * always wins regardless of which tenant is selected; for everyone else the
   * role flips depending on whether they are owner or moderator of the chosen
   * tenant. This is what every dashboard section keys off of.
   */
  const effectiveRole = computed(
    () => activeTenantRole(authStore.user, authStore.activeTenantId),
  )

  const canSeeRevenue = computed(
    () => effectiveRole.value === 'SUPERADMIN' || effectiveRole.value === 'admin',
  )

  const roleChip = computed(() => {
    switch (effectiveRole.value) {
      case 'SUPERADMIN': {
        return { label: 'Superadmin', color: 'primary', icon: 'mdi-shield-crown-outline' }
      }
      case 'admin': {
        return { label: 'Tenant admin', color: 'success', icon: 'mdi-shield-account-outline' }
      }
      case 'moderator': {
        return { label: 'Moderator', color: 'info', icon: 'mdi-account-badge-outline' }
      }
      default: {
        return null
      }
    }
  })

  const showCreateTenantReminder = computed(() => {
    const u = authStore.user
    if (!u) return false
    const ownsTenant = (u.tenantAdminOf?.length ?? 0) > 0
    return u.canCreateTenant === true && !ownsTenant
  })

  /**
   * Per-flag descriptors for the "Your capabilities" panel. Only flags the
   * caller actually holds are emitted; the panel itself is hidden when the
   * list is empty so a baseline moderator does not see an empty section.
   * Each item points at the exact screen where the capability is exercised
   * so the moderator does not have to guess where the new button lives.
   */
  const capabilityItems = computed<CapabilityItem[]>(() => {
    const perms = permsStore.permissionsFor(authStore.activeTenantId)
    const items: CapabilityItem[] = []
    if (perms.canManualPermaBan) {
      items.push({
        key: 'canManualPermaBan',
        title: 'Manual permanent ban',
        description: 'You can issue a permanent ban from a user profile, in addition to the automatic 7/30-day escalation.',
        icon: 'mdi-account-cancel-outline',
        cta: 'Open Users',
        to: '/users',
        toIcon: 'mdi-account-group-outline',
      })
    }
    if (perms.canClearStrikes) {
      items.push({
        key: 'canClearStrikes',
        title: 'Clear strike history',
        description: 'When unbanning a user you can also reset their strike counter back to zero.',
        icon: 'mdi-counter',
        cta: 'Open Users',
        to: '/users',
        toIcon: 'mdi-account-group-outline',
      })
    }
    if (perms.canVerifyCreators) {
      items.push({
        key: 'canVerifyCreators',
        title: 'Verify creators (Gold)',
        description: 'You can review credential submissions and grant or revoke the Gold creator badge.',
        icon: 'mdi-shield-check-outline',
        cta: 'Open Credentials',
        to: '/users',
        toIcon: 'mdi-account-group-outline',
      })
    }
    if (perms.canViewTenantAudit) {
      items.push({
        key: 'canViewTenantAudit',
        title: 'View tenant audit',
        description: 'You can browse the full audit log for this tenant, not only your own actions.',
        icon: 'mdi-history',
        cta: 'Open Audit log',
        to: '/audit',
        toIcon: 'mdi-history',
      })
    }
    return items
  })

  const quickActions = computed<QuickAction[]>(() => {
    const role = effectiveRole.value
    if (role === 'SUPERADMIN') {
      return [
        { title: 'Tenants', description: 'Approve, suspend or audit any tenant on the platform.', icon: 'mdi-domain', color: 'primary', to: '/tenants' },
        { title: 'Supervisors', description: 'Manage platform-level supervisor accounts.', icon: 'mdi-shield-account-outline', color: 'primary', to: '/supervisors' },
        { title: 'Audit log', description: 'Trace every privileged action across the platform.', icon: 'mdi-history', color: 'grey', to: '/audit' },
      ]
    }
    if (role === 'admin') {
      return [
        { title: 'Moderation queue', description: 'Review entries waiting for approval in your tenant.', icon: 'mdi-file-check-outline', color: 'warning', to: '/moderation' },
        { title: 'Reports', description: 'Triage user reports against content and accounts.', icon: 'mdi-flag-outline', color: 'error', to: '/reports' },
        { title: 'Moderators', description: 'Invite and manage moderators for your tenant.', icon: 'mdi-account-badge-outline', color: 'info', to: '/moderators' },
        { title: 'Spaces', description: 'Configure spaces, pricing and access rules.', icon: 'mdi-shape-outline', color: 'success', to: '/spaces' },
        { title: 'Tenant settings', description: 'Branding, payouts and policies for your tenant.', icon: 'mdi-cog-outline', color: 'grey', to: '/settings' },
        { title: 'Audit log', description: 'See who did what within your tenant.', icon: 'mdi-history', color: 'grey', to: '/audit' },
      ]
    }
    if (role === 'moderator') {
      const actions: QuickAction[] = [
        { title: 'Moderation queue', description: 'Pick up the next entries waiting for your review.', icon: 'mdi-file-check-outline', color: 'warning', to: '/moderation' },
        { title: 'Reports', description: 'Resolve user reports assigned to your tenant.', icon: 'mdi-flag-outline', color: 'error', to: '/reports' },
        { title: 'Audit log', description: 'Review your recent moderation actions.', icon: 'mdi-history', color: 'grey', to: '/audit' },
      ]
      // Surface /users when the moderator holds any per-user capability,
      // otherwise the granted flag has no entry point in the menu.
      const myPerms = permsStore.permissionsFor(authStore.activeTenantId)
      if (myPerms.canManualPermaBan || myPerms.canClearStrikes || myPerms.canVerifyCreators) {
        actions.push({
          title: 'Users',
          description: 'Open user profiles to apply the moderator actions you have been granted.',
          icon: 'mdi-account-group-outline',
          color: 'info',
          to: '/users',
        })
      }
      return actions
    }
    // No active tenant context (e.g. TENANT_PROSPECT before tenant creation)
    // — only thing meaningful is going to /tenants to create one.
    if (authStore.user?.canCreateTenant) {
      return [
        { title: 'Create your tenant', description: 'Use your Blue Credential to launch your tenant.', icon: 'mdi-domain-plus', color: 'primary', to: '/tenants' },
      ]
    }
    return []
  })

  // Live moderation stats for the active tenant — gives the Content &
  // Moderation cards real numbers instead of the previous hardcoded zeros.
  // Falls back to the sidebar-badge counts if the call ever fails.
  const stats = ref<ModerationStats | null>(null)
  const statsLoading = ref(false)

  function tenantForStats (): string | null {
    if (authStore.activeTenantId) return authStore.activeTenantId
    if (authStore.user?.role === 'SUPERADMIN') return 'earnlumens'
    return allUserTenants(authStore.user)[0] ?? null
  }

  async function loadStats () {
    const tenant = tenantForStats()
    if (!tenant) {
      stats.value = null
      return
    }
    statsLoading.value = true
    try {
      stats.value = await fetchModerationStats(tenant)
    } catch {
      stats.value = null
    } finally {
      statsLoading.value = false
    }
  }

  watch(
    () => authStore.activeTenantId,
    () => { loadStats() },
    { immediate: true },
  )

  // Platform-wide health snapshot. Restricted to SUPERADMIN on the backend
  // (returns 403 otherwise), so we only call it when the effective role says
  // so. Re-runs whenever the user (and therefore their role) changes.
  const platformStats = ref<PlatformStats | null>(null)
  const platformStatsLoading = ref(false)

  async function loadPlatformStats () {
    if (effectiveRole.value !== 'SUPERADMIN') {
      platformStats.value = null
      return
    }
    platformStatsLoading.value = true
    try {
      platformStats.value = await fetchPlatformStats()
    } catch {
      platformStats.value = null
    } finally {
      platformStatsLoading.value = false
    }
  }

  watch(effectiveRole, () => { loadPlatformStats() }, { immediate: true })

  // Revenue snapshot for the dashboard. Two effective scopes:
  //  • SUPERADMIN with no active tenant context → platform-wide aggregate
  //    (total, month, top-grossing tenant, platform fees).
  //  • Tenant admin OR SUPERADMIN with an explicit active tenant → totals
  //    scoped to that tenant plus the best-selling space inside it.
  // The backend re-checks authorisation on every call so the UI guard is
  // purely cosmetic: hides the section for moderators / unauthenticated.
  const revenueStats = ref<RevenueStats | null>(null)
  const revenueLoading = ref(false)

  /**
   * Decides which scope the revenue endpoint should return:
   *  - SUPERADMIN looking at the global "earnlumens" context → platform aggregate.
   *  - Anyone else (or SUPERADMIN inside a specific tenant) → tenant aggregate.
   * Returns `null` when the user has no tenant context to query — e.g. a
   * tenant prospect before their tenant exists, where the section is hidden.
   */
  function tenantForRevenue (): string | null | 'PLATFORM' {
    if (!canSeeRevenue.value) return null
    if (effectiveRole.value === 'SUPERADMIN') {
      // The global "earnlumens" context is platform-wide; an explicit tenant
      // selection means the SUPERADMIN wants that tenant's numbers.
      const t = authStore.activeTenantId
      return !t || t === 'earnlumens' ? 'PLATFORM' : t
    }
    return authStore.activeTenantId ?? allUserTenants(authStore.user)[0] ?? null
  }

  async function loadRevenue () {
    const scope = tenantForRevenue()
    if (!scope) {
      revenueStats.value = null
      return
    }
    revenueLoading.value = true
    try {
      revenueStats.value = await fetchRevenueStats(scope === 'PLATFORM' ? null : scope)
    } catch {
      revenueStats.value = null
    } finally {
      revenueLoading.value = false
    }
  }

  // Re-fetch whenever the effective role OR the active tenant changes — the
  // tenant switcher must trigger a refresh so a SUPERADMIN dropping into a
  // specific tenant no longer sees platform totals on screen.
  watch(
    () => [effectiveRole.value, authStore.activeTenantId],
    () => { loadRevenue() },
    { immediate: true },
  )

  /**
   * Format a BigDecimal-as-string XLM amount for compact dashboard display.
   * Keeps up to 2 decimals (further precision is irrelevant at-a-glance) and
   * uses the user's locale grouping. Returns `null` for missing values so the
   * card falls back to its em-dash placeholder.
   */
  function formatXlm (raw: string | null | undefined): string | null {
    if (raw == null || raw === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return raw
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n)
  }

  // Top-tenant card (SUPERADMIN) vs best-selling-space card (tenant admin)
  // share the same UI slot — pick whichever applies to the active scope.
  const revenueHighlight = computed(
    () => revenueStats.value?.topTenant ?? revenueStats.value?.bestSellingSpace ?? null,
  )

  // Render the XLM amount as the headline value (to match every other card
  // in the row) and keep the entity name as a small caption below the label.
  // This avoids the truncation we used to get from packing both into the
  // card title ("earnlumens · 33 X...").
  const revenueHighlightValue = computed(() => {
    const h = revenueHighlight.value
    if (!h) return null
    const amount = formatXlm(h.amountXlm)
    return amount ? `${amount} XLM` : null
  })

  const revenueHighlightCaption = computed(() => {
    const h = revenueHighlight.value
    if (!h) return null
    return h.name?.trim() || h.id
  })
</script>
