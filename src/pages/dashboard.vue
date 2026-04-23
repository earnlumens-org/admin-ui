<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'dashboard', disabled: true }]" />

    <div class="text-h6 mb-1">Dashboard</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Signed in as @{{ authStore.user?.username }}
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

    <!-- Revenue (admin/superadmin only — moderators don't see financial data) -->
    <template v-if="canSeeAdminSections">
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
    </template>

    <!-- Content & Moderation (always visible — this is the moderator's only section) -->
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

    <!-- Platform (admin/superadmin only — moderators don't see tenant-wide ops metrics) -->
    <template v-if="canSeeAdminSections">
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
    </template>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const { pendingInvitationsCount } = useSidebarBadges()

  // SUPERADMIN and tenant owners see Revenue + Platform metrics. Moderators
  // (users with moderatorOf entries but no tenant ownership and no superadmin
  // role) see only the Content & Moderation section, since financial and
  // platform-wide operational data is not their concern.
  const canSeeAdminSections = computed(() => {
    const u = authStore.user
    if (!u) return false
    if (u.role === 'SUPERADMIN') return true
    return (u.tenantAdminOf?.length ?? 0) > 0
  })

  const showCreateTenantReminder = computed(() => {
    const u = authStore.user
    if (!u) return false
    const ownsTenant = (u.tenantAdminOf?.length ?? 0) > 0
    return u.canCreateTenant === true && !ownsTenant
  })
</script>
