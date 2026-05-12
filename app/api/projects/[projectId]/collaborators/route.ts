import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

interface ClerkUserSummary {
  imageUrl: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

function badRequestResponse(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDisplayName(user: ClerkUserSummary) {
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (fullName.length > 0) {
    return fullName;
  }
  if (user.username && user.username.length > 0) {
    return user.username;
  }
  return null;
}

async function getProjectMembership(
  userId: string,
  primaryEmail: string | null,
  projectId: string,
): Promise<{ projectId: string; isOwner: boolean } | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      collaborators: primaryEmail
        ? {
            where: {
              collaboratorEmail: primaryEmail,
            },
            select: { id: true },
            take: 1,
          }
        : false,
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === userId) {
    return { projectId: project.id, isOwner: true };
  }

  if (!primaryEmail) {
    return null;
  }

  const isCollaborator = Array.isArray(project.collaborators) && project.collaborators.length > 0;
  if (!isCollaborator) {
    return null;
  }

  return { projectId: project.id, isOwner: false };
}

async function getCurrentIdentity() {
  const { userId } = await auth();

  if (!userId) {
    return { userId: null, primaryEmail: null };
  }

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress
    ? normalizeEmail(user.primaryEmailAddress.emailAddress)
    : null;

  return { userId, primaryEmail };
}

async function getClerkUsersByEmail(emails: string[]) {
  if (emails.length === 0) {
    return new Map<string, ClerkUserSummary>();
  }

  const client = await clerkClient();
  const users = await client.users.getUserList({
    emailAddress: emails,
    limit: emails.length,
  });

  const usersByEmail = new Map<string, ClerkUserSummary>();
  for (const user of users.data) {
    for (const address of user.emailAddresses) {
      usersByEmail.set(normalizeEmail(address.emailAddress), {
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    }
  }

  return usersByEmail;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentIdentity();
  if (!identity.userId) {
    return unauthorizedResponse();
  }

  const { projectId } = await context.params;
  const membership = await getProjectMembership(identity.userId, identity.primaryEmail, projectId);
  if (!membership) {
    return forbiddenResponse();
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId: membership.projectId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      collaboratorEmail: true,
      createdAt: true,
    },
  });

  const collaboratorEmails = collaborators.map((entry) => entry.collaboratorEmail.toLowerCase());
  const usersByEmail = await getClerkUsersByEmail(collaboratorEmails);

  return Response.json({
    canManage: membership.isOwner,
    collaborators: collaborators.map((entry) => {
      const email = entry.collaboratorEmail.toLowerCase();
      const user = usersByEmail.get(email);
      return {
        id: entry.id,
        email,
        name: user ? getDisplayName(user) : null,
        avatarUrl: user ? user.imageUrl : null,
        createdAt: entry.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentIdentity();
  if (!identity.userId) {
    return unauthorizedResponse();
  }

  const { projectId } = await context.params;
  const membership = await getProjectMembership(identity.userId, identity.primaryEmail, projectId);
  if (!membership) {
    return forbiddenResponse();
  }
  if (!membership.isOwner) {
    return forbiddenResponse();
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const invitedEmail =
    typeof payload === "object" &&
    payload !== null &&
    "email" in payload &&
    typeof payload.email === "string"
      ? normalizeEmail(payload.email)
      : "";

  if (!isValidEmail(invitedEmail)) {
    return badRequestResponse("Invalid email");
  }

  if (identity.primaryEmail && invitedEmail === identity.primaryEmail) {
    return badRequestResponse("Owner is already a member");
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId: membership.projectId,
        collaboratorEmail: invitedEmail,
      },
      select: {
        id: true,
        collaboratorEmail: true,
      },
    });

    return Response.json(
      {
        collaborator: {
          id: collaborator.id,
          email: collaborator.collaboratorEmail,
        },
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Collaborator already exists" }, { status: 409 });
  }
}
