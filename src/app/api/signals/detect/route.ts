import { NextResponse } from 'next/server';
import { detectAndSaveSignals, getSignals } from '@/server/services/signals';
import { log } from '@/server/services/logs';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await detectAndSaveSignals();
    const signals = await getSignals();
    return NextResponse.json({ data: signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to detect signals';
    await log({ level: 'ERROR', message: 'Manual detection failed', context: { error: message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
