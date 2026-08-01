import { NextResponse } from 'next/server';
import { getWalletData } from '@/server/services/signals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 });
    const data = await getWalletData(address);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wallet data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
