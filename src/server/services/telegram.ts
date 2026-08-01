import type { Settings, Signal } from '@/lib/types';
import { log } from '@/server/services/logs';

const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000;

function escapeMarkdown(text: string): string {
  return text.replace(/([\\_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

export function buildSignalMessage(signal: Signal, settings: Settings): string {
  const direction = signal.type === 'LONG' ? '⬆️ LONG' : '⬇️ SHORT';
  const lines = [
    `🚨 *NEW CONSENSUS SIGNAL*`,
    ``,
    `*${signal.pair}*  ${direction}`,
    ``,
    `▸ Entry: $${signal.entryPrice}`,
    `▸ Current: $${signal.currentPrice}`,
    `▸ Margin: $${signal.margin}`,
    `▸ Leverage: ${signal.leverage}x`,
    `▸ Consensus: ${signal.contributingWallets} wallets`,
    ``,
    `▸ Stop Loss: $${signal.stopLoss}`,
    ...signal.takeProfitTargets.map((tp, i) => `▸ TP${i + 1}: $${tp}`),
    ``,
    `[Open dashboard](https://hypersignal.pages.dev/signals)`,
  ];
  return lines.join('\n');
}

export async function sendTelegramMessage(signal: Signal, settings: Settings): Promise<boolean> {
  const { telegramBotToken, telegramChannelIds } = settings;
  if (!telegramBotToken || !telegramChannelIds) {
    await log({ level: 'INFO', message: 'Telegram not configured. Skipping alert.' });
    return false;
  }

  const channels = telegramChannelIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (channels.length === 0) return false;

  const text = buildSignalMessage(signal, settings);
  let sentAny = false;

  for (const channelId of channels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS);
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (response.ok && result?.ok) {
        sentAny = true;
        await log({ level: 'INFO', message: `Telegram alert sent to channel ${channelId}`, context: { signalId: signal.id } });
      } else {
        await log({
          level: 'ERROR',
          message: `Telegram send failed for channel ${channelId}`,
          context: { status: response.status, result },
        });
      }
    } catch (error) {
      await log({
        level: 'ERROR',
        message: `Telegram send error for channel ${channelId}`,
        context: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  return sentAny;
}

// Simple markdown-ish message (used by telegram.ts itself; kept for potential future use)
export { escapeMarkdown };
