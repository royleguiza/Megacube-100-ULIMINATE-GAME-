import { FaceIndex, FaceName, MoveStep, CubePalette } from '../types';

export const DEFAULT_PALETTE: CubePalette = {
  name: 'Clásico',
  U: '#FFFFFF', // Top - White
  D: '#FFD500', // Bottom - Yellow
  F: '#009E60', // Front - Green
  B: '#0051BA', // Back - Blue
  L: '#FF5800', // Left - Orange
  R: '#C41E3A', // Right - Red
  body: '#18181B', // Dark plastic
};

export const PALETTES: CubePalette[] = [
  DEFAULT_PALETTE,
  {
    name: 'Neón Oscuro',
    U: '#E0F2FE',
    D: '#FACC15',
    F: '#4ADE80',
    B: '#38BDF8',
    L: '#FB923C',
    R: '#F43F5E',
    body: '#09090B',
  },
  {
    name: 'Pastel Suave',
    U: '#F8FAFC',
    D: '#FEF08A',
    F: '#86EFAC',
    B: '#93C5FD',
    L: '#FDBA74',
    R: '#FDA4AF',
    body: '#27272A',
  },
  {
    name: 'Alto Contraste',
    U: '#FFFFFF',
    D: '#FFFF00',
    F: '#00FF00',
    B: '#0000FF',
    L: '#FF8000',
    R: '#FF0000',
    body: '#000000',
  },
];

// Face 2D state matrix array for each of the 6 faces
// faces[faceIndex][row][col] = colorIndex (0..5)
export type CubeState = number[][][];

/**
 * Creates a solved cube state of size N x N x N
 */
export function createSolvedState(N: number): CubeState {
  const faces: CubeState = [];
  for (let f = 0; f < 6; f++) {
    const face: number[][] = [];
    for (let r = 0; r < N; r++) {
      const row: number[] = new Array(N).fill(f);
      face.push(row);
    }
    faces.push(face);
  }
  return faces;
}

/**
 * Checks if the cube state is completely solved
 */
export function isStateSolved(state: CubeState): boolean {
  const N = state[0].length;
  for (let f = 0; f < 6; f++) {
    const targetColor = state[f][0][0];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (state[f][r][c] !== targetColor) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Helper to rotate a 2D N x N array in place or return new rotated array
 * dir = 1 (clockwise 90 deg), dir = -1 (counter-clockwise 90 deg)
 */
export function rotate2DMatrix<T>(matrix: T[][], dir: 1 | -1): T[][] {
  const N = matrix.length;
  const result: T[][] = Array.from({ length: N }, () => new Array(N));

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (dir === 1) {
        result[c][N - 1 - r] = matrix[r][c];
      } else {
        result[N - 1 - c][r] = matrix[r][c];
      }
    }
  }

  return result;
}

/**
 * Deep clones the CubeState
 */
export function cloneState(state: CubeState): CubeState {
  return state.map((face) => face.map((row) => [...row]));
}

/**
 * Applies a slice/layer rotation to the CubeState and returns the new state.
 * axis: 'x' | 'y' | 'z'
 * sliceIndex: 0 to N-1
 * dir: 1 (clockwise) or -1 (counter-clockwise)
 */
