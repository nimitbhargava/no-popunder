# Contributing to No-Popunder

Thanks for helping kill popunders. This is a small, dependency-free Manifest V3
extension — about 50 KB of vanilla JavaScript with no build step — so getting
started takes a minute.

## Set up

1. Clone the repo.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**,
   and select the folder.
3. Edit a file, hit **reload ↻** on the extensions page, and **refresh open tabs**
   (Chrome does not hot-reload content scripts in tabs that are already open).

Works the same in any Chromium browser (Brave, Edge, Arc, Opera, Vivaldi).

## The most useful contributions

- **A site that still leaks popunders.** Add it to `strictHosts` in `block.js`,
  or open an issue with the site so it can be seeded. Streaming sites rotate ad
  domains faster than blocklists update — this is where the project earns its
  keep.
- **A legit pop-up that got blocked** (a login, payment, or "open in new tab" on
  a normal site). Tell us the site and the flow; over-blocking is a bug.
- **A popunder that slipped through** on a normal (non-strict) site.

When reporting a missed or over-blocked pop-up, include: the site, what you
clicked, what you expected, and what happened. A short screen recording helps.

## How the pieces fit

- `block.js` — runs in the page's MAIN world at `document_start`. Intercepts
  `window.open` and synthetic `target="_blank"` anchor clicks, and decides Smart
  vs. Strict. This is where the blocking logic lives.
- `relay.js` — isolated-world bridge. Forwards blocks to the worker and feeds the
  Allow/Strict lists into `block.js` live (the page world has no `chrome.*`).
- `background.js` — per-tab tally, badge, blocked list, lifetime total, local
  domain aggregate.
- `popup.html` / `popup.js`, `options.html` / `options.js` — UI and local Stats.

The two layers (Smart everywhere, Strict on offender sites) are documented at the
top of `block.js` and in the README.

## Testing a change

There is no automated suite yet (contributions welcome). Verify by hand:

- **Smart:** on a normal page, a pop-up opened from a real button click should
  pass; one fired from clicking a `<div>` / video / overlay should be blocked;
  one with no preceding click should be blocked.
- **Strict:** on a `strictHosts` site, every cross-origin `window.open` should be
  blocked, including inside player iframes; same-host pop-ups should pass.
- **Allow list:** an allowed domain passes while others stay blocked.

## Style

Match the surrounding code: vanilla JS, no dependencies, no build tooling, no
frameworks. Keep it small. Comments explain *why*, not *what*.

## License

By contributing, you agree your contributions are licensed under the project's
[GPL-3.0](LICENSE) license.
