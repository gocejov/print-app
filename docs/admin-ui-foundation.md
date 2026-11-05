# Admin UI foundation: Material UI

The admin now uses Material UI (`@mui/material`) with Emotion. The shared theme in `client/src/app/theme.ts` defines QR2Share's green palette, locally bundled DM Sans/Manrope typography, outlined form fields, buttons, menus, and dialog styling. `ThemeProvider` wraps the React admin. No global `CssBaseline` is added during this incremental migration, so existing pages retain their established layout.

The installation follows the [official MUI installation](https://mui.com/material-ui/getting-started/installation/) and [theming](https://mui.com/material-ui/customization/theming/) guidance. Packages and resolved versions are recorded in the client package files. Lucide remains the icon library; no extra icon font or external font service is required.

## First migrated area

Spaces now uses MUI TextField controls for search, names, and multiline configuration; MUI select menus for plugin selection/filtering; MUI buttons and icon buttons for actions; MUI alerts for failures; and MUI dialogs for creating/editing spaces and viewing the QR. Configuration validation, server API payloads, QR images, and saved data remain unchanged.

`client/src/components/admin-dialog.tsx` is the shared dialog wrapper. It provides an accessible unique title, close control, and a busy guard. MUI supplies focus containment, focus restoration, Escape/backdrop behavior, portal rendering, and scroll management. Forms use a scrollable DialogContent area and a separate DialogActions footer. Closing and editing controls are disabled while a save is in progress.

MUI selects use accessible combobox/listbox behavior rather than a browser-native select. Tests interact with menu options accordingly. Text fields retain explicit labels, required state, maximum lengths, and configuration character counts.

## Migration rules

- Use the shared theme and MUI primitives for new or migrated admin controls. Configure visual defaults in the theme rather than repeating input border/padding/focus CSS in each feature.
- Use `AdminDialog` for MUI forms. Avoid nesting portaled select menus inside the legacy native-dialog wrapper; migrate the containing dialog with its controls.
- Do not apply legacy `.btn`, `.search-field`, `.select-control`, or native form overrides to MUI components. Legacy native input/textarea/label rules explicitly exclude MUI classes.
- Use layout CSS or `sx` for arranging content. Keep data operations and validation in existing feature/service boundaries.
- Migrate remaining admin pages incrementally; do not claim the whole app uses MUI. Public QR collection, media, and Message Circle pages keep their independent lightweight styles.
- Continue the mandatory [visual completion review](design-notes.md#standing-ui-completion-requirement): real desktop/mobile rendering, dialogs and menus, keyboard behavior, long content, and relevant loading/error/empty states.

## Verification

Spaces browser checks cover create/edit persistence, real select menu interaction, bounded QR previews, mobile dialog overflow, long content, search reset, and separate loading/error/empty states. The Message Circle browser flow verifies that using the new admin controls still creates and operates the same public game.

The Files create/edit form also uses `AdminDialog` and MUI controls, including the Text poster editor, font/background menus, and live preview. File library listing and preview dialogs retain their existing styling during incremental migration.
