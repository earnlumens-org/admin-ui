# Admin Panel Specification

## 1. Overview

A single-deployment admin panel at `admin.earnlumens.org` serving all roles.
The UI adapts navigation and capabilities based on the authenticated user's roles.
earnlumens.org is the root tenant (tenantId: `earnlumens`). Other tenants run on subdomains (e.g. `mytenant.earnlumens.org`).

Authentication: X (Twitter) OAuth2 only. Future: Google, Apple.

---

## 2. Role Hierarchy

### 2.1 Super Admin
- **Who**: Only `@earnlumens`. Hardcoded. One single user.
- **Scope**: Platform-wide + admin of the root tenant (earnlumens.org).
- **Can do everything** all other roles can, plus:
  - Assign/revoke Supervisor role to any user.
  - Block/unblock tenants (with justification).
  - Block/unblock any user directly (with justification).
  - View all audit logs platform-wide.
  - Configure the root tenant (logo, title, wallet, appbar).
  - Assign moderators for the root tenant.

### 2.2 Supervisor
- **Who**: Assigned exclusively by Super Admin.
- **Scope**: Read-only observation of ALL tenants. Intervention only when something went wrong.
- **Can**:
  - View all tenants, follow/unfollow specific tenants for quick access.
  - Block/unblock tenants (with justification).
  - Block/unblock tenant admins (with justification).
  - View all entries across all tenants (read-only).
  - Override moderation decisions (reverse a bad approve/reject, with justification).
  - View all block requests across all tenants.
  - View all audit logs.
  - View users and their action history.
- **Cannot**:
  - Approve/reject entries in the normal moderation flow (that's the tenant's job).
  - Change tenant settings (logo, wallet, etc.).
  - Assign moderators or other supervisors.
  - Make any decision that belongs to the tenant's internal governance.

### 2.3 Tenant Admin
- **Who**: Any user with a Blue Credential (community) who creates a tenant. One tenant per user by default; additional tenants require payment.
- **Scope**: Their own tenant(s).
- **Can**:
  - Configure tenant settings: logo, title, wallet address, appbar sections.
  - Invite moderators by exact username match (no user directory browsing).
  - Revoke moderator role from users in their tenant.
  - Approve/reject entries in their tenant's moderation queue (IN_REVIEW).
  - Approve/reject block requests created by moderators.
  - Block/unblock users within their tenant directly (with justification).
  - View audit log for their tenant.
- **Cannot**:
  - Change the subdomain (immutable after creation).
  - Access other tenants unless they have a role there.

### 2.4 Moderator
- **Who**: Any user invited by a Tenant Admin who accepts the invitation.
- **Scope**: The specific tenant(s) where they accepted the role.
- **Can**:
  - View all entries in the tenant.
  - Approve/reject entries in IN_REVIEW status (with justification on reject).
  - Suspend published entries (with justification).
  - Create block requests for users (with justification). Requires approval from another moderator or the admin.
  - Respond to block requests created by other moderators (approve/reject).
  - View audit log for their tenant.
  - Resign from moderator role voluntarily.
- **Cannot**:
  - Block users directly (must create a request).
  - Change tenant settings.
  - Invite other moderators.

---

## 3. Tenant Lifecycle

1. User with Blue Credential selects a subdomain in media-store-ui (provisional reservation).
2. User logs into admin.earnlumens.org → tenant is officially created.
3. Tenant admin configures settings (logo, title, wallet, appbar sections).
4. Tenant becomes active and accessible at `subdomain.earnlumens.org`.

**Subdomain**: Immutable after creation. Cannot be changed because it's the database discriminator for all content.

**Blocking a tenant**: Subdomain becomes inaccessible. Content is hidden but not deleted. All users (including admins) lose access until unblocked. Must be documented in Terms of Service.

**Blocking a tenant admin**: The admin loses admin panel access. Tenant continues operating under earnlumens control. Moderators remain active. Must be documented in Terms of Service.

---

## 4. Moderation Flow

### 4.1 Entry Moderation
Entry statuses (from media-store-api): `DRAFT, IN_REVIEW, APPROVED, PUBLISHED, REJECTED, SUSPENDED, UNLISTED, ARCHIVED`

- **IN_REVIEW → APPROVED**: Moderator or Admin approves.
- **IN_REVIEW → REJECTED**: Moderator or Admin rejects (justification required). Creator can see reason in studio-creator and resubmit after changes.
- **PUBLISHED → SUSPENDED**: Moderator or Admin suspends (justification required). For policy violations discovered after publication.
- **Supervisor override**: Can reverse a bad moderation decision with justification.

### 4.2 User Block Flow
- **Moderator**: Creates a block request (justification required) → Another moderator or the admin reviews → Approve/Reject.
- **Admin**: Can block directly (justification required). Can also respond to moderator block requests.
- **Supervisor**: Can block tenant admins (justification required). Can block tenants (justification required).
- **Super Admin**: Can block anyone and anything directly (justification required).

All block actions and their justifications are recorded in the audit log.

### 4.3 Moderator Invitation Flow
1. Admin enters exact username in invite form.
2. System validates user exists (no autocomplete, no user browsing).
3. Invitation is created in pending state.
4. Invited user sees the invitation in admin-ui upon login.
5. User accepts → role is activated. User declines → invitation is discarded.
6. Admin can revoke the role at any time → moderator loses access immediately.
7. Moderator can resign voluntarily at any time.

