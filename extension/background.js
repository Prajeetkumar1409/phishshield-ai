const DEFAULT_SERVER = 'http://localhost:5000';

const getServer = async () => (await chrome.storage.sync.get({ server: DEFAULT_SERVER })).server.replace(/\/$/, '');

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'scan-selection', title: 'Scan selected text with PhishShield', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'scan-link', title: 'Scan this link with PhishShield', contexts: ['link'] });
});

// Open the web analyzer pre-filled; it auto-runs the scan from the ?q= parameter.
chrome.contextMenus.onClicked.addListener(async (info) => {
  const server = await getServer();
  const [type, q] = info.menuItemId === 'scan-link' ? ['url', info.linkUrl] : ['message', info.selectionText];
  if (!q) return;
  chrome.tabs.create({ url: `${server}/analyze?type=${type}&q=${encodeURIComponent(q.slice(0, 4000))}` });
});
