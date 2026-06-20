import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type TicketStatus = 'Waiting' | 'Won' | 'Missed';

export interface FastKenoTicket {
  id: string;
  userId: string;
  drawId: string;
  selectedNumbers: number[];
  betAmount: number;
  timestamp: string;
  status: TicketStatus;
  winAmount?: number;
  matchedCount?: number;
  matchedNumbers?: number[];
}

export interface FastKenoDraw {
  drawId: string;
  time: string;
  combination: number[];
  seedHash: string;
  settledAt: string;
}

interface FastKenoState {
  balances: Record<string, number>;
  tickets: FastKenoTicket[];
  draws: FastKenoDraw[];
}

const DATA_DIR = process.env.FAST_KENO_DATA_DIR || path.join(os.tmpdir(), 'fast-keno');
const DATA_FILE = path.join(DATA_DIR, 'fast-keno.json');
const DEFAULT_BALANCE = 10000;
const WAIT_SECONDS = 60;
const POP_SECONDS = 30;
const ROUND_SECONDS = WAIT_SECONDS + POP_SECONDS;
let memoryState: FastKenoState | null = null;

const ENCRYPTED_PAY_TABLE = {
  iv: 'MjAyNDA2MTZmYXN0a2Vu',
  content:
    'jERAqpo+Y0t7MmExh+cYia8cFf/eNOpX3BN/xzB0yxuMbXvkBzHJOyos80J1K7lliqznyPvrxDQymIqJLGORp3WOTzzv4817m8eZk74BO8IPjsooYjlopod/1A/Gn3oAyL1fn2+jBrZCPdy6A8GHcdKjz/vO2H2nobpDi5gliY9/1lCSWl2r53AN3LGS46pl/S6LxxCzw4rtdJdG11GaFrsAn4KfwlBrvVbwNj34GcxLB3o5p4V6uyhAAjyEbghG3mdA7joIbGFXlPfObGEPSl9fSBt2hTvG9I3Zu5N6/vElT7KfFkMmx7W7en9l6uC+Bu51VxBFIEMH64HQSWQevKMhF0+M8sl/l/HX8/uiE1YU5ai81TtTYbEAyPl6HEc08re/9E3UoBLZlukcrN18ImYlPr9yBexwVjbapyAMLGzcbL1syndKsLgscW2MvD1L+TnG+XHk2pKjpNBdr8LuQ4VZn6hkkl9Ppb2Ulg==',
  tag: 'DBIl0GO36P81MKVuaVNR1w==',
};

function getPayTable() {
  const defaultKeySeed = 'fast-keno-paytable-v1';
  const keySeeds = [process.env.FAST_KENO_PAYTABLE_KEY, defaultKeySeed]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  for (const keySeed of keySeeds) {
    try {
      const key = crypto.createHash('sha256').update(keySeed).digest();
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ENCRYPTED_PAY_TABLE.iv, 'base64')
      );

      decipher.setAuthTag(Buffer.from(ENCRYPTED_PAY_TABLE.tag, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ENCRYPTED_PAY_TABLE.content, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      return JSON.parse(decrypted) as Record<number, Record<number, number>>;
    } catch {
      // Try the built-in key if production has a stale or mismatched override.
    }
  }

  throw new Error('Fast Keno pay table could not be loaded.');
}

const PAY_TABLE = getPayTable();

function readState(): FastKenoState {
  if (memoryState) {
    return memoryState;
  }

  if (!fs.existsSync(DATA_FILE)) {
    return { balances: {}, tickets: [], draws: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as FastKenoState;
  } catch {
    return { balances: {}, tickets: [], draws: [] };
  }
}

function writeState(state: FastKenoState) {
  memoryState = state;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Some production runtimes only allow ephemeral or no filesystem writes.
  }
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function getDrawId(now = Date.now()) {
  return String(Math.floor(now / (ROUND_SECONDS * 1000)));
}

function getRound(now = Date.now()) {
  const drawId = getDrawId(now);
  const startsAt = Number(drawId) * ROUND_SECONDS * 1000;
  const closesAt = startsAt + WAIT_SECONDS * 1000;
  const endsAt = startsAt + ROUND_SECONDS * 1000;

  return {
    drawId,
    startsAt: new Date(startsAt).toISOString(),
    closesAt: new Date(closesAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    secondsRemaining: Math.max(0, Math.ceil((closesAt - now) / 1000)),
  };
}

function normalizeNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('Select at least one number.');
  }

  const selected = value.map(Number);
  const unique = Array.from(new Set(selected)).sort((a, b) => a - b);

  if (selected.length === 0 || selected.length > 10) {
    throw new Error('Select between 1 and 10 numbers.');
  }

  if (unique.length !== selected.length || unique.some((n) => !Number.isInteger(n) || n < 1 || n > 80)) {
    throw new Error('Numbers must be unique values from 1 to 80.');
  }

  return unique;
}

