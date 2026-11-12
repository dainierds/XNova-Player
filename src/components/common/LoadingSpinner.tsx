import React from 'react';
import { BRANDING } from '../../config/branding';

interface LoadingSpinnerProps {
  message?: string;
  isError?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Cargando contenido...',
  isError = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 select-none">
      <div className="relative flex items-center justify-center">
        {/* Ícono oficial centrado sin deformación */}
        <img
          src={BRANDING.assets.icon512}
          alt={BRANDING.name}
          className="w-16 h-16 object-contain rounded-2xl drop-shadow-xl"
        />

        {/* Spinner sutil de color cian */}
        {!isError && (
          <div className="absolute -inset-2 rounded-2xl border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
        )}
      </div>

      <p className={`text-xs font-semibold tracking-wide ${isError ? 'text-red-400' : 'text-zinc-400'}`}>
        {message}
      </p>
    </div>
  );
};
