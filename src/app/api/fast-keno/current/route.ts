import { NextResponse } from 'next/server';
import { fastKenoService } from '../../../../server/fastKenoService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'demo';
  const balanceRaw = url.searchParams.get('balance');
  const seededBalance = balanceRaw == null || balanceRaw === '' ? null : Number(balanceRaw);
  return NextResponse.json({ ok: true, payload: fastKenoService.current(userId, seededBalance) });
}
