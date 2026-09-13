/**
 * Utility functions for date, time, and numerical formatting.
 */

export function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return 'Session (Transient)';
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRemainingLifespan(expiresAt?: number): string {
  if (!expiresAt) return 'Expires on browser close';
  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) return 'Expired';

  const diffSec = Math.floor(diffMs / 1000);
  const diffDays = Math.floor(diffSec / 86400);
  const diffHours = Math.floor((diffSec % 86400) / 3600);
  const diffMinutes = Math.floor((diffSec % 3600) / 60);

  if (diffDays > 365) {
    const years = (diffDays / 365).toFixed(1);
    return `~${years} years`;
  }
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
}
