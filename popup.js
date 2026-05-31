// Popup: per-page count, lifetime total, blocked domains grouped (host ×N), and
// a per-domain allowlist. "Allow" lets a domain through (and removes its past
// entries); allowed domains show as chips you can ✕ to re-block. Changes are
// written to chrome.storage.local, which relay.js pushes live into block.js.

const $ = (id) => document.getElementById(id);

let TAB = null;

function host(u) {
  try { return new URL(u).hostname; } catch { return u || ''; }
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

// Collapse items (newest-first) into per-host groups.
function groupByHost(items) {
  const order = [];
  const byHost = new Map();
  for (const it of items) {
    const h = host(it.url) || '(no url)';
    let g = byHost.get(h);
    if (!g) { g = { host: h, count: 0, latest: it }; byHost.set(h, g); order.push(g); }
    g.count += 1;
  }
  return order.sort((a, b) => b.count - a.count || (b.latest.ts || 0) - (a.latest.ts || 0));
}

// ---- allowlist storage --------------------------------------------------
async function loadAllow() {
  const r = await chrome.storage.local.get('allow');
  return Array.isArray(r.allow) ? r.allow : [];
}
async function saveAllow(arr) {
  await chrome.storage.local.set({ allow: [...new Set(arr)] });
}
async function allowHost(h) {
  const allow = await loadAllow();
  if (!allow.includes(h)) allow.push(h);
  await saveAllow(allow);
  // retroactively drop this domain's entries from the current tab + badge
  if (TAB) await chrome.runtime.sendMessage({ type: 'forget-host', tabId: TAB.id, host: h });
  await refresh();
}
async function reblockHost(h) {
  // remove any allow entry that was letting this host through
  const allow = (await loadAllow()).filter((a) => !(h === a || h.endsWith('.' + a)));
  await saveAllow(allow);
  await refresh();
}

// ---- per-site strict toggle --------------------------------------------
// Built-in offender sites, shipped strict in block.js. Keep in sync with
// block.js CONFIG.strictHosts (these show as "always strict" and can't be
// turned off from the popup).
const BUILTIN_STRICT = ['7reels.cc'];
const matchHost = (h, list) => !!h && list.some((a) => h === a || h.endsWith('.' + a));

async function loadStrict() {
  const r = await chrome.storage.local.get('strict');
  return Array.isArray(r.strict) ? r.strict : [];
}
async function saveStrict(arr) {
  await chrome.storage.local.set({ strict: [...new Set(arr)] });
}

// When a page keeps getting bombed and isn't strict yet, the toggle's subtitle
// turns into a nudge to flip it on. One control, no separate banner.
const NUDGE_THRESHOLD = 4;

async function updateSitebar(data) {
  const bar = $('sitebar');
  const toggle = $('strictToggle');
  const sub = $('strictSub');

  // Only meaningful on real web pages.
  const h = TAB && /^https?:/i.test(TAB.url || '') ? host(TAB.url) : '';
  if (!h) { bar.hidden = true; return; }
  bar.hidden = false;

  const builtin = matchHost(h, BUILTIN_STRICT);
  const on = builtin || matchHost(h, await loadStrict());
  const count = (data && data.count) || 0;

  toggle.checked = on;
  toggle.disabled = builtin;

  sub.classList.remove('nudge');
  if (builtin) {
    sub.textContent = h + ' · always strict (built-in)';
  } else if (on) {
    sub.textContent = 'blocking all pop-ups on ' + h;
  } else if (count >= NUDGE_THRESHOLD) {
    sub.textContent = '⚠ ' + count + ' blocked here — turn on to block all pop-ups';
    sub.classList.add('nudge');
  } else {
    sub.textContent = 'smart mode on ' + h;
  }

  toggle.onchange = async () => {
    const cur = await loadStrict();
    if (toggle.checked) {
      if (!cur.includes(h)) cur.push(h);
    } else {
      for (let i = cur.length - 1; i >= 0; i--) {
        if (h === cur[i] || h.endsWith('.' + cur[i])) cur.splice(i, 1);
      }
    }
    await saveStrict(cur);
    await refresh();
  };
}

// ---- render -------------------------------------------------------------
function render(data, allow) {
  const count = data.count || 0;
  $('count').textContent = count > 999 ? '999+' : String(count);
  $('label').textContent = count === 1 ? 'popup blocked on this page' : 'popups blocked on this page';
  $('site').textContent = TAB ? host(TAB.url) : '';

  const lt = data.lifetime || 0;
  const altEl = $('alltime');
  altEl.textContent = '';
  if (lt) {
    const b = document.createElement('b');
    b.textContent = lt.toLocaleString();
    altEl.append(b, document.createTextNode(' blocked all-time'));
  }

  // blocked list
  const list = $('list');
  list.textContent = '';
  if (!data.items || data.items.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = count ? '' : 'Nothing blocked yet. Click around the page and check back.';
    list.appendChild(e);
  } else {
    for (const g of groupByHost(data.items)) {
      const it = g.latest;
      const row = document.createElement('div');
      row.className = 'row';

      // meta line: KIND · time .................. [ Allow ]
      const kind = document.createElement('div');
      kind.className = 'kind';
      const left = document.createElement('span');
      left.className = 'kindleft';
      left.append(document.createTextNode(it.kind || 'blocked'));
      if (it.ts) {
        const t = document.createElement('span');
        t.className = 'time';
        t.textContent = '  ·  ' + fmtTime(it.ts);
        left.appendChild(t);
      }
      const allowBtn = document.createElement('button');
      allowBtn.className = 'act';
      allowBtn.textContent = 'Allow';
      allowBtn.title = 'Stop blocking ' + g.host;
      allowBtn.addEventListener('click', () => allowHost(g.host));
      kind.append(left, allowBtn);

      // host (bold) + ×N chip
      const hostline = document.createElement('div');
      hostline.className = 'hostline';
      const h = document.createElement('span');
      h.className = 'host';
      h.textContent = g.host;
      hostline.appendChild(h);
      if (g.count > 1) {
        const x = document.createElement('span');
        x.className = 'times';
        x.textContent = '×' + g.count;
        hostline.appendChild(x);
      }

      const url = document.createElement('div');
      url.className = 'url';
      url.textContent = it.url || '';
      url.title = it.url || '';

      row.append(kind, hostline);
      if (it.url) row.append(url);
      list.appendChild(row);
    }
  }

  // allowed-domains chips
  const allowedEl = $('allowed');
  allowedEl.textContent = '';
  if (allow && allow.length) {
    allowedEl.hidden = false;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = 'Allowed:';
    allowedEl.appendChild(lbl);
    for (const a of allow) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.append(document.createTextNode(a));
      const x = document.createElement('button');
      x.textContent = '×';
      x.title = 'Re-block ' + a;
      x.addEventListener('click', () => reblockHost(a));
      chip.appendChild(x);
      allowedEl.appendChild(chip);
    }
  } else {
    allowedEl.hidden = true;
  }
}

async function refresh() {
  const data = (await chrome.runtime.sendMessage({ type: 'get-blocks', tabId: TAB.id }))
    || { count: 0, items: [], lifetime: 0 };
  const allow = await loadAllow();
  render(data, allow);
  await updateSitebar(data);
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  TAB = tab;
  await refresh();
  $('clear').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'clear-blocks', tabId: TAB.id });
    await refresh();
  });
  $('stats').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

main();
