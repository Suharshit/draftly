import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/** Lands here after GitHub/Google; Clerk completes the sign-in (or transfers to sign-up) and redirects on. */
export default function SsoCallbackPage() {
  return (
    <div className="border border-ink/80 bg-paper-bright rounded-paper shadow-lifted px-(--space-5) py-(--space-6) text-center">
      <p className="font-hand text-(length:--text-annotation-max) leading-none text-ink">signing you in&hellip;</p>
      <AuthenticateWithRedirectCallback signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
      {/* Bot protection is on for sign-up; an SSO transfer to sign-up needs this mount point. */}
      <div id="clerk-captcha" />
    </div>
  );
}
