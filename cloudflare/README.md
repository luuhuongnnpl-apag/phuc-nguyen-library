# Phúc Nguyên Library — Cloudflare Worker + D1

This folder is the replacement backend for the legacy Google Apps Script / Google Sheets API. It is intentionally separate from the public GitHub Pages frontend until deployment and smoke tests pass.

## Security model
- GitHub OAuth authenticates administrators; there is no separate admin password.
- Only GitHub logins listed in the Cloudflare secret `ADMIN_GITHUB_USERS` can administer the library.
- OAuth client secret and session secret are Cloudflare secrets, never source-controlled.
- Access codes and usage data are stored in D1, not Google Sheets.
- Admin sessions use Secure, HttpOnly cookies and POST requests require a CSRF header.
- The Worker limits CORS to the exact `SITE_ORIGIN`.

## 1. Create D1
From the repository root, install Wrangler (Node.js required) and run:
```sh
npm install -g wrangler
wrangler login
wrangler d1 create phuc-nguyen-library
```
Copy the returned database ID into `cloudflare/wrangler.toml` replacing `REPLACE_WITH_D1_DATABASE_ID`.

Apply schema:
```sh
wrangler d1 migrations apply phuc-nguyen-library --remote
```

## 2. Create a GitHub OAuth App
GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
- Homepage URL: `https://luuhuongnnpl-apag.github.io/phuc-nguyen-library/`
- Authorization callback URL: the Worker URL plus `/auth/callback`, e.g. `https://phuc-nguyen-library-api.<your-subdomain>.workers.dev/auth/callback`.
Keep the Client Secret private.

## 3. Configure and deploy Worker
Run these from `cloudflare/` after replacing the database ID:
```sh
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET
wrangler secret put ADMIN_GITHUB_USERS
wrangler secret put SITE_ORIGIN
wrangler deploy
```
For each prompt:
- `GITHUB_CLIENT_ID`: OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: OAuth App Client Secret
- `SESSION_SECRET`: a long random secret (at least 32 random characters)
- `ADMIN_GITHUB_USERS`: comma-separated exact GitHub usernames allowed to administer
- `SITE_ORIGIN`: `https://luuhuongnnpl-apag.github.io` (origin only; no path)

Note: if using GitHub Pages project site, the Origin is `https://luuhuongnnpl-apag.github.io`, while the homepage URL includes `/phuc-nguyen-library/`.

## 4. Verify before switching production
- Open `https://<worker-host>/health`; expect `{"ok":true,"service":"pnlib-worker","database":true}`.
- Open `https://<worker-host>/auth/login`; it should redirect to GitHub.
- Sign in with an allowed GitHub account and confirm the return URL has `?admin=authenticated`.
- Test `/api/me` and code creation using the browser frontend only after integration is complete.
- Do not delete or disable Apps Script / Google Sheets until access codes, course scope, expiry, usage limits, and feedback are migrated and verified.

## API
- `GET /health`
- `GET /auth/login`, `GET /auth/callback`, `POST /auth/logout`
- `GET /api/me`
- `GET /api/check?code=...&course=...&device=...`
- `GET /api/admin/codes`
- `POST /api/admin/codes` JSON: `{ "prefix":"LDS_25_", "count":10, "expiresAt":"2026-11-30", "maxUses":20, "courses":["luat-dan-su"], "note":"..." }`
- `POST /api/admin/codes/{id}/revoke`

The public frontend has not yet been switched to this Worker. Complete the frontend OAuth/admin integration and data migration only after this backend is deployed and verified.
