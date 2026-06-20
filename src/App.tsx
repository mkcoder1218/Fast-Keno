/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import { Ticket, DrawResult, Leader, HotColdNumber } from './types';
import { 
  INITIAL_DRAWS, 
  INITIAL_TICKETS, 
  INITIAL_LEADERS, 
  HOT_NUMBERS, 
  COLD_NUMBERS,
  generateRandomCombination,
  DEFAULT_PAY_TABLE,
  getMultiplier
} from './data';
import { PayTable } from './types';
import { 
  playTickSound, 
  playWinSound, 
  playLossSound, 
  playClickSound,
  playSelectSound,
  playDeselectSound
} from './audio';

function getFastKenoSocketUrl(backendApiBase?: string, explicitSocketUrl?: string) {
  const rawSocketUrl = explicitSocketUrl || process.env.NEXT_PUBLIC_FAST_KENO_SOCKET_URL || '';
  if (rawSocketUrl.trim()) {
    return rawSocketUrl.trim();
  }

  const rawApiBase = backendApiBase || process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || 'https://api.king5.bet/api';
  try {
    const url = new URL(rawApiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = url.pathname.replace(/\/api\/?$/i, '');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/api/games/fast-keno/socket`;
    url.search = '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeSocketTicket(raw: any): Ticket | null {
  if (!raw) return null;
  const selectedNumbers = Array.isArray(raw.selectedNumbers) ? raw.selectedNumbers.map(Number) : [];
  const id = raw.id || raw.ticketNumber;
  if (!id || selectedNumbers.length === 0) return null;

  const status = String(raw.status || 'Waiting').toLowerCase();
  return {
    id: String(id),
    userId: raw.userId ? String(raw.userId) : undefined,
    selectedNumbers,
    betAmount: Number(raw.betAmount ?? raw.stake ?? 0),
    timestamp: raw.timestamp || raw.createdAt
      ? new Date(raw.timestamp || raw.createdAt).toLocaleTimeString('en-US', { hour12: false })
      : new Date().toLocaleTimeString('en-US', { hour12: false }),
    status: status === 'won' ? 'Won' : status === 'lost' || status === 'missed' ? 'Missed' : 'Waiting',
    winAmount: Number(raw.winAmount ?? raw.payout ?? 0),
    drawId: String(raw.drawId || raw.roundId || raw.roundNumber || ''),
    matchedCount: raw.matchedCount ?? raw.hits,
    matchedNumbers: Array.isArray(raw.matchedNumbers) ? raw.matchedNumbers.map(Number) : [],
    isMine: raw.isMine,
    receivedAt: Date.now(),
  };
}

export default function App() {
  const DRAW_COUNT = 20;
  const DRAW_SECONDS = 60;
  const launchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const launchUserId = launchParams?.get('userId') || '881426785';
  const launchBalance = Number(launchParams?.get('balance') || 90.37);
  const launchAuthToken = launchParams?.get('authToken') || '';
  const launchBackendApiBase = launchParams?.get('backendApiBase') || '';
  const launchSocketUrl = launchParams?.get('fastKenoSocketUrl') || launchParams?.get('socketUrl') || '';
  const isEmbeddedInKing5 = launchParams?.get('embedded') === 'king5';
  const shortUserId = launchUserId.length > 8 ? launchUserId.slice(-8) : launchUserId;

  // Gameplay States
  const [balance, setBalance] = useState<number>(Number.isFinite(launchBalance) ? launchBalance : 90.37);
  const [userId] = useState<string>(launchUserId);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [drawResults, setDrawResults] = useState<DrawResult[]>(INITIAL_DRAWS);
  const [leaders, setLeaders] = useState<Leader[]>(INITIAL_LEADERS);
  const [payTable, setPayTable] = useState<PayTable>(DEFAULT_PAY_TABLE);
  
  // Selection States
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<number>(2);
  const [activeNavItem, setActiveNavItem] = useState<string>('GAMES');
  const [placingTicketIds, setPlacingTicketIds] = useState<string[]>([]);
  const [betAcceptedFlash, setBetAcceptedFlash] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // Viewport states for mobile flexibility
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [mobileActiveTab, setMobileActiveTab] = useState<'GAME' | 'HISTORY' | 'RESULTS' | 'STATISTICS' | 'LEADERS'>('GAME');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Stats Counters
  const [hotNumbers, setHotNumbers] = useState<HotColdNumber[]>(HOT_NUMBERS);
  const [coldNumbers, setColdNumbers] = useState<HotColdNumber[]>(COLD_NUMBERS);

  // Timer & Ball Extraction State
  const [countdown, setCountdown] = useState<number>(DRAW_SECONDS);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isPlacingBet, setIsPlacingBet] = useState<boolean>(false);
  const [activeDrawnNumbers, setActiveDrawnNumbers] = useState<number[]>([]);
  const [visibleDrawnNumbers, setVisibleDrawnNumbers] = useState<number[]>([]);
  const [currentDrawId, setCurrentDrawId] = useState<string>('8024922');
  const activeTicketHighlightNumbers = useMemo(
    () => Array.from(new Set([
      ...selectedNumbers,
      ...tickets
        .filter((ticket) => ticket.isMine !== false && ticket.status === 'Waiting')
        .flatMap((ticket) => ticket.selectedNumbers),
    ])),
    [selectedNumbers, tickets]
  );
  const ticketDrawHighlights = isDrawing ? visibleDrawnNumbers : [];

  // Timer Ref to manage draw interval
  const ballTimerRef = useRef<NodeJS.Timeout | null>(null);
  const settledRoundRef = useRef<any>(null);

  const syncParentWallet = (nextBalance: number) => {
    if (typeof window === 'undefined' || window.parent === window) return;
    if (!Number.isFinite(nextBalance)) return;
    window.parent.postMessage(
      {
        type: 'fast-keno-wallet-sync',
        payload: { userId, balance: nextBalance },
      },
      '*'
    );
  };

  const mergeTickets = (nextTickets: Ticket[]) => {
    setTickets((prev) => {
      const byId = new Map<string, Ticket>();
      [...prev, ...nextTickets].forEach((ticket) => {
        const existing = byId.get(ticket.id);
        byId.set(ticket.id, {
          ...existing,
          ...ticket,
          receivedAt: ticket.receivedAt ?? existing?.receivedAt ?? Date.now(),
        });
      });
      return Array.from(byId.values()).sort((a, b) => {
        if (a.status === 'Waiting' && b.status !== 'Waiting') return -1;
        if (a.status !== 'Waiting' && b.status === 'Waiting') return 1;
        if (a.status === 'Waiting' && b.status === 'Waiting') {
          const receivedDiff = Number(b.receivedAt || 0) - Number(a.receivedAt || 0);
          if (receivedDiff !== 0) return receivedDiff;
          const betDiff = Number(b.betAmount || 0) - Number(a.betAmount || 0);
          if (betDiff !== 0) return betDiff;
        }
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      });
    });
  };

  const makeOtherPlayerTickets = (drawId: string, count = 5): Ticket[] => (
    Array.from({ length: count }).map((_, index) => ({
      id: `other-${drawId}-${index}-${Date.now()}`,
      userId: `ET***${Math.floor(10 + Math.random() * 89)}`,
      selectedNumbers: generateRandomCombination(5 + Math.floor(Math.random() * 5), 1, 80),
      betAmount: [20, 50, 100, 200][Math.floor(Math.random() * 4)],
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'Waiting',
      winAmount: 0,
      drawId,
      isMine: false,
      receivedAt: Date.now() + index,
    }))
  );

  const ensureOtherPlayerTickets = (drawId: string, count = 5) => {
    setTickets((prev) => {
      const activeOtherCount = prev.filter(
        (ticket) => ticket.isMine === false && ticket.status === 'Waiting' && ticket.drawId === drawId
      ).length;

      if (activeOtherCount >= count) {
        return prev;
      }

      const byId = new Map<string, Ticket>();
      [...prev, ...makeOtherPlayerTickets(drawId, count - activeOtherCount)].forEach((ticket) => {
        byId.set(ticket.id, ticket);
      });

      return Array.from(byId.values()).sort((a, b) => {
        if (a.status === 'Waiting' && b.status !== 'Waiting') return -1;
        if (a.status !== 'Waiting' && b.status === 'Waiting') return 1;
        if (a.status === 'Waiting' && b.status === 'Waiting') {
          const receivedDiff = Number(b.receivedAt || 0) - Number(a.receivedAt || 0);
          if (receivedDiff !== 0) return receivedDiff;
          const betDiff = Number(b.betAmount || 0) - Number(a.betAmount || 0);
          if (betDiff !== 0) return betDiff;
        }
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      });
    });
  };

  // Bulletproof cleanup of active timers on unmount
  useEffect(() => {
    return () => {
      if (ballTimerRef.current) {
        clearInterval(ballTimerRef.current);
        ballTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isDrawing || !currentDrawId || isSocketConnected) return;

    ensureOtherPlayerTickets(currentDrawId, 5);
    const timer = window.setInterval(() => {
      ensureOtherPlayerTickets(currentDrawId, 5);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [currentDrawId, isDrawing, isSocketConnected]);

  const triggerToast = (_text: string, _type: 'success' | 'info' | 'error' = 'info') => {};

  useEffect(() => {
    let mounted = true;

    const currentParams = new URLSearchParams({ userId });
    if (launchAuthToken) {
      currentParams.set('authToken', launchAuthToken);
    }
    if (launchBackendApiBase) {
      currentParams.set('backendApiBase', launchBackendApiBase);
    }
    if (Number.isFinite(launchBalance)) {
      currentParams.set('balance', String(launchBalance));
    }

    fetch(`/api/fast-keno/current?${currentParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted || !data?.ok) return;
        const payload = data.payload;
        if (payload.balance !== null && payload.balance !== undefined) {
          setBalance(payload.balance);
          syncParentWallet(Number(payload.balance));
        }
        setTickets([
          ...(payload.tickets || []).map((ticket: Ticket, index: number) => ({
            ...ticket,
            receivedAt: Date.now() + index,
          })),
          ...makeOtherPlayerTickets(String(payload.round.drawId), 4),
        ]);
        setDrawResults(payload.draws.length ? payload.draws.map((draw: any) => ({
          drawId: draw.drawId,
          time: draw.time,
          combination: draw.combination,
        })) : INITIAL_DRAWS);
        if (payload.payTable) {
          setPayTable(payload.payTable);
        }
        setCurrentDrawId(payload.round.drawId);
        setCountdown(Math.max(1, Math.min(DRAW_SECONDS, Number(payload.round.secondsRemaining || DRAW_SECONDS))));
      })
      .catch(() => {
        triggerToast('Local Fast Keno service is not reachable yet.', 'error');
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socketUrl = getFastKenoSocketUrl(launchBackendApiBase, launchSocketUrl);
    if (!socketUrl) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByCleanup = false;

    const connect = () => {
      try {
        const url = new URL(socketUrl);
        url.searchParams.set('userId', userId);
        if (launchAuthToken) {
          url.searchParams.set('authToken', launchAuthToken);
        }

        socket = new WebSocket(url.toString());

        socket.addEventListener('open', () => {
          setIsSocketConnected(true);
          socket?.send(JSON.stringify({
            type: 'subscribe',
            game: 'fast-keno',
            userId,
            authToken: launchAuthToken || undefined,
          }));
          socket?.send(JSON.stringify({
            event: 'subscribe',
            channel: 'games.fast-keno.tickets',
            userId,
            authToken: launchAuthToken || undefined,
          }));
        });

        socket.addEventListener('message', (event) => {
          let message: any;
          try {
            message = JSON.parse(String(event.data));
          } catch {
            return;
          }

          const payload = message.payload || message.data || message;
          const rawTickets = Array.isArray(payload.tickets)
            ? payload.tickets
            : Array.isArray(payload.bets)
            ? payload.bets
            : Array.isArray(payload.publicTickets)
            ? payload.publicTickets
            : Array.isArray(payload)
            ? payload
            : payload.ticket
            ? [payload.ticket]
            : payload.bet
            ? [payload.bet]
            : [];
          const nextTickets = rawTickets
            .map(normalizeSocketTicket)
            .filter((ticket): ticket is Ticket => Boolean(ticket))
            .map((ticket) => ({
              ...ticket,
              isMine: ticket.isMine ?? (ticket.userId ? String(ticket.userId) === userId : undefined),
            }));

          if (nextTickets.length) {
            mergeTickets(nextTickets);
          }

          const round = payload.round || payload.currentRound;
          if (round?.drawId || round?.roundNumber || round?.id) {
            setCurrentDrawId(String(round.drawId || round.roundNumber || round.id));
          }
          if (round?.secondsRemaining !== undefined) {
            setCountdown(Math.max(1, Math.min(DRAW_SECONDS, Number(round.secondsRemaining || DRAW_SECONDS))));
          }
          if (payload.balance !== undefined && payload.balance !== null) {
            const nextBalance = Number(payload.balance);
            if (Number.isFinite(nextBalance)) {
              setBalance(nextBalance);
              syncParentWallet(nextBalance);
            }
          }
        });

        socket.addEventListener('close', () => {
          setIsSocketConnected(false);
          if (closedByCleanup) return;
          reconnectTimer = window.setTimeout(connect, 2500);
        });
        socket.addEventListener('error', () => {
          setIsSocketConnected(false);
        });
      } catch {
        reconnectTimer = window.setTimeout(connect, 2500);
      }
    };

    connect();

    return () => {
      closedByCleanup = true;
      setIsSocketConnected(false);
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [userId, launchAuthToken, launchBackendApiBase, launchSocketUrl]);

  // Countdown timer ticking trigger
  useEffect(() => {
    if (isDrawing) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerLiveDrawing();
          return 0;
        }
        if (prev <= 6) {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDrawing, currentDrawId]);

  // Performs 20 numbers drawing sequentially
  const triggerLiveDrawing = async () => {
    // If a drawing loop is already active, do NOT start another!
    if (ballTimerRef.current) {
      return;
    }
    setIsDrawing(true);
    setActiveDrawnNumbers([]);
    setVisibleDrawnNumbers([]);
    
    let fullCombination = generateRandomCombination(20, 1, 80);
    settledRoundRef.current = null;

    const settleController = new AbortController();
    const settleTimeout = window.setTimeout(() => settleController.abort(), 1500);

    try {
      const res = await fetch('/api/fast-keno/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: settleController.signal,
        body: JSON.stringify({
          userId,
          drawId: currentDrawId,
          authToken: launchAuthToken,
          backendApiBase: launchBackendApiBase,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Draw failed');

      settledRoundRef.current = data.payload;
      if (Array.isArray(data.payload?.draw?.combination)) {
        fullCombination = data.payload.draw.combination;
      }
    } catch (error) {
      settledRoundRef.current = null;
      triggerToast(
        error instanceof Error && error.name !== 'AbortError'
          ? error.message
          : 'Draw service is slow, using local draw.',
        'error'
      );
    } finally {
      window.clearTimeout(settleTimeout);
    }
    setActiveDrawnNumbers(fullCombination.slice(0, DRAW_COUNT));
  };

  // Finalizes round, evaluates win/loss statuses
  const finalizeDrawRound = (combination: number[]) => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    const newDrawRecord: DrawResult = {
      drawId: currentDrawId,
      time: timeNow,
      combination: [...combination].sort((a, b) => a - b),
    };
    
    setDrawResults((prev) => {
      if (prev.some((r) => r.drawId === currentDrawId)) {
        return prev;
      }
      return [newDrawRecord, ...prev];
    });

    const serviceResult = settledRoundRef.current;
    let totalWinnings = Number(serviceResult?.totalWinnings || 0);
    let totalMatchedTickets = Array.isArray(serviceResult?.tickets)
      ? serviceResult.tickets.filter((t: Ticket) => t.drawId === currentDrawId).length
      : 0;

    if (serviceResult) {
      const nextBalance = Number(serviceResult.balance);
      if (Number.isFinite(nextBalance)) {
        setBalance(nextBalance);
        syncParentWallet(nextBalance);
      }
      mergeTickets(serviceResult.tickets);
      setTickets((prevTickets) => prevTickets.map((t) => {
        if (t.isMine !== false || t.status !== 'Waiting' || t.drawId !== currentDrawId) return t;
        const matchedNumbers = t.selectedNumbers.filter((n) => combination.includes(n));
        const matchedCount = matchedNumbers.length;
        const multiplier = getMultiplier(payTable, t.selectedNumbers.length, matchedCount);
        const winAmount = Math.round(t.betAmount * multiplier);
        return {
          ...t,
          status: winAmount > 0 ? 'Won' : 'Missed',
          winAmount,
          matchedCount,
          matchedNumbers,
        };
      }));
      setDrawResults(serviceResult.draws.map((draw: any) => ({
        drawId: draw.drawId,
        time: draw.time,
        combination: draw.combination,
      })));
    } else {
      setTickets((prevTickets) => {
        return prevTickets.map((t) => {
          if (t.status !== 'Waiting' || t.drawId !== currentDrawId) return t;

          const matchedNumbers = t.selectedNumbers.filter((n) => combination.includes(n));
          const matchedCount = matchedNumbers.length;
          const multiplier = getMultiplier(payTable, t.selectedNumbers.length, matchedCount);
          const winAmount = Math.round(t.betAmount * multiplier);

          totalWinnings += winAmount;
          totalMatchedTickets++;

          return {
            ...t,
            status: winAmount > 0 ? 'Won' : 'Missed',
            winAmount,
            matchedCount,
            matchedNumbers,
          };
        });
      });

      if (totalWinnings > 0) {
        setBalance((prev) => prev + totalWinnings);
      }
    }

    if (totalWinnings > 0) {
      playWinSound();
      triggerToast(
        `🏆 Dynamic Win! You received +${totalWinnings.toLocaleString('en-US')} ETB on your bets!`,
        'success'
      );
    } else if (totalMatchedTickets > 0) {
      playLossSound();
    } else {
      triggerToast(`⭐ Round #${currentDrawId} completed successfully. Ready for new bets!`, 'info');
    }

    updateStatistics(combination);
    simulateLeaderboardActivity(combination);
    setActiveDrawnNumbers([]);
    setVisibleDrawnNumbers([]);
    const nextDrawId = String(Number(currentDrawId) + 1);
    setCurrentDrawId(nextDrawId);
    setCountdown(DRAW_SECONDS);
    ensureOtherPlayerTickets(nextDrawId, 5);
    setIsDrawing(false);

    const nextRoundParams = new URLSearchParams({ userId });
    if (launchAuthToken) {
      nextRoundParams.set('authToken', launchAuthToken);
    }
    if (launchBackendApiBase) {
      nextRoundParams.set('backendApiBase', launchBackendApiBase);
    }

    fetch(`/api/fast-keno/current?${nextRoundParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.ok) return;
        if (Array.isArray(data.payload.tickets)) {
          mergeTickets(data.payload.tickets.map((ticket: Ticket, index: number) => ({
            ...ticket,
            receivedAt: Date.now() + index,
          })));
        }
      })
      .catch(() => {
        ensureOtherPlayerTickets(nextDrawId, 5);
      });
  };

  const updateStatistics = (newCombo: number[]) => {
    setHotNumbers((prevHot) => {
      return prevHot.map((hn) => {
        const hit = newCombo.includes(hn.num);
        return {
          num: hn.num,
          frequency: hit ? hn.frequency + 1 : hn.frequency,
        };
      }).sort((a, b) => b.frequency - a.frequency);
    });

    setColdNumbers((prevCold) => {
      return prevCold.map((cn) => {
        const hit = newCombo.includes(cn.num);
        const drift = Math.random() > 0.85 ? 1 : 0;
        return {
          num: cn.num,
          frequency: hit ? cn.frequency + drift : cn.frequency,
        };
      }).sort((a, b) => a.frequency - b.frequency);
    });
  };

  const simulateLeaderboardActivity = (combo: number[]) => {
    if (Math.random() > 0.4) {
      const luckyPlayer = 'ET***' + Math.floor(10 + Math.random() * 89);
      const randomStake = [100, 200, 500, 1000][Math.floor(Math.random() * 4)];
      const matches = Math.floor(2 + Math.random() * 6);
      const multiVal = getMultiplier(payTable, 8, matches);
      const totalWin = randomStake * (multiVal || 1);

      if (totalWin > 0) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        const newLeader: Leader = {
          rank: 1,
          userId: luckyPlayer,
          winAmount: totalWin,
          betAmount: randomStake,
          multiplier: 'x' + (multiVal || 1),
          time: timeStr
        };

        setLeaders((prev) => {
          const unsorted = [newLeader, ...prev.slice(0, 9)];
          return unsorted
            .sort((a, b) => b.winAmount - a.winAmount)
            .map((item, idx) => ({ ...item, rank: idx + 1 }));
        });
      }
    }
  };

  const handleToggleNumber = (num: number) => {
    if (isDrawing) {
      triggerToast('⚠️ Selections locked during draw phase!', 'error');
      return;
    }

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers((prev) => prev.filter((n) => n !== num));
      playDeselectSound();
    } else {
      if (selectedNumbers.length >= 10) {
        triggerToast('⚠️ A maximum of 10 numbers may be chosen.', 'error');
        return;
      }
      setSelectedNumbers((prev) => [...prev, num].sort((a, b) => a - b));
      playSelectSound();
    }
  };

  const handleClearSelectedNumbers = () => {
    playClickSound();
    setSelectedNumbers([]);
  };

  const handleAutoPick = (count: number) => {
    playClickSound();
    if (isDrawing) return;
    const randoms = generateRandomCombination(count, 1, 80);
    setSelectedNumbers(randoms);
    triggerToast(`⚡ Selected ${count} numbers automatically!`, 'info');
  };

  const handlePlaceBet = async () => {
    if (isDrawing || isPlacingBet) return;
    if (selectedNumbers.length === 0) {
      triggerToast('⚠️ Select some numbers to bet on first!', 'info');
      return;
    }

    if (balance < betAmount) {
      triggerToast('❌ Insufficient balance! Click the top funds pill to reload sandbox funds.', 'error');
      return;
    }

    const placedNumbers = [...selectedNumbers];

    try {
      setIsPlacingBet(true);
      const res = await fetch('/api/fast-keno/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedNumbers: placedNumbers,
          betAmount,
          authToken: launchAuthToken,
          backendApiBase: launchBackendApiBase,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Bet failed');

      const nextBalance = Number(data.payload.balance);
      if (Number.isFinite(nextBalance)) {
        setBalance(nextBalance);
        syncParentWallet(nextBalance);
      }
      mergeTickets([
        ...(data.payload.tickets || []).map((ticket: Ticket, index: number) => ({
          ...ticket,
          isMine: ticket.isMine ?? true,
          receivedAt: Date.now() + index,
        })),
        ...(data.payload.ticket ? [{
          ...data.payload.ticket,
          isMine: true,
          receivedAt: Date.now() + 1000,
        }] : []),
      ].map((ticket: Ticket) => ({
        ...ticket,
      })));
      setCurrentDrawId(data.payload.round.drawId);
      setSelectedNumbers([]);
      setBetAcceptedFlash(true);
      window.setTimeout(() => {
        setBetAcceptedFlash(false);
      }, 1400);
      if (data.payload.ticket?.id) {
        const nextTicketId = String(data.payload.ticket.id);
        setPlacingTicketIds((prev) => [...prev.filter((id) => id !== nextTicketId), nextTicketId]);
        window.setTimeout(() => {
          setPlacingTicketIds((prev) => prev.filter((id) => id !== nextTicketId));
        }, 5000);
      }
      triggerToast(`Stake of ${betAmount} placed successfully for Draw #${data.payload.round.drawId}!`, 'success');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Bet failed on local service.', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleClearHistory = () => {
    playClickSound();
    setTickets((prev) => prev.filter((t) => t.status === 'Waiting'));
    triggerToast('🧹 Ticket history cleared.', 'info');
  };

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    window.parent.postMessage(
      {
        type: 'fast-keno-wallet-sync',
        payload: { userId, balance },
      },
      '*'
    );
  }, [balance, userId]);

  const handleSelectHistoricCombination = (combination: number[]) => {
    if (isDrawing) return;
    playClickSound();
    setSelectedNumbers(combination.slice(0, 10));
    triggerToast('🔍 Loaded draws combination into selection board.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#070d0e] bg-[radial-gradient(circle_at_center,rgba(5,38,32,0.45)_0%,rgba(8,12,14,1)_75%)] text-white relative flex flex-col items-center justify-start overflow-x-hidden font-sans">
      
      {/* Top 45px Mobile header (hidden when King5 provides the wallet/header) */}
      {isMobile && !isEmbeddedInKing5 && (
        <div className="w-full h-[45px] bg-[#11191a] border-b border-[#1e2a2c] flex items-center justify-between gap-2 px-3 shrink-0 z-30" id="mobile-top-header">
          {/* FASTKENO logo left */}
          <div className="flex min-w-0 items-center">
            <h1 
              className="leading-none text-center inline-flex items-center justify-center font-black"
              style={{
                fontFamily: '"Arial Black", "Impact", sans-serif',
                fontStyle: 'italic',
                fontWeight: 800,
                letterSpacing: '-1.2px',
                fontSize: '15px',
                transform: 'skewX(-8deg)',
                color: '#cfd8d6',
                textShadow: '0 1px 1.5px rgba(0,0,0,0.8), 0 0 2px rgba(66,200,120,0.3)'
              }}
            >
              FAST<span className="text-[#42c878]">KEN</span>
              <span className="inline-flex items-center justify-center bg-[#42c878] rounded-full animate-pulse" style={{ width: '10px', height: '10px', position: 'relative', top: '0.4px', marginLeft: '2px', marginRight: '2px', boxShadow: '0 0.5px 1px rgba(0,0,0,0.4)' }}>
                <span style={{ width: 0, height: 0, borderTop: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '3.5px solid #11191a' }}></span>
              </span>
            </h1>
          </div>

          {/* Balance pill center-left & ID text */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <div
              className="bg-transparent border border-[#39d98a] px-2.5 py-0.5 rounded-full flex items-center justify-center gap-0.5 h-6"
            >
              <span className="text-[#facc15] text-[11px] font-black tracking-wide font-mono leading-none">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8px] text-[#bfccd0] font-bold ml-0.5 leading-none mt-0.5">ETB</span>
            </div>

            <span className="min-w-0 truncate text-[9px] font-mono text-zinc-500 font-bold">ID: {shortUserId}</span>
          </div>

          {/* Hamburger right */}
          <button 
            onClick={() => playClickSound()}
            className="text-[#39d98a] hover:text-[#42f5a4] hover:scale-105 cursor-pointer transition-all p-1"
            title="Open Mobile Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Left Decor Spherical Keno Ball (80) */}
      <div 
        className="absolute left-[20px] bottom-[25px] w-[290px] h-[290px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(57,217,138,0.25)_0%,rgba(16,73,56,0.6)_45%,rgba(5,20,16,0.95)_100%)] border border-emerald-500/10 shadow-[inset_-30px_-30px_60px_rgba(0,0,0,0.9),inset_20px_20px_40px_rgba(255,255,255,0.06),0_15px_40px_rgba(0,0,0,0.7)] flex items-center justify-center select-none pointer-events-none transform rotate-12 z-10 opacity-55 backdrop-blur-[1px]"
      >
        <span className="text-[120px] font-black text-[#b8b8b8]/25 font-mono tracking-tight" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
          80
        </span>
      </div>

      {/* Right Decor Spherical Keno Ball (10) */}
      <div 
        className="absolute right-[-80px] bottom-[-70px] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(52,144,220,0.18)_0%,rgba(27,47,61,0.55)_45%,rgba(8,16,21,0.95)_100%)] border border-blue-500/10 shadow-[inset_-40px_-40px_80px_rgba(0,0,0,0.95),inset_25px_25px_50px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-center select-none pointer-events-none transform -rotate-12 z-10 opacity-55 backdrop-blur-[1px]"
      >
        <span className="text-[170px] font-black text-[#b8b8b8]/20 font-mono tracking-tight" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
          10
        </span>
      </div>

      {/* Main Game Frame Container */}
      <div className="w-full sm:w-[94vw] max-w-[1540px] min-h-0 sm:min-h-[760px] mx-auto py-1.5 px-2 sm:px-2 flex flex-col justify-start relative z-20 overflow-x-hidden" id="game-stage">
        
        {!isMobile ? (
          /* Exact 3-column composition starting near same top level for desktop */
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-center gap-[16px] w-full mt-1.5" id="game-columns">
            
            {/* Column 1: Left panel: 280px to 310px wide */}
            <div className="w-full lg:w-[295px] lg:flex-shrink-0 h-[700px]">
              <LeftPanel 
                balance={balance} 
                userId={shortUserId} 
                tickets={tickets} 
                placingTicketIds={placingTicketIds}
                activeDrawnNumbers={ticketDrawHighlights}
                hideWalletHeader={isEmbeddedInKing5}
                onClearHistory={handleClearHistory} 
              />
            </div>

            {/* Column 2: Center core grid: 540px to 600px wide */}
            <div className="w-full lg:w-[580px] lg:flex-shrink-0">
              <MiddlePanel 
                selectedNumbers={selectedNumbers}
                onToggleNumber={handleToggleNumber}
                onClearNumbers={handleClearSelectedNumbers}
                onAutoPick={handleAutoPick}
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                onPlaceBet={handlePlaceBet}
                isDrawing={isDrawing}
                isPlacingBet={isPlacingBet}
                betAcceptedFlash={betAcceptedFlash}
                activeDrawnNumbers={activeDrawnNumbers}
                highlightNumbers={activeTicketHighlightNumbers}
                onVisibleDrawnNumbersChange={setVisibleDrawnNumbers}
                onDrawAnimationComplete={() => finalizeDrawRound(activeDrawnNumbers)}
                hotNumbersList={hotNumbers.map((hn) => hn.num)}
                coldNumbersList={coldNumbers.map((cn) => cn.num)}
                countdown={countdown}
                drawId={currentDrawId}
                payTable={payTable}
              />
            </div>

            {/* Column 3: Right stats/leaders/logs panel: 300px to 330px wide */}
            <div className="w-full lg:w-[325px] lg:flex-shrink-0 h-[700px]">
              <RightPanel 
                drawResults={drawResults}
                leaders={leaders}
                hotNumbers={hotNumbers}
                coldNumbers={coldNumbers}
                isDrawing={isDrawing}
                activeDrawnNumbers={activeDrawnNumbers}
                drawId={currentDrawId}
                onSelectHistoricCombination={handleSelectHistoricCombination}
              />
            </div>

          </div>
        ) : (
          /* Single Column Mobile Layout */
          <div className="flex flex-col items-center w-full mt-1.5 overflow-x-hidden" id="mobile-game-layout">
            
            {/* 1. Center Core Grid first */}
            <div className="w-full" id="mobile-center-panel">
              <MiddlePanel 
                selectedNumbers={selectedNumbers}
                onToggleNumber={handleToggleNumber}
                onClearNumbers={handleClearSelectedNumbers}
                onAutoPick={handleAutoPick}
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                onPlaceBet={handlePlaceBet}
                isDrawing={isDrawing}
                isPlacingBet={isPlacingBet}
                betAcceptedFlash={betAcceptedFlash}
                activeDrawnNumbers={activeDrawnNumbers}
                highlightNumbers={activeTicketHighlightNumbers}
                onVisibleDrawnNumbersChange={setVisibleDrawnNumbers}
                onDrawAnimationComplete={() => finalizeDrawRound(activeDrawnNumbers)}
                hotNumbersList={hotNumbers.map((hn) => hn.num)}
                coldNumbersList={coldNumbers.map((cn) => cn.num)}
                countdown={countdown}
                drawId={currentDrawId}
                payTable={payTable}
              />
            </div>

            {/* 2. Scrollable tabs below the game area */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-[#202d31]/35 pb-[2px] mt-3.5 w-full uppercase" id="mobile-tabs-container">
              {(['GAME', 'HISTORY', 'RESULTS', 'STATISTICS', 'LEADERS'] as const).map((tab) => {
                const isActive = mobileActiveTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      playClickSound();
                      setMobileActiveTab(tab);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-black tracking-wider transition-all whitespace-nowrap border-b-2 grow text-center cursor-pointer ${
                      isActive
                        ? 'text-[#39d98a] border-[#39d98a]'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* 3. Reused content panel */}
            <div className="w-full mt-3 h-[420px] overflow-hidden" id="mobile-viewport-container">
              {mobileActiveTab === 'GAME' && (
                <LeftPanel 
                  balance={balance} 
                  userId={shortUserId} 
                  tickets={tickets} 
                  placingTicketIds={placingTicketIds}
                  activeDrawnNumbers={ticketDrawHighlights}
                  onClearHistory={handleClearHistory}
                  forceTab="GAME"
                  hideHeader
                />
              )}
              {mobileActiveTab === 'HISTORY' && (
                <LeftPanel 
                  balance={balance} 
                  userId={shortUserId} 
                  tickets={tickets} 
                  placingTicketIds={placingTicketIds}
                  activeDrawnNumbers={ticketDrawHighlights}
                  onClearHistory={handleClearHistory}
                  forceTab="HISTORY"
                  hideHeader
                />
              )}
              {mobileActiveTab === 'RESULTS' && (
                <RightPanel 
                  drawResults={drawResults}
                  leaders={leaders}
                  hotNumbers={hotNumbers}
                  coldNumbers={coldNumbers}
                  isDrawing={isDrawing}
                  activeDrawnNumbers={activeDrawnNumbers}
                  drawId={currentDrawId}
                  onSelectHistoricCombination={handleSelectHistoricCombination}
                  forceTab="RESULTS"
                  hideHeaderAndQuickMenu
                />
              )}
              {mobileActiveTab === 'STATISTICS' && (
                <RightPanel 
                  drawResults={drawResults}
                  leaders={leaders}
                  hotNumbers={hotNumbers}
                  coldNumbers={coldNumbers}
                  isDrawing={isDrawing}
                  activeDrawnNumbers={activeDrawnNumbers}
                  drawId={currentDrawId}
                  onSelectHistoricCombination={handleSelectHistoricCombination}
                  forceTab="STATISTICS"
                  hideHeaderAndQuickMenu
                />
              )}
              {mobileActiveTab === 'LEADERS' && (
                <RightPanel 
                  drawResults={drawResults}
                  leaders={leaders}
                  hotNumbers={hotNumbers}
                  coldNumbers={coldNumbers}
                  isDrawing={isDrawing}
                  activeDrawnNumbers={activeDrawnNumbers}
                  drawId={currentDrawId}
                  onSelectHistoricCombination={handleSelectHistoricCombination}
                  forceTab="LEADERS"
                  hideHeaderAndQuickMenu
                />
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
