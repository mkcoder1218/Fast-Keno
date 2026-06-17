import { NextResponse } from 'next/server';
import { fastKenoService } from '../../../../server/fastKenoService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ ok: true, payload: fastKenoService.settle(body) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Settle failed.' }, { status: 400 });
  }
}
