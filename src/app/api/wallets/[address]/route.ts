import { NextResponse } from 'next/server';
import { deleteWallet } from '@/server/services/wallets';

export const dynamic = 'force-dynamic';

export async function DELETE(_: Request, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params;
    await deleteWallet(decodeURIComponent(address));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete wallet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
