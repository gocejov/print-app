# QR games: Message circle

Message circle is a self-contained game for one QR code. Its participants, names, and messages are separate from every other game, campaign, and product assignment. The first version supports text messages only.

## Host flow

Open **Games → Create game**, enter a name and welcome message, and create the game QR. Download or print that QR. The same permanent scan URL handles both joining and returning to the game. The Games page shows participant counts, links to the game's scan details, and Pause / Resume controls. Pausing blocks the public page, enrollment, participant discovery, sending, and inbox access without deleting messages. Generic QR target editing cannot replace a game's target.

Anyone holding the QR or its URL can join this game. “Closed” means room isolation, rather than invitation approval or an admission password. No participant account or app login is required.

## Player flow

1. Scan the QR, read the host's welcome message, enter a display name, and join.
2. The game opens the player's inbox. A returning scan opens the same inbox on the same browser.
3. Choose **Send a message**, find another participant by name, and send a text message (up to 2,000 characters). Player discovery is searchable and paginated, including games with more than 100 players.
4. Unread messages appear oldest first. **Next message** marks the current message read and opens the next one. The final message has a **Mark as read** button.
5. Opening or leaving a message does not mark it read. **Read messages** retains acknowledged messages and allows reading through them again. **Refresh inbox** or another scan retrieves new messages; there are no push notifications in this version.

Display names are unique within a game (case insensitive and Unicode-normalized). Names are visible to enrolled participants in that game. Text is shown as plain text, including literal HTML-looking text. Names and messages are escaped or inserted using `textContent`; they do not become executable markup.

## Browser identity and privacy

The game uses its own random 256-bit bearer cookie, HttpOnly and SameSite=Lax, Secure on HTTPS/production, scoped to `/games/<gameId>` and valid for 180 days. Only its SHA-256 digest is stored with the participant. The raw cookie is never exposed to JavaScript or returned by APIs. Each game gets a different cookie and participant identity.

The cookie is necessary to retain the participant and private inbox without login. Clearing it, changing browsers, or its expiry loses access to that participant; entering the same display name does not restore access. There is no recovery or cross-device transfer in this first version. A copied QR URL does not copy a participant session. Browser fingerprint similarity never grants access. If an existing analytics visitor cookie is available and Global Privacy Control is not enabled, an owner-scoped visitor ID is retained as optional internal context; that ID cannot authorize a game action. Game enrollment does not alter owner-managed visitor labels.

Standard scan analytics and the browser collection flow still run on the game's QR scans. Inbox reads, message navigation, refreshes, and sending do not create additional QR scan counts. Global Privacy Control still controls analytics recognition; it does not prevent a visitor explicitly joining the game with the separate functional game cookie.

## Module structure

- `src/features/games/game.models.ts`: experience configuration (`kind: message-circle`), participants, immutable text messages, and read acknowledgments.
- `game.service.ts`: QR creation, live status checks, game session identity, and participant authorization.
- `game.routes.ts`: authenticated host APIs and room-scoped participant APIs.
- `game.page.ts` and `public/games/`: mobile public experience, isolated from the authenticated React admin.
- `client/src/features/games/`: React host UI using the shared query cache, modal, QR preview, and navigation.

A QR now has exactly one product, campaign, or game target. Every game allocates one QR and stores the reciprocal reference. Creation renders before inserts and compensates allocated IDs if an insert fails, supporting standalone MongoDB without requiring transactions. Existing files and product APIs are unchanged; participant-authored text is game content rather than an owner-owned file or product.

The game `kind` and message `kind` provide extension points. Future game types can reuse QR entry, participant sessions, scoped delivery, and durable inboxes while adding their own rules. Future image or product rewards should extend typed game content with explicit ownership and delivery checks rather than granting participants access to the admin product APIs.

## API

Host routes require the normal authenticated owner session and write protection:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/games` | Owned games, QR metadata and participant counts |
| POST | `/api/games` | `{name, welcome}` → game and its new QR |
| PATCH | `/api/qrcodes/:id` | `{status: "paused"}` or `"active"` controls the game |

Public routes require the game cookie; participant routes also require enrollment. All responses use `Cache-Control: no-store` and vary by cookie.

| Method | Route under `/games/:gameId` | Purpose |
| --- | --- | --- |
| GET | `/` | Welcome page; issues the functional game cookie if absent |
| GET | `/state` | Public room configuration and current participant's name/ID, if joined |
| POST | `/join` | `{name}`; repeated enrollment from the same cookie keeps the participant |
| GET | `/participants?search=...&after=...` | Other enrolled participants' public IDs and names, up to 100 per page |
| POST | `/messages` | `{recipientId, text, requestId}`; UUID retry key prevents duplicate sends |
| GET | `/messages?status=unread` | Oldest unread message plus unread/read counts |
| GET | `/messages?status=read&after=...` | Read history, one message at a time, oldest first |
| POST | `/messages/:messageId/read` | `{}`; idempotent acknowledgment by the recipient only |

Every read/write checks the live reciprocal game/QR relationship and pause status. Sender identity always comes from the game cookie. A target must be another participant in the same game. Message APIs return only messages addressed to the current participant. A supplied participant ID cannot impersonate its browser. Cross-origin writes are rejected and body fields are allowlisted. Message writes are limited to 20 attempts per participant per minute; joining is limited to 30 attempts per game/IP per 10 minutes. Redis failure fails these writes closed. MongoDB unique indexes enforce participant/session identity, display-name uniqueness, and per-sender request deduplication.

## Verification

`tests/games.integration.test.js` covers ownership, analytics continuation, cross-game isolation, unauthorized inbox and acknowledgment access, unique names, replay-safe and concurrent sends, durable unread order/history, and pause/resume. `client/tests/games.spec.ts` exercises creation, QR preview, two independent browsers, mobile display, sending multiple messages, rescanning without losing unread content, read history, and literal HTML rendering.
