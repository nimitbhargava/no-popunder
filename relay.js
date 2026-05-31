// Bridge between block.js (page MAIN world, no chrome.* access) and the rest of
// the extension. Two jobs:
//   1. forward each blocked popup to the background worker (badge counter), and
//   2. feed the user's allowlist + strict-site list from chrome.storage into
//      block.js, live, so popup changes apply without a reload.

function pushLists() {
  try {
    chrome.storage.local.get(['allow', 'strict'], (r) => {
      window.postMessage(
        { __noPopunder: true, type: 'allowlist', hosts: r.allow || [] }, '*'
      );
      window.postMessage(
        { __noPopunder: true, type: 'strictlist', hosts: r.strict || [] }, '*'
      );
    });
  } catch {
    // Extension context can be invalidated on reload; ignore.
  }
}

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data;
  if (!d || d.__noPopunder !== true) return;

  if (d.type === 'block') {
    try {
      chrome.runtime.sendMessage({ type: 'no-popunder-block', kind: d.kind, url: d.url });
    } catch {}
  } else if (d.type === 'request-lists') {
    pushLists();
  }
}, false);

// Keep block.js in sync whenever the lists change (edited from the popup).
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.allow || changes.strict)) pushLists();
  });
} catch {}

pushLists(); // initial push, in case block.js is already listening
