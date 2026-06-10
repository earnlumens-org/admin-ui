<template>
  <v-app>
    <template v-if="showAdminShell">
      <v-app-bar>
        <v-btn v-show="!drawer || !mdAndUp" icon="mdi-menu" @click="drawer = !drawer" />

        <v-toolbar-title>
          <b class="pl-1 font-weight-bold text-label-large">EARNLUMENS</b>
          <v-chip class="ml-2" color="primary" size="x-small" variant="tonal">ADMIN</v-chip>
        </v-toolbar-title>

        <template #append>
          <TenantSwitcher v-if="showSwitcher" />
          <v-chip class="hidden-sm-and-down me-2" size="small" variant="tonal">{{ authStore.user?.username }}</v-chip>
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                class="mr-3"
                icon
                variant="text"
              >
                <v-avatar class="avatar-grayscale" color="grey-lighten-3" size="36">
                  <v-img
                    v-if="avatarUrl"
                    :alt="authStore.user?.displayName || authStore.user?.username || 'User avatar'"
                    referrerpolicy="no-referrer"
                    :src="avatarUrl"
                    @error="avatarFailed = true"
                  />
                  <v-icon v-else color="grey-darken-1" icon="mdi-account-circle" size="32" />
                </v-avatar>
              </v-btn>
            </template>
            <v-list density="compact" min-width="180">
              <v-list-item>
                <v-list-item-title class="text-body-2">{{ authStore.user?.displayName }}</v-list-item-title>
                <v-list-item-subtitle>@{{ authStore.user?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-divider />
              <v-list-item
                prepend-icon="mdi-circle-half-full"
                :title="isDark ? 'Light mode' : 'Dark mode'"
                @click="toggleTheme"
              />
              <v-list-item title="Sign out" @click="handleLogout" />
            </v-list>
          </v-menu>
        </template>
      </v-app-bar>

      <v-navigation-drawer v-model="drawer" width="232">
        <v-list class="mt-1" density="compact" nav>
          <!-- Universal anchor -->
          <v-list-item
            prepend-icon="mdi-view-dashboard-outline"
            title="Dashboard"
            to="/dashboard"
          />

          <!-- ───────── WORK · daily operations ───────── -->
          <template v-if="showWorkGroup">
            <v-list-subheader class="nav-subheader">Work</v-list-subheader>
            <v-list-item
              v-if="hasModerationAccess"
              prepend-icon="mdi-clipboard-check-outline"
              to="/moderation"
            >
              <v-list-item-title>Review queue</v-list-item-title>
              <template v-if="inReviewCount > 0" #append>
                <v-badge color="warning" :content="inReviewCount" inline />
              </template>
            </v-list-item>
            <v-list-item
              v-if="hasModerationAccess"
              prepend-icon="mdi-flag-outline"
              to="/reports"
            >
              <v-list-item-title>Reports</v-list-item-title>
              <template v-if="openReportsCount > 0" #append>
                <v-badge color="error" :content="openReportsCount" inline />
              </template>
            </v-list-item>
            <v-list-item
              v-if="pendingInvitationsCount > 0"
              prepend-icon="mdi-email-outline"
              to="/moderation/invitations"
            >
              <v-list-item-title>Invitations</v-list-item-title>
              <template #append>
                <v-badge color="warning" :content="pendingInvitationsCount" inline />
              </template>
            </v-list-item>
          </template>

          <!-- ───────── MANAGE · tenant resources ───────── -->
          <template v-if="showManageGroup">
            <v-list-subheader class="nav-subheader">Manage</v-list-subheader>
            <v-list-item
              v-if="isActiveTenantAdmin"
              prepend-icon="mdi-shape-outline"
              title="Spaces"
              to="/spaces"
            />
            <v-list-item
              v-if="isSuperadmin || isActiveTenantAdmin || canAccessUsers"
              prepend-icon="mdi-account-group-outline"
              title="Users"
              to="/users"
            />
            <v-list-item
              v-if="isActiveTenantAdmin"
              prepend-icon="mdi-account-badge-outline"
              title="Moderators"
              to="/moderators"
            />
            <v-list-item
              v-if="isActiveTenantAdmin"
              prepend-icon="mdi-handshake-outline"
              title="Earn"
              to="/earn"
            />
          </template>

          <!-- ───────── CONFIGURE · set-and-forget ───────── -->
          <template v-if="showConfigureGroup">
            <v-list-subheader class="nav-subheader">Configure</v-list-subheader>
            <v-list-item
              prepend-icon="mdi-tune-variant"
              title="Moderation rules"
              to="/moderation-settings"
            />
            <v-list-item
              prepend-icon="mdi-cog-outline"
              title="Tenant settings"
              to="/settings"
            />
          </template>

          <!-- ───────── PLATFORM · cross-tenant ───────── -->
          <template v-if="showPlatformGroup">
            <v-list-subheader class="nav-subheader">Platform</v-list-subheader>
            <v-list-item
              v-if="isSuperadmin || hasAnyTenantOwnership || canCreateTenant"
              prepend-icon="mdi-domain"
              title="Tenants"
              to="/tenants"
            />
            <v-list-item
              v-if="isSuperadmin"
              prepend-icon="mdi-shield-account-outline"
              title="Supervisors"
              to="/supervisors"
            />
          </template>

          <!-- ───────── AUDIT · forensic read ───────── -->
          <template v-if="showAuditGroup">
            <v-list-subheader class="nav-subheader">Audit</v-list-subheader>
            <v-list-item
              prepend-icon="mdi-history"
              title="Activity log"
              to="/audit"
            />
          </template>
        </v-list>

        <template #append>
          <v-list density="compact" nav>
            <v-list-item
              prepend-icon="mdi-logout"
              title="Sign out"
              @click="handleLogout"
            />
          </v-list>
        </template>
      </v-navigation-drawer>
    </template>

    <v-main>
      <router-view />
    </v-main>

    <!--
      Surface permission deltas the moment they reach the client. Without
      this, a moderator whose tenant owner just toggled `canManualPermaBan`
      would have no way to know — the new buttons would silently appear on
      a screen they may not be looking at, sometimes hours later.
    -->
    <v-snackbar
      v-model="permissionsSnackbar"
      color="info"
      location="bottom right"
      :timeout="-1"
    >
      <div class="d-flex flex-column">
        <span class="font-weight-medium">{{ permissionDeltaTitle }}</span>
        <span class="text-caption">{{ permissionDeltaBody }}</span>
      </div>
      <template #actions>
        <v-btn variant="text" @click="dismissPermissionsDelta">Got it</v-btn>
      </template>
    </v-snackbar>

    <v-dialog v-model="showError" max-width="400">
      <v-card>
        <v-card-title>Error</v-card-title>
        <v-card-text>{{ authStore.error }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dismissError">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay, useTheme } from 'vuetify'
  import TenantSwitcher from '@/components/TenantSwitcher.vue'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import {
    allUserTenants,
    hasActiveModerationAccess,
    isActiveTenantOwner as isActiveTenantOwnerFn,
    useAuthStore,
  } from '@/stores/auth'
  import { PERMISSION_LABELS, useMyPermissionsStore } from '@/stores/myPermissions'

  const authStore = useAuthStore()
  const permsStore = useMyPermissionsStore()
  const route = useRoute()
  const router = useRouter()
  const theme = useTheme()
  const { mdAndUp } = useDisplay()
  const { inReviewCount, openReportsCount, pendingInvitationsCount } = useSidebarBadges()

  // Avatar fallback: X profile_image_url URLs (pbs.twimg.com) occasionally
  // 403 / 404 on hot-link, leaving v-img with a blank box. Track load errors
  // and resize the X normal (48x48) variant to the bigger normal-resolution
  // image so we never show a microscopic upscaled blob inside the 36px avatar.
  const avatarFailed = ref(false)
  const avatarUrl = computed(() => {
    if (avatarFailed.value) return ''
    const raw = authStore.user?.profileImageUrl || ''
    if (!raw) return ''
    // X serves _normal (48), _bigger (73), _400x400 (400). Bump _normal to
    // _bigger so a 36-72px avatar still looks sharp on Retina screens.
    return raw.replace('_normal.', '_bigger.')
  })
  // Reset the error flag if the user/token changes so a fresh login can
  // re-attempt the load.
  watch(() => authStore.user?.profileImageUrl, () => { avatarFailed.value = false })

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  /** True when the user owns at least one tenant (used only for the global Tenants entry). */
  const hasAnyTenantOwnership = computed(
    () => (authStore.user?.tenantAdminOf?.length ?? 0) > 0,
  )
  const canCreateTenant = computed(() => authStore.user?.canCreateTenant === true)
  const showSwitcher = computed(() => allUserTenants(authStore.user).length >= 2)

  /**
   * Active-tenant scoped permissions. Switching the tenant in the top-right
   * picker must re-evaluate the sidebar so a user who is admin of tenant A
   * but only moderator of tenant B does not see admin-only entries while
   * acting on B.
   */
  const isActiveTenantAdmin = computed(
    () => isActiveTenantOwnerFn(authStore.user, authStore.activeTenantId),
  )
  const hasModerationAccess = computed(
    () => hasActiveModerationAccess(authStore.user, authStore.activeTenantId),
  )

  /**
   * Active-tenant moderator capabilities. Used both to gate the sidebar
   * (so a moderator with canVerifyCreators sees the Users entry) and to
   * decide which routes the user can land on after a tenant switch.
   */
  const myPerms = computed(() => permsStore.permissionsFor(authStore.activeTenantId))
  const canManageCredentials = computed(
    () => isSuperadmin.value
      || isActiveTenantAdmin.value
      || myPerms.value.canVerifyCreators,
  )
  /**
   * Any per-user moderator capability — surfaces /users in the sidebar so
   * a moderator who only has canManualPermaBan / canClearStrikes can still
   * reach the screens where those buttons live. Without this, those flags
   * would be granted but unreachable from the menu.
   */
  const canAccessUsers = computed(
    () => canManageCredentials.value
      || myPerms.value.canManualPermaBan
      || myPerms.value.canClearStrikes,
  )

  /**
   * Group visibility for the sidebar. Each subheader only renders when at
   * least one of its items is visible, so the menu never shows a hanging
   * "Manage" / "Configure" label with nothing under it (e.g. when a tenant
   * owner switches to a tenant where they're only a moderator).
   */
  const showWorkGroup = computed(
    () => hasModerationAccess.value || pendingInvitationsCount.value > 0,
  )
  const showManageGroup = computed(
    () => isActiveTenantAdmin.value || isSuperadmin.value || canAccessUsers.value,
  )
  const showConfigureGroup = computed(() => isActiveTenantAdmin.value)
  const showPlatformGroup = computed(
    () => isSuperadmin.value || hasAnyTenantOwnership.value || canCreateTenant.value,
  )
  const showAuditGroup = computed(
    () => isSuperadmin.value || isActiveTenantAdmin.value || hasModerationAccess.value,
  )

  /**
   * Per-route predicate. Mirrors the sidebar v-if conditions so when the
   * active tenant changes we can detect that the current page is no longer
   * reachable in the new context and bounce the user to /dashboard.
   *
   * Routes not listed are unrestricted (auth-only).
   */
  function routeAllowed (path: string): boolean {
    if (path.startsWith('/dashboard')) return true
    if (path.startsWith('/moderation/invitations')) return true
    if (path.startsWith('/tenants')) {
      return isSuperadmin.value || hasAnyTenantOwnership.value || canCreateTenant.value
    }
    if (path.startsWith('/supervisors')) return isSuperadmin.value
    if (path.startsWith('/users')) return isSuperadmin.value || isActiveTenantAdmin.value || canAccessUsers.value
    if (path.startsWith('/audit')) return isSuperadmin.value || isActiveTenantAdmin.value || hasModerationAccess.value
    if (path.startsWith('/moderation-settings')) return isActiveTenantAdmin.value
    if (path.startsWith('/moderators')) return isActiveTenantAdmin.value
    if (path.startsWith('/spaces')) return isActiveTenantAdmin.value
    if (path.startsWith('/earn')) return isActiveTenantAdmin.value
    if (path.startsWith('/settings')) return isActiveTenantAdmin.value
    if (path.startsWith('/moderation')) return hasModerationAccess.value
    if (path.startsWith('/reports')) return hasModerationAccess.value
    return true
  }

  // When the user switches tenant context, the page they are on may belong
  // to a role they no longer hold (e.g. /spaces while becoming a moderator).
  // Send them to the dashboard so the scope of the new context is obvious.
  watch(() => authStore.activeTenantId, () => {
    if (!authStore.isAuthenticated) return
    if (!routeAllowed(route.path)) {
      router.replace('/dashboard')
    }
  })

  // Keep the per-tenant capability cache in sync with whichever tenant the
  // user is currently looking at. Each load also diffs against the previous
  // snapshot stored in localStorage so newly granted (or revoked) flags
  // surface a snackbar without the user having to log out and back in.
  watch(
    () => [authStore.isAuthenticated, authStore.activeTenantId] as const,
    ([authed, tid]) => {
      if (!authed || !tid) return
      permsStore.loadFor(tid)
    },
    { immediate: true },
  )

  // Re-check on window focus too: tenant owners often grant a flag and
  // ping the moderator out-of-band ("dale, ya te di acceso") — the next
  // tab focus is a natural moment to pick that change up.
  function handleWindowFocus () {
    if (!authStore.isAuthenticated || !authStore.activeTenantId) return
    permsStore.loadFor(authStore.activeTenantId)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus)
  }

  /** Snackbar for permission grants/revocations detected by the store. */
  const permissionsSnackbar = computed({
    get: () => permsStore.pendingDelta !== null,
    set: value => {
      if (!value) permsStore.acknowledgeNotification()
    },
  })
  const permissionDeltaTitle = computed(() => {
    const delta = permsStore.pendingDelta
    if (!delta) return ''
    if (delta.granted.length && delta.revoked.length) {
      return 'Your moderator capabilities changed'
    }
    return delta.granted.length
      ? 'New moderator capabilities granted'
      : 'Some moderator capabilities were revoked'
  })
  const permissionDeltaBody = computed(() => {
    const delta = permsStore.pendingDelta
    if (!delta) return ''
    const parts: string[] = []
    if (delta.granted.length) {
      parts.push(`Granted: ${delta.granted.map(k => PERMISSION_LABELS[k]).join(', ')}`)
    }
    if (delta.revoked.length) {
      parts.push(`Revoked: ${delta.revoked.map(k => PERMISSION_LABELS[k]).join(', ')}`)
    }
    return parts.join(' \u00b7 ')
  })
  function dismissPermissionsDelta () {
    permsStore.acknowledgeNotification()
  }

  const authRoutes = new Set(['/', '/oauth2/callback'])

  const showAdminShell = computed(() => {
    return authStore.isAuthenticated && !authRoutes.has(route.path)
  })

  const drawer = ref(true)

  // On mobile, drawer starts closed
  watch(mdAndUp, val => {
    drawer.value = val
  }, { immediate: true })

  const isDark = computed(() => theme.global.current.value.dark)

  function toggleTheme () {
    const next = theme.global.current.value.dark ? 'light' : 'dark'
    theme.global.name.value = next
    localStorage.setItem('theme', next)
  }

  // Restore saved theme
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    theme.global.name.value = saved
  }

  const showError = ref(false)

  watch(
    () => authStore.error,
    newError => {
      if (newError) showError.value = true
    },
  )

  function dismissError () {
    showError.value = false
    authStore.error = null
  }

  async function handleLogout () {
    await authStore.logout()
    permsStore.reset()
    router.push('/')
  }
</script>

<style scoped>
.avatar-grayscale {
  filter: grayscale(100%);
}

/*
 * Sidebar section labels. Kept intentionally low-contrast and uppercase so
 * they read as structural separators rather than clickable items, and never
 * compete visually with the nav links underneath.
 */
:deep(.nav-subheader) {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
  min-height: 28px;
  padding-top: 12px;
  padding-bottom: 4px;
}
</style>
