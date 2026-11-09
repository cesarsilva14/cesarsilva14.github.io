# khomedy.github.io

A personal Spotify Now Playing widget preview and customization page hosted on GitHub Pages.

## Setup

1. In the Spotify Developer Dashboard, set the app's redirect URI to exactly:
   `https://khomedy.github.io/callback.html`
2. Save the Spotify app settings.
3. Visit [khomedy.github.io](https://khomedy.github.io/) and choose **Connect Spotify**.
4. After authorization, customize the preview. Your style choices are saved in your browser.

The site uses Spotify Authorization Code with PKCE and does not include a Spotify client secret. Your Spotify authorization is stored only in your browser. This static site provides a personal preview; a public live README image requires a separate backend service.
