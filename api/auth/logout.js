const { SESSION_COOKIE, clearCookie } = require('./_oauth');

module.exports = function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
};
