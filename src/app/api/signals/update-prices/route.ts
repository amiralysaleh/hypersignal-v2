import { NextResponse } from 'next/server';
import { updateSignalPrices } from '@/server/services/signals';
import { log } from '@/server/services/logs';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const signals = await updateSignalPrices();
    return NextResponse.json({ data: signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update signal prices';
    await log({ level: 'ERROR', message: 'Manual price update failed', context: { error: message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
