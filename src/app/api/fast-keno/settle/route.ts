import { NextResponse } from 'next/server';
import { fastKenoService } from '../../../../server/fastKenoService';
import { backendRequest, getAuthToken, mapBackendDraw, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(body?.authToken);
    const backendApiBase = typeof body?.backendApiBase === 'string' ? body.backendApiBase : null;
    if (authToken) {
      const [settledResult, ticketResult] = await Promise.all([
        backendRequest('/games/fast-keno/settle', authToken, { method: 'POST', body: JSON.stringify({}) }, backendApiBase),
        backendRequest('/games/fast-keno/tickets?limit=50', authToken, {}, backendApiBase),
      ]);
      const settledRounds = settledResult.settled || [];
      const requestedDrawId = body?.drawId ? String(body.drawId) : '';
      const latestDraw = requestedDrawId
        ? settledRounds.find((round: any) => String(round?.roundNumber || round?.id || '') === requestedDrawId) || null
        : settledRounds[settledRounds.length - 1];

      return NextResponse.json({
        ok: true,
        payload: {
          serverTime: new Date().toISOString(),
          draw: latestDraw ? mapBackendDraw(latestDraw) : null,
          totalWinnings: 0,
          balance: Number(settledResult.balance || 0),
          tickets: (ticketResult.tickets || []).map(mapBackendTicket),
          draws: settledRounds.map(mapBackendDraw).reverse(),
        },
      });
    }

    return NextResponse.json({ ok: true, payload: fastKenoService.settle(body) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Settle failed.' }, { status: 400 });
  }
}
