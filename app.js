const CLIENT_ID = '940beb9b7c414631957560ead892d125';
const REDIRECT_URI = 'https://khomedy.github.io/callback.html';
const SCOPES = 'user-read-currently-playing';
const TOKEN_KEY = 'spotify-widget-tokens-v2';
const VERIFIER_KEY = 'spotify-widget-verifier';
const STATE_KEY = 'spotify-widget-state';
const SETTINGS_KEY = 'spotify-widget-settings-v2';
const POLL_MS = 20000;

const $ = (id) => document.getElementById(id);
const controls = [
  'cover-enabled',
  'open-spotify',
  'show-offline',
  'interchange',
  'censor',
  'hide-remaster',
  'show-wave',
  'theme',
  'bar-color',
  'background-color',
  'automatic-color',
  'gradient-enabled',
  'shadow-color',
  'mid-color',
  'highlight-color',
  'gradient-strength'
];

let activeCodeFormat = 'markdown';
let pollHandle = null;

const defaultSettings = {
  coverEnabled: true,
  openSpotify: false,
  showOffline: false,
  interchange: false,
  censor: false,
  hideRemaster: false,
  showWave: true,
  theme: 'minimal',
  barColor: '#53b14f',
  backgroundColor: '#ffffff',
  automaticColor: false,
  gradientEnabled: true,
  shadow: '#172b46',
  mid: '#4d7ab3',
  highlight: '#d7e3f5',
  strength: 55,
  artist: 'M83',
  title: 'Midnight City',
  art: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80'
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function readSettings() {
  const saved = safeParse(localStorage.getItem(SETTINGS_KEY), {});
  return { ...defaultSettings, ...saved };
}

function fromControls() {
  return {
    coverEnabled: $('cover-enabled').checked,
    openSpotify: $('open-spotify').checked,
    showOffline: $('show-offline').checked,
    interchange: $('interchange').checked,
    censor: $('censor').checked,
    hideRemaster: $('hide-remaster').checked,
    showWave: $('show-wave').checked,
    theme: $('theme').value,
    barColor: $('bar-color').value,
    backgroundColor: $('background-color').value,
    automaticColor: $('automatic-color').checked,
    gradientEnabled: $('gradient-enabled').checked,
    shadow: $('shadow-color').value,
    mid: $('mid-color').value,
    highlight: $('highlight-color').value,
    strength: Number($('gradient-strength').value),
    artist: $('preview-artist').textContent.trim() || defaultSettings.artist,
    title: $('preview-song').textContent.trim() || defaultSettings.title,
    art: $('preview-art').src || defaultSettings.art
  };
}

function setControlValues(settings) {
  $('cover-enabled').checked = !!settings.coverEnabled;
  $('open-spotify').checked = !!settings.openSpotify;
  $('show-offline').checked = !!settings.showOffline;
  $('interchange').checked = !!settings.interchange;
  $('censor').checked = !!settings.censor;
  $('hide-remaster').checked = !!settings.hideRemaster;
  $('show-wave').checked = !!settings.showWave;
  $('theme').value = settings.theme || 'minimal';
  $('bar-color').value = settings.barColor || '#53b14f';
  $('background-color').value = settings.backgroundColor || '#ffffff';
  $('automatic-color').checked = !!settings.automaticColor;
  $('gradient-enabled').checked = !!settings.gradientEnabled;
  $('shadow-color').value = settings.shadow || '#172b46';
  $('mid-color').value = settings.mid || '#4d7ab3';
  $('highlight-color').value = settings.highlight || '#d7e3f5';
  $('gradient-strength').value = String(settings.strength ?? 55);

  if (settings.artist) $('preview-artist').textContent = settings.artist;
  if (settings.title) $('preview-song').textContent = settings.title;
  if (settings.art) $('preview-art').src = settings.art;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function render(settings = readSettings()) {
  const preview = $('widget-preview');
  const art = $('preview-art');
  const wave = $('preview-wave');

  preview.style.background = settings.backgroundColor || '#ffffff';
  preview.style.setProperty('--bar-color', settings.barColor || '#53b14f');
  preview.style.setProperty('--shadow', settings.shadow || '#172b46');
  preview.style.setProperty('--mid', settings.mid || '#4d7ab3');
  preview.style.setProperty('--highlight', settings.highlight || '#d7e3f5');
  preview.style.setProperty('--map-strength', settings.gradientEnabled ? Number(settings.strength || 55) / 100 : 0);

  art.style.display = settings.coverEnabled ? 'block' : 'none';
  art.style.filter = settings.gradientEnabled ? 'none' : 'none';
  art.style.setProperty('--gradient-on', settings.gradientEnabled ? '1' : '0');
  wave.style.display = settings.showWave ? 'block' : 'none';

  const artist = settings.interchange ? settings.title : settings.artist;
  const title = settings.interchange ? settings.artist : settings.title;
  $('preview-artist').textContent = artist || defaultSettings.artist;
  $('preview-song').textContent = title || defaultSettings.title;

  $('gradient-ramp').style.background = `linear-gradient(90deg, ${settings.shadow || '#172b46'}, ${settings.mid || '#4d7ab3'} 50%, ${settings.highlight || '#d7e3f5'})`;
  $('strength-output').value = `${settings.strength ?? 55}%`;
  updateCode(settings);
}

function save() {
  const settings = fromControls();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  render(settings);
}

function previewUrl(settings = readSettings()) {
  const params = new URLSearchParams();

  params.set('artist', settings.artist || defaultSettings.artist);
  params.set('title', settings.title || defaultSettings.title);
  params.set('art', settings.art || defaultSettings.art);
  params.set('cover', String(!!settings.coverEnabled));
  params.set('openSpotify', String(!!settings.openSpotify));
  params.set('offline', String(!!settings.showOffline));
  params.set('interchange', String(!!settings.interchange));
  params.set('censor', String(!!settings.censor));
  params.set('hideRemaster', String(!!settings.hideRemaster));
  params.set('showWave', String(!!settings.showWave));
  params.set('theme', settings.theme || 'minimal');
  params.set('bar', settings.barColor || '#53b14f');
  params.set('bg', settings.backgroundColor || '#ffffff');
  params.set('auto', String(!!settings.automaticColor));
  params.set('shadow', settings.shadow || '#172b46');
  params.set('mid', settings.mid || '#4d7ab3');
  params.set('highlight', settings.highlight || '#d7e3f5');
  params.set('strength', String(settings.strength ?? 55));

  return `https://khomedy.github.io/preview.html?${params.toString()}`;
}

function updateCode(settings = fromControls()) {
  const url = previewUrl(settings);
  const safeUrl = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const safeTitle = escapeHtml(settings.title || defaultSettings.title);
  const safeArtist = escapeHtml(settings.artist || defaultSettings.artist);

  const markdown = `[Now Playing — ${safeArtist} · ${safeTitle}](${url})`;
  const html = `<a href="${url}" target="_blank" rel="noreferrer noopener"><img src="${url}" alt="Now Playing — ${safeArtist} · ${safeTitle}" width="500" /></a>`;

  $('code-output').value = activeCodeFormat === 'html' ? html : markdown;
  $('preview-link').value = url;
  $('preview-url').href = url;
  $('preview-url').textContent = url;

  if (activeCodeFormat === 'html') {
    $('html-tab').classList.add('active');
    $('markdown-tab').classList.remove('active');
  } else {
    $('markdown-tab').classList.add('active');
    $('html-tab').classList.remove('active');
  }
}

async function copyCode() {
  const text = $('code-output').value;
  try {
    await navigator.clipboard.writeText(text);
    $('copy-code').textContent = '✓ Copied';
  } catch (error) {
    $('code-output').focus();
    $('code-output').select();
    document.execCommand('copy');
    $('copy-code').textContent = '✓ Copied';
  }
  clearTimeout(window.copyTimer);
  window.copyTimer = setTimeout(() => {
    $('copy-code').textContent = '▢  Copy to clipboard';
  }, 1500);
}

function setFormat(format) {
  activeCodeFormat = format;
  updateCode(fromControls());
}

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function connectSpotify() {
  try {
    const verifier = randomVerifier();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    sessionStorage.setItem(VERIFIER_KEY, verifier);

    const state = crypto.getRandomValues(new Uint8Array(16));
    const stateValue = Array.from(state, (value) => value.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(STATE_KEY, stateValue);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      state: stateValue,
      code_challenge_method: 'S256',
      code_challenge: challenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  } catch (error) {
    $('status-message').textContent = 'Spotify sign-in could not start. Please try again.';
    console.error(error);
  }
}

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

function setTokens(data, old = {}) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    access: data.access_token,
    refresh: data.refresh_token || old.refresh,
    expires: Date.now() + (Number(data.expires_in || 3600) * 1000)
  }));
}

