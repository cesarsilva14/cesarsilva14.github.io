# Spotify GitHub Profile Widget

A focused, Novatorem-style Spotify widget studio for `khomedy.github.io`.

- Connects to Spotify with OAuth Authorization Code + PKCE and polls the currently-playing endpoint while the studio is open.
- Offers Novatorem-only settings, album artwork gradient-map colors, Markdown/HTML snippets, and an inline preview.
- Runs as a static GitHub Pages site.

The preview HTML is shareable, but GitHub README image embeds need an image-serving backend. A browser-only GitHub Pages site cannot securely keep Spotify credentials or generate a live image response for GitHub's image proxy.

Spotify redirect URI: `https://khomedy.github.io/callback.html`.
