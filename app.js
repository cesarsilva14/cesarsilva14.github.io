const STORAGE_KEY = 'widget-studio-state';
const SPOTIFY_CLIENT_ID = '940beb9b7c414631957560ead892d125';
const SPOTIFY_REDIRECT = 'https://khomedy.github.io/callback.html';

const defaults = {
  title: 'Midnight City',
  artist: 'M83',
  album: 'Hurry Up, We’re Dreaming',
  art: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  bg1: '#0d1b19',
  bg2: '#0a2d30',
  accent: '#93f5c7',
  text: '#f2f7f5',
  overlay: 56,
  radius: 26,
  showArt: true,
  showAlbum: true,
  showArtist: true,
};

const refs = {
  title: document.getElementById('title-input'),
  artist: document.getElementById('artist-input'),
  album: document.getElementById('album-input'),
  art: document.getElementById('art-input'),
  bg1: document.getElementById('bg1-input'),
  bg2: document.getElementById('bg2-input'),
  accent: document.getElementById('accent-input'),
  text: document.getElementById('text-input'),
  overlay: document.getElementById('overlay-input'),
  radius: document.getElementById('radius-input'),
  showArt: document.getElementById('show-art'),
  showAlbum: document.getElementById('show-album'),
  showArtist: document.getElementById('show-artist'),
  widget: document.getElementById('widget-preview'),
  previewTitle: document.getElementById('preview-title'),
  previewArtist: document.getElementById('preview-artist'),
  previewAlbum: document.getElementById('preview-album'),
  coverArt: document.querySelector('.cover-art'),
  copyLink: document.getElementById('copy-link'),
  copyMarkdown: document.getElementById('copy-markdown'),
  status: document.getElementById('status-message'),
  spotifyConnect: document.getElementById('spotify-connect'),
};

const getState = () => {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
};

const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const applyStateToInputs = (state) => {
  Object.entries({
    title: refs.title,
    artist: refs.artist,
    album: refs.album,
    art: refs.art,
    bg1: refs.bg1,
    bg2: refs.bg2,
    accent: refs.accent,
    text: refs.text,
    overlay: refs.overlay,
    radius: refs.radius,
    showArt: refs.showArt,
    showAlbum: refs.showAlbum,
    showArtist: refs.showArtist,
  }).forEach(([key, input]) => {
    const value = state[key];
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else if (input.type === 'range') {
      input.value = String(value);
    } else {
      input.value = String(value);
    }
  });
};

const renderWidget = () => {
  const state = getState();

  refs.previewTitle.textContent = state.title || 'Now Playing';
  refs.previewArtist.textContent = state.artist || 'Artist';
  refs.previewAlbum.textContent = state.album || 'Album';

  const art = state.art || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80';
  refs.coverArt.style.backgroundImage = `linear-gradient(135deg, ${state.bg1} 0%, ${state.bg2} 100%), url(${art})`;
  refs.coverArt.style.opacity = state.showArt ? '1' : '0';
  refs.previewArtist.style.display = state.showArtist ? 'block' : 'none';
  refs.previewAlbum.style.display = state.showAlbum ? 'block' : 'none';

  refs.widget.style.setProperty('--bg1', state.bg1);
  refs.widget.style.setProperty('--bg2', state.bg2);
  refs.widget.style.setProperty('--accent', state.accent);
  refs.widget.style.setProperty('--text', state.text);
  refs.widget.style.setProperty('--overlay-opacity', `${state.overlay / 100}`);
  refs.widget.style.setProperty('--radius', `${state.radius}px`);
  refs.widget.style.setProperty('--cover-display', state.showArt ? 'block' : 'none');
};

const updateFromInputs = () => {
  const state = {
    title: refs.title.value,
    artist: refs.artist.value,
    album: refs.album.value,
    art: refs.art.value,
    bg1: refs.bg1.value,
    bg2: refs.bg2.value,
    accent: refs.accent.value,
    text: refs.text.value,
    overlay: Number(refs.overlay.value),
    radius: Number(refs.radius.value),
    showArt: refs.showArt.checked,
    showAlbum: refs.showAlbum.checked,
    showArtist: refs.showArtist.checked,
  };

  saveState(state);
  renderWidget();
};

const buildPreviewUrl = () => {
  const state = getState();
  const params = new URLSearchParams({
    title: state.title,
    artist: state.artist,
    album: state.album,
    art: state.art,
    bg1: state.bg1,
    bg2: state.bg2,
    accent: state.accent,
    text: state.text,
    overlay: String(state.overlay),
    radius: String(state.radius),
    showArt: String(state.showArt),
    showAlbum: String(state.showAlbum),
    showArtist: String(state.showArtist),
  });
  return `https://khomedy.github.io/preview.html?${params.toString()}`;
};

const copyText = async (text, successMessage) => {
  try {
    await navigator.clipboard.writeText(text);
    refs.status.textContent = successMessage;
  } catch {
    refs.status.textContent = `Copy manually: ${text}`;
  }
};

refs.copyLink.addEventListener('click', async () => {
  const url = buildPreviewUrl();
  await copyText(url, 'Preview URL copied.');
});

refs.copyMarkdown.addEventListener('click', async () => {
  const url = buildPreviewUrl();
  const markdown = `![Now Playing](${url})`;
  await copyText(markdown, 'Markdown copied. Paste it into your README.');
});

Object.values({
  title: refs.title,
  artist: refs.artist,
  album: refs.album,
  art: refs.art,
  bg1: refs.bg1,
  bg2: refs.bg2,
  accent: refs.accent,
  text: refs.text,
  overlay: refs.overlay,
  radius: refs.radius,
  showArt: refs.showArt,
  showAlbum: refs.showAlbum,
  showArtist: refs.showArtist,
}).forEach((input) => {
  input.addEventListener('input', updateFromInputs);
  input.addEventListener('change', updateFromInputs);
});

refs.spotifyConnect.addEventListener('click', () => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT,
    scope: 'user-read-currently-playing',
    code_challenge_method: 'S256',
    state: 'optional',
  });

  refs.status.textContent = 'Spotify is optional for this widget editor. If you want a live current-track preview, connect below.';
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
});

const initialState = getState();
applyStateToInputs(initialState);
renderWidget();
