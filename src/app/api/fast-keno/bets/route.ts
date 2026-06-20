import { NextResponse } from 'next/server';
import { fastKenoService } from '../../../../server/fastKenoService';
import { backendRequest, getAuthToken, mapBackendRound, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

function localBetPayload(body: any) {
  const result = fastKenoService.placeBet({
    ...body,
    betAmount: body?.betAmount ?? body?.stake,
  });

  return {
    ...result,
    round: mapBackendRound(result.round, result.serverTime),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(body?.authToken);
    const backendApiBase = typeof body?.backendApiBase === 'string' ? body.backendApiBase : null;
    if (authToken) {
      try {
        const result = await backendRequest('/games/fast-keno/bets', authToken, {
          method: 'POST',
          body: JSON.stringify({
            selectedNumbers: body?.selectedNumbers,
            stake: body?.betAmount ?? body?.stake,
          }),
        }, backendApiBase);
        const ticketResult = await backendRequest('/games/fast-keno/tickets?limit=50', authToken, {}, backendApiBase);

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
        if (!(error instanceof TypeError) && error instanceof Error && error.message !== 'fetch failed') {
          throw error;
        }
      }

      const localPayload = localBetPayload(body);

      return NextResponse.json(
        {
          ok: true,
          payload: localPayload,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ ok: true, payload: localBetPayload(body) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Bet failed.' }, { status: 400 });
  }
}
