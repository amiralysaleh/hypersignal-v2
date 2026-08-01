import { NextResponse } from 'next/server';
import { deleteSignal } from '@/server/services/signals';

export const dynamic = 'force-dynamic';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSignal(decodeURIComponent(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete signal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
