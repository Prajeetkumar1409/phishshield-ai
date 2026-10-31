const DEFAULT_SERVER = 'http://localhost:5000';
const $ = (id) => document.getElementById(id);

async function getServer() {
  const { server } = await chrome.storage.sync.get({ server: DEFAULT_SERVER });
  return server.replace(/\/$/, '');
}

async function analyze(type, content) {
  const server = await getServer();
  const res = await fetch(`${server}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content, save: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body;
}

/** Build the result DOM with textContent only — never inject server strings as HTML. */
function render(el, r) {
  el.hidden = false;
  el.className = `result ${r.verdict}`;
  el.replaceChildren();

  const head = document.createElement('div');
  head.className = 'verdict';
  const score = document.createElement('span');
  score.className = 'score';
  score.textContent = r.riskScore;
  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.textContent = r.verdict.toUpperCase();
  head.append(score, pill);

  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.textContent = r.summary;

  const list = document.createElement('ul');
  for (const s of r.signals.filter((x) => x.severity !== 'info').slice(0, 4)) {
    const li = document.createElement('li');
    li.textContent = s.title;
    list.append(li);
  }
  el.append(head, summary, list);
}

function renderError(el, err) {
  el.hidden = false;
  el.className = 'result error';
  el.textContent = `${err.message}. Check the server URL in settings (⚙).`;
}

async function scanCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  $('page-url').textContent = url || '—';
  if (!/^https?:/.test(url)) {
    $('page-result').className = 'result loading';
    $('page-result').textContent = 'Not a web page.';
    return;
  }
  try {
    render($('page-result'), await analyze('url', url));
  } catch (e) {
    renderError($('page-result'), e);
  }
}

$('scan-text').addEventListener('click', async () => {
  const text = $('text').value.trim();
  if (!text) return;
  $('scan-text').disabled = true;
  try {
    render($('text-result'), await analyze('message', text));
  } catch (e) {
    renderError($('text-result'), e);
  } finally {
    $('scan-text').disabled = false;
  }
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
  $('open-app').href = `${server}/analyze`;
  scanCurrentPage();
}
init();
