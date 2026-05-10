<template>
  <!--
    Compact, plain-language summary of the platform sanction ladder. Rendered
    at the top of every user-moderation surface so moderators (and tenant
    admins reviewing reports) always see WHAT happens at each step before
    they click a button. Same wording is mirrored on the storefront
    Guidelines page so users see the exact same rules.
  -->
  <v-alert
    class="mb-4"
    color="info"
    density="comfortable"
    icon="mdi-shield-account-outline"
    variant="tonal"
  >
    <div class="text-subtitle-2 mb-1">How user sanctions work</div>
    <div class="text-body-2 mb-2">
      We use a 3-strike escalation. Every action below is permanent in the
      audit log; only an unblock with "clear strikes" resets the count.
    </div>
    <ol class="text-body-2 ml-4" style="list-style: decimal">
      <li><b>Warning</b> — first nudge. No login restriction; the user sees a notice on their Account page.</li>
      <li><b>1st strike</b> — temporary ban for <b>7 days</b>.</li>
      <li><b>2nd strike</b> — temporary ban for <b>30 days</b>.</li>
      <li><b>3rd strike</b> — <b>permanent ban</b>. Account cannot log in.</li>
    </ol>
    <div class="text-body-2 mt-2">
      Severe violations (CSAM, credible threats, fraud) bypass the ladder and
      use <b>Ban → Permanent</b> directly.
    </div>
  </v-alert>
</template>

<script lang="ts" setup>
  // No props/state — this card is informational and identical everywhere
  // it appears, on purpose. Keep wording in sync with the storefront copy
  // at media-store-ui/src/pages/Guidelines.vue (sanctions section).
</script>
