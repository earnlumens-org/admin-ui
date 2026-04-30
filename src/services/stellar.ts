/**
 * Stellar ledger helpers used by admin-ui forms.
 *
 * Mirrors the {@code accountExists} check used by media-store-ui so the
 * tenant wallet a creator registers is guaranteed to exist on the ledger
 * (otherwise every payout would fail at settlement time).
 *
 * Implemented with bare {@code fetch} against Horizon to avoid pulling
 * the full {@code @stellar/stellar-sdk} into the admin bundle.
 */

import { getStellarHorizonUrl } from '@/config/env'

const HORIZON_URL = getStellarHorizonUrl()

/**
 * Returns {@code true} when the given Stellar public key exists (i.e. is
 * funded / initialised) on the network's ledger. Returns {@code false}
 * for 404 (unfunded) and rethrows for any other transport / network
 * failure so callers can distinguish "definitely missing" from "couldn't
 * check right now".
 */
export async function accountExists (address: string): Promise<boolean> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`)
  if (res.status === 404) return false
  if (!res.ok) {
    throw new Error(`Horizon HTTP ${res.status}`)
  }
  return true
}
