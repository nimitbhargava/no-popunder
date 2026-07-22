// Tests the trusted-pop-up detection (sign-in, payment, share) that keeps
// No Popunder from killing pop-ups the site needs. It evaluates the REAL code
// from block.js (extracted between the `trusted-popup` markers) so there is
// one source of truth: if the shipped heuristic changes, this test tracks it.
//
// Run: node test/auth-detection.test.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'block.js'), 'utf8');

const start = src.indexOf('// >>> trusted-popup');
const end = src.indexOf('// <<< trusted-popup');
if (start === -1 || end === -1) {
  console.error('FAIL: could not find trusted-popup markers in block.js');
  process.exit(1);
}
const block = src.slice(start, end);

// The extracted code uses `location.href` as the URL base. Provide a page
// context (the site from the bug report) and hand back isTrustedPopup.
const isTrustedPopup = new Function(
  'location',
  `${block}\n;return isTrustedPopup;`,
)({ href: 'https://app.timeleft.com/', hostname: 'app.timeleft.com' });

// [url, expected] — true = a legit pop-up we must NEVER block.
const cases = [
  // --- sign-in: the exact failing pop-up from the bug report ---------------
  ['https://timeleft-16fe7.firebaseapp.com/__/auth/handler?apiKey=AIzaKey&authType=signInViaPopup&providerId=google.com&redirect_uri=https%3A%2F%2Fapp.timeleft.com', true],
  // --- sign-in: major identity providers ------------------------------------
  ['https://accounts.google.com/o/oauth2/v2/auth?client_id=x&redirect_uri=y&response_type=code&scope=openid', true],
  ['https://appleid.apple.com/auth/authorize?client_id=x&redirect_uri=y&response_type=code', true],
  ['https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=x&response_type=code', true],
  ['https://github.com/login/oauth/authorize?client_id=x&scope=user', true],
  ['https://www.facebook.com/v19.0/dialog/oauth?client_id=x&redirect_uri=y', true],
  ['https://discord.com/oauth2/authorize?client_id=x&response_type=code', true],
  ['https://x.com/i/oauth2/authorize?client_id=x&response_type=code', true],
  ['https://slack.com/openid/connect/authorize?client_id=x&response_type=code', true],
  ['https://dev-abc123.okta.com/oauth2/default/v1/authorize?client_id=x', true],
  ['https://tenant.auth0.com/authorize?response_type=code&client_id=x&redirect_uri=y', true],
  ['https://tenant.b2clogin.com/tenant/oauth2/v2.0/authorize?client_id=x', true],
  // Generic OAuth 2.0 request on an app's own domain (self-hosted IdP).
  ['https://id.somestartup.io/oauth/authorize?response_type=code&client_id=x&redirect_uri=y', true],

  // --- payment / checkout ---------------------------------------------------
  ['https://checkout.stripe.com/c/pay/cs_live_abc123', true],
  ['https://www.paypal.com/checkoutnow?token=EC-123', true],
  ['https://api.razorpay.com/v1/checkout/embedded', true],
  ['https://buy.paddle.com/product/12345', true],
  ['https://pay.google.com/gp/p/ui/pay?token=abc', true],
  ['https://mystore.lemonsqueezy.com/checkout/buy/uuid', true],

  // --- social share intents --------------------------------------------------
  ['https://twitter.com/intent/tweet?text=hello&url=https%3A%2F%2Fexample.com', true],
  ['https://x.com/intent/post?text=hello', true],
  ['https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com', true],
  ['https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com', true],
  ['https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com', true],
  ['https://api.whatsapp.com/send?text=hello', true],
  ['https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fexample.com', true],

  // --- popunders and junk: these MUST stay blockable -------------------------
  ['https://cdn.popads.net/pop.php?aid=12345', false],
  ['https://junk-ads.example/?utm_source=video&ref=overlay', false],
  ['https://clickbait.example/authorize-your-prize', false], // no /oauth path, no oauth params
  ['https://tracker.example/redirect?url=https://ad.example', false],
  ['https://download.example/setup.exe', false],
  ['https://shady.example/?client_id=only', false],          // client_id alone is not enough
  ['https://shady.example/checkout?offer=1', false],         // "checkout" path on a junk host
  ['https://evil.example/intent/tweet', false],              // share-looking path, wrong host
  ['https://paypal.com.evil.example/checkoutnow', false],    // host-suffix spoof attempt
];

let pass = 0;
let fail = 0;
for (const [url, expected] of cases) {
  const got = isTrustedPopup(url);
  if (got === expected) {
    pass++;
  } else {
    fail++;
    console.error(`FAIL: isTrustedPopup(${url}) => ${got}, expected ${expected}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
