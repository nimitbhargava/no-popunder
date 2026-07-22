// Tests the OAuth / sign-in detection that keeps No Popunder from killing
// "Sign in with Google/Apple/..." pop-ups. It evaluates the REAL code from
// block.js (extracted between the `auth-flow` markers) so there is one source
// of truth: if the shipped heuristic changes, this test tracks it.
//
// Run: node test/auth-detection.test.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'block.js'), 'utf8');

const start = src.indexOf('// >>> auth-flow');
const end = src.indexOf('// <<< auth-flow');
if (start === -1 || end === -1) {
  console.error('FAIL: could not find auth-flow markers in block.js');
  process.exit(1);
}
const block = src.slice(start, end);

// The extracted code uses `location.href` as the URL base. Provide a page
// context (the site from the bug report) and hand back isAuthFlow.
const isAuthFlow = new Function(
  'location',
  `${block}\n;return isAuthFlow;`,
)({ href: 'https://app.timeleft.com/', hostname: 'app.timeleft.com' });

// [url, expected] — true = a legit sign-in pop-up we must NEVER block.
const cases = [
  // The exact failing pop-up from the screenshot.
  ['https://timeleft-16fe7.firebaseapp.com/__/auth/handler?apiKey=AIzaKey&authType=signInViaPopup&providerId=google.com&redirect_uri=https%3A%2F%2Fapp.timeleft.com', true],
  // Major identity providers.
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

  // Popunders and junk: these MUST stay blockable.
  ['https://cdn.popads.net/pop.php?aid=12345', false],
  ['https://junk-ads.example/?utm_source=video&ref=overlay', false],
  ['https://clickbait.example/authorize-your-prize', false], // no /oauth path, no oauth params
  ['https://tracker.example/redirect?url=https://ad.example', false],
  ['https://download.example/setup.exe', false],
  ['https://shady.example/?client_id=only', false], // client_id alone is not enough
];

let pass = 0;
let fail = 0;
for (const [url, expected] of cases) {
  const got = isAuthFlow(url);
  if (got === expected) {
    pass++;
  } else {
    fail++;
    console.error(`FAIL: isAuthFlow(${url}) => ${got}, expected ${expected}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
