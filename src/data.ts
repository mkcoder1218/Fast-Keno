import { DrawResult, Ticket, Leader, PayTable } from './types';

export const DEFAULT_PAY_TABLE: PayTable = {
  1: { 1: 3.5 },
  2: { 1: 1, 2: 10 },
  3: { 2: 2, 3: 50 },
  4: { 2: 1.5, 3: 10, 4: 80 },
  5: { 2: 1, 3: 3, 4: 30, 5: 150 },
  6: { 3: 2, 4: 15, 5: 60, 6: 500 },
  7: { 0: 1, 3: 2, 4: 4, 5: 20, 6: 80, 7: 1000 },
  8: { 0: 1, 4: 5, 5: 15, 6: 50, 7: 200, 8: 2000 },
  9: { 0: 2, 4: 2, 5: 10, 6: 25, 7: 125, 8: 1000, 9: 5000 },
  10: { 0: 2, 5: 5, 6: 30, 7: 100, 8: 300, 9: 2000, 10: 10000 },
};

export function getMultiplier(payTable: PayTable, picks: number, matches: number): number {
  if (picks <= 0 || matches < 0) return 0;
  return payTable[picks]?.[matches] || 0;
}

// Generate realistic draw results
export function generateRandomCombination(count = 20, min = 1, max = 80): number[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export const INITIAL_DRAWS: DrawResult[] = [
  {
    drawId: '8024921',
    time: '11:48:20',
    combination: [2, 5, 12, 17, 24, 28, 30, 35, 41, 42, 49, 50, 55, 61, 62, 68, 70, 73, 75, 79],
  },
  {
    drawId: '8024920',
    time: '11:47:40',
    combination: [4, 8, 11, 15, 23, 29, 31, 34, 39, 44, 45, 52, 57, 58, 65, 67, 71, 72, 74, 80],
  },
  {
    drawId: '8024919',
    time: '11:47:00',
    combination: [1, 9, 13, 18, 20, 22, 27, 33, 37, 43, 46, 48, 51, 56, 60, 63, 66, 69, 76, 78],
  },
  {
    drawId: '8024918',
    time: '11:46:20',
    combination: [3, 7, 10, 14, 19, 21, 26, 30, 32, 38, 40, 47, 53, 54, 59, 64, 70, 75, 77, 79],
  },
  {
    drawId: '8024917',
    time: '11:45:40',
    combination: [6, 12, 16, 25, 28, 35, 41, 44, 49, 50, 52, 55, 58, 61, 62, 68, 71, 73, 74, 80],
  },
  {
    drawId: '8024916',
    time: '11:45:00',
    combination: [2, 5, 8, 11, 23, 24, 29, 31, 34, 39, 42, 45, 57, 65, 67, 70, 72, 76, 78, 79],
  },
  {
    drawId: '8024915',
    time: '11:44:20',
    combination: [1, 4, 13, 17, 20, 22, 27, 30, 33, 37, 41, 43, 46, 48, 51, 56, 60, 63, 66, 69],
  }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'T-9821-1',
    drawId: '8024921',
    selectedNumbers: [5, 12, 28, 42, 50, 68, 75],
    betAmount: 50,
    timestamp: '11:48:02',
    status: 'Won',
    winAmount: 750, // x15 for 6 matches on 7 picks (5, 12, 28, 42, 50, 68, 75 contains 2,5,12,17,24,28,30,35,41,42,49,50,55,61,62,68,70,73,75,79 -> matches: 5, 12, 28, 42, 50, 68, 75 => 7/7 matched!)
    matchedCount: 7,
    matchedNumbers: [5, 12, 28, 42, 50, 68, 75]
  },
  {
    id: 'T-9820-1',
    drawId: '8024920',
    selectedNumbers: [10, 15, 23, 44, 52, 60, 70, 75],
    betAmount: 100,
    timestamp: '11:47:15',
    status: 'Won',
    winAmount: 200, // x2 for 4 matches on 8 picks
    matchedCount: 4,
    matchedNumbers: [15, 23, 44, 52]
  },
  {
    id: 'T-9819-1',
    drawId: '8024919',
    selectedNumbers: [4, 12, 25, 36, 44, 58, 62, 71],
    betAmount: 20,
    timestamp: '11:46:51',
    status: 'Missed',
    winAmount: 0,
    matchedCount: 0,
    matchedNumbers: []
  }
];

export const INITIAL_LEADERS: Leader[] = [
  { rank: 1, userId: 'ET***88', winAmount: 984000, betAmount: 1000, multiplier: 'x984', time: '11:40:22' },
  { rank: 2, userId: 'KE***99', winAmount: 432000, betAmount: 500, multiplier: 'x864', time: '11:42:15' },
  { rank: 3, userId: 'ET***44', winAmount: 285000, betAmount: 300, multiplier: 'x950', time: '11:38:09' },
  { rank: 4, userId: 'UG***51', winAmount: 180000, betAmount: 400, multiplier: 'x450', time: '11:45:01' },
  { rank: 5, userId: 'TZ***12', winAmount: 125000, betAmount: 250, multiplier: 'x500', time: '11:41:40' },
  { rank: 6, userId: 'NG***23', winAmount: 97500, betAmount: 150, multiplier: 'x650', time: '11:44:11' },
  { rank: 7, userId: 'ET***05', winAmount: 85000, betAmount: 100, multiplier: 'x850', time: '11:46:00' },
  { rank: 8, userId: 'ZA***77', winAmount: 72000, betAmount: 200, multiplier: 'x360', time: '11:43:18' },
  { rank: 9, userId: 'GH***19', winAmount: 48000, betAmount: 120, multiplier: 'x400', time: '11:45:50' },
  { rank: 10, userId: 'ET***64', winAmount: 35000, betAmount: 100, multiplier: 'x350', time: '11:47:04' },
];

// Seedable frequencies for Hot/Cold numbers
export const HOT_NUMBERS = [
  { num: 12, frequency: 42 },
  { num: 28, frequency: 39 },
  { num: 50, frequency: 38 },
  { num: 75, frequency: 36 },
  { num: 2,  frequency: 35 },
  { num: 79, frequency: 33 },
];

export const COLD_NUMBERS = [
  { num: 43, frequency: 3 },
  { num: 19, frequency: 4 },
  { num: 66, frequency: 6 },
  { num: 33, frequency: 7 },
  { num: 8,  frequency: 9 },
  { num: 51, frequency: 10 },
];
