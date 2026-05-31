// Stats page: reads the local aggregate (chrome.storage.local 'stats') and shows
// the top sites + ad domains, with export and reset. Nothing is sent anywhere.
//
// Each row also carries a live control: Allow/re-block an ad domain (the `allow`
// list), and Smart/Strict a site (the `strict` list). These are the same storage
// keys the popup writes and relay.js pushes into block.js, so toggles here apply
// immediately to open tabs, no reload.

const $ = (id) => document.getElementById(id);

function topEntries(obj, n) {
  return Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function topAds(adsObj, n) {
  return Object.entries(adsObj || {})
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(([h]) => h);
}

// ---- allow + strict lists (shared with popup.js / relay.js) -------------
// Built-in offender sites are shipped strict in block.js. Keep in sync with
// block.js CONFIG.strictHosts; these show as "always strict" and can't be turned
// off here.
const BUILTIN_STRICT = ['7reels.cc'];
const matchHost = (h, list) => !!h && list.some((a) => h === a || h.endsWith('.' + a));

async function loadAllow() {
  const r = await chrome.storage.local.get('allow');
  return Array.isArray(r.allow) ? r.allow : [];
}
async function loadStrict() {
  const r = await chrome.storage.local.get('strict');
  return Array.isArray(r.strict) ? r.strict : [];
}

async function allowAd(h) {
  const allow = await loadAllow();
  if (!allow.includes(h)) allow.push(h);
  await chrome.storage.local.set({ allow: [...new Set(allow)] });
  await load();
}
async function reblockAd(h) {
  const allow = (await loadAllow()).filter((a) => !(h === a || h.endsWith('.' + a)));
  await chrome.storage.local.set({ allow });
  await load();
}
async function setStrict(h, on) {
  const cur = await loadStrict();
  if (on) {
    if (!cur.includes(h)) cur.push(h);
  } else {
    for (let i = cur.length - 1; i >= 0; i--) {
      if (h === cur[i] || h.endsWith('.' + cur[i])) cur.splice(i, 1);
    }
  }
  await chrome.storage.local.set({ strict: [...new Set(cur)] });
  await load();
}

// ---- per-row action cells ----------------------------------------------
function strictCell(hostName, strictList) {
  const td = document.createElement('td');
  td.className = 'action';
  const btn = document.createElement('button');
  if (matchHost(hostName, BUILTIN_STRICT)) {
    btn.className = 'tgl strict';
    btn.textContent = 'Strict (built-in)';
    btn.disabled = true;
    btn.title = 'Always strict, shipped in block.js';
  } else if (matchHost(hostName, strictList)) {
    btn.className = 'tgl strict';
    btn.textContent = 'Strict';
    btn.title = 'Blocking all cross-site pop-ups here. Click to switch back to Smart.';
    btn.addEventListener('click', () => setStrict(hostName, false));
  } else {
    btn.className = 'tgl';
    btn.textContent = 'Make strict';
    btn.title = 'Block every cross-site pop-up on ' + hostName;
    btn.addEventListener('click', () => setStrict(hostName, true));
  }
  td.appendChild(btn);
  return td;
}

function allowCell(hostName, allowList) {
  const td = document.createElement('td');
  td.className = 'action';
  const btn = document.createElement('button');
  if (matchHost(hostName, allowList)) {
    btn.className = 'tgl allowed';
    btn.textContent = 'Allowed';
    btn.title = 'Not blocking ' + hostName + '. Click to block it again.';
    btn.addEventListener('click', () => reblockAd(hostName));
  } else {
    btn.className = 'tgl';
    btn.textContent = 'Allow';
    btn.title = 'Stop blocking ' + hostName + ' everywhere';
    btn.addEventListener('click', () => allowAd(hostName));
  }
  td.appendChild(btn);
  return td;
}

async function load() {
  const got = await chrome.storage.local.get(['stats', 'lifetime', 'allow', 'strict']);
  const stats = got.stats || { byAd: {}, byPage: {} };
  const pages = stats.byPage || {};
  const ads = stats.byAd || {};
  const allowList = Array.isArray(got.allow) ? got.allow : [];
  const strictList = Array.isArray(got.strict) ? got.strict : [];

  $('lifetime').textContent = (got.lifetime || 0).toLocaleString();
  $('nsites').textContent = Object.keys(pages).length.toLocaleString();
  $('nads').textContent = Object.keys(ads).length.toLocaleString();

  // sites (page hosts) + per-site Smart/Strict toggle
  const sitesEl = $('sites');
  sitesEl.textContent = '';
  const siteRows = Object.entries(pages).sort((a, b) => b[1].count - a[1].count).slice(0, 100);
  if (!siteRows.length) {
    sitesEl.innerHTML = '<tr><td class="empty" colspan="3">No data yet. Browse a bit and come back.</td></tr>';
  } else {
    for (const [hostName, info] of siteRows) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      const host = document.createElement('div');
      host.className = 'host';
      host.textContent = hostName;
      td1.appendChild(host);
      const adsLine = topAds(info.ads, 3);
      if (adsLine.length) {
        const sub = document.createElement('div');
        sub.className = 'ads';
        sub.textContent = 'top: ' + adsLine.join(', ');
        td1.appendChild(sub);
      }
      const td2 = document.createElement('td');
      td2.className = 'num';
      td2.textContent = info.count.toLocaleString();
      tr.append(td1, td2, strictCell(hostName, strictList));
      sitesEl.appendChild(tr);
    }
  }

  // ad domains + per-domain Allow/re-block toggle
  const adsEl = $('ads');
  adsEl.textContent = '';
  const adRows = topEntries(ads, 100);
  if (!adRows.length) {
    adsEl.innerHTML = '<tr><td class="empty" colspan="3">No data yet.</td></tr>';
  } else {
    for (const [hostName, n] of adRows) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.innerHTML = '<span class="host"></span>';
      td1.querySelector('.host').textContent = hostName;
      const td2 = document.createElement('td');
      td2.className = 'num';
      td2.textContent = n.toLocaleString();
      tr.append(td1, td2, allowCell(hostName, allowList));
      adsEl.appendChild(tr);
    }
  }
}

$('export').addEventListener('click', async () => {
  const got = await chrome.storage.local.get(['stats', 'lifetime', 'strict', 'allow']);
  const blob = new Blob([JSON.stringify(got, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'no-popunder-stats.json';
  a.click();
  URL.revokeObjectURL(url);
});

$('reset').addEventListener('click', async () => {
  if (!confirm('Reset all local stats? (Allow/Strict lists are kept.)')) return;
  await chrome.storage.local.set({ stats: { byAd: {}, byPage: {} } });
  await load();
});

load();
