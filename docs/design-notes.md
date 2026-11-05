# Admin panel design notes

## Brief and direction

Build an account-scoped admin workspace for creating dynamic QR codes, managing destinations and seeing recorded scans. Preserve the QR2Share name and the existing printed QR logo. Desktop and mobile layouts should support the same core tasks.

Three composition approaches were considered: a compact operations table, a visual card studio, and an editorial dashboard with a persistent sidebar. The implemented dashboard uses a table as the default library and offers a card view. It puts creation first while keeping management and real metrics close by.

The visual system uses warm off-white surfaces, deep green text, a restrained teal primary action and low-saturation status accents. Locally bundled DM Sans supports UI labels; Manrope establishes page and section hierarchy. The original branding image used by server-generated QR codes is unchanged. The browser uses a compact wordmark and QR icon for navigation.

## Guidance and evidence

The Infographic Artist plugin was attempted but its server reported a monthly function limit. Its bundled reference was used locally; no successful remote critique or generated design directions are claimed.

Selected library concepts were relative proximity (PER-01), priority hierarchy (PER-14), text contrast (INF-14), control contrast (INF-15), and spacing/hierarchy (INF-20). Practical translations are grouped summary metrics, a reserved primary-action color, distinct content regions, consistent navigation and clear spacing between forms. These are design choices, not measured user-study results.

Reference scopes: the bundled [Gestalt review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/) supports perceptual grouping, not a universal pixel-spacing rule; the [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [control contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) apply to actual foreground/background pairs, not an aggregate aesthetic score.

Secondary text was darkened and supplementary labels raised to at least 11px. Native dialogs provide browser focus containment; buttons and links have focus indicators; motion is disabled when the user requests reduced motion. Status includes a text label as well as color. Charts expose daily values through an accessible description. The UI remains usable with system-font fallbacks.

Browser checks inspect desktop/mobile rendering, navigation, forms, dialogs, downloads and the full dynamic-link workflow. Recognition, comprehension and aesthetic preference have not been evaluated with human participants. Technical browser tests are not a full accessibility certification.

## Content workflow correction

Files and products are first-class navigation sections. The layout makes the sequence explicit: add an image/video/URL file, attach it to a named product, then assign the product to a QR. Preselected file/product actions connect the three screens without silently creating hidden entities. Type labels and icons distinguish images, videos and URLs, and usage counts explain disabled deletes. The QR dialog selects a product rather than presenting a website-only form.

## Category and campaign organization

Dedicated sidebar pages expose categories and campaigns as reusable entities. The category editor pairs product selection with an ordered list and explicit move controls. The campaign editor pairs a product/category picker with mixed entries and shows the distinct eligible count beside its random rule. Desktop columns stack on mobile. Labels explain that category contents stay live and duplicates count once; saved entry order is organizational, while random playback selects one product per scan. The QR dialog offers Single product/Campaign targets using the same permanent-code workflow. Desktop and 390-pixel mobile browser scenarios verify the forms and horizontal fit.

## Weights and scan details

Campaign editors show one weight per distinct expanded product, defaulting to 1, alongside its percentage and an equal-weight reset. Analytics pairs a compact scan table with a full field/value dialog so long fingerprints, user agents and parameters remain inspectable. Filters, pagination and an explicit refresh sit with the table; horizontal overflow stays inside the table region on mobile. Missing metadata is labeled rather than inferred. See [analytics](analytics.md) and [weights](campaign-weights.md).

## Analytics navigation and search

Overview charts and the scan record table occupy separate tab-style navigation views. A roomier search field, independent QR selector, result count and clear controls make scan filtering more visible on desktop and stack on mobile. Per-QR menus, previews and linked scan counts lead directly to the filtered Scan details view. The URL preserves the chosen view and QR filter.

## Visitor table and profile refresh

Visitors now has a dedicated audience workspace rather than requiring owners to interpret repeated scan rows. The layout applies [Material data-table guidance](https://m2.material.io/develop/web/components/data-tables): one entity per row, clear column hierarchy, nearby search/filter/sort controls, numeric activity summaries and pagination beneath the table. This visitor view uses QR2Share's existing colors, fonts, icons and native controls. The later MUI migration starts with Spaces controls, as described below.

Readable pseudonyms, explicit recognition badges, compact device/location summaries and one primary profile action establish hierarchy. Raw identifiers and JSON move into Advanced profile details, while scan history retains the complete evidence. Missing locations remain unavailable; no personal name or verified identity is fabricated. Profiles resolve current asset names when available and retain reference fallbacks for missing records.

Mobile visitor rows become labeled cards with profile and history actions. Desktop/mobile browser checks cover grouping, shared fingerprint separation, sorting, search, empty results, paging, profile readability and browser-history links. Screenshots are visual inspection artifacts, not proof of a full accessibility audit.

The Scan details Visitor column also uses a compact identity block, a recognition badge and lightweight history/similar-browser links. Raw fingerprint hashes remain in full details rather than crowding each row; profile access is the visitor label itself. The audience selector follows the table filter styling.

## Standing UI completion requirement

This applies to **every future feature affecting the UI**, not only the Spaces refresh. A feature is not finished simply because its logic works or its tests pass. Open it in a real browser, inspect desktop and mobile rendering, and improve anything that looks broken, awkward, or unfinished before reporting completion. Review layout, spacing, hierarchy, readability, focus, control sizing, and the relevant populated/loading/empty/error states. Include long content and narrow screens where appropriate. Screenshots support review; they do not replace looking at the rendered UI. Disclose any material unresolved limitation.

The repository's [AGENTS.md](../AGENTS.md) records this as a persistent working rule for future changes.

## Spaces visual review

Spaces uses bounded QR previews, aligned card actions, explicit status styling, grouped search/filter controls, and dedicated editor/QR-dialog layouts. Welcome text is a clamped preview; full text remains editable in Settings. Cards expose only the Message Circle welcome preview rather than arbitrary configuration values. Error and empty states are mutually exclusive. Desktop/mobile browser scenarios exercise QR image bounds, dialog overflow, long content, filter reset, and loading/error/empty states. Keep the existing Plugins/Spaces names during this layout work; naming changes are a separate decision.

## Material UI adoption

The admin's first MUI migration covers Spaces controls and dialogs. A shared QR2Share theme supplies form, button, menu, and dialog styling; legacy native control rules exclude MUI inputs and labels. Layout remains feature-owned. This replaces native-control styling patches in the migrated forms while retaining the palette and typography. See [admin UI foundation](admin-ui-foundation.md). MUI does not replace the standing rendered visual-review requirement.
