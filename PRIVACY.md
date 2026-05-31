# Privacy Policy — No-Popunder

_Last updated: 2026-05-31_

No-Popunder is a browser extension that blocks popunder ad tabs. This policy
describes exactly what it does and does not do with your data. It is short on
purpose, because the extension collects almost nothing.

## The short version

**No-Popunder sends no data anywhere. It has no servers, no analytics, no
tracking, no accounts, and makes no network requests of its own.** Everything it
stores stays on your device and never leaves it.

## What is stored on your device

The extension uses the browser's local `storage` to keep, **on your device only**:

- Your **Allow list** — domains you chose to stop blocking.
- Your **Strict** per-site toggles.
- **Counts** — a per-tab number of blocked pop-ups, a lifetime total, and a local
  aggregate of *domains*: the blocked ad host, and the **host** of the page it
  fired on (e.g. `example.com`). This never includes full URLs, paths, query
  strings, page content, form data, or any personal identifier.

You can view this data under **Stats** in the popup, export it as JSON, or wipe it
at any time with **Reset stats** / **Clear**. Removing the extension deletes all
of it.

## What is NOT collected

- No browsing history is transmitted off your device.
- No page content is read or stored.
- No full URLs — hosts only, kept locally.
- No cookies, no fingerprinting, no advertising identifiers.
- No personal information of any kind.

## Permissions and why they are needed

- **`storage`** — to remember your Allow list, Strict toggles, and local counts.
- **`activeTab`** — to show the current tab's blocked count in the popup.
- **Host access (`<all_urls>`)** — popunders can fire on any website, so the
  blocking script must be allowed to run on any page. It inspects `window.open`
  and link-click behavior *in the page*; it does not read or transmit page
  content.

## Third parties

None. No-Popunder shares data with no third party, because it collects no data to
share.

## Changes to this policy

If a future version adds any feature that sends data off-device (for example, an
**opt-in, off-by-default** crowd-sourced blocklist), it will be clearly disclosed,
require explicit consent, and this policy will be updated before that feature
ships. See [ROADMAP.md](ROADMAP.md).

## Contact

Questions: open an issue on the project repository.
