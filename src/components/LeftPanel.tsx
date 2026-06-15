import React, { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Ticket } from '../types';

interface LeftPanelProps {
  balance: number;
  userId: string;
  tickets: Ticket[];
  onClearHistory: () => void;
  onQuickAddFunds: () => void;
  forceTab?: 'GAME' | 'HISTORY';
  hideHeader?: boolean;
}

type TabType = 'GAME' | 'HISTORY';
type SubTabType = 'All' | 'My Tickets' | 'My Bets';

interface MockTicket {
  id: string;
  displayMask: string;
  selectedNumbers: number[];
  greenNumbers?: number[];
  betAmountText: string;
  status: 'Waiting' | 'Won' | 'Missed';
}

const ShieldCheckTiny = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-[12px] h-[12px] text-[#39d98a] shrink-0" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

// High fidelity replica mock tickets matching the real screenshot
const GAME_MOCK_TICKETS: MockTicket[] = [
  { id: 'm1', displayMask: '7***6', selectedNumbers: [76, 23, 32, 15], betAmountText: 'Bet 1 200', status: 'Waiting' },
  { id: 'm2', displayMask: '7***2', selectedNumbers: [76, 77, 78], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm3', displayMask: '7***2', selectedNumbers: [77, 78, 79], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm4', displayMask: '3***0', selectedNumbers: [15, 16, 17], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm5', displayMask: '2***5', selectedNumbers: [38, 28, 48], greenNumbers: [48], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm6', displayMask: '3***0', selectedNumbers: [52, 53], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm7', displayMask: '3***0', selectedNumbers: [22, 12, 2], greenNumbers: [2], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm8', displayMask: '2***5', selectedNumbers: [9, 10, 11], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm9', displayMask: '4***1', selectedNumbers: [66, 67, 68], betAmountText: 'Bet 500', status: 'Waiting' },
  { id: 'm10', displayMask: '5***8', selectedNumbers: [50, 60], betAmountText: 'Bet 1 500', status: 'Waiting' },
];

export default function LeftPanel({
  balance,
  userId,
  tickets,
  onClearHistory,
  onQuickAddFunds,
  forceTab,
  hideHeader,
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

  // All gaming tickets (placed user tickets + high quality mocks)
  const allGameTickets = [...activePlacedTickets, ...GAME_MOCK_TICKETS];

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
      `}</style>

      {/* Top Wallet & User ID row precisely as screenshot - 40px high */}
      {!hideHeader && (
        <>
          <div className="flex items-center justify-between h-9 mb-1.5 px-0.5">
            {/* Balance Yellow Capsule Pill */}
            <button
              onClick={onQuickAddFunds}
              className="bg-transparent border border-[#39d98a] px-3 py-1 rounded-full text-left cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 hover:bg-[#39d98a]/5 h-7"
              title="Click to double balance (Demo Mode)"
              id="balance-button"
            >
              <span className="text-[#facc15] text-[13px] font-black tracking-wide font-mono leading-none">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-[#bfccd0] font-bold ml-0.5 leading-none mt-0.5">ETB</span>
            </button>

            {/* User ID display on same row */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-350" id="user-id-badge">
              <span className="text-zinc-500 font-bold">ID:</span>
              <span className="font-bold">881428744</span>
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
              {activeTab === 'GAME' ? 2481 + activePlacedTickets.length : 182 + pastPlacedTickets.length}
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
          // GAME VIEW (Always full, with combined Mock Tickets + User Active placed tickets)
          (activeSubTab === 'All' ? allGameTickets : activePlacedTickets).map((ticket, idx) => {
            const isMock = 'displayMask' in ticket;
            const displayMask = isMock ? (ticket as any).displayMask : `USER***${ticket.id.slice(-3)}`;
            const nums = ticket.selectedNumbers;
            const greenNums = (ticket as any).greenNumbers || [];
            const betText = (ticket as any).betAmountText || `Bet ${(ticket as any).betAmount}`;

            return (
              <div
                key={ticket.id + '-' + idx}
                className="bg-[#1f2b2e] p-1.5 rounded-[4px] border border-[#2b3a3d]/20 transition-all text-xs"
              >
                {/* Compact Row 1: Username mask */}
                <div className="text-[#39d98a] text-[10px] font-extrabold tracking-wide font-mono mb-1">
                  {displayMask}
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
                      className="w-[21px] h-[19px] rounded-[1.5px] bg-[#182325] shrink-0"
                    ></div>
                  ))}
                </div>

                {/* Compact Row 3: Horizontal segmented bar */}
                <div className="grid grid-cols-2 gap-[1.5px] text-[11px] font-mono font-bold">
                  <div className="bg-[#141b1d] py-[2.5px] px-2 text-white flex items-center justify-start rounded-l-[2.5px]">
                    {betText}
                  </div>
                  <div className="bg-[#141b1d] py-[2.5px] px-2 text-right flex items-center justify-end rounded-r-[2.5px]">
                    <span className="text-[#facc15] font-extrabold uppercase text-[10px]">
                      Waiting
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // HISTORY TAB VIEW: Past games / Draws Results (Mock or Real Results)
          (activeSubTab === 'All' ? (pastPlacedTickets.length > 0 ? pastPlacedTickets : [
            { id: 'h1', drawId: '8024921', selectedNumbers: [76, 23, 32, 15], betAmount: 1200, status: 'Won', winAmount: 2400 },
            { id: 'h2', drawId: '8024920', selectedNumbers: [5, 10, 20], betAmount: 500, status: 'Missed', winAmount: 0 },
          ]) : pastPlacedTickets).map((ticket, idx) => {
            const displayMask = `USER***${ticket.id.slice(-3)}`;
            const nums = ticket.selectedNumbers;
            const isWon = ticket.status === 'Won';

            return (
              <div
                key={ticket.id + '-' + idx}
                className="bg-[#1f2b2e] p-1.5 rounded-[4px] border border-[#2b3a3d]/20 transition-all text-xs"
              >
                <div className="text-[#39d98a] text-[10px] font-extrabold tracking-wide font-mono mb-1 flex items-center justify-between">
                  <span>{displayMask}</span>
                  <span className="text-zinc-500 font-normal">#{ticket.drawId}</span>
                </div>

                <div className="flex flex-wrap gap-[3px] mb-1.5">
                  {nums.map((num) => (
                    <div
                      key={num}
                      className="w-[21px] h-[19px] rounded-[1.5px] flex items-center justify-center text-[10px] font-mono font-bold shrink-0 bg-[#34454b] text-[#bfccd0]"
                    >
                      {num}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - nums.length) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[21px] h-[19px] rounded-[1.5px] bg-[#182325] shrink-0"
                    ></div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-[1.5px] text-[11px] font-mono font-bold">
                  <div className="bg-[#141b1d] py-[2.5px] px-2 text-white flex items-center justify-start rounded-l-[2.5px]">
                    Bet {ticket.betAmount}
                  </div>
                  <div className="bg-[#141b1d] py-[2.5px] px-2 text-right flex items-center justify-end rounded-r-[2.5px]">
                    {isWon ? (
                      <span className="text-[#39d98a] font-extrabold uppercase text-[10px]">
                        WON +{(ticket as any).winAmount || ticket.betAmount * 2}
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
