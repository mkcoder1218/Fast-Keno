import { NextResponse } from 'next/server';
import { fastKenoService } from '../../../../server/fastKenoService';
import { backendRequest, getAuthToken, mapBackendRound, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authToken = getAuthToken(url.searchParams.get('authToken'));
  const backendApiBase = url.searchParams.get('backendApiBase');
  if (authToken) {
    try {
      const [current, ticketResult] = await Promise.all([
        backendRequest('/games/fast-keno/current', authToken, {}, backendApiBase),
        backendRequest('/games/fast-keno/tickets?limit=50', authToken, {}, backendApiBase),
      ]);
      return NextResponse.json({
        ok: true,
        payload: {
          serverTime: new Date().toISOString(),
          round: mapBackendRound(current.round),
          balance: null,
          tickets: (ticketResult.tickets || []).map(mapBackendTicket),
          draws: [],
          payTable: current.config?.payTable || current.config?.paytable,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : 'Fast Keno backend unavailable.' },
        { status: 400 }
      );
    }
  }

  const userId = url.searchParams.get('userId') || 'demo';
  const balanceRaw = url.searchParams.get('balance');
  const seededBalance = balanceRaw == null || balanceRaw === '' ? null : Number(balanceRaw);
  return NextResponse.json({ ok: true, payload: fastKenoService.current(userId, seededBalance) });
}
