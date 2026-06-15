import React from 'react';
import { Menu } from 'lucide-react';
import { playClickSound } from '../audio';

interface MiddlePanelProps {
  selectedNumbers: number[];
  onToggleNumber: (num: number) => void;
  onClearNumbers: () => void;
  onAutoPick: (count: number) => void;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  onPlaceBet: () => void;
  isDrawing: boolean;
  activeDrawnNumbers: number[];
  hotNumbersList: number[];
  coldNumbersList: number[];
  countdown: number;
  drawId: string;
}

const VISUAL_PAYOUTS: Record<number, { match: number; multiplier: number }[]> = {
  1: [{ match: 1, multiplier: 3.5 }],
  2: [
    { match: 1, multiplier: 1 },
    { match: 2, multiplier: 12 }
  ],
  3: [
    { match: 2, multiplier: 2.5 },
    { match: 3, multiplier: 45 }
  ],
  4: [
    { match: 2, multiplier: 1 },
    { match: 3, multiplier: 5 },
    { match: 4, multiplier: 150 }
  ],
  5: [
    { match: 2, multiplier: 1 },
    { match: 3, multiplier: 3 },
    { match: 4, multiplier: 30 },
    { match: 5, multiplier: 150 }
  ],
  6: [
    { match: 3, multiplier: 1 },
    { match: 4, multiplier: 6 },
    { match: 5, multiplier: 25 },
    { match: 6, multiplier: 1500 }
  ],
  7: [
    { match: 4, multiplier: 4 },
    { match: 5, multiplier: 15 },
    { match: 6, multiplier: 150 },
    { match: 7, multiplier: 5000 }
  ],
  8: [
    { match: 4, multiplier: 2 },
    { match: 5, multiplier: 10 },
    { match: 6, multiplier: 50 },
    { match: 7, multiplier: 1000 },
    { match: 8, multiplier: 15000 }
  ],
  9: [
    { match: 5, multiplier: 5 },
    { match: 6, multiplier: 25 },
    { match: 7, multiplier: 200 },
    { match: 8, multiplier: 4000 },
    { match: 9, multiplier: 40000 }
  ],
  10: [
    { match: 5, multiplier: 2 },
    { match: 6, multiplier: 15 },
    { match: 7, multiplier: 100 },
    { match: 8, multiplier: 800 },
    { match: 9, multiplier: 5000 },
    { match: 10, multiplier: 100000 }
  ]
};

