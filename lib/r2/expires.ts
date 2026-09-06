const DEFAULT_EXPIRES_SECONDS = 3600;
const MIN_EXPIRES_SECONDS = 1;
const MAX_EXPIRES_SECONDS = 604800; // SigV4 cap: 7 days

/**
 * Parses and clamps the configured signed-URL expiry to the integer range
 * accepted by SigV4 (1..604800 seconds). Falls back to the default when the
 * value is missing, not a finite number, or outside that range.
 */
export function signExpiresSeconds(
  env: Record<string, string | undefined>,
): number {
  const parsed = Number(env.R2_SIGN_EXPIRES_SECONDS);
  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_EXPIRES_SECONDS ||
    parsed > MAX_EXPIRES_SECONDS
  ) {
    return DEFAULT_EXPIRES_SECONDS;
  }
  return Math.floor(parsed);
}
