/**
 * Generates a collision-resistant hash for a URL using SHA-256.
 * Returns the first 16 hex characters (64 bits of entropy).
 *
 * Replaces the old djb2 hash which only had 32 bits and was prone to collisions.
 */
export async function hashUrl(url: string): Promise<string> {
  const normalized = decodeURIComponent(url).trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Builds a storage cache key from a URL.
 */
export async function cacheKeyForUrl(url: string): Promise<string> {
  const hash = await hashUrl(url);
  return `analysis_${hash}`;
}