---

## 5. Audit Log

Every action that modifies state is logged:
- **Who**: User ID, username, role at time of action.
- **What**: Action type (approve_entry, reject_entry, suspend_entry, block_user, unblock_user, block_tenant, assign_moderator, revoke_moderator, etc.).
- **When**: Timestamp.
- **Where**: Tenant ID, target entity ID.
- **Why**: Justification text (required for all sanctions).

Visible to: Super Admin (all), Supervisor (all), Tenant Admin (own tenant), Moderator (own tenant).

---

## 6. Navigation Structure

### 6.1 Tenant Context Switcher
Located at the top of the navigation drawer, below the nav items header.
- Users with roles in multiple tenants see a dropdown to switch context.
- Super Admin sees: "earnlumens (root)" + all tenants.
- Supervisor sees: "Global" + followed tenants.
- Tenant Admin / Moderator see: only their tenant(s).
- Selected context determines what data is shown in all views.

### 6.2 Super Admin Navigation
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| mdi-view-dashboard-outline | Dashboard | /dashboard | Platform metrics |
| mdi-domain | Tenants | /tenants | List, block/unblock, detail |
| mdi-shield-account-outline | Supervisors | /supervisors | Assign/revoke supervisors |
| mdi-file-check-outline | Moderation | /moderation | Entries moderation queue |
| mdi-account-group-outline | Users | /users | Search, block requests |
| mdi-history | Audit Log | /audit | All platform actions |
| mdi-cog-outline | Settings | /settings | Root tenant configuration |

### 6.3 Supervisor Navigation
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| mdi-view-dashboard-outline | Dashboard | /dashboard | Global overview |
| mdi-domain | Tenants | /tenants | All tenants, follow/unfollow |
| mdi-file-check-outline | Moderation | /moderation | Read-only, override capability |
| mdi-account-group-outline | Users | /users | Search, view history |
| mdi-history | Audit Log | /audit | All platform actions |

### 6.4 Tenant Admin Navigation
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| mdi-view-dashboard-outline | Dashboard | /dashboard | Tenant metrics |
| mdi-file-check-outline | Moderation | /moderation | Entries queue for tenant |
| mdi-account-badge-outline | Moderators | /moderators | Invite/revoke |
| mdi-account-group-outline | Users | /users | Block requests |
| mdi-history | Audit Log | /audit | Tenant actions |
| mdi-cog-outline | Settings | /settings | Tenant configuration |

### 6.5 Moderator Navigation
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| mdi-view-dashboard-outline | Dashboard | /dashboard | Tenant overview |
| mdi-file-check-outline | Moderation | /moderation | Entries queue |
| mdi-account-group-outline | Users | /users | Block requests |
| mdi-history | Audit Log | /audit | Tenant actions |

---

## 7. Dashboard Metrics

### 7.1 Super Admin / Global Dashboard
Priority order (business-critical first):
1. **Revenue**: Total platform revenue (XLM/USD), revenue per tenant, trend chart.
2. **Entries pending review**: Count, oldest pending, average review time.
3. **Active tenants**: Total, new this period, blocked count.
4. **Content health**: Published entries, suspended entries, rejection rate.
5. **User growth**: Total users, new registrations, active creators.
6. **Block requests**: Pending count, resolution time.
7. **System bottlenecks**: Transcoding queue depth, failed jobs, stale jobs.

### 7.2 Supervisor Dashboard
Same as global but with highlighted section for followed tenants.

### 7.3 Tenant Admin Dashboard
1. **Revenue**: Tenant revenue, trend.
2. **Entries pending review**: Count for this tenant.
3. **Content overview**: Total entries by status.
4. **Moderator activity**: Active moderators, actions this period.
5. **Block requests**: Pending in this tenant.

### 7.4 Moderator Dashboard
1. **Entries pending review**: Assigned/available to review.
2. **My recent actions**: Last approvals/rejections.
3. **Block requests**: Pending created by me, pending to review.

---

## 8. Settings Page (Tenant Configuration)

Available to: Super Admin (root tenant), Tenant Admin (own tenant).

- **General**: Tenant display name, description.
- **Branding**: Logo upload, favicon, primary color override (for storefront only, not admin).
- **AppBar sections**: Configure navigation sections visible on the storefront.
- **Wallet**: Stellar wallet address for receiving payments.
- **Subdomain**: Display only (immutable). Shown as `subdomain.earnlumens.org`.

---

## 9. Current Implementation Status

- [x] Super Admin login (OAuth2 via X, @earnlumens only)
- [x] JWT + refresh token auth flow
- [x] Dashboard page (basic, static cards)
- [x] Dark/light mode toggle
- [x] Responsive navigation drawer
- [ ] Role system (backend + frontend)
- [ ] Tenant model and CRUD
- [ ] Supervisor management
- [ ] Moderation queue
- [ ] User management and block requests
- [ ] Audit log
- [ ] Tenant settings configuration
- [ ] Moderator invitation flow
- [ ] Tenant context switcher
- [ ] Dashboard metrics (real data)
