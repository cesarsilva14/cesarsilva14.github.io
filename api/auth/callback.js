const { config, seal, unseal, getCookie, COOKIE_OPTIONS, SESSION_COOKIE, STATE_COOKIE, clearCookie, setCookies } = require('../_oauth');

module.exports = async function callback(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const { code, state, error } = req.query || {};
  const { sessionSecret, clientId, appUrl } = config();
  if (error) {
    setCookies(res, [clearCookie(STATE_COOKIE)]);
    return res.redirect(302, `/?auth_error=${encodeURIComponent(String(error).slice(0, 120))}`);
  }

  const saved = unseal(getCookie(req, STATE_COOKIE), sessionSecret);
  if (!code || !state || !saved || saved.state !== state || saved.expires < Date.now()) {
    setCookies(res, [clearCookie(STATE_COOKIE)]);
    return res.redirect(302, '/?auth_error=state_check_failed');
  }

  try {
    const redirectUri = `${appUrl}/api/auth/callback`;
    const basic = Buffer.from(`${clientId}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: String(code), redirect_uri: redirectUri }),
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || `Token exchange failed (HTTP ${tokenResponse.status})`);

    const session = {
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expires: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      scope: tokens.scope || '',
    };
    const sessionCookie = `${SESSION_COOKIE}=${encodeURIComponent(seal(session, sessionSecret))}; ${COOKIE_OPTIONS}; Max-Age=2592000`;
    setCookies(res, [sessionCookie, clearCookie(STATE_COOKIE)]);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, '/?spotify=connected');
  } catch (exchangeError) {
    setCookies(res, [clearCookie(STATE_COOKIE)]);
    return res.redirect(302, `/?auth_error=${encodeURIComponent(String(exchangeError.message).slice(0, 160))}`);
  }
};