function drawNumbers(drawId: string) {
  const seed = `fast-keno:${drawId}`;
  const seedHash = crypto.createHash('sha256').update(seed).digest('hex');
  const pool = Array.from({ length: 80 }, (_, index) => index + 1);
  let numericSeed = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    numericSeed ^= seed.charCodeAt(i);
    numericSeed = Math.imul(numericSeed, 16777619);
  }

  const seededRandom = () => {
    numericSeed += 0x6d2b79f5;
    let value = numericSeed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return {
    seedHash,
    combination: pool.slice(0, 20).sort((a, b) => a - b),
  };
}

function publicTickets(state: FastKenoState, userId: string) {
  return state.tickets.filter((ticket) => ticket.userId === userId).slice(-50).reverse();
}

function syncBalance(state: FastKenoState, userId: string, seededBalance?: number | null) {
  if (state.balances[userId] === undefined && Number.isFinite(seededBalance)) {
    state.balances[userId] = money(Number(seededBalance));
    writeState(state);
    return;
  }

  if (state.balances[userId] === undefined) {
    state.balances[userId] = DEFAULT_BALANCE;
    writeState(state);
  }
}

export const fastKenoService = {
  current(userId = 'demo', seededBalance?: number | null) {
    const state = readState();
    syncBalance(state, userId, seededBalance);

    return {
      round: getRound(),
      balance: money(state.balances[userId]),
      tickets: publicTickets(state, userId),
      draws: state.draws.slice(-25).reverse(),
      payTable: PAY_TABLE,
    };
  },

  placeBet(input: { userId?: string; selectedNumbers: unknown; betAmount: unknown }) {
    const userId = String(input.userId || 'demo');
    const selectedNumbers = normalizeNumbers(input.selectedNumbers);
    const betAmount = money(Number(input.betAmount));

    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      throw new Error('Bet amount must be greater than zero.');
    }

    const state = readState();
    syncBalance(state, userId, null);

    if (state.balances[userId] < betAmount) {
      throw new Error('Insufficient balance.');
    }

    const round = getRound();
    const ticket: FastKenoTicket = {
      id: `FK-${Date.now()}-${crypto.randomInt(1000, 9999)}`,
      userId,
      drawId: round.drawId,
      selectedNumbers,
      betAmount,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'Waiting',
    };

    state.balances[userId] = money(state.balances[userId] - betAmount);
    state.tickets.push(ticket);
    writeState(state);

    return {
      round,
      ticket,
      balance: money(state.balances[userId]),
      tickets: publicTickets(state, userId),
    };
  },

  settle(input: { userId?: string; drawId?: string }) {
    const userId = String(input.userId || 'demo');
    const drawId = String(input.drawId || getDrawId());
    const state = readState();
    syncBalance(state, userId, null);

    let draw = state.draws.find((item) => item.drawId === drawId);
    if (!draw) {
      const result = drawNumbers(drawId);
      draw = {
        drawId,
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        combination: result.combination,
        seedHash: result.seedHash,
        settledAt: new Date().toISOString(),
      };
      state.draws.push(draw);
    }

    let totalWinnings = 0;
    state.tickets = state.tickets.map((ticket) => {
      if (ticket.userId !== userId || ticket.drawId !== drawId || ticket.status !== 'Waiting') {
        return ticket;
      }

      const matchedNumbers = ticket.selectedNumbers.filter((n) => draw.combination.includes(n));
      const matchedCount = matchedNumbers.length;
      const multiplier = PAY_TABLE[ticket.selectedNumbers.length]?.[matchedCount] || 0;
      const winAmount = money(ticket.betAmount * multiplier);

      if (winAmount > 0) {
        totalWinnings = money(totalWinnings + winAmount);
      }

      return {
        ...ticket,
        status: winAmount > 0 ? 'Won' : 'Missed',
        winAmount,
        matchedCount,
        matchedNumbers,
      };
    });

    state.balances[userId] = money(state.balances[userId] + totalWinnings);
    writeState(state);

    return {
      draw,
      totalWinnings,
      balance: money(state.balances[userId]),
      tickets: publicTickets(state, userId),
      draws: state.draws.slice(-25).reverse(),
    };
  },
};
