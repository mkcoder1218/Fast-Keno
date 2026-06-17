export interface Ticket {
  id: string;
  selectedNumbers: number[];
  betAmount: number;
  timestamp: string;
  status: 'Waiting' | 'Won' | 'Missed' | 'Placing';
  winAmount?: number;
  drawId: string;
  matchedCount?: number;
  matchedNumbers?: number[];
}

export interface DrawResult {
  drawId: string;
  time: string;
  combination: number[];
}

export interface Leader {
  rank: number;
  userId: string;
  winAmount: number;
  betAmount: number;
  multiplier: string;
  time: string;
}

export interface HotColdNumber {
  num: number;
  frequency: number;
}

export type PayTable = Record<number, Record<number, number>>;
