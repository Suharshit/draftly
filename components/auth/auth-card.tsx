import type { ReactNode } from "react";
import Link from "next/link";

import { marketingButtonVariants } from "@/components/ui/marketing";
import { cn } from "@/lib/utils";

/** Shared paper-card pieces for the custom Clerk sign-in and sign-up flows. */

export type AuthMessage = { message: string; longMessage?: string } | null | undefined;
export type SsoStrategy = "oauth_github" | "oauth_google";

const IS_DEV_INSTANCE = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ?? false;

/** Only same-origin destinations are honoured; anything else falls back to `/`. */
export function toSafeDestination(raw: string | undefined) {
  if (!raw || typeof window === "undefined") return "/";
  try {
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export function messageOf(error: AuthMessage) {
  return error ? (error.longMessage ?? error.message) : null;
}

/** Builds the `finalize({ navigate })` callback; `decorateUrl` may return an absolute URL for Safari ITP. */
export function navigateAfterAuth(push: (url: string) => void, destination: string) {
  return ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
    const url = decorateUrl(destination);
    if (url.startsWith("http")) {
      window.location.href = url;
    } else {
      push(url);
    }
  };
}

/** Appends `redirect_url` so switching between sign-in and sign-up keeps the destination. */
export function withRedirect(path: string, redirectUrl: string | undefined) {
  return redirectUrl ? `${path}?redirect_url=${encodeURIComponent(redirectUrl)}` : path;
}

export function AuthCard({
  title,
  subtitle,
  error,
  switchPrompt,
  children,
}: {
  title: ReactNode;
  subtitle: string;
  error: string | null;
  switchPrompt: { text: string; label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div
      style={{ rotate: "1deg" }}
      className="relative border border-ink/80 bg-paper-bright rounded-paper shadow-lifted"
    >
      {/* Push-pin holding the sheet to the mat. */}
      <span
        aria-hidden
        className="absolute -top-[7px] left-1/2 size-[14px] -translate-x-1/2 rounded-full bg-paper-pin-red shadow-flat"
      />

      <div className="px-(--space-5) pt-(--space-6) pb-(--space-5) sm:px-(--space-6)">
        <header className="text-center">
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] leading-none text-ink">{title}</h1>
          <p className="mt-(--space-3) font-brand text-[1.0625rem] text-ink-soft">{subtitle}</p>
        </header>

        {error ? (
          <p
            role="alert"
            className="mt-(--space-4) border border-paper-pin-red/60 bg-paper-cream px-(--space-3) py-(--space-2) font-brand text-sm text-paper-pin-red"
          >
            {error}
          </p>
        ) : null}

        {children}

        <p className="mt-(--space-5) text-center font-brand text-[1.0625rem] text-ink-soft">
          {switchPrompt.text}{" "}
          <Link
            href={switchPrompt.href}
            className="font-semibold text-paper-pin-red underline decoration-2 underline-offset-4"
          >
            {switchPrompt.label}
          </Link>
        </p>
      </div>

      <footer className="flex flex-col items-center gap-(--space-2) border-t border-dashed border-ink/30 py-(--space-4) font-mono text-chrome tracking-[0.2em] uppercase">
        <span className="text-ink-soft">Secured by Clerk</span>
        {IS_DEV_INSTANCE ? <span className="text-paper-pin-red">Development mode</span> : null}
      </footer>
    </div>
  );
}

/** Title lockup: Archivo Bold around an Instrument Serif Italic "Draftly". */
export function AuthTitle({ before, after }: { before: string; after?: string }) {
  return (
    <>
      <span className="font-brand font-bold tracking-brand-tight">{before} </span>
      <span className="font-serif font-normal italic">Draftly</span>
      {after ? <span className="font-brand font-bold tracking-brand-tight"> {after}</span> : null}
    </>
  );
}

export const inputClass = cn(
  "min-h-14 w-full border border-ink bg-paper-cream rounded-paper px-(--space-4)",
  "font-brand text-[1.0625rem] text-ink placeholder:text-ink-soft/80",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  "aria-invalid:border-paper-pin-red",
);

export const codeInputClass = cn(inputClass, "font-mono tracking-[0.4em]");

export const quietLinkClass =
  "mt-(--space-4) block w-full text-center font-mono text-chrome tracking-chrome uppercase text-ink-soft underline decoration-ink/30 underline-offset-4 hover:text-ink disabled:opacity-60";

export function LastUsedTag() {
  return (
    <span
      style={{ rotate: "2deg" }}
      className="border border-ink/40 bg-paper-accent-marker-amber px-(--space-2) py-(--space-1) font-mono text-chrome tracking-[0.2em] uppercase text-ink"
    >
      Last used
    </span>
  );
}

export function OrDivider() {
  return (
    <div aria-hidden className="my-(--space-5) flex items-center gap-(--space-4)">
      <span className="flex-1 border-t border-dashed border-ink/35" />
      <span className="font-mono text-chrome tracking-[0.3em] uppercase text-ink-soft">or</span>
      <span className="flex-1 border-t border-dashed border-ink/35" />
    </div>
  );
}

/** GitHub + Google buttons, in wireframe order. */
export function SsoButtons({
  disabled,
  lastUsed,
  onSelect,
}: {
  disabled: boolean;
  lastUsed?: string | null;
  onSelect: (strategy: SsoStrategy) => void;
}) {
  return (
    <div className="mt-(--space-6) flex flex-col gap-(--space-4)">
      <SsoButton
        label="Continue with GitHub"
        icon={<GitHubMark />}
        lastUsed={lastUsed === "oauth_github"}
        disabled={disabled}
        onClick={() => onSelect("oauth_github")}
      />
      <SsoButton
        label="Continue with Google"
        icon={<GoogleMark />}
        lastUsed={lastUsed === "oauth_google"}
        disabled={disabled}
        onClick={() => onSelect("oauth_google")}
      />
    </div>
  );
}

function SsoButton({
  label,
  icon,
  lastUsed,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  lastUsed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      {lastUsed ? (
        <span className="absolute right-0 bottom-full mb-(--space-2)">
          <LastUsedTag />
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex min-h-14 w-full cursor-pointer items-center justify-center gap-(--space-3)",
          "border border-ink bg-paper-bright rounded-paper shadow-flat",
          "font-brand text-[1.0625rem] font-semibold text-ink",
          "transition-[translate,box-shadow] duration-(--duration-hover) ease-(--ease-hover)",
          "hover:-translate-y-0.5 active:translate-y-(--press-translate) active:shadow-none",
          "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

export function Field({
  id,
  label,
  lastUsed = false,
  error,
  children,
}: {
  id: string;
  label: string;
  lastUsed?: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-(--space-2) flex items-end justify-between gap-(--space-3)">
        <label htmlFor={id} className="font-brand text-base font-semibold text-ink">
          {label}
        </label>
        {lastUsed ? <LastUsedTag /> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-(--space-2) font-brand text-sm text-paper-pin-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Ink slab CTA. While `loading`, it stays at full strength and reads "Loading…" so a pending request never looks frozen. */
export function SubmitButton({
  disabled,
  loading = false,
  children,
}: {
  disabled: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        marketingButtonVariants({ variant: "solid" }),
        "mt-(--space-5) min-h-16 w-full text-[1.125rem] focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-flat",
        loading && "cursor-wait disabled:cursor-wait disabled:opacity-100",
      )}
    >
      {loading ? (
        <span role="status">Loading&hellip;</span>
      ) : (
        <>
          {children}
          <span aria-hidden className="text-[0.625rem]">&#9654;</span>
        </>
      )}
    </button>
  );
}

export function IdentifierChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="mb-(--space-4) flex items-center justify-between gap-(--space-3) border border-dashed border-ink/35 px-(--space-3) py-(--space-2)">
      <span className="truncate font-brand text-sm text-ink">{email}</span>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 font-mono text-chrome tracking-chrome uppercase text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        Change
      </button>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6 fill-current">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6 fill-current">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}
