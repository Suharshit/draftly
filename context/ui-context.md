# UI Context

## Surfaces

Two separate visual systems live in this app and must not be mixed:

1. **Product (app, editor, auth)** — the dark technical workspace documented below.
2. **Marketing (`app/(marketing)`)** — the Lab-site brand & craft system v1 defined in
   `app/globals.css` (Sept 2026). Marketing surfaces use **only** the brand tokens
   (`--mat-green`, `--paper-cream`, `--ink`, paper accents, `--font-brand-*`, the
   `--text-*` brand scale, `--shadow-flat` / `--shadow-lifted`, `--space-*`). They must
   not use the product tokens (`--bg-base`, `--accent-primary`, `--border-default`, …)
   or `components/ui/button.tsx` and the other shadcn primitives, which are themed for
   the product surface.

Marketing components live in `components/ui/marketing/` and are exported from its
barrel: `MarketingNavbar`, `MarketingButton`, `HandwrittenNote`,
`HandwrittenAnnotation`, `PinnedPhoto`, `CanvasMockup`. The brand spec's rules are the
contract: hard offset shadows only (no blur-only, no glass), corner radius capped at
2px (`rounded-paper`), one green plus one cream ground, object rotation inside ±8deg,
handwriting (Caveat) reserved for the human voice, mono (JetBrains Mono) reserved for
decorative chrome, and decorative craft objects marked `aria-hidden`.

## Theme (product surface)

Dark only. No light mode. The design language is a dark technical workspace — near-black backgrounds, layered surfaces, and vivid accent colors for interactive elements. High contrast interfaces with professional, system-level visual hierarchy.

## Colors

All components must use these tokens — no hardcoded hex values.

| Role            | CSS Variable       | Value     |
| --------------- | ------------------ | --------- |
| Page background | `--bg-base`        | `#09090b` |
| Surface         | `--bg-surface`     | `#18181b` |
| Primary text    | `--text-primary`   | `#fafafa` |
| Muted text      | `--text-muted`     | `#a1a1aa` |
| Primary accent  | `--accent-primary` | `#3b82f6` |
| Border          | `--border-default` | `#27272a` |
| Error           | `--state-error`    | `#ef4444` |
| Success         | `--state-success`  | `#22c55e` |

## Typography

| Role      | Font       | Variable      |
| --------- | ---------- | ------------- |
| UI text   | Geist Sans | `--font-sans` |
| Code/mono | Geist Mono | `--font-mono` |

## Border Radius

Standardized radii for consistent depth and feel.

| Context           | Class             | Value  |
| ----------------- | ----------------- | ------ |
| Inline / small UI | `rounded-sm`      | `2px`  |
| Cards / panels    | `rounded-md`      | `6px`  |
| Modals / overlays | `rounded-lg`      | `8px`  |

## Component Library

Shadcn/ui on top of Tailwind CSS. Components live in `components/ui/`. Use the CLI to add new components rather than writing from scratch. Ensure project-specific feature logic is kept out of these base components.

## Layout Patterns

- **Editor Workspace**: Full-viewport split with left explorer, center collaborative canvas, and right property inspector.
- **Sidebars**: Fixed width (approx. 240px-300px) with thin border separators.
- **Canvas Overlay**: Floating controls for zoom, mini-map, and AI prompt input.
- **Modals**: Centered overlays with heavy backdrop blur (`backdrop-blur-sm`).

## Icons

Lucide React. Stroke-based icons only. Sizes: `h-4 w-4` for inline UI elements, `h-5 w-5` for primary buttons and nav items.

