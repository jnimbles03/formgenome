/**
 * URL validation utilities.
 *
 * Prevents SSRF, local-file access, and scheme-injection attacks
 * by restricting all outbound fetches to http(s) and blocking
 * internal / reserved IP ranges.
 */

/**
 * Internal / reserved IPv4 patterns that must never be fetched.
 * Covers RFC 1918, loopback, link-local, and cloud metadata.
 */
const INTERNAL_IP =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|0\.0\.0\.0)/;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
]);

/**
 * Returns true when `url` uses http: or https: AND does not
 * point at a known-internal host.
 */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Scheme gate — only http(s) allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block well-known internal hostnames
    if (BLOCKED_HOSTNAMES.has(host)) return false;

    // Block reserved IPv4 ranges
    if (INTERNAL_IP.test(host)) return false;

    // Block IPv6 loopback / link-local (::1, fe80::, etc.)
    if (host === '::1' || host.startsWith('[::1]') || host.startsWith('[fe80:')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Stricter check: requires https: (except localhost for dev).
 */
export function isHttpsOrLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') return true;
    return false;
  } catch {
    return false;
  }
}
