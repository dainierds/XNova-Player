import React from 'react';
import { useClock } from '../../hooks/useClock';
import { Play } from 'lucide-react';

interface HeaderBarProps {
  expDate?: string;
  profileName?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  expDate = '29 NOVIEMBRE 2026',
  profileName = 'ADULTO',
}) => {
  const clockText = useClock();

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-14 py-8 pointer-events-none">
      {/* Lado izquierdo: Logotipo y Fecha de Vencimiento */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="text-3xl font-extrabold tracking-wider text-white flex items-center drop-shadow-md">
            Prime
            <span className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400 text-cyan-300">
              <Play className="w-4 h-4 fill-cyan-400 ml-0.5" />
            </span>
          </span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold -mb-3 -ml-4">
            Black
          </span>
        </div>
        
        <div className="mt-1 text-xs tracking-wider text-zinc-300 font-semibold uppercase drop-shadow">
          VENCE: <span className="text-white font-bold">{expDate}</span>
        </div>
      </div>

      {/* Lado derecho: Fecha y Hora + Badge de Perfil */}
      <div className="flex items-center space-x-5">
        <div className="text-right">
          <div className="text-xs tracking-wider text-zinc-200 font-bold drop-shadow">
            {clockText}
          </div>
        </div>

        {/* Badge de Perfil (estilo píldora roja con brillo) */}
        <div className="px-4 py-1 rounded-full bg-red-600/90 border border-red-400 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-red-600/40">
          {profileName}
        </div>
      </div>
    </header>
  );
};
