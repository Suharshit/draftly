import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

function getRoutePath(envValue: string | undefined, fallback: string) {
  if (!envValue) {
    return fallback;
  }

  try {
    return new URL(envValue).pathname;
  } catch {
    return envValue;
  }
}

const signInPath = getRoutePath(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL, "/sign-in");
const signUpPath = getRoutePath(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL, "/sign-up");

const isPublicRoute = createRouteMatcher([signInPath, `${signInPath}(.*)`, signUpPath, `${signUpPath}(.*)`]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  {
    signInUrl: signInPath,
    signUpUrl: signUpPath,
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ttf|woff2?|ico|json|csv|pdf|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
