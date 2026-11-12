import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface ExitModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitModal: React.FC<ExitModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const [focusedBtn, setFocusedBtn] = useState<'cancel' | 'confirm'>('cancel');

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedBtn((prev) => (prev === 'cancel' ? 'confirm' : 'cancel'));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedBtn === 'confirm') {
          onConfirm();
        } else {
          onCancel();
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, focusedBtn, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="flex justify-center mb-4 text-amber-400">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¿Deseas salir de la aplicación?</h2>
        <p className="text-zinc-400 text-sm mb-8">
          Presiona confirmar para cerrar la aplicación o cancelar para seguir disfrutando.
        </p>

        <div className="flex items-center justify-center space-x-6">
          <button
            onClick={onCancel}
            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
              focusedBtn === 'cancel'
                ? 'bg-cyan-500 text-white scale-105 ring-2 ring-white shadow-lg shadow-cyan-500/50'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
              focusedBtn === 'confirm'
                ? 'bg-red-600 text-white scale-105 ring-2 ring-white shadow-lg shadow-red-600/50'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
};
