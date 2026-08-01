import { NextResponse } from 'next/server';
import { addWallet, getWallets } from '@/server/services/wallets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const wallets = await getWallets();
    return NextResponse.json({ data: wallets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wallets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    const { address } = body;
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    const wallet = await addWallet(address);
    return NextResponse.json({ data: wallet }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add wallet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
