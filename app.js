const CLIENT_ID = "940beb9b7c414631957560ead892d125";
const REDIRECT_URI = "https://khomedy.github.io/callback.html";
const SCOPES = "user-read-currently-playing";

const TOKEN_KEY = "spotify_tokens";
const STATE_KEY = "spotify_state";
const VERIFIER_KEY = "spotify_code_verifier";
const OPTIONS_KEY = "spotify_widget_options";

const trackContainer = document.getElementById("track-container");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const albumArt = document.getElementById("album-art");
const trackName = document.getElementById("track-name");
const artistName = document.getElementById("artist-name");
const albumName = document.getElementById("album-name");
const spotifyLink = document.getElementById("spotify-link");
const connectButton = document.getElementById("connect-button");
const logoutButton = document.getElementById("logout-button");
const customizer = document.getElementById("customizer");
const themeSelect = document.getElementById("theme-select");
const accentColor = document.getElementById("accent-color");
const showArt = document.getElementById("show-art");
const showAlbum = document.getElementById("show-album");
const showArtist = document.getElementById("show-artist");
const copyLinkButton = document.getElementById("copy-link");
const copyStatus = document.getElementById("copy-status");

connectButton.addEventListener("click", beginSpotifyAuth);
logoutButton.addEventListener("click", logOut);
[themeSelect, accentColor, showArt, showAlbum, showArtist].forEach((control) => {
  control.addEventListener("input", saveOptions);
  control.addEventListener("change", saveOptions);
});
copyLinkButton.addEventListener("click", copySiteLink);
loadOptions();

async function beginSpotifyAuth() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
    scope: SCOPES,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);

  if (params.has("error")) {
    showError("Spotify sign-in was cancelled or denied. You can try connecting again.");
    cleanCallbackUrl();
    return;
  }
  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !codeVerifier) {
    showError("Spotify sign-in could not be verified. Please connect again from this site.");
    cleanCallbackUrl();
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await response.json();
    if (!response.ok) throw new Error(tokenData.error_description || "Spotify token exchange failed.");

    localStorage.setItem(TOKEN_KEY, JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    }));
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    cleanCallbackUrl();
    await renderApp();
  } catch (error) {
    cleanCallbackUrl();
    showError(error.message || "Spotify sign-in failed.");
  }
}

function cleanCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function refreshToken() {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) return null;
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || "Token refresh failed.");
    const updated = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
    return updated.access_token;
  } catch (error) {
    console.error("Spotify token refresh failed:", error);
    return null;
  }
}

function getStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (Date.now() >= tokens.expires_at) return refreshToken();
  return tokens.access_token;
}

async function fetchCurrentTrack() {
  let token = await getAccessToken();
  if (!token) {
    showLoggedOutState();
    return;
  }
  let response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    token = await refreshToken();
    if (!token) {
      showLoggedOutState();
      return;
    }
    response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  if (response.status === 204) {
    showNoTrackState();
    return;
  }
  if (!response.ok) throw new Error(`Spotify couldn't load the current track (HTTP ${response.status}).`);
  renderTrack(await response.json());
}

function renderTrack(data) {
  if (!data?.item) {
    showNoTrackState();
    return;
  }
  const track = data.item;
  albumArt.src = track.album.images?.[0]?.url || "";
  albumArt.alt = `${track.name} album art`;
  trackName.textContent = track.name;
  artistName.textContent = track.artists.map((artist) => artist.name).join(", ");
  albumName.textContent = track.album.name;
  spotifyLink.href = track.external_urls?.spotify || "#";
  trackContainer.classList.remove("hidden");
  emptyState.classList.add("hidden");
  errorState.classList.add("hidden");
  logoutButton.classList.remove("hidden");
  customizer.classList.remove("hidden");
  applyOptions();
}

function showNoTrackState() {
  trackContainer.classList.add("hidden");
  emptyState.innerHTML = '<div class="spotify-icon">♪</div><p>Nothing is playing right now. Start a song and refresh.</p>';
  emptyState.classList.remove("hidden");
  errorState.classList.add("hidden");
  logoutButton.classList.remove("hidden");
  customizer.classList.remove("hidden");
}

function showLoggedOutState() {
  trackContainer.classList.add("hidden");
  emptyState.innerHTML = '<div class="spotify-icon">♪</div><p>Connect your Spotify account to preview your widget.</p><button id="connect-button" class="primary-button" type="button">Connect Spotify</button>';
  emptyState.classList.remove("hidden");
  document.getElementById("connect-button").addEventListener("click", beginSpotifyAuth);
  errorState.classList.add("hidden");
  logoutButton.classList.add("hidden");
  customizer.classList.add("hidden");
}

function showError(message) {
  trackContainer.classList.add("hidden");
  emptyState.classList.add("hidden");
  errorState.textContent = message;
  errorState.classList.remove("hidden");
  logoutButton.classList.add("hidden");
}

function logOut() {
  localStorage.removeItem(TOKEN_KEY);
  showLoggedOutState();
}

async function renderApp() {
  if (!getStoredTokens()) {
    showLoggedOutState();
    return;
  }
  try {
    await fetchCurrentTrack();
  } catch (error) {
    showError(error.message || "Unable to load your track.");
  }
}

function loadOptions() {
  let options = {};
  try {
    options = JSON.parse(localStorage.getItem(OPTIONS_KEY) || "{}");
  } catch {
    options = {};
  }
  themeSelect.value = options.theme || "green";
  accentColor.value = options.accent || "#1db954";
  showArt.checked = options.showArt !== false;
  showAlbum.checked = options.showAlbum !== false;
  showArtist.checked = options.showArtist !== false;
  applyOptions();
}

function saveOptions() {
  const options = {
    theme: themeSelect.value,
    accent: accentColor.value,
    showArt: showArt.checked,
    showAlbum: showAlbum.checked,
    showArtist: showArtist.checked,
  };
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  applyOptions();
}

function applyOptions() {
  const themes = {
    green: ["#071610", "#0f1f1b"],
    midnight: ["#10131f", "#1b2034"],
    lavender: ["#21172b", "#30203c"],
  };
  const colors = themes[themeSelect.value] || themes.green;
  document.documentElement.style.setProperty("--bg-1", colors[0]);
  document.documentElement.style.setProperty("--bg-2", colors[1]);
  document.documentElement.style.setProperty("--accent", accentColor.value);
  document.documentElement.style.setProperty("--accent-soft", `${accentColor.value}26`);
  albumArt.classList.toggle("hidden", !showArt.checked);
  artistName.classList.toggle("hidden", !showArtist.checked);
  albumName.classList.toggle("hidden", !showAlbum.checked);
}

async function copySiteLink() {
  try {
    await navigator.clipboard.writeText("https://khomedy.github.io/");
    copyStatus.textContent = "Site link copied.";
  } catch {
    copyStatus.textContent = "Copy this link: https://khomedy.github.io/";
  }
}

function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const callbackParams = new URLSearchParams(window.location.search);
if (callbackParams.has("code") || callbackParams.has("error")) {
  handleCallback();
} else {
  renderApp();
}
