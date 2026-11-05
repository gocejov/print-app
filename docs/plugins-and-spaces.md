# Plugins, spaces, and QR codes

The hierarchy is **Plugin → Space → QR code**. There is no Company entity or Company level. A space's name provides the company, event, or other context, such as “Acme Summer Party”. Existing owner accounts and access scoping still apply.

## Concepts

| Entity | Responsibility | Example |
| --- | --- | --- |
| Plugin definition | Reusable implementation, configuration schema, version, public entry behavior, participant metrics | Message Circle v1 |
| Space | One configured instance of exactly one plugin, with its own participants and content | Acme Summer Party |
| QR code | One permanent entry point assigned to that space | The party's printed QR |

One plugin can power any number of independent spaces. A space cannot combine plugins or change plugin type after creation. Each space currently creates and owns exactly one QR. Many participants use that same QR. Participant identity and message data remain isolated even when the same browser joins two spaces with the same display name.

## Admin workflow

1. Open **Plugins** to see the installed definitions. Message Circle is the first plugin.
2. Choose **Create space**, enter the space name, and fill in the plugin's configuration fields.
3. Save to create the space and its QR together. Download or share the QR from the confirmation.
4. Use **Spaces** to search by name or filter by plugin. **Settings** changes the name and configuration without replacing the QR, memberships, or messages.
5. Pause or resume through the space card. QR visitor analytics are linked from the card. QR library entries have type **Space** and a **Manage space** action.

The previous `/admin/games` page redirects to `/admin/spaces`. The public Message Circle page remains a game for its participants; the admin concepts describe how that game is instantiated and managed.

## API

All management endpoints require the normal owner session and existing write-origin protections.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/plugins` | Installed plugin metadata and configuration field descriptors; excludes executable handlers |
| GET | `/api/spaces` | Owner's spaces, normalized configuration, associated QR, and participant counts |
| GET | `/api/spaces?pluginId=message-circle` | Spaces using one supported plugin |
| POST | `/api/spaces` | Create a space and its one QR |
| PATCH | `/api/spaces/:id` | Change `name` and/or complete `configuration`; plugin ID, version, ownership, and QR are immutable here |
| GET | `/spaces/:id/open` | Resolve the space and redirect to its plugin's public entry |
| PATCH | `/api/qrcodes/:id` | Existing active/paused status controls apply to space QRs |

Create request:

```json
{
  "pluginId": "message-circle",
  "name": "Acme Summer Party",
  "configuration": {
    "welcome": "Welcome to our summer party. Enter your name to join!"
  }
}
```

The server selects the installed plugin version. Configuration is validated by the plugin, using an explicit field allowlist. Unsupported plugin IDs, invalid configuration, extra fields, cross-owner changes, and attempts to change the plugin are rejected. Creation renders the QR before inserting records and compensates only newly allocated IDs on failure. Changing settings does not redraw the QR.

QR target editing cannot turn a space QR into a product or campaign or add a visitor-specific product override. Use a new space for a different plugin. Pausing blocks the normal QR entry and the public plugin's participant operations. Space settings can still be edited while paused.

## Plugin contract

`src/features/plugins/plugin.registry.ts` defines a server-controlled registry. Each definition supplies:

- Stable ID, integer version, name, category, description, and participant label.
- Configuration field metadata for the shared React space editor.
- A server-side configuration validator, which is authoritative.
- A public entry-path resolver and space-scoped participant metrics.

The Message Circle handler retains its existing public routes, cookie, participant authorization, and text-message inbox. Generic space services validate the installed definition/version and reciprocal QR reference before dispatch. The public Message Circle routes also reject spaces belonging to another plugin.

To add a plugin, implement its public behavior and data authorization, register the definition and configuration validator, and mount its public routes. The catalog, space editor, space list, and QR entry reuse the common layer. Definitions are shipped as trusted application code in this version; there is no arbitrary-code upload, remote installation, marketplace, or mixed-plugin hub.

## Compatibility and persistence

The existing `games` collection is reused for spaces, preserving every ID. The `SpaceModel` keeps the original Mongoose model identity (`games`) so old references remain valid. New records contain `pluginId`, `pluginVersion`, and `configuration`. Legacy records resolve `kind: message-circle` (or its historical default), version 1, and `{welcome}` without a bulk migration. Saving a legacy space normalizes its metadata and keeps its QR reference.

New QR records use `space`; old records retain `game`. Validation allows exactly one product, campaign, space, or legacy game target. Both space target forms resolve through the same service. Existing `/api/games` remains a compatibility adapter for Message Circle, and existing `/games/:id` public links, room cookie names and paths, hash inputs, participant IDs, and message references do not change. New scan continuations use `spaceId`; already issued `gameId` continuations remain supported.

The old participant/message collection fields remain named `game` for compatibility; they refer to the space ID. This avoids rewriting live message history or invalidating sessions. Keeping these storage aliases is intentional, not an additional level in the product hierarchy.

## Verification

The backend game integration test covers catalog metadata, unsupported plugins, configuration validation, owner boundaries, multiple spaces under one plugin, distinct participants, settings edits, QR stability, and legacy records lacking new metadata. Browser tests cover catalog-to-space creation, settings, search, the old admin URL, mobile layout, and the complete Message Circle flow using a new space QR.

The optional generic public entry uses `/spaces/:id/open` rather than a two-segment path, preserving existing QR scan links that already use `spaces` as a custom alias.

New `space` QR targets require this release or a newer compatible server. Existing legacy games remain readable without data rewriting, but downgrading to an older server will not provide entry to newly created space-target QRs. Back up before production changes and retain the current image for rollback planning.

## UI review and layout

The Spaces page now groups search and plugin filters, reports matching results, uses consistent card actions and text-based status badges, and separates populated, loading, error, and empty states. QR previews have an explicit square size rather than inheriting an image's intrinsic dimensions. The editor has styled fields and a persistent action footer; it disables closing while a save is running. Long welcome messages are previews on cards and remain complete in Settings. See the [standing UI completion requirement](design-notes.md#standing-ui-completion-requirement), which applies to all future UI work.

Spaces form controls, select menus, buttons, error alerts, and create/settings/QR dialogs now use the [shared MUI admin foundation](admin-ui-foundation.md). Server configuration validation, space ownership, participant data, and QR link behavior are unchanged.
