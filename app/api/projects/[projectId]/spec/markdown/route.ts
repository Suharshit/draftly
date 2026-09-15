import { auth } from "@clerk/nextjs/server";

import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { toSpecFileName } from "@/lib/spec/spec-file-name";
import { readSpecMarkdown } from "@/lib/spec/spec-store";

type SpecMarkdownRouteContext = { params: Promise<{ projectId: string }> };

/** Downloads the project's latest spec as a Markdown file. */
export async function GET(_request: Request, context: SpecMarkdownRouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const { primaryEmail } = await getCurrentIdentity();
  const project = await getAccessibleProject(userId, primaryEmail, projectId);
  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const markdown = await readSpecMarkdown(project.id);
  if (markdown === null) {
    return Response.json({ error: "No spec has been generated yet" }, { status: 404 });
  }

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${toSpecFileName(project.name)}"`,
      "Cache-Control": "no-store",
    },
  });
}
