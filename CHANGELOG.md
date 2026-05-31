# Changelog

All notable changes to No Popunder are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-05-31

### Added

- Per-row controls on the Stats page. You can now Allow or re-block an ad domain,
  and switch a site between Smart and Strict, straight from the tables. The
  toggles write the same Allow and Strict lists the popup uses, so they apply to
  open tabs right away with no reload.
- A Strict-mode explainer in the popup: an info tooltip describing Smart versus
  Strict, plus a small mode pill that reads Smart or Strict for the current site.

### Changed

- Renamed the extension to "No Popunder" with a short tagline.
- Redesigned the popup and the Stats page with a frosted glass theme.
- Rewrote the README, privacy policy, contributing guide, and roadmap to read
  more naturally, and removed em dashes from all user-facing text.

## [2.2.1] - baseline

The last version before this changelog existed. It already had cross-origin
popunder blocking (Smart everywhere, Strict on offender sites), a per-domain
Allow list, a per-site Strict toggle, the badge and popup with grouped domains
and a lifetime total, and the local Stats page. Detailed per-version history
before 2.3.0 was not tracked.
