import { NextResponse } from 'next/server';
import { runAutomationTick } from '@/server/services/automation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return runTick('manual');
}

export async function POST() {
  return runTick('cron');
}

async function runTick(reason: string) {
  try {
    const result = await runAutomationTick({ reason });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automation tick failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
