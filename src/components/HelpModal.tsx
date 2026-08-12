import React from 'react';
import { X, HelpCircle, MousePointer, Hand, Keyboard, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Instrucciones y Guía del Cubo</h2>
            <p className="text-xs text-slate-400">Cómo controlar y girar el cubo NxN</p>
          </div>
        </div>

        {/* Guide Content */}
        <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex gap-3">
            <Hand className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-400 font-bold block text-sm mb-0.5">Giro Táctil o con Mouse</strong>
              Haz clic o toca en una pegatina del cubo y arrastra en la dirección deseada (horizontal o vertical) para girar exactamente esa capa/slice.
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex gap-3">
            <MousePointer className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sky-400 font-bold block text-sm mb-0.5">Rotación de la Cámara 3D</strong>
              Cambia al modo <span className="text-white font-semibold">"Rotar Cámara"</span> o arrastra fuera del cubo para examinar todas las caras en 3D.
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-400 font-bold block text-sm mb-0.5">Escalado desde 2x2 hasta 100x100</strong>
              Usa los botones de preseteo o escribe el tamaño exacto <span className="font-mono text-white">N</span>. La renderización está optimizada mediante tecnología WebGL Instanced Mesh para un rendimiento fluído en cualquier dispositivo.
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex gap-3">
            <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-indigo-400 font-bold block text-sm mb-0.5">Atajos de Teclado (Notación)</strong>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] text-slate-300">
                <div><strong className="text-white">U / Shift+U:</strong> Arriba</div>
                <div><strong className="text-white">D / Shift+D:</strong> Abajo</div>
                <div><strong className="text-white">R / Shift+R:</strong> Derecha</div>
                <div><strong className="text-white">L / Shift+L:</strong> Izquierda</div>
                <div><strong className="text-white">F / Shift+F:</strong> Frente</div>
                <div><strong className="text-white">B / Shift+B:</strong> Atrás</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          ¡Entendido, a jugar!
        </button>
      </div>
    </div>
  );
};
