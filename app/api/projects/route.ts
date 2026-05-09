import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return unauthorizedResponse();
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorizedResponse();
  }

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const nameFromBody =
    typeof payload === "object" &&
    payload !== null &&
    "name" in payload &&
    typeof payload.name === "string"
      ? payload.name.trim()
      : "";
  const idFromBody =
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof payload.id === "string" &&
    payload.id.trim().length > 0
      ? payload.id.trim()
      : undefined;

  const project = await prisma.project.create({
    data: {
      ...(idFromBody ? { id: idFromBody } : {}),
      ownerId: userId,
      name: nameFromBody.length > 0 ? nameFromBody : "Untitled Project",
    },
  });

  return Response.json({ project }, { status: 201 });
}
