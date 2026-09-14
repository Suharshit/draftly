"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";

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

type Step = "identifier" | "password" | "email-code" | "trust-code" | "totp";

const SSO_CALLBACK_PATH = "/sign-in/sso-callback";

export function SignInCard({ redirectUrl }: { redirectUrl?: string }) {
  const { signIn, errors, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<Step>("identifier");
  const [email, setEmail] = useState("");
  const [trustChannel, setTrustChannel] = useState<"email" | "phone">("email");
  const [localError, setLocalError] = useState<string | null>(null);
  // `pending` spans a whole submit (which can chain several Clerk requests); `redirecting` holds the
  // loading state from finalize until navigation lands, so the button never flashes back to "Continue".
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const loading = pending || redirecting;
  const busy = loading || fetchStatus === "fetching" || !clerk.loaded;
  const lastUsed = clerk.client?.lastAuthenticationStrategy ?? null;
  const lastUsedEmail = lastUsed === "email_code" || lastUsed === "password" || lastUsed === "email_address";
  const globalError = messageOf(errors.global?.[0] as AuthMessage) ?? localError;

  const supportsFirstFactor = (strategy: string) =>
    signIn.supportedFirstFactors.some((factor) => factor.strategy === strategy);

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

  async function finish() {
    setRedirecting(true);
    const { error } = await signIn.finalize({
      navigate: navigateAfterAuth(router.push, toSafeDestination(redirectUrl)),
    });
    if (error) setRedirecting(false);
  }

  /** Routes the flow after any factor succeeds: done, device trust, or MFA. */
  async function advance() {
    if (signIn.status === "complete") {
      await finish();
      return;
    }

    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const factors = signIn.supportedSecondFactors.map((factor) => factor.strategy as string);

      if (signIn.status === "needs_second_factor" && factors.includes("totp")) {
        setStep("totp");
        return;
      }
      if (factors.includes("email_code")) {
        const { error } = await signIn.mfa.sendEmailCode();
        if (!error) {
          setTrustChannel("email");
          setStep("trust-code");
        }
        return;
      }
      if (factors.includes("phone_code")) {
        const { error } = await signIn.mfa.sendPhoneCode();
        if (!error) {
          setTrustChannel("phone");
          setStep("trust-code");
        }
        return;
      }
    }

    setLocalError("This account needs a verification step this form doesn't support yet.");
  }

  async function handleSso(strategy: SsoStrategy) {
    setLocalError(null);
    await signIn.sso({
      strategy,
      redirectUrl: toSafeDestination(redirectUrl),
      redirectCallbackUrl: SSO_CALLBACK_PATH,
    });
  }

  async function handleIdentifier() {
    setLocalError(null);

    const { error } = await signIn.create({ identifier: email.trim() });
    if (error) return;

    if (supportsFirstFactor("password")) {
      setStep("password");
    } else if (supportsFirstFactor("email_code")) {
      await sendEmailCode();
    } else {
      setLocalError("No supported sign-in method is available for this account.");
    }
  }

  async function sendEmailCode() {
    const { error } = await signIn.emailCode.sendCode();
    if (!error) setStep("email-code");
  }

  async function handlePassword(form: HTMLFormElement) {
    const password = String(new FormData(form).get("password") ?? "");
    const { error } = await signIn.password({ identifier: email.trim(), password });
    if (!error) await advance();
  }

  async function handleCode(form: HTMLFormElement) {
    const code = String(new FormData(form).get("code") ?? "").trim();

    const { error } =
      step === "email-code"
        ? await signIn.emailCode.verifyCode({ code })
        : step === "totp"
          ? await signIn.mfa.verifyTOTP({ code })
          : trustChannel === "email"
            ? await signIn.mfa.verifyEmailCode({ code })
            : await signIn.mfa.verifyPhoneCode({ code });

    if (!error) await advance();
  }

  async function startOver() {
    setLocalError(null);
    await signIn.reset();
    setStep("identifier");
  }

  const subtitle =
    step === "identifier"
      ? "Welcome back! Pick up where the canvas left off"
      : step === "password"
        ? "Enter your password to continue"
        : step === "totp"
          ? "Enter the code from your authenticator app"
          : `We sent a code to ${step === "trust-code" && trustChannel === "phone" ? "your phone" : email}`;

  return (
    <AuthCard
      title={<AuthTitle before="Sign in to" />}
      subtitle={subtitle}
      error={globalError}
      switchPrompt={{ text: "Don't have an account?", label: "Sign up", href: withRedirect("/sign-up", redirectUrl) }}
    >
      {step === "identifier" ? (
        <>
          <SsoButtons disabled={busy} lastUsed={lastUsed} onSelect={handleSso} />
          <OrDivider />

          <form key="identifier" onSubmit={withPending(handleIdentifier)} noValidate>
            <Field id="email" label="Email address" lastUsed={lastUsedEmail} error={messageOf(errors.fields.identifier)}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.fields.identifier)}
                className={inputClass}
              />
            </Field>
            <SubmitButton loading={loading} disabled={busy || !email.trim()}>
              Continue
            </SubmitButton>
          </form>
        </>
      ) : step === "password" ? (
        // Keyed per step so the password <input> node is never reused by the code form.
        <form key="password" onSubmit={withPending(handlePassword)} noValidate className="mt-(--space-6)">
          <IdentifierChip email={email} onChange={startOver} />
          <Field id="password" label="Password" error={messageOf(errors.fields.password)}>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.fields.password)}
              className={inputClass}
            />
          </Field>
          <SubmitButton loading={loading} disabled={busy}>
            Continue
          </SubmitButton>
          {supportsFirstFactor("email_code") ? (
            <button type="button" onClick={sendEmailCode} disabled={busy} className={quietLinkClass}>
              Email me a code instead
            </button>
          ) : null}
        </form>
      ) : (
        <form key={step} onSubmit={withPending(handleCode)} noValidate className="mt-(--space-6)">
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
          {step === "email-code" ? (
            <button type="button" onClick={sendEmailCode} disabled={busy} className={quietLinkClass}>
              Resend code
            </button>
          ) : null}
        </form>
      )}
    </AuthCard>
  );
}
