import { NextResponse } from 'next/server';
import { getPerformanceData } from '@/server/services/performance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') ?? '30d';
    const data = await getPerformanceData(timeframe);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch performance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
