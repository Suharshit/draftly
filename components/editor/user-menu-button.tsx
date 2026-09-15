"use client";

import type { ComponentProps } from "react";
import { UserButton } from "@clerk/nextjs";

type UserButtonAppearance = NonNullable<ComponentProps<typeof UserButton>["appearance"]>;

const hairline = "1px solid color-mix(in srgb, var(--ink) 15%, transparent)";
const focusRing = {
  outline: "2px solid color-mix(in srgb, var(--ink) 60%, transparent)",
  outlineOffset: "2px",
};

function getUserMenuAppearance(avatarSize: string): UserButtonAppearance {
  return {
    // Clerk's `dark` base theme (set on ClerkProvider) only sets variables, so these win for this menu.
    variables: {
      colorBackground: "var(--paper-bright)",
      colorForeground: "var(--ink)",
      colorMutedForeground: "var(--ink-soft)",
      colorMuted: "var(--paper-cream)",
      colorNeutral: "var(--ink)",
      colorPrimary: "var(--ink)",
      colorPrimaryForeground: "var(--paper-cream)",
      colorInput: "var(--paper-bright)",
      colorInputForeground: "var(--ink)",
      colorBorder: "var(--ink)",
      colorDanger: "var(--paper-pin-red)",
      colorRing: "var(--ink)",
      fontFamily: "var(--font-brand-primary)",
      borderRadius: "var(--corner-radius-paper-max)",
    },
    elements: {
      userButtonTrigger: {
        borderRadius: "9999px",
        "&:focus": { boxShadow: "none" },
        "&:focus-visible": focusRing,
      },
      userButtonAvatarBox: {
        width: avatarSize,
        height: avatarSize,
        border: "1px solid color-mix(in srgb, var(--ink) 40%, transparent)",
      },
      userButtonPopoverCard: {
        width: "22rem",
        backgroundColor: "var(--paper-bright)",
        border: "1px solid var(--ink)",
        borderRadius: "var(--corner-radius-paper-max)",
        boxShadow: "var(--shadow-flat)",
        colorScheme: "light",
      },
      userButtonPopoverMain: {
        backgroundColor: "var(--paper-bright)",
        border: "none",
        borderRadius: "0",
        boxShadow: "none",
      },
      userPreview: {
        padding: "1.25rem 1.5rem",
        gap: "1rem",
      },
      userPreviewAvatarBox: {
        width: "3.25rem",
        height: "3.25rem",
        border: "1px solid var(--ink)",
        backgroundColor: "var(--paper-cream-rule)",
      },
      userPreviewMainIdentifier: {
        color: "var(--ink)",
        fontSize: "1.0625rem",
        fontWeight: "600",
      },
      userPreviewSecondaryIdentifier: {
        color: "var(--ink-soft)",
        fontSize: "0.875rem",
      },
      userButtonPopoverActions: {
        borderTop: hairline,
        padding: "0.375rem 0",
      },
      userButtonPopoverActionButton: {
        gap: "1rem",
        padding: "0.875rem 1.5rem",
        border: "none",
        color: "var(--ink)",
        fontSize: "0.9375rem",
        fontWeight: "500",
        opacity: "1",
        "&:hover": { backgroundColor: "var(--paper-cream)", color: "var(--ink)" },
        "&:focus-visible": { ...focusRing, outlineOffset: "-2px" },
      },
      userButtonPopoverActionButtonIcon: {
        width: "1.125rem",
        height: "1.125rem",
        color: "var(--ink)",
        opacity: "1",
      },
      userButtonPopoverFooter: {
        backgroundColor: "var(--paper-cream)",
        backgroundImage: "none",
        borderTop: hairline,
      },
      footer: {
        backgroundColor: "var(--paper-cream)",
        backgroundImage: "none",
      },
    },
  };
}

interface UserMenuButtonProps {
  /** Trigger avatar size as a CSS length. */
  avatarSize?: string;
}

/** Clerk's user menu (avatar trigger + popover) styled with the brand paper tokens. */
export function UserMenuButton({ avatarSize = "2.5rem" }: UserMenuButtonProps) {
  return <UserButton appearance={getUserMenuAppearance(avatarSize)} />;
}
