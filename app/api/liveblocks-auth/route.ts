import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getLiveblocksClient, getCursorColor } from "@/lib/liveblocks";
import { getCurrentIdentity, getAccessibleProject } from "@/lib/project-access";

export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve Clerk user details (display name, avatar)
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse the room ID from the request body.
  //    By convention (spec: "Use the project ID as the Liveblocks room ID"),
  //    the client sends the project ID as the room.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const roomId =
    body !== null &&
    typeof body === "object" &&
    "room" in body &&
    typeof (body as Record<string, unknown>).room === "string"
      ? (body as Record<string, unknown>).room as string
      : null;

  if (!roomId) {
    return NextResponse.json({ error: "Missing room" }, { status: 400 });
  }

  // 4. Verify project access using the existing access helper.
  //    The room ID is the project ID.
  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, roomId);

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveblocks = getLiveblocksClient();

  // 5. Ensure the Liveblocks room exists (create only if needed).
  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: [],
  });

  // 6. Build user metadata for the session token.
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "Unknown";

  const avatar = user.imageUrl ?? "";
  const cursorColor = getCursorColor(userId);

  // 7. Prepare an access-token session for this user and room.
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, avatar, cursorColor },
  });

  session.allow(roomId, session.FULL_ACCESS);

  const { status, body: sessionBody } = await session.authorize();
  return new Response(sessionBody, { status });
}
