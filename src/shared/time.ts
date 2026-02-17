/**
 * Formats a timestamp as a relative time string (e.g., "Just now", "5m ago", "2h ago").
 */
export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Formats a timestamp as a locale date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