export default function MiddlePanel({
  selectedNumbers,
  onToggleNumber,
  onClearNumbers,
  onAutoPick,
  betAmount,
  onBetAmountChange,
  onPlaceBet,
  isDrawing,
  activeDrawnNumbers,
  countdown,
}: MiddlePanelProps) {

  // Animation constants
  const POP_DURATION = 500;
  const STATIONARY_DURATION = 700;
  const FLY_DURATION = 850;
  const NEXT_BALL_DELAY = 1000;

  // Local state for animation queue
  const [settledBalls, setSettledBalls] = React.useState<number[]>([]);
  const settledBallsRef = React.useRef<number[]>([]);
  
  const updateSettledBalls = (newBalls: number[] | ((prev: number[]) => number[])) => {
    setSettledBalls((prev) => {
      const next = typeof newBalls === 'function' ? newBalls(prev) : newBalls;
      settledBallsRef.current = next;
      return next;
    });
  };

  const [currentBall, setCurrentBallState] = React.useState<number | null>(null);
  const currentBallRef = React.useRef<number | null>(null);
  
  const setCurrentBall = (ball: number | null) => {
    currentBallRef.current = ball;
    setCurrentBallState(ball);
  };

  const [animationPhase, setAnimationPhase] = React.useState<'idle' | 'pop' | 'visible' | 'fly'>('idle');

  const incomingQueueRef = React.useRef<number[]>([]);
  const isProcessingRef = React.useRef(false);

  // Helper delay
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Queue processing loop
  const processQueue = async () => {
    if (isProcessingRef.current || incomingQueueRef.current.length === 0) return;
    isProcessingRef.current = true;

    while (incomingQueueRef.current.length > 0) {
      const nextBall = incomingQueueRef.current.shift()!;
      setCurrentBall(nextBall);

      // 1. Pop center ball starts (scale 0.2, invisible)
      setAnimationPhase('pop');
      await delay(20);

      // 2. Animate to scale 1.0 (visible at center) during remaining pop duration
      setAnimationPhase('visible');
      await delay(POP_DURATION - 20);

      // 2.5 Stay stationary at center so user can register the number
      await delay(STATIONARY_DURATION);

      // 3. Animate flying to target slot during FLY_DURATION
      setAnimationPhase('fly');
      await delay(FLY_DURATION);

      // 4. After fly animation ends, remove big center ball & add to settledBalls list
      const newSettled = [...settledBallsRef.current, nextBall];
      updateSettledBalls(newSettled);
      setCurrentBall(null);
      setAnimationPhase('idle');

      // 5. Pause briefly before drawing the next ball
      await delay(NEXT_BALL_DELAY);
    }

    isProcessingRef.current = false;
  };

  // Sync incoming props to local animation queue
  React.useEffect(() => {
    if (!isDrawing) {
      updateSettledBalls([]);
      setCurrentBall(null);
      setAnimationPhase('idle');
      incomingQueueRef.current = [];
      isProcessingRef.current = false;
      return;
    }

    if (activeDrawnNumbers.length === 0) {
      updateSettledBalls([]);
      setCurrentBall(null);
      setAnimationPhase('idle');
      incomingQueueRef.current = [];
      isProcessingRef.current = false;
      return;
    }

    // Add any fresh balls to queue
    let queueChanged = false;
    for (const ball of activeDrawnNumbers) {
      const isAlreadyProcessed = 
        settledBallsRef.current.includes(ball) || 
        ball === currentBallRef.current || 
        incomingQueueRef.current.includes(ball);

      if (!isAlreadyProcessed) {
        incomingQueueRef.current.push(ball);
        queueChanged = true;
      }
    }

    if (queueChanged) {
      processQueue();
    }
  }, [activeDrawnNumbers, isDrawing]);

  const handleAdjustBet = (multiplier: number) => {
    playClickSound();
    const newBet = Math.max(1, Math.min(5000, Math.round(betAmount * multiplier)));
    onBetAmountChange(newBet);
  };

  const handleIncrement = (amount: number) => {
    playClickSound();
    const newBet = Math.max(1, Math.min(5000, betAmount + amount));
    onBetAmountChange(newBet);
  };

  const setMaxBet = () => {
    playClickSound();
    onBetAmountChange(5000);
  };

  const isCurrentlyDrawn = (num: number) => {
    return activeDrawnNumbers.includes(num);
  };

  // Decorative dots exactly mirroring the screenshot dots
  const getDotDecoration = (num: number) => {
    if (num === 16) return <span className="absolute top-1 left-1.5 w-[3.5px] h-[3.5px] rounded-full bg-cyan-400/80"></span>;
    if (num === 18) return <span className="absolute top-1 left-1.5 w-[3.5px] h-[3.5px] rounded-full bg-cyan-400/80"></span>;
    if (num === 20) return <span className="absolute top-1 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-rose-500/80"></span>;
    if (num === 25) return <span className="absolute top-1 left-1.5 w-[3.5px] h-[3.5px] rounded-full bg-cyan-400/80"></span>;
    if (num === 34) return <span className="absolute top-1 left-1.5 w-[3.5px] h-[3.5px] rounded-full bg-cyan-400/80"></span>;
    if (num === 35) return <span className="absolute top-1 left-[5px] w-[3.5px] h-[3.5px] rounded-full bg-cyan-400/80"></span>;
    if (num === 37) return <span className="absolute top-1 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-rose-500/80"></span>;
    if (num === 50) return <span className="absolute top-1 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-rose-500/80"></span>;
    if (num === 57) return <span className="absolute top-1 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-rose-500/80"></span>;
    if (num === 76) return <span className="absolute top-1 right-1.5 w-[3.5px] h-[3.5px] rounded-full bg-rose-500/80"></span>;
    return null;
  };

  // Format countdown like digital e.g. 00 : 40
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const remainder = (secs % 60).toString().padStart(2, '0');
    return `${mins} : ${remainder}`;
  };

  return (
    <div className="flex flex-col h-full text-zinc-100 select-none uppercase" id="middle-panel">
      
      {/* Dynamic Embedded Styles for Radar Rotation and Ball Pop */}
      <style>{`
        @keyframes kenoBallPop {
          0% { transform: translateX(-50%) scale(0.3) rotate(-25deg); opacity: 0; }
          75% { transform: translateX(-50%) scale(1.12) rotate(5deg); }
          100% { transform: translateX(-50%) scale(1) rotate(0); opacity: 1; }
        }
        @keyframes kenoBallFly {
          0% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
            filter: blur(0px);
          }
          90% {
            opacity: 0.95;
          }
          100% {
            transform: translate(calc(-50% + var(--target-x, 0px)), var(--target-y, 115px)) scale(0.531);
            opacity: 0;
            filter: blur(0.5px);
          }
        }
        @keyframes kenoRadarRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-keno-pop {
          animation: kenoBallPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25) forwards;
        }
        .animate-keno-fly {
          animation: kenoBallFly 0.415s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-radar-rotate {
          animation: kenoRadarRotate 25s linear infinite;
        }
      `}</style>

      {isDrawing ? (
        /* ==================== DRAWING MODE PANEL ==================== */
        (() => {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const LARGE_BALL_SIZE = isMobile ? 54 : 64;
          const SMALL_BALL_SIZE = isMobile ? 26 : 34;
          const SLOT_GAP = isMobile ? 8 : 18;
          const SLOT_STEP = SMALL_BALL_SIZE + SLOT_GAP;

          const BALLS_PER_ROW = 10;
          const ROW_WIDTH = BALLS_PER_ROW * SMALL_BALL_SIZE + (BALLS_PER_ROW - 1) * SLOT_GAP;

          const Y_CENTER_BALL = isMobile ? 18 : 28;
          const Y_ROW_1 = isMobile ? 92 : 110;
          const Y_ROW_2 = isMobile ? 128 : 156;

          // Dynamic row-splitting per user requirements:
          // The first 10 lands occupy the top row initially.
          // Once 10 balls land, they shift to the bottom row, and the next 10 occupy the top row.
          const topRow = settledBalls.length < 10 ? settledBalls : settledBalls.slice(10);
          const bottomRow = settledBalls.length < 10 ? [] : settledBalls.slice(0, 10);

          // Calculate target coordinate for active flying ball (which always starts/lands in the active Top Row slot)
          const currentSlotIndex = settledBalls.length;
          const activeSlotIndex = currentSlotIndex < 10 ? currentSlotIndex : currentSlotIndex - 10;
          const targetX = -ROW_WIDTH / 2 + activeSlotIndex * SLOT_STEP + SMALL_BALL_SIZE / 2;
          const targetY = (Y_ROW_1 + SMALL_BALL_SIZE / 2) - (Y_CENTER_BALL + LARGE_BALL_SIZE / 2);
          const scaleRatio = SMALL_BALL_SIZE / LARGE_BALL_SIZE;

          return (
            <div 
              className="rounded-[5px] h-[170px] md:h-[205px] relative overflow-hidden border border-[#2d3a3c]/40 flex flex-col justify-start" 
              style={{ backgroundColor: '#151c1d' }}
              id="drawing-mode-panel"
            >
              {/* FASTKENO Logo at top center */}
              <div className="absolute top-[2px] left-1/2 -translate-x-1/2 select-none z-[50] hidden md:block">
                <h1 
                   className="leading-none text-center inline-flex items-center justify-center font-black"
                  style={{
                    fontFamily: '"Arial Black", "Impact", sans-serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    letterSpacing: '-1.5px',
                    fontSize: '17px',
                    transform: 'skewX(-8deg)',
                    color: '#cfd8d6',
                    textShadow: '0 1.5px 2px rgba(0,0,0,0.8), 0 0 3px rgba(66,200,120,0.35)'
                  }}
                >
                  FAST<span className="text-[#42c878]">KEN</span>
                  <span className="inline-flex items-center justify-center bg-[#42c878] rounded-full" style={{ width: '12px', height: '12px', position: 'relative', top: '0.5px', marginLeft: '1px', marginRight: '1px', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                    <span style={{ width: 0, height: 0, borderTop: '2.5px solid transparent', borderBottom: '2.5px solid transparent', borderLeft: '4px solid #11191c' }}></span>
                  </span>
                </h1>
              </div>

              {/* Hamburger button at top right (hidden on mobile) */}
              <button 
                onClick={() => playClickSound()}
                className="absolute top-[8px] right-2.5 text-[#39d98a] hover:text-[#42f5a4] hover:scale-105 cursor-pointer transition-all p-1 z-[50] hidden md:block"
                title="Open Menu Options"
              >
                <Menu className="w-[22px] h-[22px] stroke-[2.5]" />
              </button>

              {/* Progress on top right like "05 / 20" */}
              <div className="absolute font-mono text-[18px] md:text-[22px] font-black select-none z-[50] top-[10px] right-[10px] md:top-[8px] md:right-[52px]" style={{ textShadow: '0 0 5px rgba(255,255,255,0.15)' }}>
                <span className="text-white tracking-[0.04em]">{String(Math.min(settledBalls.length, 20)).padStart(2, '0')}</span>
                <span className="text-[#39d98a] font-normal mx-1">/</span>
                <span className="text-white/45 tracking-[0.04em]">20</span>
              </div>

              {/* Radar: concentric broken circular arcs & radial green glow centred exactly behind big current ball */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-[540px] h-[540px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible"
                style={{
                  top: `${Y_CENTER_BALL + LARGE_BALL_SIZE / 2 - 270}px`
                }}
              >
                {/* Subtle Radial Green Glow behind the big ball */}
                <div className="absolute w-[180px] h-[180px] rounded-full bg-[#10b981]/18 blur-3xl"></div>
                
                {/* SVG radar broke arcs - deeper green (opacity 0.45) with slightly thicker strokes */}
                <svg className="w-full h-full absolute top-0 left-0 overflow-visible" viewBox="0 0 540 540">
                  <g opacity="0.45" stroke="#10b981" strokeWidth="2.2" fill="none">
                    {/* Inner arc: radius 52 */}
                    <circle cx="270" cy="270" r="52" strokeDasharray="110 30 70 40" className="animate-radar-rotate" transform="rotate(25 270 270)" style={{ transformOrigin: '270px 270px' }} />
                    {/* Middle arc: radius 86 */}
                    <circle cx="270" cy="270" r="86" strokeDasharray="160 55 45 60" style={{ transformOrigin: '270px 270px', animation: 'kenoRadarRotate 40s linear infinite reverse' }} />
                    {/* Outer arc: radius 125 */}
                    <circle cx="270" cy="270" r="125" strokeDasharray="200 90 80 80" className="animate-radar-rotate" style={{ transformOrigin: '270px 270px', animationDuration: '32s' }} />
                    {/* Far outer arc: radius 165 */}
                    <circle cx="270" cy="270" r="165" strokeDasharray="240 130 90 100" style={{ transformOrigin: '270px 270px', animation: 'kenoRadarRotate 50s linear infinite reverse' }} strokeWidth="1.6" />
                  </g>
                </svg>
              </div>

              {/* Large current drawn ball (absolutely overlay layer above the rows) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-40 flex items-center justify-center animate-pulse" 
                id="drawing-center-ball"
                style={{
                  top: `${Y_CENTER_BALL}px`,
                  width: `${LARGE_BALL_SIZE}px`,
                  height: `${LARGE_BALL_SIZE}px`
                }}
              >
                {currentBall !== null ? (
                  <div 
                     key={currentBall}
                    className="rounded-full flex items-center justify-center text-white font-mono font-black absolute"
                    style={{ 
                      width: `${LARGE_BALL_SIZE}px`,
                      height: `${LARGE_BALL_SIZE}px`,
                      fontSize: isMobile ? '20px' : '26px',
                      left: '50%',
                      top: '0px',
                      textShadow: '0 1.5px 3px rgba(0,0,0,0.85)',
                      transformOrigin: 'center center',
                      transform: animationPhase === 'pop'
                        ? 'translateX(-50%) scale(0.2) rotate(-20deg)'
                        : animationPhase === 'visible'
                        ? 'translateX(-50%) scale(1.0) rotate(0deg)'
                        : animationPhase === 'fly'
                        ? `translate(calc(-50% + ${targetX}px), ${targetY}px) scale(${scaleRatio}) rotate(15deg)`
                        : 'translateX(-50%) scale(1.0) rotate(0deg)',
                      opacity: animationPhase === 'pop' ? 0 : 1,
                      transition: animationPhase === 'pop'
                        ? 'none'
                        : animationPhase === 'visible'
                        ? `transform ${POP_DURATION - 20}ms cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 200ms ease`
                        : animationPhase === 'fly'
                        ? `transform ${FLY_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease`
                        : 'none',
                      zIndex: 40
                    }}
                    id={`active-ball-${currentBall}`}
                  >
                    {/* 3D Glossy background gradient inside */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                      selectedNumbers.includes(currentBall) ? 'keno-ball-green-glossy-lg' : 'keno-ball-blue-glossy-lg'
                    }`} />
                    <span className="relative z-10 leading-none">{currentBall}</span>
                  </div>
                ) : null}
              </div>

              {/* Row 1 (Top Row on both mobile & desktop) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-20" 
                id="drawing-previous-row-1"
                style={{
                  top: `${Y_ROW_1}px`,
                  width: `${ROW_WIDTH}px`,
                  height: `${SMALL_BALL_SIZE}px`,
                }}
              >
                {Array.from({ length: 10 }).map((_, idx) => {
                  const ballVal = topRow[idx] !== undefined ? topRow[idx] : null;
                  const hasBall = ballVal !== null;
                  const isMatch = ballVal !== null && selectedNumbers.includes(ballVal);

                  if (!hasBall) return null;

                  return (
                    <div
                      key={`top-${idx}-${ballVal}`}
                      id={`slot-top-${idx}`}
                      className={`rounded-full flex items-center justify-center absolute top-0 transition-all duration-300 ${
                        isMatch ? "keno-ball-green-glossy-sm" : "keno-ball-blue-glossy-sm"
                      }`}
                      style={{
                        width: `${SMALL_BALL_SIZE}px`,
                        height: `${SMALL_BALL_SIZE}px`,
                        left: `${idx * SLOT_STEP}px`,
                      }}
                    >
                      <span 
                        className="text-[#ffffff] font-mono font-black leading-none text-center select-none"
                        style={{ 
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                          fontSize: isMobile ? '13px' : '15px'
                        }}
                      >
                        {ballVal}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Row 2 (Bottom Row on both mobile & desktop) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-20" 
                id="drawing-previous-row-2"
                style={{
                  top: `${Y_ROW_2}px`,
                  width: `${ROW_WIDTH}px`,
                  height: `${SMALL_BALL_SIZE}px`,
                }}
              >
                {Array.from({ length: 10 }).map((_, idx) => {
                  const ballVal = bottomRow[idx] !== undefined ? bottomRow[idx] : null;
                  const hasBall = ballVal !== null;
                  const isMatch = ballVal !== null && selectedNumbers.includes(ballVal);

                  if (!hasBall) return null;

                  return (
                    <div
                      key={`bottom-${idx}-${ballVal}`}
                      id={`slot-bottom-${idx}`}
                      className={`rounded-full flex items-center justify-center absolute top-0 transition-all duration-300 ${
                        isMatch ? "keno-ball-green-glossy-sm" : "keno-ball-blue-glossy-sm"
                      }`}
                      style={{
                        width: `${SMALL_BALL_SIZE}px`,
                        height: `${SMALL_BALL_SIZE}px`,
                        left: `${idx * SLOT_STEP}px`,
                      }}
                    >
                      <span 
                        className="text-[#ffffff] font-mono font-black leading-none text-center select-none"
                        style={{ 
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                          fontSize: isMobile ? '13px' : '15px'
                        }}
                      >
                        {ballVal}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })()
      ) : (
        /* ==================== NORMAL BETTING MODE PANEL ==================== */
        <>
          {/* Top Header Row carrying Logo, Timer and Burger Menu */}
          <div className="relative w-full h-[40px] md:h-[61px] shrink-0" id="middle-logo-header">
            {/* FAST KENO brand name (hidden on mobile, handled by main header) */}
            <h1 
              className="absolute left-1/2 -select-none leading-none text-center inline-flex items-center justify-center font-black hidden md:inline-flex"
              style={{
                fontFamily: '"Arial Black", "Impact", sans-serif',
                fontStyle: 'italic',
                fontWeight: 800,
                letterSpacing: '-1.5px',
                fontSize: '23px',
                transform: 'translateX(-50%) skewX(-8deg)',
                color: '#cfd8d6',
                left: '50%',
                top: '8px',
                textShadow: '0 1.5px 2px rgba(0,0,0,0.8), 0 0 3px rgba(66,200,120,0.35)'
              }}
            >
              FAST<span className="text-[#42c878]">KEN</span>
              <span className="inline-flex items-center justify-center bg-[#42c878] rounded-full" style={{ width: '16px', height: '16px', position: 'relative', top: '0.8px', marginLeft: '1px', marginRight: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                <span style={{ width: 0, height: 0, borderTop: '3.5px solid transparent', borderBottom: '3.5px solid transparent', borderLeft: '5.5px solid #11191c' }}></span>
              </span>
            </h1>

            {/* Digital Timer Clock with cyan outer shadow glow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[8px] md:top-[34px] text-center flex items-center justify-center select-none w-[120px] h-[28px]">
              {/* Soft background glow horizontal flare */}
              <div 
                className="absolute inset-0 bg-[#06b6d4]/10 blur-[8px] rounded-full scale-y-[0.3]" 
                style={{ mixBlendMode: 'screen' }}
              />
              <span 
                className="tracking-[0.05em] relative z-10" 
                style={{ 
                  fontFamily: '"Share Tech Mono", "Orbitron", monospace',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#f3ffff',
                  textShadow: '0 0 4px rgba(6,182,212,0.4)'
                }}
              >
                {formatTimer(countdown)}
              </span>
            </div>

            {/* Hamburger Menu on top right aligned (hidden on mobile) */}
            <button 
              onClick={() => playClickSound()}
              className="absolute right-2.5 top-[8px] text-[#39d98a] hover:text-[#42f5a4] hover:scale-105 cursor-pointer transition-all p-1 z-20 hidden md:block"
              title="Open Menu Options"
            >
              <Menu className="w-[22px] h-[22px]" />
            </button>
          </div>

          {/* Header instructions / Live drawn balls container - height around 125px on mobile, 132px on desktop */}
          <div className="bg-[#263335] rounded-[5px] h-[125px] md:h-[132px] relative overflow-visible flex flex-col justify-center px-3 mt-1.5" id="middle-header">
            {selectedNumbers.length > 0 ? (
              /* Ticket Preview / Possible Win Panel */
              <div className="w-full h-full flex flex-col justify-between pr-[32px] pt-[12px] pb-[12px] relative z-10" id="selected-ticket-preview">
                {/* 1. Top row: Possible match & win amount */}
                <div className="flex items-center text-[13px] md:text-[14px] font-sans font-bold select-none leading-none" id="win-readout-row">
                  <span className="text-white">{selectedNumbers.length}</span>
                  <span className="text-white normal-case ml-1">Possible win</span>
                  <span className="text-[#39d98a] font-mono ml-1.5">
                    {(() => {
                      const tiers = VISUAL_PAYOUTS[selectedNumbers.length] || VISUAL_PAYOUTS[5];
                      const maxMultiplier = tiers[tiers.length - 1]?.multiplier || 150;
                      return Math.round(betAmount * maxMultiplier);
                    })()}
                  </span>
                </div>

                {/* 2. Payout row: small grey labels & green active payout */}
                <div className="flex items-center text-[9px] md:text-[10px] font-mono leading-tight my-1" id="payout-tiers-row">
                  <div className="flex flex-col text-[#728286] font-bold text-left w-[44px] leading-tight shrink-0 select-none">
                    <span className="normal-case">Match</span>
                    <span className="normal-case">Pays</span>
                  </div>
                  
                  <div className="flex items-center gap-[12px] md:gap-[24px] ml-2 md:ml-4 overflow-x-auto scrollbar-none font-mono font-bold">
                    {(() => {
                      const tiers = VISUAL_PAYOUTS[selectedNumbers.length] || VISUAL_PAYOUTS[5];
                      return tiers.map((tier, idx) => {
                        const isCurrentMax = idx === tiers.length - 1;
                        return (
                          <div 
                            key={idx} 
                            className={`flex flex-col items-center leading-tight text-center select-none shrink-0 ${
                              isCurrentMax ? 'text-[#39d98a]' : 'text-[#728286]'
                            }`}
                          >
                            <span className="text-[10px] md:text-[11px]">{tier.match}</span>
                            <span className="text-[10px] md:text-[11px]">x{tier.multiplier}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 3. Selected number slots - 10 total */}
                <div className="grid grid-cols-10 gap-[2.5px] md:gap-[4px] w-full mt-1.5" id="selected-number-slots-row">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const sortedSelected = [...selectedNumbers].sort((a, b) => a - b);
                    const isFilled = idx < sortedSelected.length;
                    const val = isFilled ? sortedSelected[idx] : null;

                    return (
                      <div
                        key={idx}
                        className={`h-[34px] md:h-[44px] rounded-[3px] flex items-center justify-center font-mono select-none transition-all duration-200 border ${
                          isFilled
                            ? "bg-[#34454b] text-white border-transparent"
                            : "bg-[#1b2629] border-transparent text-[#2c3d41]/15"
                        }`}
                      >
                        {isFilled && (
                          <span 
                            className="text-[18px] md:text-[23px] font-extrabold leading-none tracking-tighter"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                          >
                            {val}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Base choose 10 numbers banner instruction */
              <div className="relative w-full h-full flex items-center justify-start pointer-events-none select-none" id="interactive-instructions-banner">
                {/* Concentric radar rings decorative pattern */}
                <div className="absolute inset-0 overflow-hidden rounded-[5px] pointer-events-none opacity-60 select-none z-0">
                  <div className="absolute top-1/2 -translate-y-1/2 left-[12%] w-[120px] h-[120px] rounded-full border border-[#39d98a]/25 animate-pulse"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 left-[12%] w-[190px] h-[190px] rounded-full border border-[#39d98a]/17"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 left-[12%] w-[260px] h-[260px] rounded-full border border-[#39d98a]/10 animate-pulse"></div>
                </div>

                {/* Small blue-grey ball 80 */}
                <div 
                  className="absolute rounded-full keno-ball-blue-glossy-sm flex items-center justify-center font-mono z-10"
                  style={{
                    left: '-10px',
                    top: '12px',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  <span 
                    className="select-none tracking-tighter shadow-sm text-white" 
                    style={{ 
                      fontWeight: 900, 
                      fontSize: '11px',
                    }}
                  >
                    80
                  </span>
                </div>

                {/* Small grey/blue ball 10 */}
                <div 
                  className="absolute rounded-full keno-ball-blue-glossy-sm flex items-center justify-center font-mono z-20"
                  style={{
                    left: '22px',
                    top: '3px',
                    width: '38px',
                    height: '38px',
                    transform: 'rotate(-18deg)'
                  }}
                >
                  <span 
                    className="select-none text-center text-white"
                    style={{ 
                      fontWeight: 900, 
                      fontSize: '18px',
                    }}
                  >
                    10
                  </span>
                </div>

                {/* Large neon glass-green ball 1 */}
                <div 
                  className="absolute rounded-full keno-ball-green-glossy-lg flex items-center justify-center font-mono z-30"
                  style={{
                    left: '-17px',
                    top: '38px',
                    width: '60px',
                    height: '60px',
                    transform: 'rotate(-18deg)'
                  }}
                >
                  <span 
                    className="select-none text-center text-white"
                    style={{ 
                      fontWeight: 900, 
                      fontSize: '32px',
                    }}
                  >
                    1
                  </span>
                </div>

                {/* Instructions */}
                <div 
                  className="absolute text-left font-sans flex flex-col justify-start leading-tight z-10"
                  style={{ left: typeof window !== 'undefined' && window.innerWidth < 768 ? '60px' : '116px', top: '48px' }}
                >
                  <h2 className="text-[18px] md:text-[22px] font-bold tracking-tight text-white normal-case leading-none">Choose 10 numbers</h2>
                  <p className="text-[14px] md:text-[16px] font-medium text-[#39d98a] tracking-normal mt-1 leading-none normal-case">From 1 to 80</p>
                </div>
              </div>
            )}

            {/* Help button on far right of the banner */}
            <button 
              onClick={() => playClickSound()}
              className="absolute right-[12px] top-[14px] w-[32px] h-[32px] rounded-full bg-[#182326] hover:bg-[#1a2b2f] flex items-center justify-center text-[#39d98a] text-[18px] font-bold cursor-pointer transition-colors z-20 shadow-md border-none"
              title="Fast Keno Rules Help"
            >
              ?
            </button>
          </div>

          {/* Exact 10 column by 8 rows square button grid tightly packed */}
          <div 
            className="grid grid-cols-10 gap-[1.5px] bg-[#11191c] p-[1.5px] rounded-[4px] border border-[#11191c] mt-[10px] md:mt-[20px]"
            id="keno-numbers-grid"
          >
            {Array.from({ length: 80 }).map((_, index) => {
              const num = index + 1;
              const isSelected = selectedNumbers.includes(num);
              const isDrawn = isCurrentlyDrawn(num);

              return (
                <button
                  key={num}
                  onClick={() => onToggleNumber(num)}
                  disabled={isDrawing}
                  className={`h-[44px] md:h-[55px] flex flex-col items-center justify-center relative overflow-hidden select-none outline-none rounded-[2px] transition-all ${
                    isDrawing ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isDrawn && isSelected
                      ? 'bg-[#4ea06f] text-white font-black scale-[1.01] border border-emerald-300/40 z-[3]'
                      : isDrawn
                      ? 'bg-[#3f8d5e] text-[#d7dedc] font-black scale-[1.01] border border-[#2e5e43]/20 z-[2]'
                      : isSelected
                      ? isDrawing
                        ? 'bg-[#21432e] text-[#86aa95] border border-[#173021] z-[2]'
                        : 'bg-[#438b5f] text-white font-black border border-[#1e422c] z-[2]'
                      : `bg-[#26343a] ${!isDrawing ? 'hover:bg-[#2b393f]' : ''} text-[#a9adad] font-bold border border-[#12191b]`
                  }`}
                >
                  {/* Decorative Red and Blue dots mirror screenshot */}
                  {getDotDecoration(num)}

                  {/* Central cell value */}
                  <span className="text-[18px] md:text-[17px] font-mono tracking-tight">{num}</span>
                </button>
              );
            })}
          </div>

          {/* stake controller with full BET row on mobile */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 p-1 rounded bg-[#151d20] border border-[#202d31]/30 mt-2.5" id="main-bet-controls">
            
            {/* Row 1 for stake minus/plus, X2, MAX */}
            <div className="flex items-center justify-between gap-1.5 w-full md:w-auto">
              <div className="flex items-center bg-[#1e2a2e]/60 rounded border border-[#2e3e43]/30 px-1 py-0.5 gap-0.5 flex-1 md:flex-initial justify-between md:justify-start">
                {/* Minus Button */}
                <button
                  onClick={() => handleIncrement(-10)}
                  disabled={betAmount <= 10}
                  className="w-8 h-8 rounded text-white text-[18px] font-bold hover:bg-[#2c3d44]/50 disabled:opacity-20 cursor-pointer active:scale-95 flex items-center justify-center transition-colors select-none"
                >
                  -
                </button>

                {/* Stake readout box */}
                <div className="px-3 min-w-[50px] text-center flex items-center justify-center">
                  <span className="text-white font-mono text-[14px] font-bold tracking-tight">{betAmount}</span>
                </div>

                {/* Plus Button */}
                <button
                  onClick={() => handleIncrement(10)}
                  disabled={betAmount >= 5000}
                  className="w-8 h-8 rounded text-white text-[18px] font-bold hover:bg-[#2c3d44]/50 disabled:opacity-20 cursor-pointer active:scale-95 flex items-center justify-center transition-colors select-none"
                >
                  +
                </button>
              </div>

              {/* X2 multiplier button */}
              <button
                onClick={() => handleAdjustBet(2)}
                className="h-9 px-3 bg-[#1a2528] hover:bg-[#233237] text-[#39d98a] font-bold text-[11px] rounded border border-[#2e3e43]/40 cursor-pointer transition-colors active:scale-95 flex items-center justify-center shrink-0"
              >
                X2
              </button>

              {/* MAX Stake Button */}
              <button
                onClick={setMaxBet}
                className="h-9 px-3 bg-[#1a2528] hover:bg-[#233237] text-[#39d98a] font-bold text-[11px] rounded border border-[#2e3e43]/40 cursor-pointer transition-colors active:scale-95 flex items-center justify-center shrink-0"
              >
                MAX
              </button>
            </div>

            {/* Large Wide Dark Green BET Button - Full width row below on mobile */}
            <button
              onClick={() => {
                onPlaceBet();
              }}
              disabled={isDrawing || selectedNumbers.length === 0}
              className={`w-full md:flex-1 h-9 rounded font-extrabold tracking-widest text-[13px] uppercase cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center outline-none ${
                selectedNumbers.length === 0
                  ? 'bg-[#1b2528] text-[#4a585c] cursor-not-allowed border border-[#2e3e43]/20'
                  : isDrawing
                  ? 'bg-[#1a2530] text-cyan-400 border border-cyan-400/40 animate-pulse cursor-wait'
                  : 'bg-gradient-to-b from-[#1c7e4f] to-[#0e4b2d] hover:from-[#1e8d58] hover:to-[#105934] text-white border border-[#22975e] shadow-md shadow-brand-neon/5'
              }`}
              id="bet-submit-button"
            >
              {isDrawing ? 'Drawing' : 'BET'}
            </button>

          </div>
        </>
      )}

    </div>
  );
}
