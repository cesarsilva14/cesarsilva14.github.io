const crypto = require('node:crypto');
const { config, seal, COOKIE_OPTIONS, STATE_COOKIE, sendError } = require('../api/_oauth');

module.exports = function login(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  try {
    const { clientId, sessionSecret, appUrl } = config();
    const state = crypto.randomBytes(24).toString('base64url');
    const callback = `${appUrl}/api/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: callback,
      scope: 'user-read-currently-playing user-read-recently-played',
      state,
    });
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=${encodeURIComponent(seal({ state, expires: Date.now() + 10 * 60 * 1000 }, sessionSecret))}; ${COOKIE_OPTIONS}; Max-Age=600`);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, `https://accounts.spotify.com/authorize?${params}`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
