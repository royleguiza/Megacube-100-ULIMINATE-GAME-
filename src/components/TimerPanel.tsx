import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Trophy, Flame, History, Trash2 } from 'lucide-react';
import { SolveRecord } from '../types';

interface TimerPanelProps {
  cubeSize: number;
  isSolved: boolean;
  moveCount: number;
  onTimerStart?: () => void;
  onTimerReset?: () => void;
}

export const TimerPanel: React.FC<TimerPanelProps> = ({
  cubeSize,
  isSolved,
  moveCount,
}) => {
  const [timeMs, setTimeMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [history, setHistory] = useState<SolveRecord[]>([]);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`rubik_history_${cubeSize}`);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [cubeSize]);

  // Save history to localStorage
  const saveRecord = useCallback((newRecord: SolveRecord) => {
    setHistory((prev) => {
      const updated = [newRecord, ...prev];
      try {
        localStorage.setItem(`rubik_history_${cubeSize}`, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save solve history', err);
      }
      return updated;
    });
  }, [cubeSize]);

  // Start Timer
  const startTimer = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = performance.now() - timeMs;
    setIsRunning(true);

    timerIntervalRef.current = window.setInterval(() => {
      setTimeMs(performance.now() - startTimeRef.current);
    }, 10);
  }, [isRunning, timeMs]);

  // Stop Timer
  const stopTimer = useCallback(() => {
    if (!isRunning) return;
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRunning(false);
  }, [isRunning]);

  // Trigger timer start on first move if not running
  useEffect(() => {
    if (moveCount === 1 && !isRunning && !isSolved) {
      setTimeMs(0);
      startTimer();
    }
  }, [moveCount, isRunning, isSolved, startTimer]);

  // Trigger stop on solve completion
  useEffect(() => {
    if (isSolved && isRunning) {
      stopTimer();
      if (timeMs > 0) {
        const record: SolveRecord = {
          id: Date.now().toString(),
          size: cubeSize,
          timeMs,
          movesCount: moveCount,
          date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          scramble: `${cubeSize}x${cubeSize}`,
        };
        saveRecord(record);
      }
    }
  }, [isSolved, isRunning, timeMs, moveCount, cubeSize, stopTimer, saveRecord]);

  // Reset timer
  const handleResetTimer = () => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRunning(false);
    setTimeMs(0);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(`rubik_history_${cubeSize}`);
    } catch {}
  };

  // Format milliseconds to MM:SS.ms
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '00:00.00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}.${pad(hundredths)}`;
  };

  // Stats calculation
  const times = history.map((h) => h.timeMs);
  const bestTime = times.length > 0 ? Math.min(...times) : null;

  // Average of 5
  const ao5 = times.length >= 5 ? times.slice(0, 5).reduce((a, b) => a + b, 0) / 5 : null;

  return (
    <div className="flex flex-col gap-4 w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Cronómetro de Resolución</h3>
            <p className="text-xs text-slate-400">Inicia automáticamente al primer movimiento</p>
          </div>
        </div>

        <button
          onClick={handleResetTimer}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
        >
          Reiniciar Reloj
        </button>
      </div>

      {/* Main Stopwatch Display */}
      <div className="flex flex-col items-center justify-center bg-slate-950 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="text-4xl sm:text-5xl font-mono font-black tracking-wider text-amber-400 drop-shadow-md">
          {formatTime(timeMs)}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-mono">
          <span>Movimientos: <strong className="text-indigo-400 font-bold">{moveCount}</strong></span>
          <span>•</span>
          <span>Estado: {isRunning ? <strong className="text-emerald-400 font-bold">En marcha</strong> : isSolved ? <strong className="text-amber-400 font-bold">¡Resuelto!</strong> : 'Esperando movimiento'}</span>
        </div>
      </div>

      {/* Speedcubing Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mejor Tiempo</div>
            <div className="font-mono text-sm font-bold text-emerald-400">
              {bestTime !== null ? formatTime(bestTime) : '—'}
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Promedio de 5 (Ao5)</div>
            <div className="font-mono text-sm font-bold text-sky-400">
              {ao5 !== null ? formatTime(ao5) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Solve History Table */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Historial de Tiempos ({history.length})
            </span>
            <button
              onClick={clearHistory}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
              title="Borrar historial de este tamaño"
            >
              <Trash2 className="w-3 h-3" /> Limpiar
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {history.map((rec, i) => (
              <div
                key={rec.id}
                className="flex items-center justify-between bg-slate-950/40 border border-slate-800/60 rounded-lg px-3 py-1.5 text-xs font-mono"
              >
                <span className="text-slate-500 font-bold">#{history.length - i}</span>
                <span className="text-amber-400 font-bold">{formatTime(rec.timeMs)}</span>
                <span className="text-slate-400">{rec.movesCount} movs</span>
                <span className="text-slate-500 text-[10px]">{rec.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
