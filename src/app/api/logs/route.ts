import { NextResponse } from 'next/server';
import { clearLogs, getLogs } from '@/server/services/logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await getLogs();
    return NextResponse.json({ data: logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
