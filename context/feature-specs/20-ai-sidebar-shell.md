Complete the existing AI sidebar placeholder and turn it into a proper floating chat sidebar component. The sidebar already exists, so keep the current floating placement and smooth slide-in behavior from the right side. This unit is focused on building UI inside it.

## Implementation Details for the AI Agent

### 1. Component Structure
- **Target File:** Extract the sidebar content into a new component `components/editor/ai-sidebar.tsx`.
- Keep the open/close state controlled by the parent (`editor-shell.tsx` or similar).
- Preserve the existing slide animation, floating position, and container boundaries.
- **Surface Styling:** Use standard tailwind styles, e.g., `bg-background` or `bg-card`, `border-border`.

### 2. Sidebar Header
- **Layout:** Flex container, items centered, justify between.
- **Title/Subtitle:**
  - Title: "AI Workspace" (`text-sm font-semibold text-foreground`)
  - Subtitle: "Collaborate with Ghost AI" (`text-xs text-muted-foreground`)
- **Icons:** Use `Bot` from `lucide-react`.
- **Close Button:** Add a close button aligned to the right using `X` from `lucide-react` triggers the `onClose` prop.

### 3. Tabbed Layout (shadcn `Tabs`)
- Implement a tabs layout using `@/components/ui/tabs`.
- **Tabs:** "AI Architect" and "Specs".
- **Styling:** Set the default selected tab to "architect". Ensure TabsList spans the full width.

### 4. AI Architect Tab Content
- Use a `ScrollArea` (`@/components/ui/scroll-area`) to hold the mock chat log.
- **Empty State:**
  - Bot Icon
  - Text: "How can I help you design your architecture?"
  - **Starter Chips:** Provide three mock chips: "Design an e-commerce backend", "Create a chat app architecture", "Build a CI/CD pipeline". Style as small soft pills (`bg-muted text-muted-foreground text-xs`).
- **Mock Messages:**
  - User: Right-aligned, `bg-primary text-primary-foreground` or `bg-secondary`.
  - Assistant: Left-aligned, `bg-muted text-foreground`.
- **Input Area:**
  - Wrap inside a form or standard div pinned to the bottom.
  - Use `react-textarea-autosize` for auto-resizing, or a standard Textarea component with a fixed/max height.
  - Buttons: Send button using `Button` with `Send` from `lucide-react`.
  - Behavior Notes (no JS logic needed yet, just mock the UI): pressing Enter should submit, Shift+Enter adds newline.

### 5. Specs Tab Content
- **Action Button:** "Generate Spec" (`Button` component, `bg-primary`).
- **Demo Spec Card:**
  - `Card` component (`bg-card border-border`).
  - Icon: `FileText` from `lucide-react`.
  - Content: Document title and short snippet/excerpt.
  - Action: Include a visually disabled "Download" button (`lucide-react` `Download` icon).

### 6. Styling Guidelines
- Use Shadcn/standard Tailwind variable names (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`).
- Follow `context/ui-context.md` concepts.

## Scope Limits
- **NO** backend integration or API calls.
- **NO** Liveblocks or actual AI generation logic.
- Focus purely on a solid, responsive, pixel-perfect UI.