export function applyMove(
  state: CubeState,
  axis: 'x' | 'y' | 'z',
  sliceIndex: number,
  dir: 1 | -1
): CubeState {
  const next = cloneState(state);
  const N = state[0].length;
  const k = Math.max(0, Math.min(N - 1, sliceIndex));

  if (axis === 'y') {
    // Rotating layer around Y axis (+Y pointing UP)
    // If k === 0 (Top layer), rotate U face clockwise (dir=1) or CCW (dir=-1)
    if (k === 0) {
      next[FaceIndex.U] = rotate2DMatrix(next[FaceIndex.U], dir);
    }
    // If k === N - 1 (Bottom layer), rotate D face CCW (dir=1) or CW (dir=-1)
    if (k === N - 1) {
      next[FaceIndex.D] = rotate2DMatrix(next[FaceIndex.D], (dir * -1) as 1 | -1);
    }

    // Ring affected: Front, Right, Back, Left at row k
    const fRow = [...state[FaceIndex.F][k]];
    const rRow = [...state[FaceIndex.R][k]];
    const bRow = [...state[FaceIndex.B][k]];
    const lRow = [...state[FaceIndex.L][k]];

    if (dir === 1) {
      // CW (+Y): F -> L -> B -> R -> F
      next[FaceIndex.L][k] = fRow;
      next[FaceIndex.B][k] = lRow;
      next[FaceIndex.R][k] = bRow;
      next[FaceIndex.F][k] = rRow;
    } else {
      // CCW (+Y): F -> R -> B -> L -> F
      next[FaceIndex.R][k] = fRow;
      next[FaceIndex.B][k] = rRow;
      next[FaceIndex.L][k] = bRow;
      next[FaceIndex.F][k] = lRow;
    }
  } else if (axis === 'x') {
    // Rotating layer around X axis (+X pointing RIGHT)
    // k = 0 is Right face, k = N-1 is Left face
    if (k === 0) {
      next[FaceIndex.R] = rotate2DMatrix(next[FaceIndex.R], dir);
    }
    if (k === N - 1) {
      next[FaceIndex.L] = rotate2DMatrix(next[FaceIndex.L], (dir * -1) as 1 | -1);
    }

    // Slice coordinates on surrounding faces:
    // Front: col (N - 1 - k)
    // Top (U): col (N - 1 - k)
    // Back: col k
    // Bottom (D): col (N - 1 - k)

    const colF = Math.max(0, Math.min(N - 1, N - 1 - k));
    const colU = colF;
    const colB = k;
    const colD = colF;

    const uVals: number[] = [];
    const bVals: number[] = [];
    const dVals: number[] = [];
    const fVals: number[] = [];

    for (let r = 0; r < N; r++) {
      uVals.push(state[FaceIndex.U][r][colU]);
      bVals.push(state[FaceIndex.B][r][colB]);
      dVals.push(state[FaceIndex.D][r][colD]);
      fVals.push(state[FaceIndex.F][r][colF]);
    }

    if (dir === 1) {
      // CW (+X looking from Right): Top -> Back -> Bottom -> Front -> Top
      // Note: Back col k goes in reverse order relative to Top col
      for (let r = 0; r < N; r++) {
        next[FaceIndex.B][N - 1 - r][colB] = uVals[r];
        next[FaceIndex.D][r][colD] = bVals[N - 1 - r];
        next[FaceIndex.F][r][colF] = dVals[r];
        next[FaceIndex.U][r][colU] = fVals[r];
      }
    } else {
      // CCW (+X): Top -> Front -> Bottom -> Back -> Top
      for (let r = 0; r < N; r++) {
        next[FaceIndex.F][r][colF] = uVals[r];
        next[FaceIndex.D][r][colD] = fVals[r];
        next[FaceIndex.B][N - 1 - r][colB] = dVals[r];
        next[FaceIndex.U][r][colU] = bVals[N - 1 - r];
      }
    }
  } else if (axis === 'z') {
    // Rotating layer around Z axis (+Z pointing FRONT)
    // k = 0 is Front face, k = N-1 is Back face
    if (k === 0) {
      next[FaceIndex.F] = rotate2DMatrix(next[FaceIndex.F], dir);
    }
    if (k === N - 1) {
      next[FaceIndex.B] = rotate2DMatrix(next[FaceIndex.B], (dir * -1) as 1 | -1);
    }

    // Surrounding ring:
    // Top (U): row (N - 1 - k)
    // Right (R): col k
    // Bottom (D): row k
    // Left (L): col (N - 1 - k)

    const rowU = Math.max(0, Math.min(N - 1, N - 1 - k));
    const colR = k;
    const rowD = k;
    const colL = Math.max(0, Math.min(N - 1, N - 1 - k));

    const uRow = [...state[FaceIndex.U][rowU]];
    const rCol: number[] = [];
    const dRow = [...state[FaceIndex.D][rowD]];
    const lCol: number[] = [];

    for (let r = 0; r < N; r++) {
      rCol.push(state[FaceIndex.R][r][colR]);
      lCol.push(state[FaceIndex.L][r][colL]);
    }

    if (dir === 1) {
      // CW (+Z): U row -> R col -> D row -> L col -> U row
      for (let i = 0; i < N; i++) {
        next[FaceIndex.R][i][colR] = uRow[i];
        next[FaceIndex.D][rowD][N - 1 - i] = rCol[i];
        next[FaceIndex.L][i][colL] = dRow[i];
        next[FaceIndex.U][rowU][N - 1 - i] = lCol[i];
      }
    } else {
      // CCW (+Z): U row -> L col -> D row -> R col -> U row
      for (let i = 0; i < N; i++) {
        next[FaceIndex.L][N - 1 - i][colL] = uRow[i];
        next[FaceIndex.D][rowD][i] = lCol[i];
        next[FaceIndex.R][N - 1 - i][colR] = dRow[i];
        next[FaceIndex.U][rowU][i] = rCol[i];
      }
    }
  }

  return next;
}

