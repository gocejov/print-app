# Authentication and ownership

Management APIs use Express sessions stored in Redis. The browser keeps an HTTP-only `connect.sid` cookie; clients must send that cookie on subsequent requests. Public QR scan and content routes remain accessible without an account.

## Register, log in and log out

Example local registration (use your own email and password):

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Example","lastName":"User","email":"example@example.com","password":"replace-with-a-long-password"}' \
  http://127.0.0.1:3000/api/users

curl -b cookies.txt http://127.0.0.1:3000/api/users/me
curl -b cookies.txt http://127.0.0.1:3000/api/products
```

Registration returns 201 and establishes a session. To log in to an existing account:

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"example@example.com","password":"replace-with-a-long-password"}' \
  http://127.0.0.1:3000/api/users/login

curl -b cookies.txt -H 'Content-Type: application/json' -d '{}' \
  http://127.0.0.1:3000/api/users/logout
```

Logout returns 204 and destroys that session. Treat cookie jars as credentials and keep them out of version control. The React panel at `/admin/` provides login/registration and uses the same session. The legacy CRUD page at `/crud/` includes sign-in/out controls and uses `credentials: include`.

## Access policy

- Registration, login and logout are callable without an existing login.
- Other `/api/users` operations require login and apply only to the current account. `/api/users` lists that account alone, not all users.
- `/api/files`, `/api/products`, `/api/categories`, `/api/campaigns`, `/api/qrcodes`, `/api/upload` and `/api/statistics` require login.
- Resource ownership uses `createdBy`. Foreign records return 404; foreign identity claims return 403. Ownership cannot be reassigned. Product file changes and QR product reassignment use explicit, ownership-checked fields.
- Product creation accepts an owned `fileId`; QR creation accepts exactly one owned `productId` or `campaignId`. The server fills in `userId`. Legacy identity fields are optional and must equal the session user if present.
- Upload `:uid` must equal the logged-in account and is checked before Multer writes bytes.
- Statistics are visible only for QR codes created by the current account.
- Health, Swagger, React/CRUD HTML and `/:alias/:qid` / `/l/:alias/:type/:qid` are public. Public HTML access does not grant management API access.

No administrator role is implemented. Public scan links are shareable access links, not authenticated media access.

## Validation and password changes

Registration accepts only `name`, `lastName`, `email` and `password`. Emails are trimmed and lowercased; new passwords must be 12–128 characters. Profile updates allow name, lastName, email, password, currentPassword, alias and useAlias. Email/password changes require a valid `currentPassword`:

```json
{
  "currentPassword": "the-current-password",
  "password": "a-new-long-password"
}
```

Send this to `PUT /api/users/YOUR_ID` with the current cookie. A password change increments `authVersion`, rotates the current session and invalidates other sessions on their next authenticated request. Clients must keep the new Set-Cookie value. Deleted accounts cannot use old sessions.

Resource updates are restricted: files accept name and, for web files, URL; products accept name, description, an owned fileId and legacy alias; QR PATCH accepts name, status and an owned productId/campaignId (or the compatible website override for product targets). Uploaded paths/types and ownership cannot be edited. Unknown fields and MongoDB update operators are rejected. URLs must use http/https without embedded credentials. Alias values use letters, digits, underscores or hyphens; user aliases also reject reserved route names.

Passwords are salted using Node's scrypt and never included in user JSON responses, including populated references. Existing bcrypt hashes remain usable. Existing plaintext passwords are rejected rather than silently treated as valid credentials. Such accounts require an administrative password reset through a trusted process; no public reset endpoint or automatic migration is included. Existing mixed-case email records may require normalization before login. No existing account data is rewritten automatically.

## Session and browser behavior

Sessions expire after one day. Anonymous visits no longer allocate saved sessions. Production requires `SESSION_SECRET`, HTTPS cookies and correct reverse proxy configuration. Production uses `SameSite=None`, while development uses `SameSite=Lax`.

Unsafe API requests enforce an allowed Origin independently of CORS and accept JSON or multipart content types. Requests from the API's own origin or an origin in `CORS_ORIGIN` are permitted. Nonbrowser clients without Origin headers are permitted unless they explicitly identify as cross-site through Fetch Metadata. Browser clients on another origin must send credentials and be configured in `CORS_ORIGIN`; development cookies still follow normal SameSite rules.

Registration and login together allow 30 attempts per socket IP in a 15-minute window, stored in Redis. Exceeding the limit returns 429 with Retry-After. Behind a reverse proxy the limit is shared by callers using that proxy; proxy trust and a deployment-specific client-IP policy remain future work. This is a basic throttle, not comprehensive abuse prevention.

`SESSION_KEY_PREFIX` optionally namespaces session, rate-limit and campaign-selection keys; default `sess:`. Old anonymous sessions do not contain a user ID and must log in. The `active` account flag is not currently an authentication gate; account verification and recovery remain future work.

Sources: [account controller](../src/controllers/user.controller.ts), [auth middleware](../src/middlewares/auth.middleware.ts), [management policy](../src/middlewares/management.middleware.ts), [password helpers](../src/utils/password.utils.ts), [sessions](../src/config/sesion.config.ts).

The React workspace adds no administrator role. `POST /api/qrcodes/dynamic` and `PATCH /api/qrcodes/:id` use the same authenticated ownership policy; see [admin panel](admin-panel.md). `admin` is now a reserved user alias alongside existing route prefixes.

Authenticated `GET /api/files/:id/content` previews uploaded images/videos only for their owner. Image/video upload user IDs are checked before bytes are written. Referenced file/product deletes return 409. See [content ownership and lifecycle](content-workflow.md).

Category and campaign CRUD use their own scoped services, including ownership checks for every product/category entry and the expanded pool preview. Foreign resource references return 404, unknown/operator fields are rejected, and ownership is immutable. Public campaign selection tickets grant only the selected QR media response, expire after 30 minutes, and recheck status/membership on each request. See [campaign ownership and lifecycle](campaigns.md).

Campaign weight overrides must refer to owned campaign members and accept only positive integers 1–1000. Analytics exposes existing owned scan metadata plus bounded request context through the same authenticated statistics endpoint, without adding a public statistics route. The new request snapshot contains no cookies or authorization headers. See [weights](campaign-weights.md) and [analytics](analytics.md).
