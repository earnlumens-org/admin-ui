/**
 * Minimal Stellar Wallets Kit wrapper for the Pro plan checkout
 * (custom-domain-upgrade 1D.2). Mirrors the provider pattern of
 * media-store-ui/src/services/wallet/ but only exposes the two calls the
 * plan page needs: connect (authModal) and signTransaction.
 */
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils'
import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit/sdk'
import { SwkAppDarkTheme } from '@creit-tech/stellar-wallets-kit/types'

/** Must match media-store-api's stellar.network-passphrase. */
export const STELLAR_NETWORK_PASSPHRASE = 'Public Global Stellar Network ; September 2015'

let initialized = false

function ensureInit (): void {
  if (initialized) {
    return
  }
  StellarWalletsKit.init({
    theme: SwkAppDarkTheme,
    modules: defaultModules(),
  })
  initialized = true
}

/** Opens the kit's auth modal; resolves with the connected address or null on cancel. */
export async function connectWallet (): Promise<string | null> {
  ensureInit()
  try {
    const result = await StellarWalletsKit.authModal()
    return result.address || null
  } catch {
    return null
  }
}

/** Address of the currently-connected wallet, if any (no popups). */
export async function getConnectedAddress (): Promise<string | null> {
  ensureInit()
  try {
    const result = await StellarWalletsKit.getAddress()
    return result.address || null
  } catch {
    return null
  }
}

/** Signs an unsigned XDR with the connected wallet. Throws on user rejection. */
export async function signTransaction (unsignedXdr: string, address: string): Promise<string> {
  ensureInit()
  const result = await StellarWalletsKit.signTransaction(unsignedXdr, {
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    address,
  })
  return result.signedTxXdr
}
