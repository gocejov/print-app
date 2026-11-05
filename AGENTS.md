# Project working rules

## UI quality is part of completion

Apply this requirement to every future feature or change that affects a user interface, not just the Spaces page.

- Open the affected UI in a real browser and inspect its rendered appearance before finishing. Passing type checks and automated tests alone does not establish visual quality.
- Review desktop and mobile layouts, including dialogs, forms, primary actions, spacing, hierarchy, readability, and keyboard focus. Check narrower widths and long content when the affected layout could overflow.
- Inspect the relevant loading, empty, error, and populated states. Avoid overlapping controls, accidental page overflow, awkward action wrapping, unbounded images, and misleading simultaneous states.
- If the result looks unfinished, confusing, inconsistent, or visually broken, improve it and inspect it again before reporting the feature complete. Use the existing design system unless a deliberate change is needed.
- Keep screenshots as review evidence where useful and run checks appropriate to the affected behavior. Describe any material unresolved UI limitations honestly; do not claim a visual review that was not performed.

## Documentation

Update related Markdown documentation whenever functionality, behavior, architecture, or user workflows change.

## Admin component foundation

Use the shared Material UI theme and MUI primitives for new or migrated admin controls. Use `AdminDialog` for MUI forms, and avoid mixing MUI portaled menus with the legacy native-dialog wrapper. Keep per-feature CSS focused on layout rather than overriding MUI input internals. Existing admin pages migrate incrementally; public QR/game pages retain their own styles. See `docs/admin-ui-foundation.md`.
