import { NextResponse } from 'next/server';
import { backendRequest, getAuthToken, mapBackendRound, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(body?.authToken);
    if (!authToken) {
      return NextResponse.json({ ok: false, message: 'King 5 login required.' }, { status: 401 });
    }

    const result = await backendRequest('/games/fast-keno/bets', authToken, {
          method: 'POST',
          body: JSON.stringify({
            selectedNumbers: body?.selectedNumbers,
            stake: body?.betAmount ?? body?.stake,
          }),
    });
    const ticketResult = await backendRequest('/games/fast-keno/tickets?limit=50', authToken);

        return NextResponse.json(
          {
            ok: true,
            payload: {
              serverTime: new Date().toISOString(),
              round: mapBackendRound(result.round),
              ticket: mapBackendTicket(result.ticket),
              balance: Number(result.balance || 0),
              tickets: (ticketResult.tickets || []).map(mapBackendTicket),
            },
          },
          { status: 201 }
        );
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Bet failed.' }, { status: 401 });
  }
}
