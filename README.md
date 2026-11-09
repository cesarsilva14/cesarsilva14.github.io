# khomedy.github.io

This is a static GitHub Pages project for a README widget studio.

## What it does

- Lets you customize a Now Playing card without needing a backend.
- Lets you preview it locally in the browser.
- Generates a preview link and a markdown snippet for your README.
- Spotify connection is optional and only used if you want to try to load live track data.

## Important limitation

GitHub Pages cannot securely run the Spotify OAuth + dynamic image generation flow that a fully live README widget requires. This project gives you the designer/editor and a shareable preview URL. For a fully auto-refreshing README image, you still need a small backend service (Vercel, Cloudflare Pages function, or Netlify function).

## Usage

1. Open the site at `https://khomedy.github.io/`
2. Edit the widget text, colors, and album art
3. Copy the preview URL or markdown snippet
4. Paste it into your README or share the URL

## Redirect

This repo still includes a `callback.html` file for compatibility with Spotify OAuth, but the main studio works without it.
