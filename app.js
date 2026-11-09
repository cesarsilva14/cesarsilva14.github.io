const API_BASE = 'https://spotify-github-profile.kittinanx.com/api/view';
const $ = (id) => document.getElementById(id);
const settingIds = ['cover-image', 'open-spotify', 'show-offline', 'interchange', 'profanity', 'hide-remaster', 'bar-color-cover'];
const STORAGE_KEY = 'novatorem-generator-settings';
let codeFormat = 'markdown';
let loadTimer;

function hexValue(inputId) {
  return $(inputId).value.replace(/^#/, '').toUpperCase();
}

function settings() {
  return {
    uid: $('spotify-uid').value.trim(),
    profile: $('profile-link').value.trim(),
    cover: $('cover-image').checked,
    openSpotify: $('open-spotify').checked,
    offline: $('show-offline').checked,
    interchange: $('interchange').checked,
    profanity: $('profanity').checked,
    hideRemaster: $('hide-remaster').checked,
    bar: hexValue('bar-color'),
    background: hexValue('background-color'),
    barCover: $('bar-color-cover').checked,
  };
}

function widgetUrl(s = settings()) {
  const query = new URLSearchParams({
    uid: s.uid,
    cover_image: String(s.cover),
    theme: 'novatorem',
    show_offline: String(s.offline),
    background_color: s.background,
    interchange: String(s.interchange),
    profanity: String(s.profanity),
    hide_remaster: String(s.hideRemaster),
    bar_color: s.bar,
    bar_color_cover: String(s.barCover),
  });
  return `${API_BASE}?${query.toString()}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function updateCode(s = settings()) {
  if (!s.uid) {
    $('code-output').value = '';
    return;
  }
  const image = widgetUrl(s);
  const markdown = `[![spotify-github-profile](${image})](${s.profile || image})`;
  const html = `<p align="center">\n  <a href="${escapeHtml(s.profile || image)}">\n    <img src="${escapeHtml(image)}" alt="spotify-github-profile">\n  </a>\n</p>`;
  $('code-output').value = codeFormat === 'markdown' ? markdown : html;
}

function refreshWidget() {
  const s = settings();
  clearTimeout(loadTimer);
  $('widget-status').textContent = s.uid ? 'Loading Novatorem widget…' : 'Enter your Spotify UID';
  $('widget-preview').alt = s.uid ? 'Loading Novatorem widget for Spotify UID ' + s.uid : 'Enter your Spotify UID to preview the widget';
  $('widget-preview').removeAttribute('src');
  updateCode(s);
  if (!s.uid) return;
  loadTimer = setTimeout(() => {
    const image = $('widget-preview');
    image.onload = () => { $('widget-status').textContent = 'Widget loaded · Novatorem'; };
    image.onerror = () => { $('widget-status').textContent = 'Widget could not load. Check the Spotify UID or try again later.'; };
    image.src = widgetUrl(s);
  }, 180);
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.uid) $('spotify-uid').value = saved.uid;
    if (saved.profile) $('profile-link').value = saved.profile;
    if (saved.bar) $('bar-color').value = `#${saved.bar.replace(/^#/, '')}`;
    if (saved.background) $('background-color').value = `#${saved.background.replace(/^#/, '')}`;
    for (const id of settingIds) {
      if (typeof saved[id] === 'boolean') $(id).checked = saved[id];
    }
  } catch { /* Start with the documented example defaults. */ }
  refreshWidget();
}

function saveAndRefresh() {
  const s = settings();
  const saved = {
    uid: s.uid,
    profile: s.profile,
    bar: s.bar,
    background: s.background,
  };
  for (const id of settingIds) saved[id] = $(id).checked;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  refreshWidget();
}

function selectFormat(format) {
  codeFormat = format;
  for (const name of ['markdown', 'html']) {
    $(`${name}-tab`).classList.toggle('active', name === format);
    $(`${name}-tab`).setAttribute('aria-selected', String(name === format));
  }
  updateCode();
}

async function copyCode() {
  const output = $('code-output');
  try {
    await navigator.clipboard.writeText(output.value);
    $('copy-status').textContent = 'Copied to clipboard.';
  } catch {
    output.focus();
    output.select();
    $('copy-status').textContent = 'Clipboard access is unavailable. The code is selected—copy it manually.';
  }
}

for (const id of [...settingIds, 'spotify-uid', 'profile-link', 'bar-color', 'background-color']) {
  $(id).addEventListener('input', saveAndRefresh);
  $(id).addEventListener('change', saveAndRefresh);
}
$('markdown-tab').addEventListener('click', () => selectFormat('markdown'));
$('html-tab').addEventListener('click', () => selectFormat('html'));
$('copy-code').addEventListener('click', copyCode);
restoreSettings();
