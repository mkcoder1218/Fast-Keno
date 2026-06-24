import { NextResponse } from 'next/server';
import { backendRequest, getAuthToken, mapBackendDraw, mapBackendTicket } from '../backendProxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(body?.authToken);
    if (!authToken) {
      return NextResponse.json({ ok: false, message: 'King 5 login required.' }, { status: 401 });
    }
    const settledResult = await backendRequest(
      '/games/fast-keno/settle',
      authToken,
      { method: 'POST', body: JSON.stringify({}) }
    );
    // Fetch tickets only after settlement commits, otherwise winning tickets can
    // still arrive as "Waiting" and suppress the result message.
    const ticketResult = await backendRequest('/games/fast-keno/tickets?limit=50', authToken);
      const settledRounds = settledResult.settled || [];
      const requestedDrawId = body?.drawId ? String(body.drawId) : '';
      const latestDraw = requestedDrawId
        ? settledRounds.find((round: any) => String(round?.roundNumber || round?.id || '') === requestedDrawId) || null
        : settledRounds[settledRounds.length - 1];
      const mappedTickets = (ticketResult.tickets || []).map(mapBackendTicket);
      const settledDrawIds = new Set([
        requestedDrawId,
        latestDraw?.roundNumber ? String(latestDraw.roundNumber) : '',
        latestDraw?.id ? String(latestDraw.id) : '',
      ].filter(Boolean));
      const totalWinnings = mappedTickets
        .filter((ticket: any) => settledDrawIds.has(String(ticket.drawId)) && ticket.status === 'Won')
        .reduce((sum: number, ticket: any) => sum + Number(ticket.winAmount || 0), 0);

      return NextResponse.json({
        ok: true,
        payload: {
          serverTime: new Date().toISOString(),
          draw: latestDraw ? mapBackendDraw(latestDraw) : null,
          totalWinnings,
          balance: Number(settledResult.balance || 0),
          tickets: mappedTickets,
          draws: settledRounds.map(mapBackendDraw).reverse(),
        },
      });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Settle failed.' }, { status: 401 });
  }
}
