const STORAGE_KEY = 'widget-studio-state';
const TOKEN_KEY = 'spotify-widget-tokens';
const STATE_KEY = 'spotify-oauth-state';
const VERIFIER_KEY = 'spotify-pkce-verifier';
const SPOTIFY_CLIENT_ID = '940beb9b7c414631957560ead892d125';
const SPOTIFY_REDIRECT = 'https://khomedy.github.io/callback.html';
const SCOPES = 'user-read-currently-playing';

const defaults = {
  title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We’re Dreaming',
  art: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  bg1: '#0d1b19', bg2: '#0a2d30', accent: '#93f5c7', text: '#f2f7f5',
  overlay: 56, radius: 26, showArt: true, showAlbum: true, showArtist: true,
};

const refs = {
  title: document.getElementById('title-input'), artist: document.getElementById('artist-input'),
  album: document.getElementById('album-input'), art: document.getElementById('art-input'),
  bg1: document.getElementById('bg1-input'), bg2: document.getElementById('bg2-input'),
  accent: document.getElementById('accent-input'), text: document.getElementById('text-input'),
  overlay: document.getElementById('overlay-input'), radius: document.getElementById('radius-input'),
  showArt: document.getElementById('show-art'), showAlbum: document.getElementById('show-album'),
  showArtist: document.getElementById('show-artist'), widget: document.getElementById('widget-preview'),
  previewTitle: document.getElementById('preview-title'), previewArtist: document.getElementById('preview-artist'),
  previewAlbum: document.getElementById('preview-album'), coverArt: document.querySelector('.cover-art'),
  copyLink: document.getElementById('copy-link'), copyMarkdown: document.getElementById('copy-markdown'),
  status: document.getElementById('status-message'), spotifyConnect: document.getElementById('spotify-connect'),
};

function getState() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

function renderWidget() {
  const state = getState();
  refs.previewTitle.textContent = state.title || 'Now Playing';
  refs.previewArtist.textContent = state.artist || 'Artist';
  refs.previewAlbum.textContent = state.album || 'Album';
  const art = state.art || defaults.art;
  refs.coverArt.style.backgroundImage = `linear-gradient(135deg, ${state.bg1} 0%, ${state.bg2} 100%), url("${art.replace(/"/g, '%22')}")`;
  refs.coverArt.style.display = state.showArt ? 'block' : 'none';
  refs.previewArtist.style.display = state.showArtist ? 'block' : 'none';
  refs.previewAlbum.style.display = state.showAlbum ? 'block' : 'none';
  refs.widget.style.setProperty('--bg1', state.bg1);
  refs.widget.style.setProperty('--bg2', state.bg2);
  refs.widget.style.setProperty('--accent', state.accent);
  refs.widget.style.setProperty('--text', state.text);
  refs.widget.style.setProperty('--overlay-opacity', String(state.overlay / 100));
  refs.widget.style.setProperty('--radius', `${state.radius}px`);
}

function updateFromInputs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    title: refs.title.value, artist: refs.artist.value, album: refs.album.value, art: refs.art.value,
    bg1: refs.bg1.value, bg2: refs.bg2.value, accent: refs.accent.value, text: refs.text.value,
    overlay: Number(refs.overlay.value), radius: Number(refs.radius.value),
    showArt: refs.showArt.checked, showAlbum: refs.showAlbum.checked, showArtist: refs.showArtist.checked,
  }));
  renderWidget();
}

function loadInputs() {
  const state = getState();
  for (const key of ['title', 'artist', 'album', 'art', 'bg1', 'bg2', 'accent', 'text', 'overlay', 'radius', 'showArt', 'showAlbum', 'showArtist']) {
    const input = refs[key];
    if (input.type === 'checkbox') input.checked = Boolean(state[key]);
    else input.value = String(state[key]);
  }
  renderWidget();
}

