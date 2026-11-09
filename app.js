const WIDGET_BASE = 'https://spotify-github-profile.kittinanx.com/api/view';
const CONNECT_URL = 'https://spotify-github-profile.kittinanx.com/api/login';
const STORAGE_KEY = 'novatorem-widget-generator-v5';
const $ = (id) => document.getElementById(id);
let format = 'markdown';
let previewRequest = 0;

function settings() {
  return {
    uid: $('widget-uid').value.trim(),
    cover: $('cover-enabled').checked,
    offline: $('show-offline').checked,
    interchange: $('interchange').checked,
    profanity: $('profanity').checked,
    hideRemaster: $('hide-remaster').checked,
    automatic: $('automatic-color').checked,
    bar: $('bar-color').value.slice(1),
    background: $('background-color').value.slice(1),
    shadow: $('shadow-color').value,
    mid: $('mid-color').value,
    highlight: $('highlight-color').value,
    strength: Number($('gradient-strength').value)
  };
}

function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { /* use defaults */ }
  if (saved.uid) $('widget-uid').value = saved.uid;
  for (const [id, key] of Object.entries({
    'cover-enabled':'cover','show-offline':'offline','interchange':'interchange',
    'profanity':'profanity','hide-remaster':'hideRemaster','automatic-color':'automatic'
  })) if (typeof saved[key] === 'boolean') $(id).checked = saved[key];
  for (const [id,key] of Object.entries({
    'bar-color':'bar','background-color':'background','shadow-color':'shadow',
    'mid-color':'mid','highlight-color':'highlight','gradient-strength':'strength'
  })) if (saved[key] !== undefined) $(id).value = id.includes('color') && !id.includes('strength') && !String(saved[key]).startsWith('#') ? `#${saved[key]}` : saved[key];
  refresh();
}

function widgetUrl(s = settings()) {
  if (!s.uid) return '';
  const params = new URLSearchParams({
    uid: s.uid,
    theme: 'novatorem',
    cover_image: String(s.cover),
    show_offline: String(s.offline),
    interchange: String(s.interchange),
    profanity: String(s.profanity),
    hide_remaster: String(s.hideRemaster),
    background_color: s.background,
    bar_color: s.bar,
    bar_color_cover: String(s.automatic)
  });
  return `${WIDGET_BASE}?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function refresh() {
  const s = settings();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* local storage may be disabled */ }
  $('gradient-ramp').style.background = `linear-gradient(90deg,${s.shadow},${s.mid} 50%,${s.highlight})`;
  $('strength-output').value = `${s.strength}%`;
  const url = widgetUrl(s);
  const image = $('widget-image');
  const request = ++previewRequest;
  image.removeAttribute('src');
  if (!s.uid) {
    $('connection-status').textContent = 'Not connected';
    $('status-message').textContent = 'Connect Spotify in the widget service, then paste the UID it provides here.';
    $('code-output').value = '';
    return;
  }
  $('connection-status').textContent = 'Loading live widget…';
  image.onload = () => { if (request === previewRequest) { $('connection-status').textContent = 'Widget loaded'; $('status-message').textContent = 'Live Novatorem widget loaded from the connected Spotify account.'; } };
  image.onerror = () => { if (request === previewRequest) { $('connection-status').textContent = 'Widget unavailable'; $('status-message').textContent = 'Could not load the widget. Confirm the UID from the authorization page and try again.'; } };
  image.src = url;
  const target = s.offline ? url : `${WIDGET_BASE}?${new URLSearchParams({uid:s.uid,redirect:'true'})}`;
  const htmlUrl = escapeHtml(url);
  const htmlTarget = escapeHtml(target);
  $('code-output').value = format === 'markdown'
    ? `[![spotify-github-profile](${url})](${target})`
    : `<p align="center">\n  <a href="${htmlTarget}">\n    <img src="${htmlUrl}" alt="spotify-github-profile">\n  </a>\n</p>`;
}

function connect() {
  window.open(CONNECT_URL, '_blank', 'noopener,noreferrer');
  $('status-message').textContent = 'Complete Spotify authorization in the new tab, then paste the UID shown there into the Widget UID field.';
}

async function copyCode() {
  const value = $('code-output').value;
  if (!value) { $('copy-status').textContent = 'Connect Spotify and enter the UID first.'; return; }
  try { await navigator.clipboard.writeText(value); $('copy-status').textContent = 'Copied embed code.'; }
  catch { $('code-output').focus(); $('code-output').select(); $('copy-status').textContent = 'Clipboard unavailable; code selected for manual copy.'; }
}

$('spotify-connect').addEventListener('click', connect);
$('copy-code').addEventListener('click', copyCode);
$('markdown-tab').addEventListener('click', () => { format = 'markdown'; $('markdown-tab').classList.add('active'); $('html-tab').classList.remove('active'); $('markdown-tab').setAttribute('aria-selected','true'); $('html-tab').setAttribute('aria-selected','false'); refresh(); });
$('html-tab').addEventListener('click', () => { format = 'html'; $('html-tab').classList.add('active'); $('markdown-tab').classList.remove('active'); $('html-tab').setAttribute('aria-selected','true'); $('markdown-tab').setAttribute('aria-selected','false'); refresh(); });
for (const id of ['widget-uid','cover-enabled','show-offline','interchange','profanity','hide-remaster','automatic-color','bar-color','background-color','gradient-enabled','shadow-color','mid-color','highlight-color','gradient-strength']) {
  $(id).addEventListener('input', refresh);
  $(id).addEventListener('change', refresh);
}
loadSettings();
