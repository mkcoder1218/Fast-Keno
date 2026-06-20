import React, { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Ticket } from '../types';

interface LeftPanelProps {
  balance: number;
  userId: string;
  tickets: Ticket[];
  placingTicketIds?: string[];
  activeDrawnNumbers?: number[];
  onClearHistory: () => void;
  forceTab?: 'GAME' | 'HISTORY';
  hideHeader?: boolean;
  hideWalletHeader?: boolean;
}

type TabType = 'GAME' | 'HISTORY';
type SubTabType = 'All' | 'My Tickets' | 'My Bets';

const ShieldCheckTiny = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-[12px] h-[12px] text-[#39d98a] shrink-0" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

export default function LeftPanel({
  balance,
  userId,
  tickets,
  placingTicketIds = [],
  activeDrawnNumbers = [],
  onClearHistory,
  forceTab,
  hideHeader,
  hideWalletHeader,
}: LeftPanelProps) {
  const [localActiveTab, setLocalActiveTab] = useState<TabType>('GAME');
  const activeTab = forceTab || localActiveTab;
  const setActiveTab = (tab: TabType) => {
    if (!forceTab) {
      setLocalActiveTab(tab);
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('All');

  // Active placed tickets (from state)
  const activePlacedTickets = tickets.filter(t => t.status === 'Waiting');
  const pastPlacedTickets = tickets.filter(t => t.status !== 'Waiting');
  const wonTickets = pastPlacedTickets.filter((t) => t.status === 'Won');
  const activeDrawnNumberSet = new Set(activeDrawnNumbers);

  return (
    <div className="flex flex-col h-full bg-[#11191a] border border-[#1e2a2c] p-2 text-zinc-100 uppercase select-none rounded-md" id="left-panel">
      <style>{`
        .visible-thin-scrollbar-left::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .visible-thin-scrollbar-left::-webkit-scrollbar-track {
          background: #11191a;
        }
        .visible-thin-scrollbar-left::-webkit-scrollbar-thumb {
          background: #4a5b61;
          border-radius: 2px;
        }
        .visible-thin-scrollbar-left::-webkit-scrollbar-thumb:hover {
          background: #39d98a;
        }
        @keyframes ticket-sweep {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(140%); opacity: 0; }
        }
        @keyframes ticket-pop {
          0%, 100% { transform: scale(0.88) rotate(-10deg); opacity: 0.7; }
          50% { transform: scale(1.08) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* Top Wallet & User ID row precisely as screenshot - 40px high */}
      {!hideHeader && !hideWalletHeader && (
        <>
          <div className="flex items-center justify-between h-9 mb-1.5 px-0.5">
            {/* Balance Yellow Capsule Pill */}
            <div
              className="bg-transparent border border-[#39d98a] px-3 py-1 rounded-full flex items-center justify-center gap-1 h-7"
              id="balance-button"
            >
              <span className="text-[#facc15] text-[13px] font-black tracking-wide font-mono leading-none">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-[#bfccd0] font-bold ml-0.5 leading-none mt-0.5">ETB</span>
            </div>

            {/* User ID display on same row */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-350" id="user-id-badge">
              <span className="text-zinc-500 font-bold">ID:</span>
              <span className="font-bold">{userId}</span>
              <ShieldCheckTiny />
            </div>
          </div>

          {/* Divider */}
          <div className="border-b border-[#202d31]/30 pb-0.5 mb-1.5"></div>
        </>
      )}

      {/* Main Tabs: Inline GAME & HISTORY text tabs */}
      {!hideHeader && (
        <div className="flex gap-4 mb-2 px-1 text-[11px]" id="left-main-tabs">
          <button
            onClick={() => setActiveTab('GAME')}
            className={`flex items-center gap-1 font-extrabold tracking-wider transition-colors shrink-0 cursor-pointer pb-1 border-b-2 ${
              activeTab === 'GAME'
                ? 'text-[#39d98a] border-[#39d98a]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <Play className="w-[12px] h-[12px] fill-current text-inherit shrink-0 stroke-[3]" />
            GAME
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-1 font-extrabold tracking-wider transition-colors shrink-0 cursor-pointer pb-1 border-b-2 ${
              activeTab === 'HISTORY'
                ? 'text-[#39d98a] border-[#39d98a]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <RotateCcw className="w-[12px] h-[12px] text-inherit shrink-0 stroke-[3]" />
            HISTORY
          </button>
        </div>
      )}

      {/* Sub tabs row values */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 border-b border-[#202d31]/25 pb-1.5 mb-2 px-1" id="left-sub-tabs">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('All')}
            className={`transition-colors flex items-center gap-1 ${
              activeSubTab === 'All' ? 'text-[#bfccd0]' : 'hover:text-zinc-300'
            }`}
          >
            <span>All</span>
            <span className="text-[#39d98a] font-black font-mono">
              {activeTab === 'GAME' ? activePlacedTickets.length : pastPlacedTickets.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('My Tickets')}
            className={`transition-colors flex items-center gap-1 ${
              activeSubTab === 'My Tickets' ? 'text-[#bfccd0]' : 'hover:text-zinc-200'
            }`}
          >
            <span>My Tickets</span>
            <span className="text-[#39d98a]/80 font-bold font-mono">
              {activeTab === 'GAME' ? activePlacedTickets.length : pastPlacedTickets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('My Bets')}
            className={`transition-colors flex items-center gap-1 ${
              activeSubTab === 'My Bets' ? 'text-[#bfccd0]' : 'hover:text-zinc-200'
            }`}
          >
            <span>My Bets</span>
            <span className="text-[#39d98a]/80 font-bold font-mono">
              {activeTab === 'GAME' ? activePlacedTickets.length : pastPlacedTickets.length}
            </span>
          </button>
        </div>

        {/* Clear action in history view */}
        {activeTab === 'HISTORY' && (activePlacedTickets.length > 0 || pastPlacedTickets.length > 0) && (
          <button
            onClick={onClearHistory}
            className="text-[9px] text-[#ff3950] font-bold hover:underline cursor-pointer"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Scroller Area of compact tickets */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1.5 visible-thin-scrollbar-left" id="tickets-list">
        {activeTab === 'GAME' ? (
          (activeSubTab === 'All' ? activePlacedTickets : activePlacedTickets).map((ticket, idx) => {
            const displayMask = ticket.isMine === false ? String(ticket.userId || `USER***${ticket.id.slice(-3)}`) : `USER***${ticket.id.slice(-3)}`;
            const nums = ticket.selectedNumbers;
            const greenNums = ticket.isMine === false
              ? []
              : nums.filter((num) => activeDrawnNumberSet.has(num));
            const betText = `Bet ${ticket.betAmount}`;
            const isPlacing = placingTicketIds.includes(ticket.id);
            const myTicketLabel = ticket.isMine === false ? displayMask : `${Math.max(1, activePlacedTickets.length - idx)} My Ticket`;

            return (
              <div
                key={ticket.id + '-' + idx}
                className={`p-1.5 rounded-[4px] border transition-all text-xs relative overflow-hidden ${
                  isPlacing
                    ? 'bg-[#245135] border-[#3f8b5f] shadow-[0_0_0_1px_rgba(104,219,146,0.18)]'
                    : 'bg-[#1f2b2e] border-[#2b3a3d]/20'
                }`}
              >
                {isPlacing && (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(165,255,208,0.08)_35%,rgba(255,255,255,0.16)_50%,rgba(165,255,208,0.08)_65%,transparent_100%)] animate-[ticket-sweep_1s_ease-in-out_infinite]" />
                    <div className="pointer-events-none absolute right-2 bottom-2 text-white text-[18px] animate-[ticket-pop_0.65s_ease-in-out_infinite]">✓</div>
                  </>
                )}
                {/* Compact Row 1: Username mask */}
                <div className={`text-[10px] font-extrabold tracking-wide font-mono mb-1 ${isPlacing ? 'text-[#7ff0a6]' : 'text-[#39d98a]'}`}>
                  {ticket.isMine === false || isPlacing ? myTicketLabel : displayMask}
                </div>

                {/* Compact Row 2: Selected numbers in small cubes (22px x 20px) */}
                <div className="flex flex-wrap gap-[3px] mb-1.5">
                  {nums.map((num) => {
                    const isGreen = greenNums.includes(num);
                    return (
                      <div
                        key={num}
                        className={`w-[21px] h-[19px] rounded-[1.5px] flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          isGreen
                            ? 'bg-[#39d98a] text-black'
                            : isPlacing
                            ? 'bg-[#3c6f4c] text-[#f2fff8]'
                            : 'bg-[#34454b] text-[#bfccd0]'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                  
                  {/* Empty slots up to 10 max slots */}
                  {Array.from({ length: Math.max(0, 10 - nums.length) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[21px] h-[19px] rounded-[1.5px] shrink-0 ${isPlacing ? 'bg-[#2b5b3d]' : 'bg-[#182325]'}`}
                    ></div>
                  ))}
                </div>

                {/* Compact Row 3: Horizontal segmented bar */}
                <div className="grid grid-cols-2 gap-[1.5px] text-[11px] font-mono font-bold">
                  <div className={`${isPlacing ? 'bg-[#21452f]' : 'bg-[#141b1d]'} py-[2.5px] px-2 text-white flex items-center justify-start rounded-l-[2.5px]`}>
                    {betText}
                  </div>
                  <div className={`${isPlacing ? 'bg-[#21452f]' : 'bg-[#141b1d]'} py-[2.5px] px-2 text-right flex items-center justify-end rounded-r-[2.5px]`}>
                    <span className={`font-extrabold uppercase text-[10px] ${isPlacing ? 'text-[#7ff0a6] animate-pulse' : 'text-[#facc15]'}`}>
                      Waiting
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          (activeSubTab === 'All' ? pastPlacedTickets : pastPlacedTickets).map((ticket, idx) => {
            const displayMask = ticket.isMine === false ? String(ticket.userId || `USER***${ticket.id.slice(-3)}`) : `USER***${ticket.id.slice(-3)}`;
            const nums = ticket.selectedNumbers;
            const isWon = ticket.status === 'Won';
            const payoutText = ((ticket as any).winAmount || 0).toLocaleString('en-US');
            const wonIndex = isWon ? wonTickets.findIndex((t) => t.id === ticket.id) : -1;
            const wonTicketLabel = ticket.isMine === false ? displayMask : wonIndex >= 0 ? `${Math.max(1, wonTickets.length - wonIndex)} My Ticket` : displayMask;
            const matchedNumberSet = ticket.isMine === false
              ? new Set<number>()
              : new Set(ticket.matchedNumbers || []);

            return (
              <div
                key={ticket.id + '-' + idx}
                className={`${isWon ? 'bg-[#245135] border-[#3f8b5f]' : 'bg-[#1f2b2e] border-[#2b3a3d]/20'} p-1.5 rounded-[4px] border transition-all text-xs`}
              >
                <div className={`text-[10px] font-extrabold tracking-wide font-mono mb-1 flex items-center justify-between ${isWon ? 'text-[#7ff0a6]' : 'text-[#39d98a]'}`}>
                  <span>{wonTicketLabel}</span>
                  <span className={`${isWon ? 'text-[#a7d8ba]' : 'text-zinc-500'} font-normal`}>#{ticket.drawId}</span>
                </div>

                <div className="flex flex-wrap gap-[3px] mb-1.5">
                  {nums.map((num) => {
                    const isMatched = matchedNumberSet.has(num);
                    return (
                    <div
                      key={num}
                      className={`w-[21px] h-[19px] rounded-[1.5px] flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${isMatched ? 'bg-[#39d98a] text-black' : isWon ? 'bg-[#3c6f4c] text-[#f2fff8]' : 'bg-[#34454b] text-[#bfccd0]'}`}
                    >
                      {num}
                    </div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 10 - nums.length) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[21px] h-[19px] rounded-[1.5px] shrink-0 ${isWon ? 'bg-[#2b5b3d]' : 'bg-[#182325]'}`}
                    ></div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-[1.5px] text-[11px] font-mono font-bold">
                  <div className={`${isWon ? 'bg-[#21452f]' : 'bg-[#141b1d]'} py-[2.5px] px-2 text-white flex items-center justify-start rounded-l-[2.5px]`}>
                    Bet {ticket.betAmount}
                  </div>
                  <div className={`${isWon ? 'bg-[#21452f]' : 'bg-[#141b1d]'} py-[2.5px] px-2 text-right flex items-center justify-end rounded-r-[2.5px]`}>
                    {isWon ? (
                      <span className="text-[#39d98a] font-extrabold uppercase text-[10px]">
                        {payoutText}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-bold uppercase text-[9px]">
                        Missed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
