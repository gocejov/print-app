# GitHub Actions CI/CD

The workflow is [.github/workflows/ci.yml](../.github/workflows/ci.yml). It runs automatically on **every branch push** and on pull requests. Production deployment runs only for successful pushes to **`dev-qr2share`**, including merges into that branch. Other branches and pull requests never deploy.

## Required checks

1. **Lint** installs the root lockfile dependencies and runs ESLint over backend/frontend source and tests. It also validates GitHub Actions syntax with actionlint and deployment scripts with Bash/ShellCheck.
2. **Build and integration tests** installs both lockfiles, builds server and React assets, and runs backend tests against temporary MongoDB/Redis services. It installs Chromium and runs the actual desktop/mobile browser suite. Browser failure diagnostics are retained for seven days; no production credentials enter these jobs.
3. **Deploy production** requires both jobs to succeed. It builds one production image with an immutable commit-SHA tag and revision/source labels, then streams that exact image over restricted SSH. It does not build on the live host or require a container registry login.

Use Node 22 (`.nvmrc`). Locally run `npm run lint`, `npm run build`, backend integration tests and `npm run test:ui` before pushing. `npm run lint:fix` applies safe ESLint fixes. GitHub receives commit events when commits are pushed; this is not a local Git pre-commit hook. Existing old branches need the workflow/config files merged or rebased into them before their future pushes can run this workflow.

ESLint uses recommended JavaScript/TypeScript rules and React hooks checks. Legacy backend `any`, unused declarations and empty interface rules are explicitly relaxed to avoid turning pipeline setup into a wholesale typing refactor. Primitive wrapper types and const declarations were corrected; one legacy bcrypt require has a documented local exception. Type checking remains part of the production build. Existing dependency advisories are not hidden or automatically force-upgraded; dependency remediation remains separate work.

## Production environment and credentials

Repository: `gocejov/print-app`. GitHub environment: **production**, with a deployment branch policy restricted to `dev-qr2share`. No manual reviewer is required, matching automatic deployment on push. Default workflow token permissions are read-only, review approval is disabled, and actions must be pinned to full commit SHAs. The Dependabot file configures weekly dependency/action PRs targeting `dev-qr2share`; it does not auto-merge them. GitHub activates this schedule only after `.github/dependabot.yml` also exists on the repository default branch (`main`). Until that merge, the schedule is configured but not active. The repository default branch was left unchanged.

Environment secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | `realno.live` |
| `DEPLOY_USER` | Dedicated `qr2share-deploy` account |
| `DEPLOY_SSH_KEY` | Dedicated private key, stored only as an encrypted GitHub environment secret |
| `DEPLOY_KNOWN_HOSTS` | Pinned server Ed25519 host public key from the already authenticated server connection |

The server stores only this deployment key's public half. Its authorized-key entry uses `restrict` and a forced [SSH gate](../deploy/qr2share-deploy-gate.sh), permitting only `deploy <40-character commit SHA>`. It cannot open a shell, use SCP, forward ports or run arbitrary SSH commands. Sudo permits only the root-owned [deployment helper](../deploy/qr2share-deploy.sh), which independently validates arguments and branch/revision. The workflow does not use the server root password. Host key verification is mandatory; update the pinned secret through a trusted channel after a legitimate host-key rotation.

## Release safeguards and rollback

The root helper takes a server-side deployment lock, requires a clean tracked production checkout on `dev-qr2share`, verifies the requested SHA is the latest branch tip, requires at least 3 GiB free disk space, and checks the received image's revision/source labels. It checks the branch tip again after upload to avoid deploying a superseded commit. Environment credentials stay in the root-readable server `.env`.

Before changing the app, it saves the current environment, checkout SHA, image ID and a gzip-verified logical MongoDB backup under `/var/backups/qr2share/releases/TIMESTAMP-SHA/` (private to root). The recovery timer is paused during the change. The checkout fast-forwards, only `QR2SHARE_IMAGE` changes in `.env`, and the existing systemd unit restarts the stack with health checks. Loopback and public HTTPS health/admin checks must pass before the release succeeds. The watchdog is resumed afterward.

If an application/configuration change fails, the helper restores the previous checkout and environment/image, restarts the stack, and exits with failure so GitHub reports the failed release. Signals during the switch also trigger rollback. This rolls back **application/configuration**, not database writes: automatically restoring a database could lose legitimate traffic. The pre-release dump is available for deliberate database recovery. Use backward-compatible schema changes; a standalone MongoDB dump does not provide a cross-collection transaction snapshot. Unexpected host power loss cannot be handled by a shell trap; check the recorded release state and backups before manual recovery.

Workflow and server locks serialize production changes; running production deployments are not cancelled by newer pushes. Superseded queued revisions are refused. `.env`, uploads and MongoDB/Redis volumes are never overwritten by Git checkout or included in an image artifact. Old pre-migration containers/volumes remain untouched. Previous release images/backups are retained deliberately; monitor disk and prune only reviewed obsolete releases, never old volumes indiscriminately.

## Operations

Watch runs at [GitHub Actions](https://github.com/gocejov/print-app/actions). Production deployments appear in the repository's production environment history. `workflow_dispatch` is also declared for a manual re-run on `dev-qr2share`; GitHub exposes manual dispatch once the workflow exists on the repository's default branch. Until then, re-run an existing run or push to the production branch.

The live host is bootstrapped once with root-owned helper/gate files in `/usr/local/sbin/`, a restricted deploy user/key and sudoers entry. Changes to these privileged helper programs must be reviewed and installed by the server administrator; an ordinary source update does not silently replace them. Systemd and Nginx definitions remain as described in [live deployment](live-deployment.md). Do not edit tracked production files directly: the deploy helper refuses to overwrite them. Emergency server edits must be saved and reconciled before the next release.

For a team repository, require the **Lint** and **Build and integration tests** checks and reviewed PRs in a branch ruleset. Workflow gates already prevent failed checks from deploying; branch policies/review requirements are separate repository governance and should match who is allowed to push. No additional mandatory reviewer was added to block this owner's automatic-push workflow.

## References and verification

The setup follows GitHub's [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) for immutable action pins and reduced credentials, [environment branch restrictions](https://docs.github.com/en/rest/deployments/branch-policies), and the [typescript-eslint flat-config setup](https://typescript-eslint.io/docs/). Actionlint/ShellCheck images are pinned by digest and action references by full upstream SHA.

Local validation includes lint, production compilation, nine backend/unit cases, eight Chromium desktop/mobile scenarios, workflow validation and deployment shell checks. The restricted SSH key was verified to reject arbitrary commands. The [first hosted run](https://github.com/gocejov/print-app/actions/runs/40969745733) passed all three jobs, including runner installation, isolated tests, image build/transfer, database backup, systemd release and public HTTPS checks. The production environment recorded a successful deployment of `f62914f474ac108fceccbc0d908b55086ec3ed5f`. Subsequent pushes use the same release path. This is a single-instance deployment with a brief stack restart, rather than a zero-downtime rollout.
