# Changelog

All notable changes to No Popunder are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-07-22

### Fixed

- Custom-element buttons now count as real clicks. Smart mode only trusted
  pop-ups that followed a click on a semantic control (`<a>`, `<button>`,
  `role="button"`, ...), so sites whose "Pay" / "Share" / "Sign in" buttons are
  styled `<div>`s had their legit pop-ups blocked. The gesture detector now also
  accepts explicit intent markers: `onclick`, focusable `tabindex`, and the
  `link` / `menuitem` / `tab` / `option` ARIA roles. What keeps this from
  re-opening the popunder hole: a matched control that blankets the viewport
  (>= 90% of both dimensions, the click-trap overlay signature) does not count
  as intent. That guard also tightens the old behavior, where a full-page
  transparent `<a href>` overlay counted as a real link click.

### Added

- Payment and share pop-ups are now recognized as trusted destinations and are
  never blocked, in either mode, even when they open after the gesture window.
  Payments match processor hosts (Stripe, PayPal, Razorpay, Paddle, Checkout.com,
  Adyen, Braintree, Square, Mollie, Lemon Squeezy, Klarna, 2Checkout, PayU, and
  Google Pay); shares match the standard intent URLs (Twitter/X, Facebook,
  LinkedIn, Pinterest, Reddit, WhatsApp, Telegram, Tumblr, Hacker News, Buffer,
  Pocket). Together with the 2.4.0 OAuth recognizer these form one
  trusted-pop-up layer, covered by `test/auth-detection.test.mjs` (35 cases,
  including host-spoof attempts like `paypal.com.evil.example`, which stay
  blockable).

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
