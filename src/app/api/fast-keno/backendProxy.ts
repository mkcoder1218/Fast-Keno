const DEFAULT_BACKEND_API_BASE = 'https://api.king5.bet/api';

export function getBackendApiBase(value?: string | null) {
  const raw = String(
    value ||
      process.env.FAST_KENO_BACKEND_API_BASE_URL ||
      process.env.BACKEND_API_BASE_URL ||
      DEFAULT_BACKEND_API_BASE
  ).trim();
  const base = raw.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${base}/api`;
}

export async function backendRequest(path: string, token: string, init: RequestInit = {}, backendApiBase?: string | null) {
  const res = await fetch(`${getBackendApiBase(backendApiBase)}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || Number(data?.code) !== 0) {
    throw new Error(data?.message || data?.msg || 'Fast Keno backend request failed.');
  }
  return data.payload;
}

export function getAuthToken(value: unknown) {
  const token = String(value || '').trim();
  return token || null;
}

export function mapBackendRound(round: any) {
  const startsAtMs = round?.startsAt ? new Date(round.startsAt).getTime() : NaN;
  const closesAtMs = new Date(round?.closesAt || Date.now()).getTime();
  const normalizedClosesAtMs = Number.isFinite(startsAtMs)
    ? startsAtMs + 60 * 1000
    : closesAtMs;
  const endsAtMs = Number.isFinite(startsAtMs)
    ? startsAtMs + 90 * 1000
    : normalizedClosesAtMs + 30 * 1000;
  const secondsRemaining = Math.max(0, Math.ceil((normalizedClosesAtMs - Date.now()) / 1000));

  return {
    drawId: String(round?.roundNumber || round?.id || ''),
    id: round?.id,
    startsAt: round?.startsAt,
    closesAt: new Date(normalizedClosesAtMs).toISOString(),
    endsAt: round?.endsAt || new Date(endsAtMs).toISOString(),
    secondsRemaining: Math.min(secondsRemaining, 60),
  };
}

export function mapBackendTicket(ticket: any) {
  const status = String(ticket?.status || '').toLowerCase();
  return {
    id: String(ticket?.id || ticket?.ticketNumber || ''),
    drawId: String(ticket?.roundNumber || ticket?.roundId || ''),
    selectedNumbers: Array.isArray(ticket?.selectedNumbers) ? ticket.selectedNumbers : [],
    betAmount: Number(ticket?.stake || 0),
    timestamp: ticket?.createdAt
      ? new Date(ticket.createdAt).toLocaleTimeString('en-US', { hour12: false })
      : new Date().toLocaleTimeString('en-US', { hour12: false }),
    status: status === 'won' ? 'Won' : status === 'lost' ? 'Missed' : 'Waiting',
    winAmount: Number(ticket?.payout || 0),
    matchedCount: ticket?.hits ?? undefined,
    matchedNumbers: Array.isArray(ticket?.matchedNumbers) ? ticket.matchedNumbers : [],
    isMine: true,
  };
}

export function mapBackendDraw(round: any) {
  const drawId = String(round?.roundNumber || round?.id || '');
  return {
    drawId,
    time: round?.settledAt
      ? new Date(round.settledAt).toLocaleTimeString('en-US', { hour12: false })
      : new Date().toLocaleTimeString('en-US', { hour12: false }),
    combination: Array.isArray(round?.drawNumbers) ? round.drawNumbers.map(Number) : [],
  };
}
