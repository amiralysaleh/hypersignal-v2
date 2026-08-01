/**
 * Adds a `scheduled` handler to the OpenNext worker so Cloudflare Cron
 * Triggers hit our automation endpoint (free, no Durable Objects).
 * Run after `opennextjs-cloudflare build`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const workerPath = resolve('.open-next/worker.js');
  let source = await readFile(workerPath, 'utf8');

  if (source.includes('async scheduled(')) {
    console.log('scheduled handler already present, skipping patch.');
    return;
  }

  const patch = `
async function handleScheduled(event, env, ctx) {
  const origin = 'https://automation.internal';
  const url = new URL('/api/automation/run', origin);
  const request = new Request(url, {
    method: 'POST',
    headers: { 'cf-automation-trigger': 'cron' },
  });
  const response = await runWithCloudflareRequestContext(request, env, ctx, async () => {
    const { handler } = await import('./server-functions/default/handler.mjs');
    return handler(request, env, ctx, request.signal);
  });
  if (!response.ok) {
    console.error('Automation cron tick failed', response.status, await response.text());
  }
}
`;

  // Insert handleScheduled after the imports, before `export default`.
  source = source.replace('export default {', `${patch}\nexport default {`);

  // Add the scheduled method inside the default export object.
  source = source.replace(
    '    async fetch(request, env, ctx) {',
    `    async scheduled(event, env, ctx) {
        await handleScheduled(event, env, ctx);
    },
    async fetch(request, env, ctx) {`
  );

  await writeFile(workerPath, source);
  console.log('Patched scheduled handler into worker.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
