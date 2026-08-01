import { NextResponse } from 'next/server';
import { findWalletClusters } from '@/server/services/dashboard';
import { getSignals } from '@/server/services/signals';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const signals = await getSignals();
    const groups = findWalletClusters(signals);
    return NextResponse.json({ data: groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wallet correlations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
