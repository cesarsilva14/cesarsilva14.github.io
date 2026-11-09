# Spotify GitHub Profile Widget

A Novatorem-only Spotify profile widget customizer for GitHub Pages.

- Sign in with Spotify using Authorization Code + PKCE.
- While the studio is open, it checks the currently playing track and falls back to the most recently played track when playback is idle.
- Customize the Novatorem-style bar, cover, and a real luminance-based gradient map with shadow, midtone, highlight, and strength controls.
- Copy Markdown or HTML for a shareable preview.

Spotify redirect URI: `https://khomedy.github.io/callback.html`.

GitHub Pages is static hosting. The generator can show and poll Spotify data in the signed-in browser, but an automatically updating image in a GitHub README needs a separate image-serving backend; README image requests do not carry the browser's Spotify login.
