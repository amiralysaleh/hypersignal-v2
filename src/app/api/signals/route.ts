import { NextResponse } from 'next/server';
import { updateSignalPrices } from '@/server/services/signals';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const signals = await updateSignalPrices();
    return NextResponse.json({ data: signals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch signals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
