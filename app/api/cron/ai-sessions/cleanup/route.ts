import { timingSafeEqual } from "node:crypto";

import { deleteExpiredSessions } from "@/lib/ai/session-store";

/**
 * Vercel Cron calls this daily (see `vercel.json`) with
 * `Authorization: Bearer $CRON_SECRET`. The route is public in `proxy.ts`, so
 * the secret is the only gate.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedSessions = await deleteExpiredSessions();
  return Response.json({ deletedSessions });
}
