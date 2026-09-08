/**
 * Block until the API health endpoint responds (used before starting Vite).
 */
const HEALTH_URL = process.env.API_HEALTH_URL || 'http://127.0.0.1:5000/api/v1/health';
const MAX_WAIT_MS = Number(process.env.API_WAIT_MS || 90_000);
const INTERVAL_MS = 400;

async function isApiReady() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForApi() {
  const started = Date.now();
  process.stdout.write('[wait-for-api] Waiting for API');

  while (Date.now() - started < MAX_WAIT_MS) {
    if (await isApiReady()) {
      process.stdout.write('\n');
      console.log(`[wait-for-api] API ready (${HEALTH_URL})`);
      return;
    }
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  process.stdout.write('\n');
  console.error(`[wait-for-api] Timed out after ${MAX_WAIT_MS}ms — is the server running on port 5000?`);
  process.exit(1);
}

await waitForApi();
