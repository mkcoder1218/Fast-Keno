const DEFAULT_BACKEND_API_BASE = 'https://api.king5.bet/api';

function createSeededRandom(seedText: string) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getDrawCombination(drawId: string) {
  const random = createSeededRandom(`fast-keno:${drawId}`);
  const pool = Array.from({ length: 80 }, (_, index) => index + 1);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 20).sort((a, b) => a - b);
}

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
  const closesAtMs = new Date(round?.closesAt || Date.now()).getTime();
  return {
    drawId: String(round?.roundNumber || round?.id || ''),
    id: round?.id,
    startsAt: round?.startsAt,
    closesAt: round?.closesAt,
    secondsRemaining: Math.max(0, Math.ceil((closesAtMs - Date.now()) / 1000)),
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
    combination: drawId ? getDrawCombination(drawId) : [],
  };
}
