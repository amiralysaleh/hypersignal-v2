import { NextResponse } from 'next/server';
import { findWalletsByCoin } from '@/server/services/signals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coin = searchParams.get('coin');
    if (!coin) return NextResponse.json({ error: 'coin is required' }, { status: 400 });
    const data = await findWalletsByCoin(coin);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to find wallets by coin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
