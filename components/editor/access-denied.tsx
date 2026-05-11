import Link from "next/link";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center rounded-md border border-border bg-card/60 p-8 text-center">
        <div className="mb-4 rounded-md border border-border bg-background/60 p-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">You do not have access to this workspace.</p>
        <Link href="/editor" className={buttonVariants({ className: "mt-6" })}>
          Back to projects
        </Link>
      </div>
    </div>
  );
}
