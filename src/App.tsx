/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  X, 
  Trophy,
  Info
} from 'lucide-react';
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
  getMultiplier
} from './data';
import { 
  playTickSound, 
  playDrawBallSound, 
  playWinSound, 
  playLossSound, 
  playClickSound,
  playSelectSound,
  playDeselectSound
} from './audio';

const NAV_ITEMS = [
  'HOME',
  'SPORT',
  'LIVE',
  'GAMES',
  'LIVE GAMES',
  'VIRTUAL SPORTS',
  'COUPON CHECK',
  'PROMOTIONS',
];

export default function App() {
  // Gameplay States
  const [balance, setBalance] = useState<number>(90.37);
  const [userId] = useState<string>('881426785'); // Match screenshot exactly!
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [drawResults, setDrawResults] = useState<DrawResult[]>(INITIAL_DRAWS);
  const [leaders, setLeaders] = useState<Leader[]>(INITIAL_LEADERS);
  
  // Selection States
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<number>(500); // Set default bet to 500 supporting 'Bet 500' representation
  const [activeNavItem, setActiveNavItem] = useState<string>('GAMES');

  // Viewport states for mobile flexibility
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [mobileActiveTab, setMobileActiveTab] = useState<'GAME' | 'HISTORY' | 'RESULTS' | 'STATISTICS' | 'LEADERS'>('GAME');

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Stats Counters
  const [hotNumbers, setHotNumbers] = useState<HotColdNumber[]>(HOT_NUMBERS);
  const [coldNumbers, setColdNumbers] = useState<HotColdNumber[]>(COLD_NUMBERS);

  // Timer & Ball Extraction State
  const [countdown, setCountdown] = useState<number>(40);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeDrawnNumbers, setActiveDrawnNumbers] = useState<number[]>([]);
  const [currentDrawId, setCurrentDrawId] = useState<string>('8024922');

  // Interactive Toast Overlay state for instant win display
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Timer Ref to manage draw interval
  const ballTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bulletproof cleanup of active timers on unmount
  useEffect(() => {
    return () => {
      if (ballTimerRef.current) {
        clearInterval(ballTimerRef.current);
        ballTimerRef.current = null;
      }
    };
  }, []);

  // Show customized success toast helper
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5500);
  };

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
  const triggerLiveDrawing = () => {
    // If a drawing loop is already active, do NOT start another!
    if (ballTimerRef.current) {
      return;
    }
    setIsDrawing(true);
    setActiveDrawnNumbers([]);
    
    const fullCombination = generateRandomCombination(20, 1, 80);
    let index = 0;

    ballTimerRef.current = setInterval(() => {
      if (index < 20) {
        const nextBall = fullCombination[index];
        setActiveDrawnNumbers((prev) => {
          // Strictly cap at exactly 20 elements
          if (prev.length >= 20) {
            return prev;
          }
          return [...prev, nextBall];
        });
        playDrawBallSound();
        index++;
      } else {
        if (ballTimerRef.current) {
          clearInterval(ballTimerRef.current);
          ballTimerRef.current = null;
        }
        finalizeDrawRound(fullCombination);
      }
    }, 1000);
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

    let totalWinnings = 0;
    let winCountInTickets = 0;
    let totalMatchedTickets = 0;

    setTickets((prevTickets) => {
      return prevTickets.map((t) => {
        if (t.status !== 'Waiting' || t.drawId !== currentDrawId) return t;

        const matchedNumbers = t.selectedNumbers.filter((n) => combination.includes(n));
        const matchedCount = matchedNumbers.length;
        const multiplier = getMultiplier(t.selectedNumbers.length, matchedCount);
        
        let winAmount = 0;
        let status: 'Won' | 'Missed' = 'Missed';

        if (multiplier > 0) {
          winAmount = Math.round(t.betAmount * multiplier);
          status = 'Won';
          totalWinnings += winAmount;
          winCountInTickets++;
        }

        totalMatchedTickets++;

        return {
          ...t,
          status,
          winAmount,
          matchedCount,
          matchedNumbers,
        };
      });
    });

    if (totalWinnings > 0) {
      setBalance((prev) => prev + totalWinnings);
      playWinSound();
      triggerToast(
        `🏆 Dynamic Win! You received +${totalWinnings.toLocaleString('en-US')} ETB on your bets!`,
        'success'
      );
    } else if (totalMatchedTickets > 0) {
      playLossSound();
      triggerToast('💸 Drawing finalized. Better luck next time!', 'error');
    } else {
      triggerToast(`⭐ Round #${currentDrawId} completed successfully. Ready for new bets!`, 'info');
    }

    updateStatistics(combination);
    simulateLeaderboardActivity(combination);

    const nextId = String(Number(currentDrawId) + 1);
    setCurrentDrawId(nextId);
    setCountdown(40);
    setIsDrawing(false);
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
      const multiVal = getMultiplier(8, matches);
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

  const handlePlaceBet = () => {
    if (isDrawing) return;
    if (selectedNumbers.length === 0) {
      triggerToast('⚠️ Select some numbers to bet on first!', 'info');
      return;
    }

    if (balance < betAmount) {
      triggerToast('❌ Insufficient balance! Click the top funds pill to reload sandbox funds.', 'error');
      return;
    }

    setBalance((prev) => prev - betAmount);

    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newTicket: Ticket = {
      id: 'T-' + Math.floor(1000 + Math.random() * 9000),
      drawId: currentDrawId,
      selectedNumbers: [...selectedNumbers],
      betAmount: betAmount,
      timestamp: timeNow,
      status: 'Waiting',
    };

    setTickets((prev) => [newTicket, ...prev]);
    triggerToast(`🎟️ Stake of ${betAmount} placed successfully for Draw #${currentDrawId}!`, 'success');
  };

  const handleClearHistory = () => {
    playClickSound();
    setTickets((prev) => prev.filter((t) => t.status === 'Waiting'));
    triggerToast('🧹 Ticket history cleared.', 'info');
  };

  const handleQuickAddFunds = () => {
    playClickSound();
    setBalance((prev) => prev + 1000.00);
    triggerToast('💰 +1,000.00 ETB demo funds added successfully!', 'success');
  };

  const handleSelectHistoricCombination = (combination: number[]) => {
    if (isDrawing) return;
    playClickSound();
    setSelectedNumbers(combination.slice(0, 10));
    triggerToast('🔍 Loaded draws combination into selection board.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#070d0e] bg-[radial-gradient(circle_at_center,rgba(5,38,32,0.45)_0%,rgba(8,12,14,1)_75%)] text-white relative flex flex-col items-center justify-start overflow-x-hidden font-sans">
      
      {/* Decoupled top sports navigation bar inside sportsbook theme (hidden on mobile) */}
      {!isMobile && (
        <div className="w-full bg-[#1a1128] border-b border-[#2d2142] py-2 px-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    playClickSound();
                    setActiveNavItem(item);
                  }}
                  className={`text-[11px] font-black tracking-widest cursor-pointer transition-all whitespace-nowrap uppercase ${
                    activeNavItem === item
                      ? 'text-[#39ff14] border-b-2 border-[#39ff14]/80 pb-1.5'
                      : 'text-zinc-400 hover:text-zinc-200 pb-1.5'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse"></span>
              <span>SYSTEM ENCRYPTED</span>
            </div>
          </div>
        </div>
      )}

      {/* Top 45px Mobile header (visible ONLY on mobile) */}
      {isMobile && (
        <div className="w-full h-[45px] bg-[#11191a] border-b border-[#1e2a2c] flex items-center justify-between px-3 shrink-0 z-30" id="mobile-top-header">
          {/* FASTKENO logo left */}
          <div className="flex items-center">
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickAddFunds}
              className="bg-transparent border border-[#39d98a] px-2.5 py-0.5 rounded-full text-left cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-0.5 h-6 hover:bg-[#39d98a]/5"
              title="Click to double balance (Demo Mode)"
            >
              <span className="text-[#facc15] text-[11px] font-black tracking-wide font-mono leading-none">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8px] text-[#bfccd0] font-bold ml-0.5 leading-none mt-0.5">ETB</span>
            </button>

            <span className="text-[9px] font-mono text-zinc-500 font-bold">ID: 881426785</span>
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

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed top-14 right-4 z-50 transform transition-all duration-300 max-w-sm w-full font-mono shadow-2xl animate-bounce">
          <div className={`p-3 rounded-lg border flex items-start gap-2.5 bg-[#1a1f26] border-zinc-800 text-zinc-100`}>
            {toastMessage.type === 'success' && <Trophy className="w-4 h-4 text-[#39ff14] shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            
            <div className="flex-1 text-[11px] font-bold">
              {toastMessage.text}
            </div>
            
            <button 
              onClick={() => setToastMessage(null)} 
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Game Frame Container */}
      <div className="w-full sm:w-[94vw] max-w-[1540px] min-h-0 sm:min-h-[760px] mx-auto py-1.5 px-3 sm:px-2 flex flex-col justify-start relative z-20 overflow-x-hidden" id="game-stage">
        
        {!isMobile ? (
          /* Exact 3-column composition starting near same top level for desktop */
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-center gap-[16px] w-full mt-1.5" id="game-columns">
            
            {/* Column 1: Left panel: 280px to 310px wide */}
            <div className="w-full lg:w-[295px] lg:flex-shrink-0 h-[700px]">
              <LeftPanel 
                balance={balance} 
                userId={userId} 
                tickets={tickets} 
                onClearHistory={handleClearHistory} 
                onQuickAddFunds={handleQuickAddFunds} 
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
                activeDrawnNumbers={activeDrawnNumbers}
                hotNumbersList={hotNumbers.map((hn) => hn.num)}
                coldNumbersList={coldNumbers.map((cn) => cn.num)}
                countdown={countdown}
                drawId={currentDrawId}
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
                activeDrawnNumbers={activeDrawnNumbers}
                hotNumbersList={hotNumbers.map((hn) => hn.num)}
                coldNumbersList={coldNumbers.map((cn) => cn.num)}
                countdown={countdown}
                drawId={currentDrawId}
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
                  userId={userId} 
                  tickets={tickets} 
                  onClearHistory={handleClearHistory} 
                  onQuickAddFunds={handleQuickAddFunds}
                  forceTab="GAME"
                  hideHeader
                />
              )}
              {mobileActiveTab === 'HISTORY' && (
                <LeftPanel 
                  balance={balance} 
                  userId={userId} 
                  tickets={tickets} 
                  onClearHistory={handleClearHistory} 
                  onQuickAddFunds={handleQuickAddFunds}
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

        {/* Minimal compact footer info */}
        <footer className="mt-4 pt-2 border-t border-[#1c2229] flex flex-col sm:flex-row items-center justify-between text-[9px] text-zinc-650 font-mono gap-1.5 uppercase tracking-wider font-bold">
          <span>FAST KENO ARENA • SPORTSBOOK CLIENT</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#39ff14]"></span>
              SYSTEM STATUS: ACTIVE
            </span>
            <span>VOUCHER SECURE: OK</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