/**
 * Converts a MoveStep into standard Rubik notation string (e.g., R, U', L2, 2R, etc.)
 */
export function formatNotation(move: MoveStep, N: number): string {
  const { axis, sliceIndex, dir } = move;
  const dirStr = dir === -1 ? "'" : "";

  if (axis === 'y') {
    if (sliceIndex === 0) return `U${dirStr}`;
    if (sliceIndex === N - 1) return `D${dir === 1 ? "'" : ""}`;
    return `Y[${sliceIndex + 1}]${dirStr}`;
  } else if (axis === 'x') {
    if (sliceIndex === 0) return `R${dirStr}`;
    if (sliceIndex === N - 1) return `L${dir === 1 ? "'" : ""}`;
    return `X[${sliceIndex + 1}]${dirStr}`;
  } else {
    if (sliceIndex === 0) return `F${dirStr}`;
    if (sliceIndex === N - 1) return `B${dir === 1 ? "'" : ""}`;
    return `Z[${sliceIndex + 1}]${dirStr}`;
  }
}

/**
 * Generates a list of random moves to scramble a cube of size N
 */
export function generateScrambleMoves(N: number, count?: number): MoveStep[] {
  const numMoves = count || Math.min(Math.max(15, N * 8), 40);
  const moves: MoveStep[] = [];
  const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];

  let lastAxis: 'x' | 'y' | 'z' | null = null;
  let lastSlice = -1;

  for (let i = 0; i < numMoves; i++) {
    let axis: 'x' | 'y' | 'z';
    let sliceIndex: number;

    // Avoid redundant back-to-back moves on same slice
    do {
      axis = axes[Math.floor(Math.random() * 3)];
      // Choose sliceIndex randomly: heavier probability on outer layers, but inner layers for N > 3
      if (N <= 3) {
        sliceIndex = Math.floor(Math.random() * N);
      } else {
        const rand = Math.random();
        if (rand < 0.4) sliceIndex = 0;
        else if (rand < 0.8) sliceIndex = N - 1;
        else sliceIndex = Math.floor(Math.random() * N);
      }
    } while (axis === lastAxis && sliceIndex === lastSlice);

    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const move: MoveStep = {
      axis,
      sliceIndex,
      dir,
      notation: formatNotation({ axis, sliceIndex, dir }, N),
    };

    moves.push(move);
    lastAxis = axis;
    lastSlice = sliceIndex;
  }

  return moves;
}

/**
 * Convert color index to hex color string using chosen palette
 */
export function getColorHex(colorIndex: number, palette: CubePalette): string {
  switch (colorIndex) {
    case FaceIndex.U: return palette.U;
    case FaceIndex.D: return palette.D;
    case FaceIndex.F: return palette.F;
    case FaceIndex.B: return palette.B;
    case FaceIndex.L: return palette.L;
    case FaceIndex.R: return palette.R;
    default: return palette.body;
  }
}
