# Seasons landing

Public site for `getseasons.app`: hand-written marketing, legal, and app-handoff pages, plus the Provider Actions delivery adapter. The workspace [AGENTS.md](../AGENTS.md) owns cross-platform rules (verification policy, task completion); read it once per task. This file owns the website.

## Workspace gates

- Drawing a *network* or *poster* (landing orbit, trending grid): follow [Artwork shapes](../AGENTS.md#artwork-shapes).
- Editing the app IDs, package name, or signing fingerprints in `.well-known/`: satisfy the [Product Identity Gate](../AGENTS.md#product-identity-gate).

## Verify

Run Python 3.11+ (CI uses 3.13): the tests import `tomllib`, and `python3` on this machine resolves to 3.9. Done when every command exits 0.

```bash
python3.13 -m unittest discover -s tests
node --test cloudflare/provider-actions/worker.test.mjs tests/app-link-fallback.test.mjs
ruff check provider_actions scripts tests
python3.13 -m provider_actions render provider-actions-safe-baseline-release.json provider-actions-public-artifact
python3.13 -m provider_actions scan provider-actions-public-artifact provider-actions-safe-baseline-release.json
python3.13 scripts/stage_pages.py --output _site --provider-actions-artifact provider-actions-public-artifact --sealed-release provider-actions-safe-baseline-release.json
```

For page changes, also preview `_site` (the deployed tree), not the repository root: `python3.13 -m http.server -d _site`.

## Deploy

A push to `main`, and a daily cron, runs `.github/workflows/static.yml`, which rebuilds `_site` and deploys it to GitHub Pages. Pushing to `main` and deploying the Worker are production releases: do either only when the user asks.

- **Allowlist**: only what `PUBLIC_FILES` / `PUBLIC_DIRECTORIES` / `PUBLIC_ALIASES` in `scripts/stage_pages.py` list ships; `campaigns/`, `prototypes/`, and `docs/` stay repo-only. When adding a public file or page, add it there plus a test in `tests/test_stage_pages.py` (like `test_ai_agents_help_page_is_public`). Store-facing pages such as the privacy policy must return the full page at every address a store or app links, with and without a trailing slash: add a `PUBLIC_ALIASES` entry, not a redirect stub.
- **Trending snapshot**: before staging, CI runs `scripts/refresh_landing_trends.py`, which rewrites the tracked `trending-shows.json` from the live API without committing. If the refresh fails, the deploy uses the checked-in snapshot only while it is under 8 days old, and fails otherwise. To unblock, run the script locally and commit the refreshed file.
- **Cache busting**: after changing `landing.css` or `landing.js`, bump the `?v=` stamp on both references in `index.html`.

## Third-party code

HubSpot and Ahrefs load only on `index.html`. App-link pages and Provider Action responses admit no third-party origin.

## App links

`getseasons.app` paths open the iOS and Android apps; the site serves the web fallback when the app is absent.

- Account links (`verify-contact-email/`, `recover-account/`, `replace-contact-email/`, `family-invite/`) carry a bearer proof in the URL fragment; `account-link.js` hands it to `seasons://` so it never reaches a server.
- Fixed routes (`watchlist/`, `plan/`, …) are directories loading `/app-link-fallback.mjs`. Dynamic routes (`/movies/*`, `/shows/*`, `/plan/actions/*`, `/subscriptions/*`) have no directory: GitHub Pages serves `404.html`, which runs the same script.
- Every app-link page, `404.html` included, carries the same self-only CSP and `no-referrer` meta; copy both onto new ones.
- Pages cannot set the AASA `Content-Type`. Before relying on universal links in production, follow [docs/app-site-association-delivery.md](docs/app-site-association-delivery.md).

To add or change an app-link path:

1. Add the component to `.well-known/apple-app-site-association` and to the pinned list in `tests/test_app_links.py`.
2. Add the route to `app-link-fallback.mjs` with a case in `tests/app-link-fallback.test.mjs`. A fixed route also needs its directory, allowlisted.
3. Dispatch the iOS and Android agents to handle the same path.

Done when Verify passes and both apps handle the path.

## Provider Actions

This repo is a delivery adapter: `provider_actions` renders a pinned sealed release into the artifact staged under `/provider-actions/`. The backend owns pair resolution, provider destinations, regional fallback, freshness, rights, activation, the private runtime index, and the runtime sitemap (the root `sitemap.xml` only indexes it; staging refuses a static copy).

- `provider-actions-safe-baseline-release.json` is a zero-publication baseline: the renderer rejects `guide` outcomes until the publication-cleared integration lands. Its `releaseSha256` hashes the file's own canonical JSON (sorted keys, compact separators, that field removed); recompute it after any edit.
- The scan re-renders the pinned release and requires byte equality with the artifact, which is why rendering stays deterministic (no clock, sorted output, LF). Keep exact byte equality as the check, never hash-shaped metadata or substring matching.
- The artifact holds only sealed-release content; restricted evidence and private runtime data stay in the backend.
- `cloudflare/provider-actions/wrangler.toml` binds a Worker to only the `/provider-actions` route family, proxying it to the backend; Pages serves everything else. Deploying, activating, or rolling back the Worker: follow its [README](cloudflare/provider-actions/README.md) and `scripts/provider_actions_rollout.py`.
