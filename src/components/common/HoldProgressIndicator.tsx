import React from 'react';
import { Heart } from 'lucide-react';

interface HoldProgressIndicatorProps {
  progress: number; // 0 to 100
  title?: string;
}

export const HoldProgressIndicator: React.FC<HoldProgressIndicatorProps> = ({ progress, title }) => {
  if (progress <= 5) return null;

  return (
    <div className="fixed bottom-10 right-10 z-80 bg-black/90 backdrop-blur-xl border-2 border-cyan-400 rounded-2xl px-5 py-3 shadow-2xl shadow-cyan-500/40 flex items-center space-x-3.5 animate-bounce">
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* Anillo de progreso SVG */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/20"
            fill="transparent"
          />
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="currentColor"
            strokeWidth="3"
            className="text-cyan-400 transition-all duration-75"
            fill="transparent"
            strokeDasharray={81.68}
            strokeDashoffset={81.68 - (81.68 * progress) / 100}
            strokeLinecap="round"
          />
        </svg>
        <Heart className="w-3.5 h-3.5 text-cyan-300 absolute fill-cyan-400" />
      </div>

      <div className="flex flex-col text-left">
        <span className="text-xs font-black text-white flex items-center space-x-1">
          <span>Mantén presionado para Favoritos</span>
        </span>
        {title && (
          <span className="text-[10px] text-cyan-300 font-bold truncate max-w-[180px]">
            {title}
          </span>
        )}
      </div>
    </div>
  );
};
