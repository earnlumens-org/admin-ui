import { createI18n } from 'vue-i18n'

/**
 * Admin-UI i18n bundle.
 *
 * All tenant-error codes mirror {@code TenantErrorCode.name().toLowerCase()}
 * on the server side so the server can return {@code {"error": "<code>"}}
 * and the UI picks up the localised string under {@code tenants.errors.<code>}.
 */
const messages = {
  en: {
    common: {
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      submit: 'Create',
      loading: 'Loading…',
      retry: 'Retry',
      close: 'Close',
    },
    tenants: {
      page: {
        title: 'Tenants',
        subtitle_superadmin: 'All tenants on the platform.',
        subtitle_owner: 'Your tenant storefront.',
        create_cta: 'Create your tenant',
        no_tenants: 'No tenants yet.',
      },
      soon: {
        title: 'Additional tenants — coming soon',
        body: 'Running multiple storefronts under one account is a paid feature still under construction. Each user may currently own a single tenant.',
        badge: 'próximamente',
      },
      switcher: {
        label: 'Active tenant',
        none: 'No tenants available',
      },
      wizard: {
        title: 'Create your tenant',
        step_profile: 'Profile',
        step_wallet: 'Wallet & fee',
        step_subdomain: 'Subdomain',
        step_review: 'Review & create',
        fields: {
          title: 'Storefront title',
          title_hint: 'Shown to your customers — 2 to 80 characters.',
          description: 'Description',
          description_hint: 'Optional — up to 280 characters.',
          wallet: 'Stellar wallet (G… address)',
          wallet_hint: 'Public key that will receive your share of every sale.',
          fee: 'Your fee (%)',
          fee_hint: 'Your cut on each sale. 0 to 30, up to two decimals.',
          subdomain: 'Subdomain',
          subdomain_hint: 'Your storefront URL will be {host}.earnlumens.org. Lowercase letters, digits and hyphens only. 3–30 characters. This cannot be changed later.',
          confirm: 'I understand the subdomain cannot be changed after creation.',
        },
        review: {
          heading: 'Please review before submitting.',
          url_preview: 'Your URL will be',
          fee_suffix: '% per sale',
        },
      },
      errors: {
        not_verified: 'You need a Blue Credential (U1) before you can open a tenant.',
        already_owns_tenant: 'Your account already owns a tenant.',
        additional_not_available: 'Additional tenants are a paid feature still under construction.',
        subdomain_required: 'Please choose a subdomain.',
        subdomain_length: 'Subdomain must be between 3 and 30 characters.',
        subdomain_format: 'Use only lowercase letters, digits and hyphens; no leading or trailing hyphen.',
        subdomain_reserved: 'That subdomain is reserved. Please pick another.',
        subdomain_taken: 'That subdomain is already taken.',
        wallet_format: 'Invalid Stellar address. It must start with G and be 56 characters long.',
        tenant_fee_range: 'Your fee must be between 0 and 30, with at most two decimals.',
        confirmation_required: 'You must confirm before creating the tenant.',
        forbidden: 'You are not allowed to perform this action.',
        blocked: 'Your tenant is currently blocked. Please contact support.',
        unknown_error: 'Something went wrong. Please try again.',
      },
    },
  },
  ja: {
    common: {
      cancel: 'キャンセル',
      back: '戻る',
      next: '次へ',
      submit: '作成',
      loading: '読み込み中…',
      retry: '再試行',
      close: '閉じる',
    },
    tenants: {
      page: {
        title: 'テナント',
        subtitle_superadmin: 'プラットフォーム上のすべてのテナント。',
        subtitle_owner: 'あなたのストアフロント。',
        create_cta: 'テナントを作成',
        no_tenants: 'テナントはまだありません。',
      },
      soon: {
        title: '追加テナント — 近日公開',
        body: '1つのアカウントで複数のストアフロントを運用する機能は有料機能として準備中です。現在、ユーザーごとに1つのテナントのみ所有できます。',
        badge: '近日公開',
      },
      switcher: {
        label: 'アクティブなテナント',
        none: '利用可能なテナントがありません',
      },
      wizard: {
        title: 'テナントを作成',
        step_profile: 'プロフィール',
        step_wallet: 'ウォレットと手数料',
        step_subdomain: 'サブドメイン',
        step_review: '確認と作成',
        fields: {
          title: 'ストアフロント名',
          title_hint: 'お客様に表示されます — 2〜80文字。',
          description: '説明',
          description_hint: '任意 — 最大280文字。',
          wallet: 'Stellarウォレット（G…アドレス）',
          wallet_hint: '各販売の取り分を受け取る公開鍵。',
          fee: 'あなたの手数料 (%)',
          fee_hint: '各販売に対するあなたの取り分。0〜30、小数点以下2桁まで。',
          subdomain: 'サブドメイン',
          subdomain_hint: 'ストアフロントのURLは {host}.earnlumens.org になります。小文字・数字・ハイフンのみ使用可。3〜30文字。作成後の変更はできません。',
          confirm: 'サブドメインは作成後に変更できないことを理解しています。',
        },
        review: {
          heading: '送信前に内容をご確認ください。',
          url_preview: 'URLは次のようになります',
          fee_suffix: '% / 販売',
        },
      },
      errors: {
        not_verified: 'テナントを開設するには Blue Credential (U1) が必要です。',
        already_owns_tenant: 'あなたのアカウントは既にテナントを所有しています。',
        additional_not_available: '追加テナントは有料機能として準備中です。',
        subdomain_required: 'サブドメインを選択してください。',
        subdomain_length: 'サブドメインは3〜30文字で入力してください。',
        subdomain_format: '小文字・数字・ハイフンのみ使用可能で、先頭と末尾にハイフンは使えません。',
        subdomain_reserved: 'そのサブドメインは予約済みです。別のものを選んでください。',
        subdomain_taken: 'そのサブドメインは既に使用されています。',
        wallet_format: 'Stellarアドレスが無効です。Gで始まる56文字である必要があります。',
        tenant_fee_range: '手数料は0〜30、小数点以下2桁までで入力してください。',
        confirmation_required: 'テナントを作成する前に確認が必要です。',
        forbidden: 'この操作は許可されていません。',
        blocked: 'あなたのテナントはブロックされています。サポートにお問い合わせください。',
        unknown_error: '問題が発生しました。もう一度お試しください。',
      },
    },
  },
}

export default createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
})
