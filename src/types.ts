export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export enum FaceIndex {
  U = 0, // Top (+Y)
  D = 1, // Bottom (-Y)
  F = 2, // Front (+Z)
  B = 3, // Back (-Z)
  L = 4, // Left (-X)
  R = 5, // Right (+X)
}

export type ColorHex = string;

export interface CubePalette {
  name: string;
  U: ColorHex; // Top (White)
  D: ColorHex; // Bottom (Yellow)
  F: ColorHex; // Front (Green)
  B: ColorHex; // Back (Blue)
  L: ColorHex; // Left (Orange)
  R: ColorHex; // Right (Red)
  body: ColorHex; // Inner plastic color
}

export interface MoveStep {
  axis: 'x' | 'y' | 'z';
  sliceIndex: number; // 0 to N-1
  dir: 1 | -1; // 1 = clockwise around axis, -1 = counter-clockwise
  notation?: string;
  duration?: number;
}

export interface SolveRecord {
  id: string;
  size: number;
  timeMs: number;
  movesCount: number;
  date: string;
  scramble: string;
}

export type ViewMode = 'rotate-cube' | 'rotate-slice';

export interface SpeedTier {
  id: string;
  label: string;
  fingerTag: string;
  turnsPerMin: number;
}

export const SPEED_TIERS: SpeedTier[] = [
  { id: 'normal', label: '600 /min', fingerTag: '600 /min • Normal (1 dedo)', turnsPerMin: 600 },
  { id: 'medio', label: '1,200 /min', fingerTag: '1,200 /min • Medio (2 dedos)', turnsPerMin: 1200 },
  { id: 'rapido', label: '1,800 /min', fingerTag: '1,800 /min • Rápido (3 dedos)', turnsPerMin: 1800 },
  { id: 'muy_rapido', label: '2,400 /min', fingerTag: '2,400 /min • Muy Rápido (4 dedos)', turnsPerMin: 2400 },
  { id: 'extra_rapido', label: '3,000 /min', fingerTag: '3,000 /min • Extra Rápido (1 mano)', turnsPerMin: 3000 },
  { id: 'super_rapido', label: '6,000 /min', fingerTag: '6,000 /min • Super Rápido (2 manos)', turnsPerMin: 6000 },
  { id: 'flash', label: '12,000 /min', fingerTag: '12,000 /min • Flash (2 pies y 2 manos = 20 dedos)', turnsPerMin: 12000 },
];
