<template>
  <v-list density="comfortable" lines="two">
    <template v-if="loading">
      <div class="d-flex justify-center pa-6">
        <v-progress-circular indeterminate />
      </div>
    </template>
    <template v-else-if="rows.length === 0">
      <v-list-item>
        <v-list-item-subtitle class="text-center text-medium-emphasis py-4">
          {{ emptyHint }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
    <template v-else>
      <v-list-item
        v-for="row in rows"
        :key="row.oauthUserId"
        :prepend-avatar="row.profileImageUrl || undefined"
        :subtitle="describe(row)"
        :title="row.displayName || row.username"
        @click="$emit('open', row)"
      >
        <template #prepend>
          <v-avatar size="36">
            <v-img v-if="row.profileImageUrl" :src="row.profileImageUrl" />
            <v-icon v-else>mdi-account</v-icon>
          </v-avatar>
        </template>
        <template #append>
          <div class="d-flex align-center ga-2">
            <v-chip
              v-if="row.blocked"
              color="error"
              prepend-icon="mdi-account-cancel"
              size="x-small"
              variant="flat"
            >
              {{ row.banExpiresAt ? 'TEMP BAN' : 'PERMA BAN' }}
            </v-chip>
            <v-chip
              v-if="(row.strikeCount ?? 0) > 0"
              color="warning"
              prepend-icon="mdi-alert-decagram"
              size="x-small"
              variant="tonal"
            >
              {{ row.strikeCount }} strike{{ (row.strikeCount ?? 0) > 1 ? 's' : '' }}
            </v-chip>
            <v-icon size="16">mdi-chevron-right</v-icon>
          </div>
        </template>
      </v-list-item>
    </template>
  </v-list>
</template>

<script lang="ts" setup>
  import type { StorefrontUserDto } from '@/api/userModeration'

  defineProps<{
    rows: StorefrontUserDto[]
    loading: boolean
    emptyHint: string
  }>()

  defineEmits<{
    open: [user: StorefrontUserDto]
  }>()

  function describe (u: StorefrontUserDto): string {
    const parts: string[] = [`@${u.username}`]
    if (u.blocked && u.banReason) parts.push(`Reason: ${u.banReason}`)
    if (u.banExpiresAt) parts.push(`Until ${new Date(u.banExpiresAt).toLocaleString()}`)
    return parts.join(' · ')
  }
</script>
