import React from 'react';
import { Palette, Check } from 'lucide-react';
import { CubePalette } from '../types';
import { PALETTES } from '../utils/cubeLogic';

interface ColorCustomizerProps {
  palette: CubePalette;
  setPalette: (palette: CubePalette) => void;
}

export const ColorCustomizer: React.FC<ColorCustomizerProps> = ({ palette, setPalette }) => {
  return (
    <div className="flex flex-col gap-4 w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base">Paleta de Colores</h3>
          <p className="text-xs text-slate-400">Personaliza los colores de las caras del cubo</p>
        </div>
      </div>

      {/* Preset Palettes */}
      <div className="grid grid-cols-2 gap-2.5">
        {PALETTES.map((p) => {
          const isSelected = p.name === palette.name;
          return (
            <button
              key={p.name}
              onClick={() => setPalette(p)}
              className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10'
                  : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{p.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </div>

              {/* Color previews */}
              <div className="flex items-center gap-1">
                {[p.U, p.D, p.F, p.B, p.L, p.R].map((color, idx) => (
                  <span
                    key={idx}
                    className="w-4 h-4 rounded-full border border-slate-700 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Color Picker for current palette */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
        <span className="text-xs font-semibold text-slate-400">Personalizar Caras Individuales</span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: 'U (Arriba)', key: 'U' as const },
            { label: 'D (Abajo)', key: 'D' as const },
            { label: 'F (Frente)', key: 'F' as const },
            { label: 'B (Atrás)', key: 'B' as const },
            { label: 'L (Izquierda)', key: 'L' as const },
            { label: 'R (Derecha)', key: 'R' as const },
          ].map((face) => (
            <label key={face.key} className="flex flex-col items-center gap-1 bg-slate-950 p-2 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 font-bold">{face.label}</span>
              <input
                type="color"
                value={palette[face.key]}
                onChange={(e) =>
                  setPalette({
                    ...palette,
                    name: 'Personalizado',
                    [face.key]: e.target.value,
                  })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