function setSignedIn(ok) {
  $('connection-status').textContent = ok ? '✓ Signed in to Spotify' : 'Not signed in';
  $('connection-status').classList.toggle('signed-in', ok);
  $('spotify-connect').textContent = ok ? 'Disconnect' : 'Connect Spotify';
}

async function token() {
  let existing = getTokens();
  if (!existing) return null;

  if (Date.now() < existing.expires - 30000) {
    return existing.access;
  }

  if (!existing.refresh) {
    localStorage.removeItem(TOKEN_KEY);
    setSignedIn(false);
    return null;
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: existing.refresh,
    client_id: CLIENT_ID
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const data = await response.json();
    setTokens(data, existing);
    return data.access_token;
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    setSignedIn(false);
    return null;
  }
}

async function pollTrack() {
  try {
    const access = await token();
    if (!access) {
      setSignedIn(false);
      return;
    }

    setSignedIn(true);

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${access}` }
    });

    if (response.status === 204) {
      $('status-message').textContent = 'Nothing is playing right now. You can still build your widget.';
      return;
    }

    if (!response.ok) {
      throw new Error('Spotify request failed');
    }

    const data = await response.json();
    const item = data.item || null;
    if (!item) {
      $('status-message').textContent = 'Nothing is playing right now. You can still build your widget.';
      return;
    }

    const artist = item.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist';
    const title = item.name || 'Unknown title';
    const art = item.album?.images?.[0]?.url || defaultSettings.art;

    $('preview-artist').textContent = artist;
    $('preview-song').textContent = title;
    $('preview-art').src = art;
    $('status-message').textContent = 'Live Spotify data loaded.';

    const settings = fromControls();
    settings.artist = artist;
    settings.title = title;
    settings.art = art;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    render(settings);
  } catch (error) {
    $('status-message').textContent = 'Spotify data is unavailable right now. You can still customize the widget.';
    console.error(error);
  }
}

async function handleCallback() {
  const query = new URLSearchParams(location.search);
  const code = query.get('code');
  const state = query.get('state');

  if (query.has('error')) {
    $('status-message').textContent = 'Spotify sign-in was canceled or denied.';
    return;
  }

  if (!code) {
    return;
  }

  const storedState = sessionStorage.getItem(STATE_KEY);
  if (storedState && state !== storedState) {
    $('status-message').textContent = 'Spotify sign-in state did not match. Please try again.';
    return;
  }

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    $('status-message').textContent = 'Spotify PKCE verifier was missing. Please try again.';
    return;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    setTokens(data);
    setSignedIn(true);
    $('status-message').textContent = 'Spotify connected. Loading your current track...';
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    history.replaceState({}, document.title, '/');
    await pollTrack();
  } catch (error) {
    $('status-message').textContent = 'Spotify sign-in failed. Please try again.';
    console.error(error);
  }
}

function disconnect() {
  localStorage.removeItem(TOKEN_KEY);
  if (pollHandle) {
    clearInterval(pollHandle);
  }
  setSignedIn(false);
  $('status-message').textContent = 'Disconnected. You can still build your widget.';
}

for (const id of controls) {
  const element = $(id);
  if (!element) continue;
  element.addEventListener('input', save);
  element.addEventListener('change', save);
}

$('copy-code').addEventListener('click', copyCode);
$('markdown-tab').addEventListener('click', () => setFormat('markdown'));
$('html-tab').addEventListener('click', () => setFormat('html'));
$('spotify-connect').addEventListener('click', async () => {
  if ($('spotify-connect').textContent.includes('Disconnect')) {
    disconnect();
    return;
  }
  await connectSpotify();
});

const initialSettings = readSettings();
setControlValues(initialSettings);
render(initialSettings);

const callback = new URLSearchParams(location.search);
if (callback.has('code') || callback.has('error')) {
  handleCallback();
} else if (getTokens()) {
  setSignedIn(true);
  $('status-message').textContent = 'Connected. Loading your current track...';
  pollTrack();
  pollHandle = setInterval(pollTrack, POLL_MS);
} else {
  $('status-message').textContent = 'Connect Spotify to load what you’re playing. You can customize the sample without signing in.';
}

window.addEventListener('DOMContentLoaded', () => {
  if (getTokens()) {
    pollHandle = setInterval(pollTrack, POLL_MS);
  }
});
