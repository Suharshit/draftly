# UI Context

## Theme

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

