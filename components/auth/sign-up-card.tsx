"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignUp } from "@clerk/nextjs";

import {
  AuthCard,
  AuthTitle,
  Field,
  IdentifierChip,
  OrDivider,
  SsoButtons,
  SubmitButton,
  codeInputClass,
  inputClass,
  messageOf,
  navigateAfterAuth,
  quietLinkClass,
  toSafeDestination,
  withRedirect,
  type AuthMessage,
  type SsoStrategy,
} from "./auth-card";

type Step = "details" | "password" | "email-code";

const SSO_CALLBACK_PATH = "/sign-up/sso-callback";
const DETAIL_PARAMS = new Set(["email_address"]);

export function SignUpCard({ redirectUrl }: { redirectUrl?: string }) {
  const { signUp, errors, fetchStatus } = useSignUp();
  const clerk = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  // `pending` spans a whole submit (which can chain several Clerk requests); `redirecting` holds the
  // loading state from finalize until navigation lands, so the button never flashes back to "Continue".
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const loading = pending || redirecting;
  const busy = loading || fetchStatus === "fetching" || !clerk.loaded;
  const globalError = messageOf(errors.global?.[0] as AuthMessage) ?? localError;

  /** Wraps a submit handler so the CTA shows "Loading…" for its full duration and double submits are ignored. */
  function withPending(handler: (form: HTMLFormElement) => Promise<void>) {
    return async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (loading) return;
      const form = event.currentTarget;
      setPending(true);
      try {
        await handler(form);
      } finally {
        setPending(false);
      }
    };
  }

  /** Routes the flow after each request: done, email verification, or an unsupported requirement. */
  async function advance() {
    if (signUp.status === "complete") {
      setRedirecting(true);
      const { error } = await signUp.finalize({
        navigate: navigateAfterAuth(router.push, toSafeDestination(redirectUrl)),
      });
      if (error) setRedirecting(false);
      return;
    }

    if (signUp.unverifiedFields.includes("email_address")) {
      await sendEmailCode();
      return;
    }

    setLocalError("Your account needs a detail this form doesn't collect yet.");
  }

  async function sendEmailCode() {
    const { error } = await signUp.verifications.sendEmailCode();
    if (!error) setStep("email-code");
  }

  async function handleSso(strategy: SsoStrategy) {
    setLocalError(null);
    const { error } = await signUp.sso({
      strategy,
      redirectUrl: toSafeDestination(redirectUrl),
      redirectCallbackUrl: SSO_CALLBACK_PATH,
    });
    // A failed redirect otherwise leaves the button doing nothing, with no message anywhere.
    if (error) {
      console.error("SSO sign-up failed", error);
      setLocalError(messageOf(error as AuthMessage) ?? "Couldn't start sign-up. Please try again.");
    }
  }

  async function handleDetails() {
    setLocalError(null);

    // Register the email with Clerk now, so an address that already has an account is rejected
    // on this step instead of after the user has chosen a password.
    const { error } = await signUp.create({ emailAddress: email.trim() });
    if (!error) setStep("password");
  }

  async function handlePassword(form: HTMLFormElement) {
    const password = String(new FormData(form).get("password") ?? "");

    const { error } = await signUp.password({ emailAddress: email.trim(), password });

    if (error) {
      // Email errors (e.g. an address that's already taken) are shown next to the field, so step back to it.
      // The hook's `errors` is stale inside this handler; read the params off the returned API error instead.
      const params = "errors" in error && Array.isArray(error.errors)
        ? (error.errors as { meta?: { paramName?: string } }[]).map((apiError) => apiError.meta?.paramName)
        : [];
      if (params.some((param) => param && DETAIL_PARAMS.has(param))) {
        setStep("details");
      }
      return;
    }

    await advance();
  }

  async function handleCode(form: HTMLFormElement) {
    const code = String(new FormData(form).get("code") ?? "").trim();
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (!error) await advance();
  }

  async function startOver() {
    setLocalError(null);
    await signUp.reset();
    setStep("details");
  }

  const subtitle =
    step === "details"
      ? "Start a canvas, invite the room, decide faster"
      : step === "password"
        ? "Choose a password for your account"
        : `We sent a code to ${email}`;

  return (
    <AuthCard
      title={<AuthTitle before="Create your" after="account" />}
      subtitle={subtitle}
      error={globalError}
      switchPrompt={{ text: "Already have an account?", label: "Sign in", href: withRedirect("/sign-in", redirectUrl) }}
    >
      {step === "details" ? (
        <>
          <SsoButtons disabled={busy} onSelect={handleSso} />
          <OrDivider />

          <form key="details" onSubmit={withPending(handleDetails)} noValidate>
            <Field id="email" label="Email address" error={messageOf(errors.fields.emailAddress)}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.fields.emailAddress)}
                className={inputClass}
              />
            </Field>

            <SubmitButton loading={loading} disabled={busy || !email.trim()}>
              Continue
            </SubmitButton>
          </form>
        </>
      ) : step === "password" ? (
        // Each step form gets its own key: otherwise React reuses the same uncontrolled <input> node
        // across steps and the typed password carries over into the verification-code field.
        <form key="password" onSubmit={withPending(handlePassword)} noValidate className="mt-(--space-6)">
          <IdentifierChip email={email} onChange={() => setStep("details")} />
          <Field id="password" label="Password" error={messageOf(errors.fields.password)}>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              placeholder="Create a password"
              aria-invalid={Boolean(errors.fields.password)}
              className={inputClass}
            />
          </Field>
          <SubmitButton loading={loading} disabled={busy}>
            Continue
          </SubmitButton>
        </form>
      ) : (
        <form key="email-code" onSubmit={withPending(handleCode)} noValidate className="mt-(--space-6)">
          <IdentifierChip email={email} onChange={startOver} />
          <Field id="code" label="Verification code" error={messageOf(errors.fields.code)}>
            <input
              id="code"
              name="code"
              type="text"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              aria-invalid={Boolean(errors.fields.code)}
              className={codeInputClass}
            />
          </Field>
          <SubmitButton loading={loading} disabled={busy}>
            Verify
          </SubmitButton>
          <button type="button" onClick={sendEmailCode} disabled={busy} className={quietLinkClass}>
            Resend code
          </button>
        </form>
      )}

      {/* Clerk's bot protection (Turnstile) mounts here; it must stay in the DOM for every sign-up request. */}
      <div id="clerk-captcha" className="mt-(--space-4) flex justify-center empty:hidden" />
    </AuthCard>
  );
}
