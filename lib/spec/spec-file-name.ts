/** Download file name for a project's spec: `payments-service-spec.md` from "Payments Service". */
export function toSpecFileName(projectName: string): string {
  const slug = projectName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${slug || "draftly"}-spec.md`;
}
