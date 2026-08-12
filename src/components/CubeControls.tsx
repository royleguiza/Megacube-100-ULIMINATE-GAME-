import React, { useState } from 'react';
import { Play, RotateCcw, Shuffle, Undo2, Redo2, Eye, Hand, Layers, FastForward, CheckCircle2, Wand2, Zap } from 'lucide-react';
import { ViewMode, MoveStep, SpeedTier, SPEED_TIERS } from '../types';

interface CubeControlsProps {
  cubeSize: number;
  setCubeSize: (size: number) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onScramble: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  animSpeedMs: number;
  setAnimSpeedMs: (speed: number) => void;
  onTriggerMove: (move: MoveStep) => void;
  historyLength: number;
  isAutoSolving: boolean;
  onAutoSolve: () => void;
  onSolveAll: () => void;
  maxTurnsCap: number;
  selectedSpeedTier: SpeedTier;
  setSelectedSpeedTier: (tier: SpeedTier) => void;
  isVirtualTurboHolding: boolean;
  setIsVirtualTurboHolding: (holding: boolean) => void;
}

const SIZE_PRESETS = [2, 3, 4, 5, 7, 10, 20, 50, 100];

export const CubeControls: React.FC<CubeControlsProps> = ({
  cubeSize,
  setCubeSize,
  viewMode,
  setViewMode,
  onScramble,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  animSpeedMs,
  setAnimSpeedMs,
  onTriggerMove,
  historyLength,
  isAutoSolving,
  onAutoSolve,
  onSolveAll,
  maxTurnsCap,
  selectedSpeedTier,
  setSelectedSpeedTier,
  isVirtualTurboHolding,
  setIsVirtualTurboHolding,
}) => {
  const [customInput, setCustomInput] = useState<string>(cubeSize.toString());
  const [selectedSlice, setSelectedSlice] = useState<number>(0);

  const handleCustomSizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed >= 2 && parsed <= 100) {
      setCubeSize(parsed);
      setSelectedSlice(0);
    }
  };

  const handleFaceMove = (axis: 'x' | 'y' | 'z', slice: number, dir: 1 | -1) => {
    onTriggerMove({ axis, sliceIndex: slice, dir });
  };

  return (
    <div className="flex flex-col gap-5 w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
      {/* Header & Main Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Cubo de Rubik {cubeSize}x{cubeSize}</h2>
            <p className="text-xs text-slate-400">Selecciona tamaño de 2x2 a 100x100</p>
          </div>
        </div>

        {/* View / Drag Mode Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('rotate-slice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'rotate-slice'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toca o arrastra sobre el cubo para girar las capas"
          >
            <Hand className="w-3.5 h-3.5" />
            Giro Táctil
          </button>
          <button
            onClick={() => setViewMode('rotate-cube')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'rotate-cube'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Arrastra fuera del cubo para rotar la cámara 3D"
          >
            <Eye className="w-3.5 h-3.5" />
            Rotar Cámara
          </button>
        </div>
      </div>

      {/* Preset Sizes & Custom Size Input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400 flex justify-between">
          <span>Tamaños Rápidos</span>
          <span className="text-indigo-400 font-mono font-bold">Rango: 2x2 — 100x100</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {SIZE_PRESETS.map((sz) => (
            <button
              key={sz}
              onClick={() => {
                setCubeSize(sz);
                setCustomInput(sz.toString());
                setSelectedSlice(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                cubeSize === sz
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/25 scale-105'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              {sz}x{sz}
            </button>
          ))}

          {/* Custom Size Form */}
          <form onSubmit={handleCustomSizeSubmit} className="flex items-center gap-1.5 ml-auto">
            <input
              type="number"
              min="2"
              max="100"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center font-mono text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
            >
              Fijar N
            </button>
          </form>
        </div>
      </div>

      {/* Main Action Buttons: Scramble, Reset, Undo, Redo, Auto-Solve, Resolver Todo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-b border-slate-800 py-4">
        <button
          onClick={onScramble}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg transition-all active:scale-95"
        >
          <Shuffle className="w-4 h-4" />
          Mezclar
        </button>

        <button
          onClick={onSolveAll}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all active:scale-95"
          title="Resuelve todo el cubo al instante"
        >
          <Wand2 className="w-4 h-4 text-emerald-200" />
          Resolver Todo
        </button>

        <button
          onClick={onAutoSolve}
          disabled={historyLength === 0 || isAutoSolving}
          className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg transition-all border ${
            historyLength > 0 && !isAutoSolving
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500 active:scale-95'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
          title="Auto-deshace la secuencia de movimientos paso a paso"
        >
          {isAutoSolving ? <FastForward className="w-4 h-4 animate-spin text-emerald-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          Auto-Resolver
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-700 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-xl transition-all border ${
            canUndo
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
          Deshacer
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-xl transition-all border ${
            canRedo
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" />
          Rehacer
        </button>
      </div>

      {/* Turbo Speed Tier Selector (Clic Derecho / Giro continuo) */}
      <div className="flex flex-col gap-2.5 bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/40 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Nivel de Giro Turbo (Mantener Clic Derecho)
          </span>
          <span className="font-mono text-xs text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/60">
            {selectedSpeedTier.turnsPerMin.toLocaleString('es-ES')} giros/min
          </span>
        </div>

        {/* Speed Tier Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {SPEED_TIERS.map((tier) => {
            const isSelected = selectedSpeedTier.id === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedSpeedTier(tier)}
                className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-600/30 border-amber-400 text-white shadow-md shadow-amber-950/50 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-mono font-bold text-xs text-amber-300">{tier.label}</span>
                <span className="text-[10px] text-slate-300 truncate w-full">{tier.fingerTag.split('•')[1] || tier.fingerTag}</span>
              </button>
            );
          })}
        </div>

        {/* Virtual Turbo Hold Button for Touch / Mobile */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onMouseDown={() => setIsVirtualTurboHolding(true)}
            onMouseUp={() => setIsVirtualTurboHolding(false)}
            onMouseLeave={() => setIsVirtualTurboHolding(false)}
            onTouchStart={() => setIsVirtualTurboHolding(true)}
            onTouchEnd={() => setIsVirtualTurboHolding(false)}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all select-none ${
              isVirtualTurboHolding
                ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg scale-[0.98]'
                : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-600/40 text-amber-300'
            }`}
          >
            <Zap className={`w-4 h-4 ${isVirtualTurboHolding ? 'animate-bounce text-slate-950' : 'text-amber-400'}`} />
            {isVirtualTurboHolding ? '¡GIRANDO A MÁXIMA VELOCIDAD!' : 'MANTÉN PRESIONADO AQUÍ (BOTÓN TURBO)'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          💡 <strong className="text-amber-300">Tip de Control:</strong> Mantén presionado el <strong className="text-white">Botón Derecho del Mouse</strong> sobre el cubo para hacerlo girar. Al <strong className="text-emerald-400">acercar el cubo en pantalla (Zoom In)</strong> obtienes <strong className="text-emerald-400">+500 giros/minuto extra</strong> automáticamente.
        </p>
      </div>

      {/* Auto-Resolver Capability Badge */}
      <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Capacidad Máxima del Auto-Resolver
          </span>
          <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            {maxTurnsCap.toLocaleString('es-ES')} giros máx.
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          El motor de auto-resolución procesa secuencias de giros de hasta {maxTurnsCap.toLocaleString('es-ES')} movimientos continuos optimizados.
        </p>
      </div>

      {/* Manual Quick Turn Buttons (Standard Rubik Notation) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Botones de Giro Directo</span>
          {cubeSize > 3 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span>Capa Interna #:</span>
              <input
                type="number"
                min="0"
                max={cubeSize - 1}
                value={selectedSlice}
                onChange={(e) => setSelectedSlice(Math.max(0, Math.min(cubeSize - 1, parseInt(e.target.value) || 0)))}
                className="w-10 bg-slate-900 border border-slate-700 rounded text-center text-indigo-400 font-mono font-bold"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {/* Outer Layer Faces */}
          <button
            onClick={() => handleFaceMove('y', 0, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Arriba (U)"
          >
            U
          </button>
          <button
            onClick={() => handleFaceMove('y', 0, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Arriba Antihorario (U')"
          >
            U'
          </button>

          <button
            onClick={() => handleFaceMove('y', cubeSize - 1, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Abajo (D)"
          >
            D
          </button>
          <button
            onClick={() => handleFaceMove('y', cubeSize - 1, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Abajo Antihorario (D')"
          >
            D'
          </button>

          <button
            onClick={() => handleFaceMove('x', 0, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Derecha (R)"
          >
            R
          </button>
          <button
            onClick={() => handleFaceMove('x', 0, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Derecha Antihorario (R')"
          >
            R'
          </button>

          <button
            onClick={() => handleFaceMove('x', cubeSize - 1, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Izquierda (L)"
          >
            L
          </button>
          <button
            onClick={() => handleFaceMove('x', cubeSize - 1, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Izquierda Antihorario (L')"
          >
            L'
          </button>

          <button
            onClick={() => handleFaceMove('z', 0, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Frente (F)"
          >
            F
          </button>
          <button
            onClick={() => handleFaceMove('z', 0, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Frente Antihorario (F')"
          >
            F'
          </button>

          <button
            onClick={() => handleFaceMove('z', cubeSize - 1, -1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Atrás (B)"
          >
            B
          </button>
          <button
            onClick={() => handleFaceMove('z', cubeSize - 1, 1)}
            className="bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs py-2 rounded-lg border border-slate-700 transition-all active:scale-95"
            title="Giro Atrás Antihorario (B')"
          >
            B'
          </button>
        </div>
      </div>

      {/* Animation Speed Controller Slider */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
          Velocidad de Animación: <span className="font-mono text-indigo-400 font-bold">{animSpeedMs} ms</span>
        </label>
        <input
          type="range"
          min="0"
          max="500"
          step="25"
          value={animSpeedMs}
          onChange={(e) => setAnimSpeedMs(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
};
