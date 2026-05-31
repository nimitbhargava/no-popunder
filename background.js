// Keeps a per-tab tally of blocked popups, drives the toolbar badge, and stores
// the list of blocked URLs for the popup. State lives in chrome.storage.session
// (in-memory, cleared when Chrome closes) so it survives the worker sleeping.

const key = (tabId) => `tab_${tabId}`;
const MAX_ITEMS = 100;

const RED = '#e53935';

async function getTab(tabId) {
  const k = key(tabId);
  const got = await chrome.storage.session.get(k);
  return got[k] || { count: 0, items: [] };
}

function setBadge(tabId, count) {
  const text = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
  chrome.action.setBadgeText({ tabId, text });
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: RED });
    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
    }
  }
}

async function bumpLifetime() {
  // Lifetime total lives in storage.local so it survives Chrome restarts and is
  // never reset by per-page "Clear".
  const got = await chrome.storage.local.get('lifetime');
  const n = (got.lifetime || 0) + 1;
  await chrome.storage.local.set({ lifetime: n });
}

async function recordBlock(tabId, entry) {
  const data = await getTab(tabId);
  data.count += 1;
  data.items.unshift(entry); // newest first
  if (data.items.length > MAX_ITEMS) data.items.length = MAX_ITEMS;
  await chrome.storage.session.set({ [key(tabId)]: data });
  setBadge(tabId, data.count);
  await bumpLifetime();
}

// ---- local aggregate stats (never leaves this device) -------------------
// We record only domains: the ad host that was blocked, and the HOST of the
// page it fired on (e.g. "7reels.cc") — never the full URL/path/query. This is
// the dataset for deciding shipped strict defaults, and it powers the local
// "suggest Strict" nudge. Writes are serialized to avoid lost increments when
// a page fires many popunders at once.
//
// TODO(phase-2): opt-in crowd-sourced upload of {adHost, pageHost} aggregates is
// sourced from this `stats` object. Default OFF, host-only, anonymous. See
// ROADMAP.md ("Phase 2") for the full plan before wiring any network calls.
let statsChain = Promise.resolve();
function bumpStats(adHost, pageHost) {
  statsChain = statsChain.then(() => doBumpStats(adHost, pageHost)).catch(() => {});
  return statsChain;
}
async function doBumpStats(adHost, pageHost) {
  if (!adHost && !pageHost) return;
  const got = await chrome.storage.local.get('stats');
  const stats = got.stats || { byAd: {}, byPage: {} };
  if (adHost) stats.byAd[adHost] = (stats.byAd[adHost] || 0) + 1;
  if (pageHost) {
    const p = stats.byPage[pageHost] || { count: 0, ads: {} };
    p.count += 1;
    if (adHost) p.ads[adHost] = (p.ads[adHost] || 0) + 1;
    stats.byPage[pageHost] = p;
  }
  await chrome.storage.local.set({ stats });
}

async function clearTab(tabId) {
  await chrome.storage.session.remove(key(tabId));
  setBadge(tabId, 0);
}

function hostOf(u) {
  try { return new URL(u).hostname; } catch { return ''; }
}

// When the user allows a domain, drop its past entries from this tab and lower
// the badge so the count reflects reality.
async function forgetHost(tabId, allowed) {
  const data = await getTab(tabId);
  const before = data.items.length;
  data.items = data.items.filter((it) => {
    const h = hostOf(it.url);
    return !(h === allowed || h.endsWith('.' + allowed));
  });
  const removed = before - data.items.length;
  data.count = Math.max(0, data.count - removed);
  await chrome.storage.session.set({ [key(tabId)]: data });
  setBadge(tabId, data.count);
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // From relay.js: a popup was blocked in some frame of sender.tab.
  if (msg && msg.type === 'no-popunder-block' && sender.tab) {
    recordBlock(sender.tab.id, {
      kind: msg.kind,
      url: msg.url || '',
      frame: sender.url || '',
      ts: Date.now(),
    });
    // Aggregate by domain only (ad host + page host), for the Stats page and
    // the "suggest Strict" nudge. sender.tab.url is the top page URL; we keep
    // only its host.
    bumpStats(hostOf(msg.url || ''), hostOf(sender.tab.url || ''));
    return; // no response needed
  }

  // From popup.js: per-tab data + the lifetime total.
  if (msg && msg.type === 'get-blocks' && typeof msg.tabId === 'number') {
    Promise.all([getTab(msg.tabId), chrome.storage.local.get('lifetime')])
      .then(([data, lt]) => sendResponse({ ...data, lifetime: lt.lifetime || 0 }));
    return true; // async response
  }
  if (msg && msg.type === 'clear-blocks' && typeof msg.tabId === 'number') {
    clearTab(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg && msg.type === 'forget-host' && typeof msg.tabId === 'number' && msg.host) {
    forgetHost(msg.tabId, msg.host).then(sendResponse);
    return true;
  }
});

// Reset the tally when a tab navigates to a new page.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') clearTab(tabId);
});

// Tidy up when a tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(key(tabId));
});
