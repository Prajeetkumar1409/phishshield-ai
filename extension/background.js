// Every result opens in TRACE-X on this server (the API is reached through it at /api).
const DEFAULT_SERVER = 'https://client-roan-delta.vercel.app';

const getServer = async () => (await chrome.storage.sync.get({ server: DEFAULT_SERVER })).server.replace(/\/$/, '');
const GMAIL = /^https:\/\/mail\.google\.com\/mail\//;

// removeAll first so an update from 1.0 doesn't leave the old "scan selected text" items behind
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'link-tracex', title: 'Check this link in TRACE-X', contexts: ['link'] });
    chrome.contextMenus.create({
      id: 'gmail-tracex',
      title: 'Analyse this email in TRACE-X',
      contexts: ['page', 'frame', 'selection'],
      documentUrlPatterns: ['https://mail.google.com/*'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'link-tracex' && info.linkUrl) checkLinkInTraceX(info.linkUrl, tab);
  if (info.menuItemId === 'gmail-tracex' && tab?.id) sendGmailToTraceX(tab.id).catch((e) => console.warn('TRACE-X import failed:', e.message));
});

// The popup asks; the work happens here because the popup closes as soon as the new tab opens.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const run = {
    'gmail-tracex': () => sendGmailToTraceX(msg.tabId),
    'paste-tracex': () => openInTraceX(String(msg.raw || ''), 'pasted-original.eml', 'paste'),
    'link-tracex': () => checkLinkInTraceX(msg.url),
  }[msg?.type];
  if (!run) return;
  run().then(() => reply({ ok: true }), (e) => reply({ ok: false, error: e.message }));
  return true; // async reply
});

async function checkLinkInTraceX(url, tab) {
  const server = await getServer();
  await chrome.tabs.create({ url: `${server}/trace-x.html?check=${encodeURIComponent(url)}`, ...(tab && { index: tab.index + 1 }) });
}

async function sendGmailToTraceX(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!GMAIL.test(tab.url || '')) throw new Error('Open the email in Gmail first');

  // Runs inside Gmail with the user's session, so the same-origin "Show original" fetch is authorised.
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: grabOpenGmailMessage });
  if (!result?.ok) throw new Error(result?.error || 'Could not read the open email');
  await openInTraceX(result.raw, result.name, result.origin, tab.index + 1);
}

/** Open TRACE-X and hand it a raw RFC 822 message; it parses it like an uploaded .eml. */
async function openInTraceX(raw, name, origin, index) {
  if (!raw.trim()) throw new Error('Nothing to analyse');
  const server = await getServer();
  const tx = await chrome.tabs.create({ url: `${server}/trace-x.html#/overview`, ...(index != null && { index }) });
  await waitForLoad(tx.id);
  await chrome.scripting.executeScript({
    target: { tabId: tx.id },
    func: (raw, name, origin) => window.postMessage({ type: 'tracex-import', raw, name, origin }, location.origin),
    args: [raw, name, origin],
  });
}

function waitForLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('TRACE-X took too long to load (is the server awake?)')), 60000);
    const listener = (id, info) => { if (id === tabId && info.status === 'complete') done(); };
    function done(err) {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      err ? reject(err) : resolve();
    }
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((t) => t.status === 'complete' && done(), () => {});
  });
}

/**
 * Injected into the Gmail tab (page world). Must be self-contained.
 * 1. Find the open message's id in the DOM.
 * 2. Fetch Gmail's "Show original" for it: the full RFC 822 source, same as a downloaded .eml.
 * 3. If that fails, rebuild a minimal message from what is rendered (no auth/Received headers).
 */
async function grabOpenGmailMessage() {
  const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const account = (location.pathname.match(/\/mail\/u\/(\d+)/) || [])[1] || '0';

  // Expanded messages in the thread carry a body (.a3s); the last one is the most recent open message.
  const containers = [...document.querySelectorAll('[data-message-id], [data-legacy-message-id]')].filter(visible);
  const withBody = containers.filter((el) => el.closest('.adn, [role="listitem"]')?.querySelector('.a3s') || el.querySelector('.a3s'));
  const node = withBody.at(-1) || containers.at(-1);
  if (!node) return { ok: false, error: 'No open email found. Open a message (not the inbox list) and try again.' };

  const scope = node.closest('.adn, [role="listitem"]') || node;
  const permAttr = (node.getAttribute('data-message-id') || scope.querySelector('[data-message-id]')?.getAttribute('data-message-id') || '').replace(/^#/, '');
  const legacy = node.getAttribute('data-legacy-message-id') || scope.querySelector('[data-legacy-message-id]')?.getAttribute('data-legacy-message-id') || '';
  let permmsgid = /^msg-[af]:\d+$/.test(permAttr) ? permAttr : '';
  if (!permmsgid && /^[0-9a-f]+$/i.test(legacy)) permmsgid = 'msg-f:' + BigInt('0x' + legacy).toString();

  const subject = (document.querySelector('h2.hP')?.textContent || 'gmail-message').trim();
  const name = subject.replace(/[^\w\- ]+/g, '').trim().slice(0, 60).replace(/\s+/g, '_') + '.eml';
  const unescapeHtml = (t) => t.replace(/<[^>]+>/g, '').replace(/&(#x?[0-9a-f]+|lt|gt|amp|quot|apos|nbsp);/gi, (m, e) => {
    const named = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' }[e.toLowerCase()];
    if (named) return named;
    const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
  const looksLikeEmail = (t) => typeof t === 'string' && /^(received|from|delivered-to|return-path|mime-version|subject|date|message-id):/im.test(t) && /\n\r?\n/.test(t);

  const ik = window.GLOBALS?.[9];
  const urls = [];
  if (permmsgid) urls.push(`/mail/u/${account}/?${ik ? `ik=${ik}&` : ''}view=om&permmsgid=${permmsgid}`);
  if (legacy) urls.push(`/mail/u/${account}/?${ik ? `ik=${ik}&` : ''}view=att&th=${legacy}&attid=0&disp=comp&safe=1&zw`);
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const text = await res.text();
      if (looksLikeEmail(text)) return { ok: true, raw: text, name, origin: 'gmail' };
      // "Show original" wraps the source in an HTML page. No DOMParser: Gmail enforces Trusted Types.
      const pre = (text.match(/<pre[^>]*raw_message_text[^>]*>([\s\S]*?)<\/pre>/i) || text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || [])[1];
      const decoded = pre && unescapeHtml(pre);
      if (looksLikeEmail(decoded)) return { ok: true, raw: decoded, name, origin: 'gmail' };
    } catch { /* try the next endpoint */ }
  }

  // Fallback: reconstruct from the rendered message
  const body = scope.querySelector('.a3s');
  const senderEl = scope.querySelector('.gD[email]') || document.querySelector('.gD[email]');
  if (!body && !senderEl) return { ok: false, error: 'Could not read this email from Gmail.' };
  const fold = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();
  const from = senderEl ? `"${fold(senderEl.getAttribute('name') || senderEl.textContent)}" <${senderEl.getAttribute('email')}>` : '';
  const date = fold(scope.querySelector('.g3')?.getAttribute('title') || '');
  const headers = [
    from && `From: ${from}`,
    `Subject: ${fold(subject)}`,
    date && `Date: ${date}`,
    'X-TraceX-Source: gmail-view (reconstructed; authentication and Received headers unavailable)',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
  ].filter(Boolean);
  const raw = `${headers.join('\r\n')}\r\n\r\n${body ? body.innerHTML : ''}`;
  return { ok: true, raw, name, origin: 'gmail-view' };
}
