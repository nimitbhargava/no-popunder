# Changelog

All notable changes to No Popunder are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-07-22

### Fixed

- "Sign in with Google" (and Apple, Microsoft, Facebook, GitHub, and other
  OAuth flows) are no longer blocked. The sign-in pop-up is recognized as a
  federated-auth flow and always allowed, in both Smart and Strict mode. This
  was especially bad for Firebase logins: the pop-up opens on a
  `<project>.firebaseapp.com/__/auth/handler` URL, not on `accounts.google.com`,
  so allowlisting the provider by hand never actually worked. Recognition is by
  identity-provider host, the standard OAuth/OIDC endpoint path, or the OAuth
  2.0 authorization query signature; a junk popunder carries none of these, so
  ordinary popunder blocking is unchanged. Covered by
  `test/auth-detection.test.mjs`.

## [2.3.0] - 2026-05-31

### Added

- Published to the [Chrome Web Store](https://chromewebstore.google.com/detail/no-popunder/egnfpcniepjchocifgegplahbgmnhojn).
  This 2.3.0 build is the first release available there; before this the only way
  to run it was loading it unpacked.
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
