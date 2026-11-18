import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { SHOWCASE_MOVIES, SHOWCASE_SERIES } from '../../mock/showcaseData';

interface TvLoginScreenProps {
  onOpenAdminPanel: () => void;
  disabled?: boolean;
}

type FocusedElement =
  | 'username'
  | 'password'
  | 'toggle_eye'
  | 'submit';

// Combinamos películas y series para el grid de fondo
const ALL_POSTERS = [...SHOWCASE_MOVIES, ...SHOWCASE_SERIES].map(i => i.thumbnailUrl);
// Duplicamos varias veces para llenar el grid completo (apuntamos a ~40 imágenes)
const BG_POSTERS: string[] = Array.from({ length: 5 }, () => ALL_POSTERS).flat();

export const TvLoginScreen: React.FC<TvLoginScreenProps> = ({ onOpenAdminPanel, disabled = false }) => {
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedElement, setFocusedElement] = useState<FocusedElement>('username');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const userInputRef = useRef<HTMLInputElement>(null);
  const passInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    userInputRef.current?.blur();
    passInputRef.current?.blur();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      const res = await login(username, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales incorrectas.');
      } else if (res.isAdmin) {
        onOpenAdminPanel();
      }
    }, 200);
  };

  // 🎮 Motor de Navegación D-Pad para TV
  useEffect(() => {
    if (disabled) {
      userInputRef.current?.blur();
      passInputRef.current?.blur();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter') {
        if (focusedElement === 'username') { userInputRef.current?.focus(); return; }
        if (focusedElement === 'password') { passInputRef.current?.focus(); return; }
        if (focusedElement === 'toggle_eye') { setShowPassword(p => !p); return; }
        if (focusedElement === 'submit') { handleSubmit(); return; }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        e.preventDefault();

        switch (e.key) {
          case 'ArrowDown':
            if (focusedElement === 'username') setFocusedElement('password');
            else if (focusedElement === 'password' || focusedElement === 'toggle_eye') setFocusedElement('submit');
            break;
          case 'ArrowUp':
            if (focusedElement === 'submit') setFocusedElement('password');
            else if (focusedElement === 'password' || focusedElement === 'toggle_eye') setFocusedElement('username');
            break;
          case 'ArrowRight':
            if (focusedElement === 'password') setFocusedElement('toggle_eye');
            break;
          case 'ArrowLeft':
            if (focusedElement === 'toggle_eye') setFocusedElement('password');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElement, username, password, disabled]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">

      {/* ══════════════════════════════════════════════
          FONDO: Grid de posters de películas/series
          ══════════════════════════════════════════════ */}
      <div className="absolute inset-0 grid grid-cols-5 gap-0.5 overflow-hidden">
        {BG_POSTERS.map((url, i) => (
          <div
            key={i}
            className="overflow-hidden"
            style={{ aspectRatio: '2/3' }}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Overlay oscuro sobre el grid */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Gradiente lateral derecho para el panel */}
      <div className="absolute inset-y-0 right-0 w-[420px] bg-gradient-to-l from-black/95 via-black/80 to-transparent" />

      {/* ══════════════════════════════════════════════
          PANEL DE LOGIN (derecha)
          ══════════════════════════════════════════════ */}
      <div className="absolute inset-y-0 right-0 w-[400px] flex flex-col items-stretch justify-center px-10 py-12">

        {/* Título */}
        <h1 className="text-3xl font-black tracking-wide text-white mb-8 uppercase">
          INICIAR SESIÓN
        </h1>

        {/* Error */}
        {errorMessage && (
          <div className="mb-4 flex items-center space-x-2 bg-red-700/30 border border-red-500/40 text-red-300 text-xs px-3 py-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-3">

          {/* Campo Usuario */}
          <div
            onClick={() => { setFocusedElement('username'); userInputRef.current?.focus(); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg cursor-pointer transition-all duration-150 ${
              focusedElement === 'username'
                ? 'bg-zinc-700 ring-2 ring-white/60'
                : 'bg-zinc-800/90'
            }`}
          >
            <User className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              ref={userInputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedElement('username')}
              placeholder="Correo Electrónico o Usuario"
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Campo Contraseña */}
          <div
            onClick={() => { setFocusedElement('password'); passInputRef.current?.focus(); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg cursor-pointer transition-all duration-150 ${
              focusedElement === 'password' || focusedElement === 'toggle_eye'
                ? 'bg-zinc-700 ring-2 ring-white/60'
                : 'bg-zinc-800/90'
            }`}
          >
            <Lock className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              ref={passInputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedElement('password')}
              placeholder="Contraseña"
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowPassword(p => !p); }}
              className={`p-1 rounded text-zinc-400 hover:text-white transition ${
                focusedElement === 'toggle_eye' ? 'ring-2 ring-white/60 text-white' : ''
              }`}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Botón INICIAR SESIÓN — rojo igual que Netflix */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full mt-1 py-3.5 rounded-lg font-black text-sm tracking-widest uppercase
              transition-all duration-150 flex items-center justify-center
              ${focusedElement === 'submit'
                ? 'bg-red-500 ring-4 ring-red-400/50 scale-[1.02] shadow-lg shadow-red-600/40'
                : 'bg-red-600 hover:bg-red-500'}
              text-white
            `}
          >
            {isLoading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'INICIAR SESIÓN'
            }
          </button>
        </form>

        {/* Links inferiores */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-white/80">
          <button type="button" className="hover:underline hover:text-white transition">
            Olvidé mi contraseña?
          </button>
          <button type="button" className="hover:underline hover:text-white transition">
            Crear una cuenta
          </button>
        </div>
      </div>

    </div>
  );
};
