import { NextResponse } from 'next/server';
import { toggleWalletFavorite } from '@/server/services/wallets';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params;
    const wallet = await toggleWalletFavorite(decodeURIComponent(address));
    return NextResponse.json({ data: wallet });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle favorite';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
