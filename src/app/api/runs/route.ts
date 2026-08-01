import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/server/services/automation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getSystemStatus();
    return NextResponse.json({ data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch system status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
