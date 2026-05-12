import { Liveblocks } from "@liveblocks/node";

/**
 * Fixed palette of cursor colors. The color assigned to a user is deterministic:
 * it is derived from the user's ID so the same user always gets the same color
 * across sessions and reconnections.
 */
const CURSOR_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
] as const;

/**
 * Maps a user ID to a consistent cursor color from the fixed palette.
 * Uses a simple hash so the mapping is deterministic without storage.
 */
export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

/**
 * Cached Liveblocks node client.
 * Reused across requests in the same process to avoid creating a new instance
 * on every call (important in Next.js route handlers and server actions).
 */
declare global {
  var __liveblocksClient: Liveblocks | undefined;
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
  }
  return new Liveblocks({ secret });
}

export const liveblocks: Liveblocks =
  globalThis.__liveblocksClient ?? (globalThis.__liveblocksClient = createLiveblocksClient());
