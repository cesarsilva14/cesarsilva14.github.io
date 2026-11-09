# Spotify GitHub Profile Widget

A first-party Spotify sign-in and preview UI. OAuth is handled by this site's serverless API; Spotify credentials are kept in an encrypted, HttpOnly cookie and are never exposed to page JavaScript. Spotify's authorization screen itself is hosted by Spotify, then returns to this site's callback.

## Deploy (required)

GitHub Pages only serves static files and cannot run the OAuth callback or API. Deploy this repository to Vercel (or another Node serverless host) to enable Connect Spotify. Use the deployed site as the app URL; the browser frontend and `/api` endpoints must share the same origin for the secure session cookie.

Set these Vercel environment variables:

- `SPOTIFY_CLIENT_ID` — your Spotify application's client ID.
- `SPOTIFY_CLIENT_SECRET` — that application's client secret (server-side only; never put it in `app.js`).
- `SESSION_SECRET` — a long random secret, at least 32 random bytes.
- `APP_URL` — the exact deployed HTTPS origin, for example `https://your-project.vercel.app` (no trailing slash).

In Spotify Developer Dashboard, add this exact Redirect URI:

`https://your-project.vercel.app/api/auth/callback`

Replace the example host with the value of `APP_URL`, save, and redeploy after setting environment variables. Then open the Vercel-hosted site and use **Connect Spotify**. The Spotify consent screen will return directly to your site's preview.

The site requests `user-read-currently-playing` and `user-read-recently-played`. The API falls back to recent history when there is no current item, refreshes tokens server-side, and reports Spotify's access-denied details. Spotify can still deny API access due to app/account restrictions; the backend cannot bypass Spotify's permissions.

The UI can generate a shareable preview page link. A live README image requires an image-rendering backend; GitHub Pages and an HTML link do not themselves create a dynamic image.