function buildPreviewUrl() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(getState())) params.set(key, String(value));
  return `https://khomedy.github.io/preview.html?${params}`;
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    refs.status.textContent = successMessage;
  } catch {
    refs.status.textContent = `Clipboard unavailable. Copy this: ${text}`;
  }
}

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function beginSpotifyAuth() {
  try {
    const verifier = randomVerifier();
    const challenge = await createCodeChallenge(verifier);
    const state = randomVerifier().slice(0, 32);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT,
      scope: SCOPES,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
  } catch (error) {
    refs.status.textContent = `Could not start Spotify sign-in: ${error.message}`;
  }
}

async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);

  if (params.has('error')) {
    refs.status.textContent = `Spotify sign-in was not completed: ${params.get('error')}.`;
    cleanCallbackUrl();
    return;
  }
  if (!code || !returnedState || returnedState !== expectedState || !verifier) {
    refs.status.textContent = 'Spotify sign-in could not be verified. Please try Connect Spotify again.';
    cleanCallbackUrl();
    return;
  }

  refs.status.textContent = 'Spotify connected. Loading your current track…';
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code,
        redirect_uri: SPOTIFY_REDIRECT, code_verifier: verifier,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || `Token exchange failed (HTTP ${response.status}).`);
    localStorage.setItem(TOKEN_KEY, JSON.stringify({
      accessToken: data.access_token, refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }));
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    cleanCallbackUrl();
    await loadCurrentTrack();
  } catch (error) {
    cleanCallbackUrl();
    refs.status.textContent = `Spotify sign-in succeeded, but the track request failed: ${error.message}`;
  }
}

function cleanCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function getValidAccessToken() {
  const tokens = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt - 30000) return tokens.accessToken;
  if (!tokens.refreshToken) return null;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'refresh_token', refresh_token: tokens.refreshToken }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || `Token refresh failed (HTTP ${response.status}).`);
  const updated = { accessToken: data.access_token, refreshToken: data.refresh_token || tokens.refreshToken, expiresAt: Date.now() + data.expires_in * 1000 };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
  return updated.accessToken;
}

async function loadCurrentTrack() {
  const token = await getValidAccessToken();
  if (!token) {
    refs.status.textContent = 'Connect Spotify to load live track details. The widget designer works without it.';
    return;
  }
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 204) {
    refs.status.textContent = 'Spotify is connected, but it reports no track currently playing. Your editor is still ready.';
    return;
  }
  if (!response.ok) {
    if (response.status === 403) {
      refs.status.textContent = 'Spotify connected, but Spotify denied playback access (HTTP 403). The editor still works; check your app access and permissions.';
      return;
    }
    refs.status.textContent = `Spotify connected, but the track request failed (HTTP ${response.status}). The editor still works.`;
    return;
  }
  const data = await response.json();
  if (!data.item) {
    refs.status.textContent = 'Spotify is connected, but no track is available right now.';
    return;
  }
  const track = data.item;
  refs.title.value = track.name || '';
  refs.artist.value = track.artists?.map((artist) => artist.name).join(', ') || '';
  refs.album.value = track.album?.name || '';
  refs.art.value = track.album?.images?.[0]?.url || '';
  updateFromInputs();
  refs.status.textContent = 'Live track loaded into your widget. Adjust the design and copy your README snippet.';
}

refs.copyLink.addEventListener('click', () => copyText(buildPreviewUrl(), 'Preview URL copied.'));
refs.copyMarkdown.addEventListener('click', () => copyText(`![Now Playing](${buildPreviewUrl()})`, 'Markdown copied. Paste it into your README.'));
refs.spotifyConnect.addEventListener('click', beginSpotifyAuth);
for (const input of Object.values({
  title: refs.title, artist: refs.artist, album: refs.album, art: refs.art, bg1: refs.bg1,
  bg2: refs.bg2, accent: refs.accent, text: refs.text, overlay: refs.overlay, radius: refs.radius,
  showArt: refs.showArt, showAlbum: refs.showAlbum, showArtist: refs.showArtist,
})) {
  input.addEventListener('input', updateFromInputs);
  input.addEventListener('change', updateFromInputs);
}

loadInputs();
if (new URLSearchParams(window.location.search).has('code') || new URLSearchParams(window.location.search).has('error')) {
  handleSpotifyCallback();
}
