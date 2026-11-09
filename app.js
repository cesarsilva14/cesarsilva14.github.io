const STORAGE_KEY = 'widget-studio-state-v2';
const TOKEN_KEY = 'spotify-widget-tokens';
const STATE_KEY = 'spotify-oauth-state';
const VERIFIER_KEY = 'spotify-pkce-verifier';
const CLIENT_ID = '940beb9b7c414631957560ead892d125';
const REDIRECT_URI = 'https://khomedy.github.io/callback.html';
const SCOPES = 'user-read-currently-playing';
const POLL_INTERVAL_MS = 20000;

const defaults = {
  title: 'Midnight City', artist: 'M83',
  art: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  shadow: '#172b46', midtone: '#8167a8', highlight: '#ffd6a0', strength: 62,
  radius: 12, textColor: '#30343b', waveColor: '#8c62c7', showWave: true, showGradient: true,
};
const $ = (id) => document.getElementById(id);
const fields = {
  title: $('title-input'), artist: $('artist-input'), art: $('art-input'),
  shadow: $('stop-0'), midtone: $('stop-1'), highlight: $('stop-2'), strength: $('strength-input'),
  radius: $('radius-input'), textColor: $('text-color-input'), waveColor: $('wave-color-input'),
  showWave: $('show-wave'), showGradient: $('show-gradient'),
};
let liveTrack = false;
let pollTimer;

function readState() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
function stateFromInputs() {
  return {
    title: fields.title.value, artist: fields.artist.value, art: fields.art.value,
    shadow: fields.shadow.value, midtone: fields.midtone.value, highlight: fields.highlight.value,
    strength: Number(fields.strength.value), radius: Number(fields.radius.value),
    textColor: fields.textColor.value, waveColor: fields.waveColor.value,
    showWave: fields.showWave.checked, showGradient: fields.showGradient.checked,
  };
}
function saveAndRender() {
  const state = stateFromInputs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render(state);
}
function render(state = readState()) {
  $('preview-artist').textContent = state.artist || 'Artist';
  $('preview-song').textContent = state.title || 'Song title';
  $('preview-art').src = state.art || defaults.art;
  $('preview-art').style.borderRadius = `${state.radius}px`;
  $('widget-preview').style.setProperty('--text-color', state.textColor);
  $('widget-preview').style.setProperty('--wave-color', state.waveColor);
  $('widget-preview').style.setProperty('--cover-radius', `${state.radius}px`);
  $('widget-preview').style.setProperty('--map-strength', String(state.strength / 100));
  $('widget-preview').style.setProperty('--shadow-color', state.shadow);
  $('widget-preview').style.setProperty('--midtone-color', state.midtone);
  $('widget-preview').style.setProperty('--highlight-color', state.highlight);
  $('widget-preview').classList.toggle('no-gradient', !state.showGradient);
  $('wave-line').classList.toggle('hidden', !state.showWave);
  $('strength-value').value = `${state.strength}%`;
  $('radius-value').value = `${state.radius} px`;
  updateRamp(state);
}
function updateRamp(state = stateFromInputs()) {
  const ramp = $('gradient-ramp');
  ramp.style.background = `linear-gradient(90deg, ${state.shadow}, ${state.midtone} 50%, ${state.highlight})`;
}
function setInputs(state) {
  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'checkbox') field.checked = Boolean(state[key]);
    else field.value = String(state[key]);
  }
  render(state);
}

async function startSpotifyConnect() {
  try {
    const verifierBytes = crypto.getRandomValues(new Uint8Array(64));
    const verifier = Array.from(verifierBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const stateBytes = crypto.getRandomValues(new Uint8Array(24));
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const params = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI, scope: SCOPES, state, code_challenge_method: 'S256', code_challenge: challenge });
    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (error) {
    $('status-message').textContent = `Could not start Spotify sign-in: ${error.message}`;
  }
}

