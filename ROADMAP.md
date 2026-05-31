# Roadmap

## Done

- **Phase 0–1** (v1.0 → v2.2): cross-origin popunder blocking (Smart everywhere
  + Strict on offender sites), per-domain Allow list, per-site Strict toggle,
  badge + popup with grouped domains and lifetime total, and **local** domain
  aggregation (Stats page + "Make this site Strict" nudge). Nothing leaves the
  device.

---

## Phase 2: opt-in crowd-sourced domain intelligence (next)

**Goal.** Aggregate `{adHost, pageHost}` across many users to (a) ship better
`strictHosts` defaults and (b) a shared ad-domain blocklist, so new users are
protected on day one without anyone toggling anything.

**Rule.** Build it strictly opt-in. An ad blocker that quietly phones home with
browsing data is the fastest path to losing trust and getting delisted. Default
OFF. Host-only. No full URLs, ever.

### Must-haves (privacy/legal: do these or don't ship)

- [ ] Opt-in toggle in `options.html`, **default OFF** (`share` flag in
      `storage.local`).
- [ ] Plain-language disclosure of exactly what's sent: page **host** +
      ad-domain **host** only, with no path, no query, no page content, no IDs.
- [ ] A hosted **privacy policy** page (the `chrome-extension-submission` skill
      can generate + host one).
- [ ] Chrome Web Store **data-use disclosure** form filled; mark Limited Use;
      justify any "web history"/"website content" categories.

### Client (extension)

- [ ] Read `share` consent before doing anything network.
- [ ] Batch deltas since last upload from the existing `stats` aggregate; dedupe;
      cap payload size.
- [ ] `chrome.alarms` periodic flush (e.g. every 6h) with exponential backoff on
      failure; drop quietly when offline.
- [ ] `fetch` POST to the endpoint. Add `host_permissions` for the endpoint and
      the `alarms` permission to the manifest.
- [ ] Strip everything but hosts. No stable user ID (anonymous), or a rotating
      one. Decide below and document it.

### Backend (minimal)

- [ ] Endpoint that accepts the JSON and increments aggregate counts keyed by
      `(adHost, pageHost)`. Stateless ingestion.
- [ ] Stack options: Cloudflare Worker + D1/KV, or a Vercel function + a
      Marketplace DB. Either is fine; pick the one you'll actually maintain.
- [ ] Abuse handling: rate-limit by IP, validate that values look like hostnames,
      and consider recording **presence-per-day** rather than raw counts so a
      single client can't inflate a domain.
- [ ] A simple query/dashboard for "top sites with popunders" and "top ad
      domains" (mirrors the local Stats page, but global).

### Closing the loop (turn data into protection)

- [ ] **2a (manual):** review the dashboard, bump `strictHosts` and an ad-domain
      blocklist in `block.js`, ship a release.
- [ ] **2b (auto, later):** extension fetches a signed, cached remote config
      (blocklist + strict-list) on a schedule, so defaults improve without a full
      release. Verify a signature so the list can't be tampered with in transit.

### Decisions to make first

- **Identity:** anonymous (no ID) vs rotating client ID. Recommend none/rotating.
- **Signal:** raw counts (give weight) vs presence-only (resists gaming).
- **Hosting:** self-host endpoint vs managed; where the privacy policy lives.

### Rough effort

- Client opt-in + uploader: ~½ day.
- Backend ingestion + dashboard: ~½–1 day.
- Privacy policy + store disclosure: ~2 hours.

> Hook point in code: see the `TODO(phase-2)` marker in `background.js`, next to
> the local `stats` aggregation. That's where the upload batch is sourced.

---

## Phase 3: community lists (EasyList / uBlock)

**Goal.** Complement the behavioral blocker with curated ad-domain blocking, the
way uBlock Origin Lite (uBOL) does.

**Mechanism.** MV3 doesn't run Adblock-syntax lists in JS. You compile them to
`declarativeNetRequest` (DNR) static rulesets. Two integration options:

- [ ] **DNR ad-request blocking:** convert an ad-domain list to DNR `block`
      rules so ad domains never load (broad, not just popunders). Easiest from a
      hosts-format domain list, much harder from full EasyList ABP syntax.
- [ ] **Domain blocklist for `block.js`:** extract just the domains and always
      block `window.open`/anchors to them, even in Smart mode. Lighter; fits the
      current architecture. Good home for the Phase 2 crowd-sourced domains too.

**Licensing (decide before shipping):**
- EasyList: **GPLv3 + CC BY-SA 3.0** (attribution + share-alike).
- uBlock `uAssets`: **GPLv3**.
- Peter Lowe's list: **non-commercial only**.
- → Pick a list whose license fits how you distribute (commercial vs not), add
  attribution, and keep source available if GPL.

**Note.** The behavioral blocker already handles the *rotating* popunder domains
on streaming sites (they change faster than lists update). Lists mainly add broad
ad-request blocking, which is nice to have but not the core. Consider seeding the blocklist
from our own Phase 2 data instead, which sidesteps the licensing question.

### Permissions this adds
- `declarativeNetRequest` (static rulesets), and host perms / a fetch schedule if
  lists are updated at runtime rather than shipped per release.
