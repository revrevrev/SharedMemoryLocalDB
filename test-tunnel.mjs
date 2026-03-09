/**
 * test-tunnel.mjs — End-to-end tunnel smoke test
 *
 * Usage:
 *   node test-tunnel.mjs <base-url> <client-id> <client-secret>
 *
 * Example:
 *   node test-tunnel.mjs https://yourname.ngrok-free.app my-gpt-client my-secret
 *
 * Requires: API server + ngrok tunnel both running.
 */

const [baseUrl, clientId, clientSecret] = process.argv.slice(2);

if (!baseUrl || !clientId || !clientSecret) {
  console.error('Usage: node test-tunnel.mjs <base-url> <client-id> <client-secret>');
  process.exit(1);
}

const NAMESPACE = `tunnel-test-${Date.now()}`;
let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗ ${label}`);
  if (detail) console.error(`    ${detail}`);
  failed++;
}

async function step(label, fn) {
  console.log(`\n[${label}]`);
  try {
    return await fn();
  } catch (err) {
    fail('Unexpected error', err.message);
    return null;
  }
}

// ── Step 1: Get token ─────────────────────────────────────────────────────────
const token = await step('POST /oauth/token', async () => {
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (res.status !== 200) {
    fail(`Expected 200, got ${res.status}`);
    return null;
  }
  ok(`Status 200`);

  const body = await res.json();

  if (body.token_type === 'Bearer') ok('token_type is Bearer');
  else fail('token_type is Bearer', `got: ${body.token_type}`);

  if (typeof body.access_token === 'string' && body.access_token.length > 0) ok('access_token present');
  else fail('access_token present', `got: ${body.access_token}`);

  if (typeof body.expires_in === 'number') ok('expires_in is a number');
  else fail('expires_in is a number', `got: ${body.expires_in}`);

  return body.access_token ?? null;
});

if (!token) {
  console.error('\nCannot continue without a token. Is the server running and reachable?');
  process.exit(1);
}

// ── Step 2: Write an entry ────────────────────────────────────────────────────
const payload = { message: 'hello from tunnel test', ts: new Date().toISOString() };

const writeId = await step(`POST /api/namespaces/${NAMESPACE}`, async () => {
  const res = await fetch(`${baseUrl}/api/namespaces/${NAMESPACE}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status !== 201) {
    fail(`Expected 201, got ${res.status}`);
    return null;
  }
  ok('Status 201');

  const body = await res.json();

  if (typeof body.id === 'string') ok('Entry has id');
  else fail('Entry has id', `got: ${body.id}`);

  if (typeof body.timestamp === 'string') ok('Entry has timestamp');
  else fail('Entry has timestamp', `got: ${body.timestamp}`);

  if (body.payload?.message === payload.message) ok('Payload round-trips correctly');
  else fail('Payload round-trips correctly', `got: ${JSON.stringify(body.payload)}`);

  return body.id ?? null;
});

// ── Step 3: Read back ─────────────────────────────────────────────────────────
await step(`GET /api/namespaces/${NAMESPACE}`, async () => {
  const res = await fetch(`${baseUrl}/api/namespaces/${NAMESPACE}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status !== 200) {
    fail(`Expected 200, got ${res.status}`);
    return;
  }
  ok('Status 200');

  const body = await res.json();
  const entries = body.entries;

  if (Array.isArray(entries)) ok('body.entries is an array');
  else { fail('body.entries is an array', `got: ${typeof entries}`); return; }

  if (entries.length === 1) ok('Array contains exactly 1 entry');
  else fail('Array contains exactly 1 entry', `got: ${entries.length}`);

  if (writeId && entries[0]?.id === writeId) ok('Entry id matches written id');
  else if (writeId) fail('Entry id matches written id', `got: ${entries[0]?.id}`);
});

// ── Step 4: Reject bad token ──────────────────────────────────────────────────
await step('Auth rejects invalid token', async () => {
  const res = await fetch(`${baseUrl}/api/namespaces/${NAMESPACE}`, {
    headers: { Authorization: 'Bearer this-is-not-a-valid-token' },
  });

  if (res.status === 401) ok('Status 401 for invalid token');
  else fail('Status 401 for invalid token', `got: ${res.status}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('All checks passed — tunnel is working correctly.');
} else {
  console.log('Some checks failed — see above for details.');
  process.exit(1);
}
