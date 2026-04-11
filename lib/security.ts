/**
 * Normalizes auth error reasons to a single value.
 *
 * Prevents timing-based oracle attacks and email confirmation
 * via token state — callers should never see whether a token
 * was not_found, expired, or already used.
 */
export function normalizeAuthError(_reason: string): string {
  return 'invalid_or_expired'
}

/**
 * Validates that a sync request comes from the session's owner.
 *
 * Anonymous sessions (no userId) accept any sync.
 * Claimed sessions require the mmr_uid cookie to match.
 */
export function validateSessionOwnership(
  sessionUserId: string | null,
  cookieUserId: string | null
): boolean {
  if (!sessionUserId) return true
  return sessionUserId === cookieUserId
}
