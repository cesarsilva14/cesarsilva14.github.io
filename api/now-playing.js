const { config, unseal, seal, getCookie, COOKIE_OPTIONS, SESSION_COOKIE, clearCookie, sendError } = require('./_oauth');

module.exports = async function nowPlaying(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

  let session;
  try {
    const { sessionSecret, clientId, clientSecret } = config();
    session = unseal(getCookie(req, SESSION_COOKIE), sessionSecret);
    if (!session) return sendError(res, 401, 'Not connected to Spotify.');

    if (!session.expires || Date.now() >= session.expires - 30000) {
      if (!session.refresh) {
        res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
        return sendError(res, 401, 'Spotify session expired. Connect again.');
      }
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refresh }),
      });
      const refreshed = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !refreshed.access_token) {
        res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
        return sendError(res, 401, 'Spotify session expired. Connect again.');
      }
      session = {
        access: refreshed.access_token,
        refresh: refreshed.refresh_token || session.refresh,
        expires: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
        scope: refreshed.scope || session.scope,
      };
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(seal(session, sessionSecret))}; ${COOKIE_OPTIONS}; Max-Age=2592000`);
    }

    async function spotifyGet(path) {
      const response = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${session.access}` } });
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      return { response, data };
    }

    const current = await spotifyGet('/me/player/currently-playing?additional_types=track,episode');
    let item = current.data?.item || null;
    let source = 'current';

    if (!current.response.ok && current.response.status !== 204) {
      if (current.response.status !== 403) {
        return sendError(res, current.response.status, current.data?.error?.message || `Spotify playback request failed (HTTP ${current.response.status}).`);
      }
    }

    if (!item) {
      const recent = await spotifyGet('/me/player/recently-played?limit=1');
      if (recent.response.ok && recent.data?.items?.[0]?.track) {
        item = recent.data.items[0].track;
        source = 'recent';
      } else if (recent.response.status === 403) {
        const missing = ['user-read-currently-playing', 'user-read-recently-played'].filter(scope => !session.scope?.includes(scope));
        const detail = missing.length ? ` Reconnect and approve: ${missing.join(', ')}.` : ' Check that your Spotify app allows this account and has playback scopes enabled.';
        return sendError(res, 403, `Spotify denied playback access.${detail}`);
      } else if (!recent.response.ok && recent.response.status !== 204) {
        return sendError(res, recent.response.status, recent.data?.error?.message || `Spotify recent-play request failed (HTTP ${recent.response.status}).`);
      }
    }

    if (!item) return res.status(200).json({ track: null, message: 'Connected. Spotify has no current or recent track to show.' });

    const isEpisode = item.type === 'episode';
    const track = {
      artist: isEpisode ? (item.show?.publisher || 'Spotify podcast') : (item.artists?.map(artist => artist.name).join(', ') || 'Unknown artist'),
      title: item.name || 'Unknown title',
      art: (isEpisode ? item.images?.[0]?.url : item.album?.images?.[0]?.url) || '',
      url: item.external_urls?.spotify || '',
    };
    return res.status(200).json({ track, source });
  } catch (error) {
    return sendError(res, 500, error.message || 'Could not load Spotify playback.');
  }
};
