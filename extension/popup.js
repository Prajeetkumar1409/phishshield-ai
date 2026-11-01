const DEFAULT_SERVER = 'https://client-roan-delta.vercel.app';
const $ = (id) => document.getElementById(id);

async function getServer() {
  const { server } = await chrome.storage.sync.get({ server: DEFAULT_SERVER });
  return server.replace(/\/$/, '');
}

function showError(el, message) {
  el.hidden = false;
  el.className = 'result error';
  el.textContent = message;
}

/**
 * Every action hands off to the background worker, which opens TRACE-X with the result.
 * The popup closes as soon as that tab opens, so only failures are ever shown here.
 */
async function handOff(button, resultEl, message) {
  button.disabled = true;
  resultEl.hidden = false;
  resultEl.className = 'result loading';
  resultEl.textContent = 'Opening TRACE-X…';
  const res = await chrome.runtime.sendMessage(message);
  button.disabled = false;
  if (res?.ok) return;
  showError(resultEl, `${res?.error || 'Something went wrong'}. Check the server URL in settings (⚙).`);
}

let activeTab = null;

$('gmail-tracex').addEventListener('click', () => handOff($('gmail-tracex'), $('gmail-result'), { type: 'gmail-tracex', tabId: activeTab.id }));

$('page-tracex').addEventListener('click', () => handOff($('page-tracex'), $('page-result'), { type: 'link-tracex', url: activeTab.url }));

$('paste-tracex').addEventListener('click', () => {
  const raw = $('text').value;
  if (!raw.trim()) return showError($('paste-result'), 'Paste the original email first');
  handOff($('paste-tracex'), $('paste-result'), { type: 'paste-tracex', raw });
});

$('settings-btn').addEventListener('click', () => ($('settings').hidden = !$('settings').hidden));
$('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({ server: $('server').value.trim() || DEFAULT_SERVER });
  $('settings').hidden = true;
  init();
});

async function init() {
  const server = await getServer();
  $('server').value = server;
  $('open-app').href = `${server}/trace-x.html`;

  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = activeTab?.url || '';
  const isWeb = /^https?:/.test(url);
  $('gmail-card').hidden = !/^https:\/\/mail\.google\.com\/mail\//.test(url);
  // On Gmail the page URL is just the mailbox; the email card above is what matters.
  $('page-card').hidden = !isWeb || !$('gmail-card').hidden;
  $('page-url').textContent = url || '—';
}
init();
