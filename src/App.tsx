import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { HelpCircle, Sparkles, Box, Palette, RefreshCw } from 'lucide-react';

import { RubikCanvas } from './components/RubikCanvas';
import { CubeControls } from './components/CubeControls';
import { TimerPanel } from './components/TimerPanel';
import { ColorCustomizer } from './components/ColorCustomizer';
import { HelpModal } from './components/HelpModal';

import {
  createSolvedState,
  generateScrambleMoves,
  DEFAULT_PALETTE,
  isStateSolved,
  applyMove,
  CubeState,
} from './utils/cubeLogic';

import { CubePalette, MoveStep, ViewMode, SpeedTier, SPEED_TIERS } from './types';

export default function App() {
  const [cubeSize, setCubeSize] = useState<number>(3);
  const [cubeState, setCubeState] = useState<CubeState>(() => createSolvedState(3));
  const [palette, setPalette] = useState<CubePalette>(DEFAULT_PALETTE);
  const [viewMode, setViewMode] = useState<ViewMode>('rotate-slice');
  const [animSpeedMs, setAnimSpeedMs] = useState<number>(200);

  // Speed tiers and turbo hold states
  const [selectedSpeedTier, setSelectedSpeedTier] = useState<SpeedTier>(SPEED_TIERS[0]);
  const [isVirtualTurboHolding, setIsVirtualTurboHolding] = useState<boolean>(false);

  // Moves tracking
  const [moveHistory, setMoveHistory] = useState<MoveStep[]>([]);
  const [redoStack, setRedoStack] = useState<MoveStep[]>([]);
  const [animatingMove, setAnimatingMove] = useState<MoveStep | null>(null);

  // Handle Turbo Spin moves update from right-click or virtual hold
  const handleTurboTurn = useCallback((moves: MoveStep[], nextCubeState: CubeState) => {
    setCubeState(nextCubeState);
    setMoveHistory((prev) => [...prev, ...moves]);
    setIsSolved(false);
  }, []);

  // States
  const [isSolved, setIsSolved] = useState<boolean>(true);
  const [isAutoSolving, setIsAutoSolving] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'timer' | 'palette'>('controls');

  // Active solve moves counter (excluding scramble)
  const [solveMoveCount, setSolveMoveCount] = useState<number>(0);
  const isScramblingRef = useRef<boolean>(false);

  // Auto solve queue refs
  const autoSolveQueueRef = useRef<MoveStep[]>([]);
  const isAutoSolvingRef = useRef<boolean>(false);

  // Change size callback
  const handleSetCubeSize = useCallback((newSize: number) => {
    if (newSize < 2 || newSize > 100) return;
    isAutoSolvingRef.current = false;
    autoSolveQueueRef.current = [];
    setCubeSize(newSize);
    setCubeState(createSolvedState(newSize));
    setMoveHistory([]);
    setRedoStack([]);
    setIsSolved(true);
    setSolveMoveCount(0);
    setIsAutoSolving(false);
  }, []);

  // Trigger single move
  const handleTriggerMove = useCallback((move: MoveStep) => {
    if (animatingMove) return; // Wait for current animation
    setAnimatingMove(move);
  }, [animatingMove]);

  const autoSolveDurationRef = useRef<number>(60);

  // Callback after move finishes animation
  const handleMoveComplete = useCallback((completedMove: MoveStep) => {
    if (isAutoSolvingRef.current) {
      if (autoSolveQueueRef.current.length > 0) {
        const nextMove = autoSolveQueueRef.current.shift()!;
        const dur = autoSolveDurationRef.current || 50;
        setAnimatingMove({ ...nextMove, duration: dur });
      } else {
        isAutoSolvingRef.current = false;
        setIsAutoSolving(false);
        setMoveHistory([]);
        setRedoStack([]);
        setCubeState(createSolvedState(cubeSize));
        setIsSolved(true);
        confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#009E60', '#FFD500', '#FF5800', '#C41E3A', '#0051BA', '#FFFFFF'],
        });
      }
      return;
    }

    if (!isScramblingRef.current) {
      setMoveHistory((prev) => [...prev, completedMove]);
      setRedoStack([]); // clear redo stack on new action
      setSolveMoveCount((prev) => prev + 1);
      setIsSolved(false);
    }
  }, [cubeSize]);

  // Handle Scramble
  const handleScramble = useCallback(() => {
    isScramblingRef.current = true;
    const scrambleMoves = generateScrambleMoves(cubeSize);

    // Apply moves sequentially without heavy animation delay for instant scramble setup
    let currState = createSolvedState(cubeSize);
    scrambleMoves.forEach((m) => {
      currState = applyMove(currState, m.axis, m.sliceIndex, m.dir);
    });

    setCubeState(currState);
    setMoveHistory(scrambleMoves);
    setRedoStack([]);
    setIsSolved(false);
    setSolveMoveCount(0);
    isScramblingRef.current = false;
  }, [cubeSize]);

  // Handle Reset to solved
  const handleReset = useCallback(() => {
    isAutoSolvingRef.current = false;
    autoSolveQueueRef.current = [];
    setCubeState(createSolvedState(cubeSize));
    setMoveHistory([]);
    setRedoStack([]);
    setIsSolved(true);
    setSolveMoveCount(0);
    setIsAutoSolving(false);
  }, [cubeSize]);

  // Undo move
  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || animatingMove) return;
    const lastMove = moveHistory[moveHistory.length - 1];

    // Inverse move: same axis & slice, opposite direction
    const inverseMove: MoveStep = {
      ...lastMove,
      dir: (lastMove.dir * -1) as 1 | -1,
    };

    setMoveHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [lastMove, ...prev]);
    setAnimatingMove(inverseMove);
  }, [moveHistory, animatingMove]);

  // Redo move
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || animatingMove) return;
    const nextMove = redoStack[0];

    setRedoStack((prev) => prev.slice(1));
    setMoveHistory((prev) => [...prev, nextMove]);
    setAnimatingMove(nextMove);
  }, [redoStack, animatingMove]);

  const MAX_AUTO_SOLVE_TURNS = 73500;

  // Auto Solve: reverses move history step-by-step with real 3D layer rotation animations
  const handleAutoSolve = useCallback(() => {
    if (isAutoSolvingRef.current) return;

    // Enforce maximum cap of 73,500 turns
    const movesToReverse = moveHistory.slice(-MAX_AUTO_SOLVE_TURNS).reverse();

    if (movesToReverse.length === 0) {
      if (isStateSolved(cubeState)) {
        setIsSolved(true);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      } else {
        // If state isn't solved and moveHistory is empty, set solved state gracefully
        setCubeState(createSolvedState(cubeSize));
        setIsSolved(true);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
      }
      return;
    }

    const inverseMoves: MoveStep[] = movesToReverse.map((m) => ({
      ...m,
      dir: (m.dir * -1) as 1 | -1,
    }));

    // Calculate dynamic animation speed based on move count so user always sees real 3D layer rotations
    let animDur = 80;
    if (inverseMoves.length > 200) {
      animDur = 15;
    } else if (inverseMoves.length > 100) {
      animDur = 25;
    } else if (inverseMoves.length > 40) {
      animDur = 40;
    } else if (inverseMoves.length > 15) {
      animDur = 60;
    }

    autoSolveDurationRef.current = animDur;
    isAutoSolvingRef.current = true;
    setIsAutoSolving(true);

    autoSolveQueueRef.current = [...inverseMoves];
    const firstMove = autoSolveQueueRef.current.shift()!;
    setAnimatingMove({ ...firstMove, duration: animDur });
  }, [moveHistory, cubeSize, cubeState]);

  // Solve All: Triggers the same realistic animated step-by-step 3D solver sequence
  const handleSolveAll = useCallback(() => {
    handleAutoSolve();
  }, [handleAutoSolve]);

  // Solve detection celebration
  const handleSolved = useCallback(() => {
    setIsSolved(true);
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#009E60', '#FFD500', '#FF5800', '#C41E3A', '#0051BA', '#FFFFFF'],
    });
  }, []);

  // Keyboard Shortcuts (U, D, R, L, F, B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      const isShift = e.shiftKey;
      const dir: 1 | -1 = isShift ? -1 : 1;

      switch (key) {
        case 'U': handleTriggerMove({ axis: 'y', sliceIndex: 0, dir }); break;
        case 'D': handleTriggerMove({ axis: 'y', sliceIndex: cubeSize - 1, dir: (dir * -1) as 1 | -1 }); break;
        case 'R': handleTriggerMove({ axis: 'x', sliceIndex: 0, dir }); break;
        case 'L': handleTriggerMove({ axis: 'x', sliceIndex: cubeSize - 1, dir: (dir * -1) as 1 | -1 }); break;
        case 'F': handleTriggerMove({ axis: 'z', sliceIndex: 0, dir }); break;
        case 'B': handleTriggerMove({ axis: 'z', sliceIndex: cubeSize - 1, dir: (dir * -1) as 1 | -1 }); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cubeSize, handleTriggerMove]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Cubo de Rubik NxN
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Simulador 3D Interactivo (2x2 — 100x100)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700/80 transition-all shadow-md active:scale-95"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Guía & Ayuda</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Column: 3D Interactive WebGL Rubik Canvas */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 w-full h-[520px] sm:h-[620px] sticky top-20">
          <RubikCanvas
            cubeState={cubeState}
            setCubeState={setCubeState}
            palette={palette}
            animSpeedMs={animSpeedMs}
            viewMode={viewMode}
            onMoveComplete={handleMoveComplete}
            onSolved={handleSolved}
            animatingMove={animatingMove}
            setAnimatingMove={setAnimatingMove}
            selectedSpeedTier={selectedSpeedTier}
            onTurboTurn={handleTurboTurn}
            isVirtualTurboHolding={isVirtualTurboHolding}
          />

          {/* Quick Info Banner below Canvas */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
            <span>Tiro Total: <strong className="text-indigo-400">{moveHistory.length}</strong></span>
            <span>Tamaño actual: <strong className="text-white">{cubeSize}x{cubeSize}x{cubeSize}</strong></span>
            <span>Estado: {isSolved ? <strong className="text-emerald-400">¡Resuelto!</strong> : <strong className="text-amber-400">En Progreso</strong>}</span>
          </div>
        </section>

        {/* Right Column: Control Panels & Navigation Tabs */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 w-full">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'controls'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Controles
            </button>

            <button
              onClick={() => setActiveTab('timer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'timer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cronómetro
            </button>

            <button
              onClick={() => setActiveTab('palette')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'palette'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Colores
            </button>
          </div>

          {/* Active Tab Component */}
          {activeTab === 'controls' && (
            <CubeControls
              cubeSize={cubeSize}
              setCubeSize={handleSetCubeSize}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onScramble={handleScramble}
              onReset={handleReset}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={moveHistory.length > 0}
              canRedo={redoStack.length > 0}
              animSpeedMs={animSpeedMs}
              setAnimSpeedMs={setAnimSpeedMs}
              onTriggerMove={handleTriggerMove}
              historyLength={moveHistory.length}
              isAutoSolving={isAutoSolving}
              onAutoSolve={handleAutoSolve}
              onSolveAll={handleSolveAll}
              maxTurnsCap={MAX_AUTO_SOLVE_TURNS}
              selectedSpeedTier={selectedSpeedTier}
              setSelectedSpeedTier={setSelectedSpeedTier}
              isVirtualTurboHolding={isVirtualTurboHolding}
              setIsVirtualTurboHolding={setIsVirtualTurboHolding}
            />
          )}

          {activeTab === 'timer' && (
            <TimerPanel
              cubeSize={cubeSize}
              isSolved={isSolved}
              moveCount={solveMoveCount}
            />
          )}

          {activeTab === 'palette' && (
            <ColorCustomizer
              palette={palette}
              setPalette={setPalette}
            />
          )}
        </section>
      </main>

      {/* Instructions Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
