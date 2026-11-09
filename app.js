const CLIENT_ID = "940beb9b7c414631957560ead892d125";
const REDIRECT_URI = "https://khomedy.github.io/callback";
const SCOPES = ["user-read-currently-playing"].join(" ");

const TOKEN_KEY = "spotify_tokens";
const STATE_KEY = "spotify_state";
const VERIFIER_KEY = "spotify_code_verifier";

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

connectButton.addEventListener("click", beginSpotifyAuth);
logoutButton.addEventListener("click", logOut);

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

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);

  if (params.has("error")) {
    showError("Spotify sign-in was cancelled or denied. Please try again.");
    return;
  }

  if (!code || !returnedState || !expectedState || returnedState !== expectedState || !codeVerifier) {
    showError("Spotify sign-in failed. Please try again.");
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      throw new Error(tokenData.error_description || "Token exchange failed.");
    }

    const payload = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    };

    localStorage.setItem(TOKEN_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);

    window.history.replaceState({}, document.title, "/");
    renderApp();
  } catch (error) {
    showError(error.message || "Spotify sign-in failed.");
  }
}

async function refreshToken() {
  const tokens = getStoredTokens();
  if (!tokens || !tokens.refresh_token) return null;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      throw new Error(tokenData.error_description || "Refresh failed.");
    }

    const updatedTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };

    localStorage.setItem(TOKEN_KEY, JSON.stringify(updatedTokens));
    return updatedTokens.access_token;
  } catch (error) {
    console.error("Refresh token failed:", error);
    return null;
  }
}

function getStoredTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (Date.now() >= tokens.expires_at) {
    return (await refreshToken()) || null;
  }

  return tokens.access_token;
}

async function fetchCurrentTrack() {
  const token = await getAccessToken();
  if (!token) {
    showLoggedOutState();
    return;
  }

  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    showNoTrackState();
    return;
  }

  if (response.status === 401) {
    const refreshedToken = await refreshToken();
    if (!refreshedToken) {
      showLoggedOutState();
      return;
    }

    const retry = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${refreshedToken}`,
      },
    });

    if (retry.status === 204) {
      showNoTrackState();
      return;
    }

    if (!retry.ok) {
      throw new Error("Failed to load current track.");
    }

    const data = await retry.json();
    renderTrack(data);
    return;
  }

  if (!response.ok) {
    throw new Error("Failed to load current track.");
  }

  const data = await response.json();
  renderTrack(data);
}

function renderTrack(data) {
  if (!data || !data.item) {
    showNoTrackState();
    return;
  }

  const track = data.item;
  const artistNames = track.artists.map((artist) => artist.name).join(", ");
  const image = track.album.images?.[0]?.url || "";

  trackContainer.classList.remove("hidden");
  emptyState.classList.add("hidden");
  errorState.classList.add("hidden");
  logoutButton.classList.remove("hidden");

  albumArt.src = image;
  albumArt.alt = `${track.name} album art`;
  trackName.textContent = track.name;
  artistName.textContent = artistNames;
  albumName.textContent = track.album.name;
  spotifyLink.href = track.external_urls?.spotify || "#";
}

function showNoTrackState() {
  trackContainer.classList.add("hidden");
  emptyState.classList.remove("hidden");
  errorState.classList.add("hidden");
  logoutButton.classList.remove("hidden");

  emptyState.innerHTML = `
    <div class="spotify-icon">♪</div>
    <p>Nothing is playing right now.</p>
    <button id="connect-button" class="primary-button">Connect Spotify</button>
  `;

  document.getElementById("connect-button").addEventListener("click", beginSpotifyAuth);
}

function showLoggedOutState() {
  trackContainer.classList.add("hidden");
  emptyState.classList.remove("hidden");
  errorState.classList.add("hidden");
  logoutButton.classList.add("hidden");

  emptyState.innerHTML = `
    <div class="spotify-icon">♪</div>
    <p>Connect your Spotify to show what you’re listening to.</p>
    <button id="connect-button" class="primary-button">Connect Spotify</button>
  `;

  document.getElementById("connect-button").addEventListener("click", beginSpotifyAuth);
}

function showError(message) {
  trackContainer.classList.add("hidden");
  emptyState.classList.add("hidden");
  errorState.classList.remove("hidden");
  logoutButton.classList.add("hidden");
  errorState.textContent = message;
}

function logOut() {
  localStorage.removeItem(TOKEN_KEY);
  showLoggedOutState();
}

async function renderApp() {
  const tokens = getStoredTokens();
  if (!tokens) {
    showLoggedOutState();
    return;
  }

  try {
    await fetchCurrentTrack();
  } catch (error) {
    showError(error.message || "Unable to load track.");
  }
}

function generateRandomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let text = "";

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function base64UrlEncode(value) {
  let binary = "";
  const bytes = new Uint8Array(value);

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const callbackParams = new URLSearchParams(window.location.search);
if (
  window.location.pathname.endsWith("/callback") ||
  window.location.pathname.endsWith("/callback.html") ||
  callbackParams.has("code") ||
  callbackParams.has("error")
) {
  handleCallback();
} else {
  renderApp();
}
