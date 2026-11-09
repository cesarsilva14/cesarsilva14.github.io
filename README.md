# khomedy.github.io

This is a GitHub Pages site that shows the Spotify song you're currently listening to.

## Setup

1. Open the Spotify Developer Dashboard.
2. Create a new app.
3. Use the redirect URI:
   `https://khomedy.github.io/callback`
4. Add the app's Client ID to `app.js` if you want to reuse this project.
5. Publish this repo to GitHub Pages.

## What this does

This site uses Spotify's Authorization Code with PKCE flow, which keeps the Client Secret off the front-end and works with a static GitHub Pages site.

## Notes

- The app will ask you to log into Spotify and grant permission to read your currently playing track.
- When nothing is playing, it shows a friendly message.
- The page can be embedded in your GitHub README as an image or linked directly.

## Example README card

```md
![Now Playing](https://khomedy.github.io/)
```

If you want a dedicated image card instead of a full page, I can also build the SVG version for your README.
