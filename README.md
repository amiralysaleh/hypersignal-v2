# HyperSignal v2

Pixel-art dashboard that watches Hyperliquid perp wallets for **coordinated position opening** and alerts you on Telegram when it happens.

Completely rewritten from the first version with a simpler, cheaper, more accurate engine:

| | v1 (old) | v2 (this repo) |
|---|---|---|
| 24/7 automation | Durable Object alarm (paid, ~$72/yr, fragile) | **Free Cloudflare Cron Trigger** every 10 min |
| Deployment | OpenNext + patched worker | OpenNext with native cron binding |
| Position accuracy | Heuristic "first fill" for entry | **Fill-chain reconstruction** of entry & open time (flip/closing-aware) |
| Volume limit | 1000+ Hyperliquid calls/run | **Newest-fill early exit** — only fetch what's in the detection window |
| AI analytics | Paid Gemini calls for correlations | **Deterministic cluster detection**, free |
| UI | shadcn template | Custom **pixel-art CRT** design system |

## What it does

- Track a list of Hyperliquid wallet addresses
- Every 10 minutes the cron bot scans the next batch of wallets' recent fills
- When **N+ wallets** open the **same direction on the same pair** within **T minutes** → **SIGNAL**
- Signal stores entry, margin, leverage, stop-loss, take-profit levels, contributing wallets
- Every tick, open signals get their mark price refreshed; hitting TP/SL closes them and credits the participating wallets' stats
- Telegram alerts on new signals (bot token + channel IDs in settings)
- Explorer: lookup any wallet's live positions, or find tracked wallets holding a coin
- Performance: per-wallet win rate / PnL leaderboard
- Logs: every run logs INFO/WARN/ERROR

## Architecture

```
Cron Trigger (every 10 min, free)
   └─ /api/automation/run
        ├─ Phase 1: scan batch of wallets (rate-limited HL calls, resumable cursor)
        └─ Phase 2: refresh open signal prices (single allMids call)
Data: Cloudflare D1 (single kv table), free tier
UI:   Next.js App Router, zero heavy deps (no recharts, no radix, no genkit)
```

- **Rate limiting**: all Hyperliquid calls go through a serialized queue (1 req/sec), with 429 retry-after backoff and timeout penalties. Far under free-tier limits.
- **Accuracy**: entry price & open time are reconstructed by walking fills backward (newest-first) until the current position size is rebuilt. Flips / closes / missing fills → `null` (never a wrong guess).
- **Cost**: reads only, no API key, no paid services. ~2 req/setup + 1 req/wallet per scan, 20 wallets/scan, 6 scans/hour ≈ **under 300 req/day**.

## Local dev (no Cloudflare needed)

```bash
npm install
npm run dev:demo     # DEMO=1 — in-memory seeded data, whole UI works
```

Or against a real D1 locally:

```bash
npx wrangler d1 create hypersignal          # once
npx wrangler d1 execute hypersignal --local --file=migrations/0001_init.sql
npm run dev                                  # binds local D1 via .dev.vars
```

## Deploy to Cloudflare (free plan, all-in)

```bash
npm install
npm run db:migrate                # create tables in remote D1 (one-time)
npx wrangler login
npm run deploy
npx wrangler triggers list        # confirm the */10 cron exists
npx wrangler triggers create --cron "*/10 * * * *"
```

> Wrangler deploys cron triggers from `wrangler.jsonc` automatically on `deploy`; `triggers create` is only needed if it was skipped.

## Settings that matter

| Setting | Meaning |
|---|---|
| minWalletCount (N) | wallets needed to fire a signal |
| timeWindow (T) | cluster window in minutes |
| minVolume | minimum cluster notional ($) |
| defaultStopLoss | SL % from entry |
| takeProfitTargets | comma list, e.g. `2.0, 3.5, 5.0` |
| telegramBotToken / telegramChannelIds | alert relay (optional) |
| monitoredPairs / ignoredPairs | display + filter lists (detection auto-scopes to actual wallet activity) |

## Rate limit tuning (env vars)

- `HL_MIN_REQUEST_INTERVAL_MS` (default 1000) — min gap between Hyperliquid calls
- `HL_REQUEST_TIMEOUT_MS` (default 15000)
- `DETECTION_MAX_WALLETS_PER_RUN` (default 20) — wallets scanned per 10-min tick

## Notes

- The old repo (amiralysaleh/hypersignal) is untouched — this is a fresh repository.
- D1 free tier: 5M rows reads/day — the detection engine uses ~2 reads per tick. No quota worries.
- Dashboard shows a "SYSTEM PAUSED" badge if cron stops running.
