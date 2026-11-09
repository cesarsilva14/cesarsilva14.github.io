const crypto = require('node:crypto');

const SESSION_COOKIE = 'spotify_widget_session';
const STATE_COOKIE = 'spotify_oauth_state';
const COOKIE_OPTIONS = 'Path=/; Secure; HttpOnly; SameSite=Lax';

function config() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SESSION_SECRET, APP_URL } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SESSION_SECRET || !APP_URL) {
    throw new Error('Server setup is incomplete. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SESSION_SECRET, and APP_URL in the deployment environment.');
  }
  return { clientId: SPOTIFY_CLIENT_ID, clientSecret: SPOTIFY_CLIENT_SECRET, sessionSecret: SESSION_SECRET, appUrl: APP_URL.replace(/\/$/, '') };
}

function seal(value, secret) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function unseal(value, secret) {
  if (!value) return null;
  try {
    const data = Buffer.from(value, 'base64url');
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const json = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    if (pair.slice(0, index).trim() === name) return decodeURIComponent(pair.slice(index + 1).trim());
  }
  return null;
}

function setCookies(res, values) {
  res.setHeader('Set-Cookie', values);
}

function clearCookie(name) {
  return `${name}=; ${COOKIE_OPTIONS}; Max-Age=0`;
}

function sendError(res, status, message) {
  res.status(status).setHeader('Cache-Control', 'no-store').json({ error: message });
}

async function spotifyTokenRequest(body) {
  const { clientId, clientSecret } = config();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Spotify token endpoint returned HTTP ${response.status}`);
  return data;
}

module.exports = {
  SESSION_COOKIE, STATE_COOKIE, COOKIE_OPTIONS, config, seal, unseal,
  getCookie, setCookies, clearCookie, sendError, spotifyTokenRequest,
};
