# Spotify GitHub Profile Widget Generator

A small Novatorem-only generator for the Kittinanx Spotify GitHub Profile image service.

- Uses the live image endpoint at `https://spotify-github-profile.kittinanx.com/api/view` for both preview and generated embeds.
- Generates Markdown and HTML using the configured Spotify UID and profile link.
- Exposes the Novatorem settings supported by the example configuration: cover image, offline display, artist/song interchange, profanity and remaster options, background and bar colors, and cover-derived bar color.
- Does not use a fake sample track or a separate Spotify OAuth flow; the Kittinanx widget service resolves the account's listening activity from the Spotify UID.

The default UID and profile link are the ones in the user's supplied snippet. The generator does not own or operate the Kittinanx service.
