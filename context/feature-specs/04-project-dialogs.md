## Goal

Build the `/editor` home screen and add project dialogs/sidebar actions. No API calls or persistence yet.
## Editor Home

Reuse the existing editor layout. Do not modify the navbar or sidebar behaviour.

In the center of the page, add:

- heading: `Create a project or open an existing one`
- heading: `Create a project or open an existing one`- `New Project` button with a `Plus` icon

Keep the layout minimal. Do not wrap this content in cards.

Clicking `New Project` should open the Create Project dialog.

## Dialogs

### Create Project

- project name input
- live slug preview based on the name
- preview updates as the user types

### Rename Project

- prefilled project name input
- current project name shown in the description
- input auto-focuses
- Enter submits

### Delete Project

- destructive confirmation only
- no input
- confirm button uses destructive styling

## Sidebar

Add project item actions:

- rename
- delete

Show actions only for owned projects.

Hide actions for shared/collaborator projects.

On mobile:
- tapping outside the sidebar closes it
- add a backdrop scrim

## Implementation

Create a dedicated hook to manage:

- dialog state
- form state
- loading state

Wire:

- editor home `New Project` -> Create dialog
- sidebar create -> Create dialog
- sidebar rename -> Rename dialog
- sidebar delete -> Delete dialog

Use mock Project data only. Do not add API calls or presistence.

Use mock Project data only. Do not add API calls or persistence.
- sidebar actions are wired
- slug preview works
- no TypeScript errors
- no lint errors