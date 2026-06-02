# No Popunder

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Add%20to%20Chrome-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/no-popunder/egnfpcniepjchocifgegplahbgmnhojn)
&nbsp;[![License: GPLv3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)
&nbsp;![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)
&nbsp;![No servers](https://img.shields.io/badge/servers-none-brightgreen)
&nbsp;![No tracking](https://img.shields.io/badge/tracking-none-brightgreen)
&nbsp;![~50 KB · no deps](https://img.shields.io/badge/size-~50KB%20·%20no%20deps-lightgrey)

A site-agnostic Chrome extension that stops popunder ad tabs, the junk tabs that
open behind the page when you click. They are worst on free streaming sites. It
works on any site and tries hard not to break legit pop-ups like logins, payment
windows, and "open in new tab".

## Why popunders get past Chrome

Chrome's built-in pop-up blocker only stops pop-ups that open *without* a user
gesture. Popunders get around that. They listen for any click and call
`window.open(adURL)` while riding on your real click, so to Chrome it looks like
you opened the tab yourself. That is why you need something aimed at the
technique rather than at a list of domains.

## How it works

`block.js` runs in every frame at `document_start` and intercepts the two ways
popunders open tabs: `window.open`, and an injected `<a target="_blank">` that
gets auto-clicked. It then decides each pop-up using two layers.

- **Smart (everywhere, default).** A cross-origin pop-up is blocked unless it
  directly followed you clicking a real link or button. A pop-up that fires from
  clicking the video, the page, or an invisible overlay (the popunder signature)
  is blocked. A login pop-up you opened from a real button is allowed. Pop-ups
  with no preceding click at all, like timers and page-load pop-ups, are blocked.
- **Strict (on `strictHosts`).** On sites that have no legit pop-ups, block every
  cross-origin pop-up whether or not there was a gesture. `7reels.cc` is seeded;
  add more in `block.js`. Strict also applies inside the page's player iframes,
  matched via `ancestorOrigins`.

Three things are always allowed in both layers: same-origin pop-ups, same-tab
navigations (`window.open(url, "_self")`), and any domain on your Allow list.

## Screenshots

![The popup blocking pop-ups: a count of pop-ups blocked on the page, every blocked ad domain with a one-click Allow, an Allowed chip, and a nudge to turn on Strict](assets/screenshot-1-hero.png)

![Make any site Strict in one click: the per-site Smart/Strict toggle in the popup](assets/screenshot-2-strict.png)

![The local Stats page listing the sites with the most pop-ups and the most-seen ad domains, host names only, with per-row Allow and Make-strict controls](assets/screenshot-3-stats.png)

![Private by design: a summary that all data is stored locally on the device, with no servers, no tracking, no accounts, and no network requests](assets/screenshot-4-privacy.png)

## Install

### From the Chrome Web Store

[**Add to Chrome →**](https://chromewebstore.google.com/detail/no-popunder/egnfpcniepjchocifgegplahbgmnhojn)

Click Add to Chrome and browse normally. Popunders are gone and logins still
work. Chrome keeps it updated automatically. Remove it any time from
`chrome://extensions`, or by right-clicking the toolbar icon.

> **Seeing a "not trusted by Enhanced Safe Browsing" notice while installing?**
> That is normal for a newly published extension, and it only shows if you have
> Enhanced Safe Browsing turned on. It is a reputation signal based on how new the
> extension and its developer are on the store, not a finding about the code, and
> it clears on its own over the first few months. Click Continue to install in the
> meantime. Everything here is open source, about 50 KB of vanilla JS with no
> servers and no network calls, so you can read every line before you trust it.

> Works the same in any Chromium browser: Brave, Edge, Arc, Opera, Vivaldi. Open
> the link above in any of them and install.

### From source (load unpacked)

To run the latest unreleased code or hack on it:

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on Developer mode (top-right toggle).
3. Click Load unpacked and select the folder.
4. Browse normally. Popunders are gone and logins still work.

It talks to no servers either way.

> **Just updated?** Whether Chrome auto-updates the store version or you reload an
> unpacked build, refresh any tabs you already had open. Chrome does not swap the
> content script in tabs that were already loaded.

## Privacy

No Popunder talks to no servers. No analytics, no tracking, no remote config, no
account. Nothing leaves your device. It asks for the minimum it needs:

- `storage`, to remember your Allow list, per-site Strict toggles, and counts.
- `activeTab`, to show the current tab's blocked count in the popup.
- host access (`<all_urls>`), because popunders can fire on any site, so the
  blocking script has to be allowed to run anywhere. It inspects `window.open`
  and link-click behavior in the page. It never reads or transmits page content.

The only thing it keeps is a local domain tally (ad host plus page host, never
full URLs) that you can view or wipe under Stats. Full policy in
[PRIVACY.md](PRIVACY.md).

## Seeing what it blocked

The toolbar icon shows a red badge with the number of pop-ups blocked on the
current page, which resets on navigation. Click the icon for the per-page count,
a lifetime total, and the blocked domains grouped so repeat offenders collapse
into one row (`host ×N`):

<p align="center">
  <img src="assets/popup.png" width="340"
       alt="No Popunder popup: pop-ups blocked on this page and a lifetime total, the blocked ad domains grouped (host ×N) each with a one-click Allow, an Allowed chip, and the per-site Strict toggle">
</p>

The per-page count and its list reset on navigation. The lifetime total persists
across restarts, and Clear resets only the current page.

### Allow or re-block a domain

Click Allow next to a domain to stop blocking it everywhere. Its past entries are
removed and the badge drops, with no reload needed. Allowed domains show as chips
under Allowed. Click the × on a chip to re-block it.

### Make any site Strict (one click, no editing)

The Strict on this site switch marks the current site strict, so it blocks every
cross-origin pop-up here instead of just the popunder-signature ones. Flip it on
for a streaming site that still leaks and it takes effect right away, with no
reload and no editing of `block.js`. Flip it off to go back to Smart.

Built-in strict sites (shipped in `block.js`, for example `7reels.cc`) show the
switch on and disabled, since they are always strict. The toggle is stored
locally and synced into the blocker live.

## Learning from usage (all local, no analytics)

The extension keeps a small local aggregate so you can see what is actually
happening and improve the shipped defaults. It does this without sending anything
anywhere, and without Google Analytics, which cannot run under MV3 anyway and is
the wrong tool here.

It records domains only: the blocked ad host, and the host of the page it fired
on (for example `7reels.cc`), never the full URL, path, or query. Open it from
the popup footer under Stats:

- Sites with the most pop-ups, which are candidates to ship in `strictHosts`.
- Most-seen ad domains, which are candidates for a future blocklist.
- Export JSON and Reset stats.

The same local data powers a nudge. When a page keeps getting bombed and is not
strict yet, the Strict on this site toggle's subtitle changes to "⚠ N blocked
here. Turn on to block all pop-ups." so you can flip it on in one click.

> **Going crowd-sourced later (Phase 2).** To learn across users you would add an
> opt-in (default off) upload of just `{adHost, pageHost}` pairs to an endpoint
> you control, behind a clear privacy policy. Keep it host-only and anonymous.
> Do not ship that silently. For an ad blocker, quietly phoning home with
> browsing data is the fastest way to lose user trust and get delisted. The full
> plan (client, backend, privacy and legal, decisions, effort) is in
> [ROADMAP.md](ROADMAP.md).

## Tuning (in `block.js` → `CONFIG`)

- `strictHosts`, the sites to block all cross-origin pop-ups on. Add streaming
  sites here for zero leaks: `strictHosts: ['7reels.cc', 'anothersite.to']`.
- `gestureWindowMs`, how long after a real click a pop-up still counts as
  user-intended in Smart mode (default 1200ms).
- `blockWindowOpen` and `blockBlankAnchors`, to turn off a vector if you need to.
- `logBlocks`, `false` by default. The badge and popup already show every block,
  and console output can land on the `chrome://extensions` Errors page.

Reload the extension and refresh open tabs after editing.

## When it gets something wrong

If a legit pop-up gets blocked (rare, on a normal site), open the popup and click
Allow on that domain. It is remembered from then on.

If a popunder slips through on a normal site because it fired from a real button,
flip the Strict on this site switch in the popup to block everything cross-origin
there. To ship a site strict by default, add it to `strictHosts` in `block.js`.

## Files

- `manifest.json`, the extension definition (Manifest V3, `<all_urls>`, all
  frames).
- `block.js`, the Smart and Strict decision plus the blocking, in the MAIN world.
- `relay.js`, the isolated-world bridge. It forwards blocks to the worker and
  feeds the allowlist into `block.js` live.
- `background.js`, the per-tab tally, badge, blocked-URL list, lifetime total,
  and the local domain aggregate (`stats`).
- `popup.html` and `popup.js`, the toolbar panel (count, list, Allow, Strict
  toggle, nudge, Stats link).
- `options.html` and `options.js`, the local Stats page (export and reset).
- `icons/`, the toolbar icons.

## Verification

Tested live:

- Strict on `7reels.cc`: a cross-origin `window.open` with no gesture is blocked,
  and a same-host one passes.
- Smart on a normal page: a pop-up opened from a real button click passes, a
  pop-up fired from clicking a `<div>` is blocked, and a pop-up with no preceding
  click is blocked.
- The per-domain allowlist lets an allowed domain through while others stay
  blocked.

## Contributing

Contributions are welcome, especially sites that still leak popunders (add them
to `strictHosts`), legit pop-ups that got blocked, and popunders that slipped
through. The whole extension is about 50 KB of dependency-free vanilla JS with no
build step, so you can clone, load unpacked, edit, and reload. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to test a change by hand, and
what to put in a report.

## Support

Questions, bug reports, or a site that still leaks popunders: open an issue at
[github.com/nimitbhargava/no-popunder/issues](https://github.com/nimitbhargava/no-popunder/issues).

## License

[GPL-3.0](LICENSE) © No Popunder contributors.
