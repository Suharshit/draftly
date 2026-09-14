import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// The landing page is authored in app/(marketing)/landing/page.tsx for easy editing,
// but served here at `/`; next.config.ts redirects `/landing` back to `/`.
import LandingPage from "./(marketing)/landing/page";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/editor");
  }

  // Rendered in place (no second redirect), so signing out to `/` lands straight on the landing page.
  return <LandingPage />;
}
