// Stats page: reads the local aggregate (chrome.storage.local 'stats') and shows
// the top sites + ad domains, with export and reset. Nothing is sent anywhere.

const $ = (id) => document.getElementById(id);

function topEntries(obj, n) {
  return Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function topAds(adsObj, n) {
  return Object.entries(adsObj || {})
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(([h]) => h);
}

async function load() {
  const got = await chrome.storage.local.get(['stats', 'lifetime']);
  const stats = got.stats || { byAd: {}, byPage: {} };
  const pages = stats.byPage || {};
  const ads = stats.byAd || {};

  $('lifetime').textContent = (got.lifetime || 0).toLocaleString();
  $('nsites').textContent = Object.keys(pages).length.toLocaleString();
  $('nads').textContent = Object.keys(ads).length.toLocaleString();

  // sites
  const sitesEl = $('sites');
  sitesEl.textContent = '';
  const siteRows = Object.entries(pages).sort((a, b) => b[1].count - a[1].count).slice(0, 100);
  if (!siteRows.length) {
    sitesEl.innerHTML = '<tr><td class="empty" colspan="2">No data yet — browse a bit and come back.</td></tr>';
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
      tr.append(td1, td2);
      sitesEl.appendChild(tr);
    }
  }

  // ad domains
  const adsEl = $('ads');
  adsEl.textContent = '';
  const adRows = topEntries(ads, 100);
  if (!adRows.length) {
    adsEl.innerHTML = '<tr><td class="empty" colspan="2">No data yet.</td></tr>';
  } else {
    for (const [hostName, n] of adRows) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.innerHTML = '<span class="host"></span>';
      td1.querySelector('.host').textContent = hostName;
      const td2 = document.createElement('td');
      td2.className = 'num';
      td2.textContent = n.toLocaleString();
      tr.append(td1, td2);
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
