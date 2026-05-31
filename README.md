# No-Popunder

[![License: GPLv3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)
&nbsp;![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)
&nbsp;![No servers](https://img.shields.io/badge/servers-none-brightgreen)
&nbsp;![No tracking](https://img.shields.io/badge/tracking-none-brightgreen)
&nbsp;![~50 KB · no deps](https://img.shields.io/badge/size-~50KB%20·%20no%20deps-lightgrey)

A site-agnostic Chrome extension that stops **popunder ad tabs** — the junk tabs
that open behind the page when you click, especially on free streaming sites.
It works on any site, and it tries hard not to break legit pop-ups (logins,
payment windows, "open in new tab").

## Why popunders get past Chrome

Chrome's built-in pop-up blocker only stops pop-ups that open *without* a user
gesture. Popunders exploit that: they listen for **any** click and, riding on
your real click, call `window.open(adURL)`. To Chrome it looks like you opened
it, so it's allowed. That's why you need something that targets the technique.

## How it works

`block.js` runs in every frame at `document_start` and intercepts the two ways
popunders open tabs (`window.open`, and an injected `<a target="_blank">` that's
auto-clicked). It then decides per pop-up using two layers:

- **Smart (everywhere, default).** A cross-origin pop-up is blocked **unless it
  directly followed you clicking a real link or button.** So a pop-up that fires
  from clicking the video, the page, or an invisible overlay — the popunder
  signature — is blocked, while a login pop-up you opened from a real button is
  allowed. Pop-ups with no preceding click at all (timers, page load) are
  blocked.
- **Strict (on `strictHosts`).** On sites that have *no* legit pop-ups (streaming
  sites), block **every** cross-origin pop-up, gesture or not. `7reels.cc` is
  seeded; add more in `block.js`. Strict also applies inside the page's player
  iframes (matched via `ancestorOrigins`).

Always allowed in both layers: same-origin pop-ups, same-tab navigations
(`window.open(url, "_self")`), and any domain on your **Allow** list.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Browse normally — popunders are gone, logins still work.

It talks to no servers. To remove it, click **Remove** on the extensions page.

> Works the same in any Chromium browser: Brave, Edge, Arc, Opera, Vivaldi.

> **Updating from an older version?** After **reload ↻** on the extensions page,
> also **refresh any open tabs** — Chrome does not update content scripts in tabs
> that are already open.

## Privacy

No-Popunder **talks to no servers.** No analytics, no tracking, no remote config,
no account — nothing leaves your device. It asks for the minimum it needs:

- `storage` — to remember your Allow list, per-site Strict toggles, and counts.
- `activeTab` — to show the current tab's blocked count in the popup.
- host access (`<all_urls>`) — because popunders can fire on **any** site, the
  blocking script must be allowed to run anywhere. It inspects `window.open` and
  link-click behavior *in the page*; it never reads or transmits page content.

The only thing it keeps is a **local** domain tally (ad host + page host, never
full URLs) you can view or wipe under **Stats**. Full policy: [PRIVACY.md](PRIVACY.md).

## Seeing what it blocked

The toolbar icon shows a **red badge with the number of pop-ups blocked on the
current page** (resets on navigation). Click the icon for the per-page count, a
lifetime total, and the blocked domains grouped so repeat offenders collapse into
one row (`host ×N`):

```
┌────────────────────────────────┐
│ ● No-Popunder                  │
│               6                │
│   popups blocked on this page  │
│    1,284 blocked all-time      │
│ ────────────────────────────── │
│  WINDOW.OPEN · 2:37:06 [ Allow]│
│  qg.arylblurry.shop        ×3  │
│  https://qg.arylblurry.shop…   │
│  WINDOW.OPEN · 2:37:09 [ Allow]│
│  ua.shikosharply.shop      ×2  │
│  https://ua.shikosharply.sh…   │
│ ────────────────────────────── │
│  Allowed: ( vidvault.ru × )    │
│ ────────────────────────────── │
│  Strict on this site      (●─) │
│  blocking all pop-ups on …     │
│ ────────────────────────────── │
│  example.com          [ Clear ]│
└────────────────────────────────┘
```

- The **per-page count** and its list reset on navigation.
- The **lifetime total** persists across restarts. **Clear** resets only the
  current page.

### Allow or re-block a domain

- Click **Allow** next to a domain to stop blocking it everywhere. Its past
  entries are removed and the badge drops. Effect is immediate, no reload.
- Allowed domains show as chips under **Allowed:** — click **×** to re-block.

### Make any site Strict (one click, no editing)

The **Strict on this site** switch at the bottom marks the current site strict —
block *every* cross-origin pop-up here, instead of just the popunder-signature
ones. Flip it on for a streaming site that still leaks, and it takes effect
immediately (no reload, no editing `block.js`). Flip it off to return to Smart.

Built-in strict sites (shipped in `block.js`, e.g. `7reels.cc`) show the switch
on and disabled — they're always strict. The toggle is stored locally and synced
into the blocker live.

## Learning from usage (all local, no analytics)

The extension keeps a small **local** aggregate so you can see what's actually
happening and improve the shipped defaults — without sending anything anywhere
and without Google Analytics (which can't even run under MV3 and is the wrong
tool here anyway).

It records **domains only** — the blocked ad host, and the **host** of the page
it fired on (`7reels.cc`), never the full URL/path/query. Open it from the popup
footer → **Stats**:

- **Sites with the most pop-ups** → candidates to ship in `strictHosts`.
- **Most-seen ad domains** → candidates for a future blocklist.
- **Export JSON** / **Reset stats**.

The same local data powers a **proactive nudge**: when a page keeps getting
bombed and isn't strict yet, the **Strict on this site** toggle's subtitle turns
into **"⚠ N blocked here — turn on to block all pop-ups"**, so you can flip it on
in one click.

> **Going crowd-sourced later (Phase 2).** To learn across users you'd add an
> **opt-in** (default off) upload of just `{adHost, pageHost}` pairs to an
> endpoint you control, behind a clear privacy policy. Keep it host-only and
> anonymous. Don't ship that silently — for an ad blocker, quietly phoning home
> with browsing data is the fastest way to lose user trust (and get delisted).
> The full plan (client, backend, privacy/legal, decisions, effort) is written
> up in [ROADMAP.md](ROADMAP.md).

## Tuning (in `block.js` → `CONFIG`)

- `strictHosts` — sites to block *all* cross-origin pop-ups on. Add streaming
  sites here for zero leaks: `strictHosts: ['7reels.cc', 'anothersite.to']`.
- `gestureWindowMs` — how long after a real click a pop-up still counts as
  user-intended in Smart mode (default 1200ms).
- `blockWindowOpen` / `blockBlankAnchors` — turn off a vector if needed.
- `logBlocks` — `false` by default; the badge + popup already show every block,
  and console output can land on the `chrome://extensions` Errors page.

Reload the extension and refresh open tabs after editing.

## When it gets something wrong

- **A legit pop-up got blocked** (rare, on a normal site): open the popup, click
  **Allow** on that domain. Remembered forever.
- **A popunder slipped through on a normal site** (it fired from a real button):
  flip the **Strict on this site** switch in the popup to block everything
  cross-origin there. (Or, to ship a site strict by default, add it to
  `strictHosts` in `block.js`.)

## Files

- `manifest.json` — extension definition (Manifest V3, `<all_urls>`, all frames).
- `block.js` — the Smart/Strict decision + blocking, MAIN world.
- `relay.js` — isolated-world bridge: forwards blocks to the worker and feeds the
  allowlist into `block.js` live.
- `background.js` — per-tab tally, badge, blocked-URL list, lifetime total, and
  the local domain aggregate (`stats`).
- `popup.html` / `popup.js` — the toolbar panel (count, list, Allow, Strict
  toggle, proactive nudge, Stats link).
- `options.html` / `options.js` — the local Stats page (export / reset).
- `icons/` — toolbar icons.

## Verification

Tested live:

- **Strict** on `7reels.cc`: a cross-origin `window.open` with no gesture is
  blocked; a same-host one passes.
- **Smart** on a normal page: a pop-up opened from a real button click passes; a
  pop-up fired from clicking a `<div>` is blocked; a pop-up with no preceding
  click is blocked.
- The per-domain allowlist lets an allowed domain through while others stay
  blocked.

## Contributing

Contributions are welcome — especially **sites that still leak popunders** (add
them to `strictHosts`), **legit pop-ups that got blocked**, and **popunders that
slipped through**. The whole extension is ~50 KB of dependency-free vanilla JS
with no build step: clone, load unpacked, edit, reload. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, how to test a change by hand, and
what to include in a report.

## Support

No-Popunder is free and open source, and stays that way. If it spared you a few
hundred junk tabs and you want to support continued work, see
[`.github/FUNDING.yml`](.github/FUNDING.yml) for sponsor links. Starring the repo
helps too.

## License

[GPL-3.0](LICENSE) © No-Popunder contributors.

Copyleft on purpose: a pop-up/ad blocker only earns trust if anyone can read every
line it runs and any fork stays just as open. GPLv3 guarantees that, and keeps the
project compatible with community blocklists (EasyList, uBlock's uAssets) should
they ever be incorporated.
