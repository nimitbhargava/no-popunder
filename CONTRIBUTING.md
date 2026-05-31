# Contributing to No Popunder

Thanks for helping kill popunders. This is a small, dependency-free Manifest V3
extension, about 50 KB of vanilla JavaScript with no build step, so getting
started takes a minute.

## Set up

1. Clone the repo.
2. Open `chrome://extensions`, enable Developer mode, click Load unpacked, and
   select the folder.
3. Edit a file, reload it on the extensions page, then refresh any open tabs.
   Chrome does not hot-reload content scripts in tabs that are already open.

Works the same in any Chromium browser (Brave, Edge, Arc, Opera, Vivaldi).

## The most useful contributions

- A site that still leaks popunders. Add it to `strictHosts` in `block.js`, or
  open an issue with the site so it can be seeded. Streaming sites rotate ad
  domains faster than blocklists can keep up, which is where this project earns
  its keep.
- A legit pop-up that got blocked, like a login, a payment, or "open in new tab"
  on a normal site. Tell us the site and the flow. Over-blocking is a bug.
- A popunder that slipped through on a normal (non-strict) site.

When you report a missed or over-blocked pop-up, include the site, what you
clicked, what you expected, and what happened. A short screen recording helps.

## How the pieces fit

- `block.js` runs in the page's MAIN world at `document_start`. It intercepts
  `window.open` and synthetic `target="_blank"` anchor clicks, and decides Smart
  versus Strict. This is where the blocking logic lives.
- `relay.js` is the isolated-world bridge. It forwards blocks to the worker and
  feeds the Allow and Strict lists into `block.js` live, since the page world has
  no access to `chrome.*`.
- `background.js` holds the per-tab tally, badge, blocked list, lifetime total,
  and local domain aggregate.
- `popup.html` and `popup.js`, plus `options.html` and `options.js`, are the UI
  and the local Stats page.

The two layers (Smart everywhere, Strict on offender sites) are documented at the
top of `block.js` and in the README.

## Testing a change

There is no automated suite yet (contributions welcome). Verify by hand:

- Smart: on a normal page, a pop-up opened from a real button click should pass.
  One fired from clicking a `<div>`, the video, or an overlay should be blocked.
  One with no preceding click should be blocked.
- Strict: on a `strictHosts` site, every cross-origin `window.open` should be
  blocked, including inside player iframes, while same-host pop-ups pass.
- Allow list: an allowed domain passes while others stay blocked.

## Style

Match the surrounding code: vanilla JS, no dependencies, no build tooling, no
frameworks. Keep it small. Comments explain why, not what.

## License

By contributing, you agree your contributions are licensed under the project's
[GPL-3.0](LICENSE) license.