async function processCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (params.has('error')) {
    $('status-message').textContent = `Spotify sign-in was cancelled: ${params.get('error')}.`;
    cleanCallbackUrl();
    return;
  }
  if (!code || !returnedState || returnedState !== expectedState || !verifier) {
    $('status-message').textContent = 'Could not verify the Spotify sign-in. Please connect again.';
    cleanCallbackUrl();
    return;
  }
  $('status-message').textContent = 'Finishing Spotify sign-in…';
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier }),
    });
    const token = await response.json();
    if (!response.ok) throw new Error(token.error_description || `Token exchange failed (${response.status}).`);
    storeTokens(token);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    cleanCallbackUrl();
    markConnected(true);
    await refreshTrack(true);
    startPolling();
  } catch (error) {
    cleanCallbackUrl();
    $('status-message').textContent = `Sign-in did not finish: ${error.message}`;
  }
}
function cleanCallbackUrl() { history.replaceState({}, document.title, location.pathname); }
function storeTokens(data, old = {}) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: data.access_token, refreshToken: data.refresh_token || old.refreshToken, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 }));
}
function getTokens() { try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; } }
async function accessToken() {
  let tokens = getTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - 30000) return tokens.accessToken;
  if (!tokens.refreshToken) { localStorage.removeItem(TOKEN_KEY); markConnected(false); return null; }
  const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: tokens.refreshToken }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || `Could not refresh Spotify session (${response.status}).`);
  storeTokens(data, tokens);
  tokens = getTokens();
  return tokens.accessToken;
}
function markConnected(connected) {
  $('connection-status').textContent = connected ? '✓ Signed in to Spotify' : 'Not connected';
  $('connection-status').classList.toggle('connected', connected);
  $('spotify-connect').classList.toggle('hidden', connected);
  $('spotify-disconnect').classList.toggle('hidden', !connected);
}
async function refreshTrack(initial = false) {
  try {
    const token = await accessToken();
    if (!token) {
      markConnected(false);
      if (initial) $('status-message').textContent = 'Connect Spotify to load the track you’re playing.';
      return;
    }
    markConnected(true);
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 204) {
      $('status-message').textContent = 'Signed in to Spotify, but Spotify reports no current track. Play something and the preview will update.';
      $('track-updated').textContent = 'Waiting for playback';
      return;
    }
    if (!response.ok) {
      $('status-message').textContent = response.status === 403
        ? 'Signed in to Spotify, but the API denied access to current playback (403). Your account is connected; check Spotify app access/permissions.'
        : `Signed in, but Spotify returned HTTP ${response.status} while loading playback.`;
      return;
    }
    const data = await response.json();
    if (!data.item) return;
    const track = data.item;
    liveTrack = true;
    fields.title.value = track.name || '';
    fields.artist.value = track.artists?.map((artist) => artist.name).join(', ') || '';
    fields.art.value = track.album?.images?.[0]?.url || defaults.art;
    saveAndRender();
    $('track-updated').textContent = 'Live from Spotify';
    $('status-message').textContent = '✓ Signed in. Preview is showing the track currently playing on your Spotify account.';
  } catch (error) {
    $('status-message').textContent = `Spotify connection issue: ${error.message}`;
  }
}
function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => refreshTrack(false), POLL_INTERVAL_MS);
}
function disconnectSpotify() {
  localStorage.removeItem(TOKEN_KEY);
  clearInterval(pollTimer);
  liveTrack = false;
  markConnected(false);
  $('track-updated').textContent = 'Preview sample';
  $('status-message').textContent = 'Disconnected from Spotify. You can still customize the widget.';
}
function previewUrl() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(stateFromInputs())) params.set(key, String(value));
  return `${location.origin}/preview.html?${params.toString()}`;
}
async function copyPreviewLink() {
  const url = previewUrl();
  try { await navigator.clipboard.writeText(url); $('copy-status').textContent = 'Preview link copied.'; }
  catch { $('copy-status').textContent = `Copy this preview link: ${url}`; }
}

for (const field of Object.values(fields)) {
  field.addEventListener('input', saveAndRender);
  field.addEventListener('change', saveAndRender);
}
$('spotify-connect').addEventListener('click', startSpotifyConnect);
$('spotify-disconnect').addEventListener('click', disconnectSpotify);
$('copy-link').addEventListener('click', copyPreviewLink);

setInputs(readState());
if (new URLSearchParams(location.search).has('code') || new URLSearchParams(location.search).has('error')) {
  processCallback();
} else if (getTokens()) {
  markConnected(true);
  $('status-message').textContent = '✓ Signed in to Spotify. Checking what’s playing…';
  refreshTrack(true);
  startPolling();
} else {
  markConnected(false);
  $('status-message').textContent = 'Connect Spotify to load the track you’re playing.';
}
