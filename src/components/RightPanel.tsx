import React, { useState } from 'react';
import { Volume2, VolumeX, Maximize, Star, Check, BarChart3, Crown } from 'lucide-react';
import { DrawResult, Leader, HotColdNumber } from '../types';
import { toggleMuted, getMutedState, playClickSound } from '../audio';

interface RightPanelProps {
  drawResults: DrawResult[];
  leaders: Leader[];
  hotNumbers: HotColdNumber[];
  coldNumbers: HotColdNumber[];
  isDrawing: boolean;
  activeDrawnNumbers: number[];
  drawId: string;
  onSelectHistoricCombination: (combination: number[]) => void;
  forceTab?: 'RESULTS' | 'STATISTICS' | 'LEADERS';
  hideHeaderAndQuickMenu?: boolean;
}

type MenuTabType = 'RESULTS' | 'STATISTICS' | 'LEADERS';

const ShieldCheckTiny = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-[11px] h-[11px] text-[#39d98a] shrink-0" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

export default function RightPanel({
  drawResults,
  leaders,
  hotNumbers,
  coldNumbers,
  isDrawing,
  activeDrawnNumbers,
  drawId,
  onSelectHistoricCombination,
  forceTab,
  hideHeaderAndQuickMenu,
}: RightPanelProps) {
  const [localActiveMenuTab, setLocalActiveMenuTab] = useState<MenuTabType>('RESULTS');
  const activeMenuTab = forceTab || localActiveMenuTab;
  const setActiveMenuTab = (tab: MenuTabType) => {
    if (!forceTab) {
      setLocalActiveMenuTab(tab);
    }
  };

  const [soundMuted, setSoundMuted] = useState(getMutedState());
  const [isFavorited, setIsFavorited] = useState(false);

  const handleSoundToggle = () => {
    const isMuted = toggleMuted();
    setSoundMuted(isMuted);
    playClickSound();
  };

  const handleFavoriteToggle = () => {
    setIsFavorited(!isFavorited);
    playClickSound();
  };

  const handleFullscreenToggle = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen helper failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="flex h-full bg-[#11191a] border border-[#1e2a2c] p-2 text-zinc-100 uppercase select-none w-full rounded-md" id="right-panel">
      <style>{`
        .visible-thin-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .visible-thin-scrollbar::-webkit-scrollbar-track {
          background: #11191a;
        }
        .visible-thin-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5b61;
          border-radius: 2px;
        }
        .visible-thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #39d98a;
        }
      `}</style>

      {/* Primary tab content block */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Simple top tabs matching original inline text with icons */}
        {!hideHeaderAndQuickMenu && (
          <div className="flex items-center gap-3 border-b border-[#202d31]/40 pb-1.5 mb-2 text-[10px]" id="right-main-nav">
            <button
              onClick={() => {
                playClickSound();
                setActiveMenuTab('RESULTS');
              }}
              className={`flex items-center gap-1 font-extrabold tracking-wide transition-colors cursor-pointer shrink-0 pb-0.5 border-b-2 ${
                activeMenuTab === 'RESULTS'
                  ? 'text-[#39d98a] border-[#39d98a]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Check className="w-[12px] h-[12px] stroke-[3]" />
              RESULTS
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMenuTab('STATISTICS');
              }}
              className={`flex items-center gap-1 font-extrabold tracking-wide transition-colors cursor-pointer shrink-0 pb-0.5 border-b-2 ${
                activeMenuTab === 'STATISTICS'
                  ? 'text-[#39d98a] border-[#39d98a]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <BarChart3 className="w-[11px] h-[11px] stroke-[2.5]" />
              STATISTICS
            </button>

            <button
              onClick={() => {
                playClickSound();
                setActiveMenuTab('LEADERS');
              }}
              className={`flex items-center gap-1 font-extrabold tracking-wide transition-colors cursor-pointer shrink-0 pb-0.5 border-b-2 ${
                activeMenuTab === 'LEADERS'
                  ? 'text-[#39d98a] border-[#39d98a]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Crown className="w-[11px] h-[11px] fill-current" />
              LEADERS
            </button>
          </div>
        )}

        {/* Views */}
        <div className="flex-1 overflow-y-auto pr-0.5 visible-thin-scrollbar">
          {activeMenuTab === 'RESULTS' && (
            <div className="flex flex-col h-full" id="results-tab-content">
              
              {/* Dense Header for columns */}
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono font-bold px-1.5 mb-1 bg-[#11191a]">
                <span>draw id</span>
                <span>combination</span>
              </div>

              {/* Active Draw wait indicator row strictly aligned */}
              <div className="flex justify-between items-center bg-[#1f2b2e] p-1.5 rounded-[4px] min-h-[38px] mb-[3px] border border-[#2e3e41]/30">
                <div className="flex items-center gap-1 shrink-0 mr-3">
                  <ShieldCheckTiny />
                  <span className="text-[#39d98a] text-[10px] font-mono font-bold tracking-tight">
                    {drawId}
                  </span>
                </div>

                {isDrawing ? (
                  <div className="grid grid-cols-10 gap-[2px]">
                    {Array.from({ length: 20 }).map((_, idx) => {
                      const num = activeDrawnNumbers[idx];
                      const hasValue = num !== undefined;
                      return (
                        <span
                          key={idx}
                          className={`w-[18px] h-[15px] rounded-[1.5px] text-[9px] font-mono font-semibold flex items-center justify-center shrink-0 ${
                            hasValue
                              ? 'bg-[#3f8d5e] text-[#d7dedc] font-black scale-[1.01]'
                              : 'bg-[#151c1d] text-zinc-650 font-normal border border-zinc-900'
                          }`}
                        >
                          {hasValue ? num : '•'}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  /* Center aligned WAIT bar */
                  <div className="flex-1 h-[26px] rounded-[2px] bg-[#4a5b61] flex items-center justify-center">
                    <span className="text-[#bfccd0] font-mono font-black tracking-widest text-[9px]">
                      WAIT
                    </span>
                  </div>
                )}
              </div>

              {/* Draw logs list */}
              <div className="space-y-[3px]" id="results-table">
                {drawResults.map((result) => (
                  <div
                    key={result.drawId}
                    onClick={() => onSelectHistoricCombination(result.combination)}
                    className="flex justify-between items-center bg-[#1f2b2e] p-1.5 rounded-[4px] min-h-[38px] hover:bg-[#253539] transition-all cursor-pointer border border-[#2a3c41]/15"
                    title="Click combination to preview on selection board"
                  >
                    <div className="flex items-center gap-1 select-none shrink-0 pr-2">
                      <ShieldCheckTiny />
                      <div className="flex flex-col leading-none">
                        <span className="text-[#39d98a] text-[10px] font-mono font-bold tracking-tight">
                          {result.drawId}
                        </span>
                        <span className="text-[#39d98a]/80 text-[8px] font-mono leading-none mt-[2.5px]">
                          {result.time || "11:59:44"}
                        </span>
                      </div>
                    </div>

                    {/* Combinations represented as very small rectangular number boxes on 2 rows */}
                    <div className="grid grid-cols-10 gap-[2px] shrink-0">
                      {result.combination.map((ball) => (
                        <span
                          key={ball}
                          className="w-[18px] h-[15px] rounded-[1.5px] bg-[#34454b] text-[#bfccd0] text-[9px] font-mono font-semibold flex items-center justify-center shrink-0"
                        >
                          {ball}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenuTab === 'STATISTICS' && (
            <div className="space-y-2.5 text-xs font-sans pt-1" id="stats-tab-content">
              {/* Cold and hot listing */}
              <div className="bg-[#1f2b2e] p-2 rounded-[4px] border border-[#2a3c41]/20 space-y-2">
                <h3 className="text-[10px] text-[#39d98a] font-extrabold tracking-wider">HOT NUMBERS</h3>
                <div className="grid grid-cols-5 gap-1">
                  {hotNumbers.slice(0, 5).map((item) => (
                    <div key={item.num} className="bg-[#11191a] border border-[#1e2a2c] p-1 rounded text-center">
                      <div className="text-white font-mono font-bold text-xs">{item.num}</div>
                      <div className="text-[8px] text-[#39d98a] font-mono">{item.frequency}x</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1f2b2e] p-2 rounded-[4px] border border-[#2a3c41]/20 space-y-2">
                <h3 className="text-[10px] text-cyan-400 font-extrabold tracking-wider">COLD NUMBERS</h3>
                <div className="grid grid-cols-5 gap-1">
                  {coldNumbers.slice(0, 5).map((item) => (
                    <div key={item.num} className="bg-[#11191a] border border-[#1e2a2c] p-1 rounded text-center">
                      <div className="text-zinc-450 font-mono font-bold text-xs">{item.num}</div>
                      <div className="text-[8px] text-zinc-550 font-mono">{item.frequency}x</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split Stats metadata */}
              <div className="p-2 bg-[#1f2b2e]/50 rounded border border-[#2a3c41]/10 text-[8px] text-zinc-650 font-mono lowercase tracking-normal leading-tight flex flex-col gap-0.5">
                <span>Ratios, frequencies and draw statistics are updated at the completion of each direct local simulation loop.</span>
                <span>no real telemetry or outer network components used.</span>
              </div>
            </div>
          )}

          {activeMenuTab === 'LEADERS' && (
            <div className="space-y-1 text-xs font-mono pt-1" id="leaders-tab-content">
              {/* Headers */}
              <div className="grid grid-cols-12 text-[9px] text-zinc-500 font-bold border-b border-[#202d31]/30 pb-1 px-1">
                <span className="col-span-2">RANK</span>
                <span className="col-span-4">PLAYER</span>
                <span className="col-span-3 text-right">STAKE</span>
                <span className="col-span-3 text-right">WINS</span>
              </div>

              {/* Rows */}
              <div className="space-y-[3px]">
                {leaders.map((item) => (
                  <div
                    key={item.userId + item.rank}
                    className="grid grid-cols-12 items-center bg-[#1f2b2e] p-1 rounded-[4px] border border-[#2a3c41]/10 text-[10px]"
                  >
                    <span className="col-span-2 font-bold text-[#39d98a]">
                      #{item.rank}
                    </span>
                    <span className="col-span-4 text-zinc-300 font-bold">
                      {item.userId}
                    </span>
                    <span className="col-span-3 text-right text-zinc-400">
                      {item.betAmount}
                    </span>
                    <span className="col-span-3 text-right text-[#39d98a] font-black">
                      +{item.winAmount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Settings Action strip with new matching deep borders */}
      {!hideHeaderAndQuickMenu && (
        <div className="w-9 flex flex-col gap-1.5 border-l border-[#202d31]/30 pl-1.5 ml-1.5 justify-start text-zinc-500" id="right-quickres-menu">
          <button
            onClick={handleSoundToggle}
            className="w-6 h-6 rounded bg-[#1f2b2e] border border-[#28393c] hover:border-[#39d98a]/30 hover:text-[#39d98a] transition-colors flex items-center justify-center cursor-pointer"
            title={soundMuted ? 'Unmute game sounds' : 'Mute game sounds'}
          >
            {soundMuted ? <VolumeX className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3" />}
          </button>

          <button
            onClick={handleFavoriteToggle}
            className={`w-6 h-6 rounded bg-[#1f2b2e] border border-[#28393c] hover:border-[#39d98a]/30 hover:text-yellow-400 transition-colors flex items-center justify-center cursor-pointer ${
              isFavorited ? 'text-yellow-400' : ''
            }`}
            title="Favorite room"
          >
            <Star className={`w-3 h-3 ${isFavorited ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleFullscreenToggle}
            className="w-6 h-6 rounded bg-[#1f2b2e] border border-[#28393c] hover:border-[#39d98a]/30 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="Fullscreen Mode"
          >
            <Maximize className="w-3 h-3" />
          </button>
        </div>
      )}

    </div>
  );
}
