/** Compact time since `isoDate`: "now", "5m", "2h", "3d", "1w", "4mo", "1y". */
export function formatRelativeTime(isoDate: string, now: number): string {
  const minutes = Math.floor(Math.max(0, now - new Date(isoDate).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
