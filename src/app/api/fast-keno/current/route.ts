import { NextResponse } from 'next/server';
import { backendRequest, getAuthToken, mapBackendRound, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authToken = getAuthToken(url.searchParams.get('authToken'));
  if (!authToken) {
    return NextResponse.json({ ok: false, message: 'King 5 login required.' }, { status: 401 });
  }

  try {
    const [current, ticketResult] = await Promise.all([
      backendRequest('/games/fast-keno/current', authToken),
      backendRequest('/games/fast-keno/tickets?limit=50', authToken),
    ]);
      return NextResponse.json({
        ok: true,
        payload: {
          serverTime: current.serverTime || new Date().toISOString(),
          round: mapBackendRound(current.round, current.serverTime),
          balance: null,
          tickets: (ticketResult.tickets || []).map(mapBackendTicket),
          draws: [],
          payTable: current.config?.payTable || current.config?.paytable,
        },
      });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Fast Keno backend unavailable.' },
      { status: 401 }
    );
  }
}
