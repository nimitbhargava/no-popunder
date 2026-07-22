// No Popunder: a site-agnostic popunder blocker.
// Runs in every frame's MAIN world at document_start and stops the
// "click the video, a junk tab opens behind it" behavior, on any site.
//
// Two layers:
//   • Smart (everywhere, default): a cross-origin pop-up is blocked UNLESS it
//     directly followed you clicking a real link or button. So pop-ups that fire
//     from clicks on the video, page, or invisible overlay (the popunder
//     signature) are blocked, while logins, payments and intentional
//     "open in new tab" keep working.
//   • Strict (on `strictHosts`): block ALL cross-origin pop-ups, because those
//     sites have no legit pop-ups. Covers the page and its player iframes.
//
// The user allowlist (managed from the popup, fed in live by relay.js) always
// wins, in both layers.

(() => {
  'use strict';

  // ---- config -------------------------------------------------------------
  const CONFIG = {
    blockWindowOpen: true,   // popunder vector #1: window.open(adUrl)
    blockBlankAnchors: true, // popunder vector #2: inject <a target=_blank> + auto-click
    // Sites with zero legit pop-ups: block everything cross-origin here.
    // Matched against the frame host AND ancestor hosts (covers player iframes).
    strictHosts: ['7reels.cc'],
    // Smart mode treats a pop-up as user-intended only if it follows a trusted
    // click on a real control within this many milliseconds.
    gestureWindowMs: 1200,
    logBlocks: false,        // see chrome://extensions Errors note; off by default
  };

  const now = () => Date.now();
  const log = (...a) => CONFIG.logBlocks && console.log('[no-popunder]', ...a);

  const report = (kind, url) => {
    log('blocked', kind, '->', url);
    try {
      window.postMessage({ __noPopunder: true, type: 'block', kind, url: url || '' }, '*');
    } catch {}
  };

  // ---- strict-host detection (own host or any ancestor frame host) --------
  // Effective strict list = built-in offenders (CONFIG.strictHosts) + sites the
  // user toggled strict from the popup (fed in live by relay.js).
  const hostIn = (h, list) => !!h && list.some((r) => h === r || h.endsWith('.' + r));
  function isStrictFor(list) {
    try { if (hostIn(location.hostname, list)) return true; } catch {}
    try {
      const anc = location.ancestorOrigins;
      for (let i = 0; i < (anc ? anc.length : 0); i++) {
        if (hostIn(new URL(anc[i]).hostname, list)) return true;
      }
    } catch {}
    return false;
  }
  let userStrict = [];
  let strictMode = isStrictFor(CONFIG.strictHosts);
  const recomputeStrict = () => {
    strictMode = isStrictFor(CONFIG.strictHosts.concat(userStrict));
  };

  // ---- user allowlist (fed by relay.js, kept live) ------------------------
  let allowHosts = new Set();
  const isAllowed = (h) =>
    !!h && [...allowHosts].some((a) => h === a || h.endsWith('.' + a));

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.__noPopunder !== true) return;
    if (d.type === 'allowlist') {
      allowHosts = new Set(Array.isArray(d.hosts) ? d.hosts : []);
    } else if (d.type === 'strictlist') {
      userStrict = Array.isArray(d.hosts) ? d.hosts : [];
      recomputeStrict();
    }
  }, false);
  try { window.postMessage({ __noPopunder: true, type: 'request-lists' }, '*'); } catch {}

  // ---- track the last trusted user gesture --------------------------------
  // Lets Smart mode tell "you clicked a real link/button" (likely a legit
  // pop-up) from "a pop-up fired off a click on the video/page" (popunder).
  let lastGesture = { ts: 0, interactive: false };
  // Beyond semantic elements we accept explicit intent markers (onclick,
  // focusable tabindex, common ARIA roles): plenty of real "Pay" / "Share" /
  // "Sign in" buttons are custom <div>/<span> components, not <button>s, and
  // blocking their pop-up breaks the site for the user.
  const INTERACTIVE =
    'a[href], button, input, select, textarea, summary, label, ' +
    '[role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], ' +
    '[onclick], [tabindex]:not([tabindex="-1"])';
  // What keeps the broader selector from re-opening the popunder hole: a
  // popunder's click trap is a full-viewport overlay (often with its own
  // onclick), while a genuine control is small. A match that blankets the
  // screen is a trap, not intent.
  function blanketsViewport(el) {
    try {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!vw || !vh) return false;
      return r.width >= vw * 0.9 && r.height >= vh * 0.9;
    } catch { return false; }
  }
  function onGesture(e) {
    if (!e.isTrusted) return;
    const el = e.target;
    const control = el && el.closest && el.closest(INTERACTIVE);
    lastGesture = { ts: now(), interactive: !!control && !blanketsViewport(control) };
  }
  // Registered first (document_start) so they record the real click target
  // before the page's own handlers run and call window.open.
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('click', onGesture, true);

  // ---- trusted pop-up destinations: sign-in, payment, share ---------------
  // Some pop-ups are the OPPOSITE of a popunder: the site breaks without them.
  // We never block these, in any mode:
  //   • OAuth / federated sign-in ("Sign in with Google/Apple/..."). The pop-up
  //     often lands on a handler the user can't guess: Firebase opens
  //     `<project>.firebaseapp.com/__/auth/handler`, not accounts.google.com,
  //     so manually allowlisting the provider wouldn't even help.
  //   • Payment / checkout windows (Stripe, PayPal, 3-D Secure hand-offs, ...).
  //   • Social share intents (tweet/share/submit windows).
  // Matched by identity-provider or payment-processor host, well-known OAuth
  // endpoint path, the OAuth 2.0 authorization query signature, or a share
  // intent URL. A junk popunder carries none of these (there is no ad money on
  // the other side of checkout.stripe.com), so this can't reopen the hole.
  //
  // >>> trusted-popup (shared verbatim with test/auth-detection.test.mjs) >>>
  // Hosts that do nothing but authentication: an exact/subdomain match is safe.
  const AUTH_HOSTS = [
    'accounts.google.com', 'appleid.apple.com',
    'login.microsoftonline.com', 'login.microsoft.com', 'login.live.com',
    'login.yahoo.com', 'oauth.telegram.org',
  ];
  // Identity-platform domains (any subdomain is an auth tenant).
  const AUTH_HOST_SUFFIX = [
    'firebaseapp.com', 'auth0.com', 'okta.com', 'oktapreview.com',
    'okta-emea.com', 'onelogin.com', 'b2clogin.com', 'microsoftonline.com',
  ];
  // Well-known OAuth 2.0 / OIDC / Firebase authorization endpoints.
  const AUTH_PATH_RE = /\/__\/auth\/handler|\/o\/oauth2\/|\/oauth2?\/(?:v\d+\/)?auth(?:orize|orization|enticate)?|\/i\/oauth2\/authorize|\/login\/oauth\/authorize|\/dialog\/oauth|\/connect\/authorize/i;
  function isAuthFlow(url) {
    if (!url) return false;
    let u;
    try { u = new URL(url, location.href); } catch { return false; }
    const host = u.hostname;
    if (AUTH_HOSTS.includes(host)) return true;
    if (AUTH_HOST_SUFFIX.some((s) => host === s || host.endsWith('.' + s))) return true;
    if (AUTH_PATH_RE.test(u.pathname)) return true;
    const q = u.searchParams;
    if (q.get('response_type') && (q.get('client_id') || q.get('redirect_uri'))) return true;
    if (q.get('client_id') && q.get('redirect_uri') && q.get('scope')) return true;
    const at = (q.get('authType') || '').toLowerCase();
    if (at === 'signinviapopup' || at === 'signinwithpopup' || at === 'signinviaredirect') return true;
    if (q.get('providerId') && q.get('apiKey')) return true; // Firebase handler
    return false;
  }
  // Payment processors: their pop-ups are checkout/3DS windows, never ads.
  const PAY_HOSTS = ['pay.google.com'];
  const PAY_HOST_SUFFIX = [
    'stripe.com', 'paypal.com', 'razorpay.com', 'paddle.com', 'checkout.com',
    'adyen.com', 'braintreegateway.com', 'squareup.com', 'mollie.com',
    'lemonsqueezy.com', 'klarna.com', '2checkout.com', 'payu.in',
  ];
  function isPaymentFlow(url) {
    if (!url) return false;
    let u;
    try { u = new URL(url, location.href); } catch { return false; }
    const host = u.hostname;
    if (PAY_HOSTS.includes(host)) return true;
    return PAY_HOST_SUFFIX.some((s) => host === s || host.endsWith('.' + s));
  }
  // Social share intents: the classic small share window.
  const SHARE_RE = new RegExp([
    'twitter\\.com/intent/', 'x\\.com/intent/',
    'facebook\\.com/sharer', 'facebook\\.com/dialog/(?:share|feed|send)',
    'linkedin\\.com/shar', // /sharing/share-offsite, /shareArticle
    'pinterest\\.[a-z.]+/pin/create', 'reddit\\.com/submit',
    'api\\.whatsapp\\.com/send', 'wa\\.me/', 't\\.me/share', 'telegram\\.me/share',
    'tumblr\\.com/widgets/share', 'news\\.ycombinator\\.com/submitlink',
    'buffer\\.com/add', 'getpocket\\.com/(?:edit|save)',
  ].join('|'), 'i');
  function isShareIntent(url) {
    if (!url) return false;
    let u;
    try { u = new URL(url, location.href); } catch { return false; }
    return SHARE_RE.test(u.hostname + u.pathname);
  }
  function isTrustedPopup(url) {
    return isAuthFlow(url) || isPaymentFlow(url) || isShareIntent(url);
  }
  // <<< trusted-popup <<<

  // ---- the decision -------------------------------------------------------
  function shouldBlock(url) {
    let h;
    if (url) { try { h = new URL(url, location.href).hostname; } catch {} }
    if (h && h === location.hostname) return false; // same-host pop-up is fine
    if (h && isAllowed(h)) return false;            // user allowed this domain
    if (isTrustedPopup(url)) return false;          // sign-in/payment/share: never a popunder
    if (strictMode) return true;                     // known offender: block all
    // Smart: allow only if it directly followed a click on a real control.
    const recent = now() - lastGesture.ts < CONFIG.gestureWindowMs;
    return !(recent && lastGesture.interactive);
  }

  // ---- vector #1: window.open --------------------------------------------
  if (CONFIG.blockWindowOpen) {
    const realOpen = window.open; // capture native before we override it

    const stubWindow = () => ({
      closed: true,
      focus() {}, blur() {}, close() {}, postMessage() {}, moveTo() {}, resizeTo() {},
      document: { write() {}, writeln() {}, close() {}, open() {} },
      location: {
        href: 'about:blank', assign() {}, replace() {}, reload() {},
        toString() { return 'about:blank'; },
      },
    });

    const blockedOpen = function open(url, target) {
      // Same-tab navigations via window.open(url, '_self'|'_top'|'_parent') are
      // not pop-ups, so never block those.
      const t = target ? String(target).toLowerCase() : '';
      if (t === '_self' || t === '_top' || t === '_parent') {
        return realOpen.apply(window, arguments);
      }
      if (!shouldBlock(url)) return realOpen.apply(window, arguments);
      report('window.open', url);
      return stubWindow();
    };

    // Getter/setter so the page can't quietly restore the real window.open.
    try {
      Object.defineProperty(window, 'open', {
        configurable: false,
        enumerable: true,
        get() { return blockedOpen; },
        set() { /* ignore attempts to overwrite */ },
      });
    } catch {
      window.open = blockedOpen; // fallback if already locked
    }
  }

  // ---- vector #2: synthetic target=_blank anchor clicks -------------------
  // On strict sites we cancel cross-origin new-tab anchors (overlay ad links).
  // In Smart mode a real anchor click is treated as intentional and left alone.
  if (CONFIG.blockBlankAnchors) {
    window.addEventListener('click', (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[target="_blank"]');
      if (!a) return;

      let dest;
      try { dest = new URL(a.href, location.href); } catch { return; }
      if (dest.origin === location.origin) return; // same-site new tabs are fine
      if (isAllowed(dest.hostname)) return;        // user allowed this domain
      if (isTrustedPopup(a.href)) return;          // sign-in/payment/share, never block
      if (!strictMode) return;                     // Smart: trust real link clicks

      e.preventDefault();
      e.stopImmediatePropagation();
      report('new-tab-link', a.href);
    }, true); // capture = true so we fire before the site's own handlers
  }
})();
