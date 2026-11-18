import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface TvLoginScreenProps {
  onOpenAdminPanel: () => void;
  disabled?: boolean;
}

type FocusedElement =
  | 'username'
  | 'password'
  | 'toggle_eye'
  | 'submit';

// ─── Backdrops LANDSCAPE de películas y series top (TMDB w1280 - 100% verificados HTTP 200) ───
const BD = 'https://image.tmdb.org/t/p/w1280';
const BG_POSTERS: string[] = [
  `${BD}/c6OLXfKAk5BKeR6broC8pYiCquX.jpg`,  // Fight Club
  `${BD}/8sNiAPPYU14PUepFNeSNGUTiHW.jpg`,  // Interstellar
  `${BD}/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg`,  // Inception
  `${BD}/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg`,  // Avengers: Endgame
  `${BD}/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg`,  // The Dark Knight
  `${BD}/96hiUXEuYsu4tcnvlaY8tEMFM0m.jpg`,  // Pulp Fiction
  `${BD}/66Kn4XWhkuPkJxOJyPEx4U2CUfN.jpg`,  // Forrest Gump
  `${BD}/ctiw6FZK4N36LmkjSklWEbuvlq9.jpg`,  // The Lord of the Rings: Return of the King
  `${BD}/4qCqAdHcNKeAHcK8tJ8wNJZa9cx.jpg`,  // Star Wars: A New Hope
  `${BD}/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg`,  // The Avengers
  `${BD}/sCzcYW9h55WcesOqA12cgEr9Exw.jpg`,  // Titanic
  `${BD}/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg`,  // Avatar
  `${BD}/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg`,  // The Matrix
  `${BD}/95qi5TJMIBI5VzWHia88Pbrye7Z.jpg`,  // Se7en
  `${BD}/AbgEQO2mneCSOc8CSnOMa8pBS8I.jpg`,  // The Green Mile
  `${BD}/zb6fM1CX41D9rF9hdgclu0peUmy.jpg`,  // Harry Potter
  `${BD}/6qgSKYgkHLL0vAVbsqRfo8KmZgL.jpg`,  // The Lord of the Rings: Fellowship
  `${BD}/oiwc338EoBgS4sEI2ixAny4KQKg.jpg`,  // The Lord of the Rings: Two Towers
  `${BD}/6G73mNyooWAEQTpckPSnFxFoNmc.jpg`,  // The Godfather
  `${BD}/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg`,  // Schindler's List
  `${BD}/jwBs4djVIe9Kz3Vu9rsI9aEEKWU.jpg`,  // GoodFellas
  `${BD}/amZavErrjrdgDwhsIdpWxHNenIx.jpg`,  // Star Wars: Empire Strikes Back
  `${BD}/qrKcg4CbBm3165QNT3kQWQnqlTM.jpg`,  // Star Wars: Return of the Jedi
  `${BD}/7tbeoSTWW2cWPecjQo9fcdf0Hzv.jpg`,  // Spirited Away
];

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

  // 🎮 Motor D-Pad TV
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
    <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans bg-black">

      {/* ══════════════════════════════════════════════
          FONDO: Grid cinématico landscape (3 col × N filas)
          Igual a la imagen de referencia Netflix-style
          ══════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: '33.4vh',
          gap: '3px',
        }}
      >
        {/* Triplicamos la lista para asegurar que llena la pantalla */}
        {[...BG_POSTERS, ...BG_POSTERS, ...BG_POSTERS].map((url, i) => (
          <div
            key={i}
            className="overflow-hidden relative"
            style={{ background: `hsl(${(i * 41) % 360}, 20%, 10%)` }}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover transition-opacity duration-300"
              loading={i < 12 ? 'eager' : 'lazy'}
              draggable={false}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = BG_POSTERS[i % 5];
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Overlay oscuro suave sobre todo el grid */}
      <div className="absolute inset-0 bg-black/40" />

      {/* ══════════════════════════════════════════════
          PANEL DE LOGIN — glassmorphism, centrado a la derecha
          ══════════════════════════════════════════════ */}
      <div className="absolute inset-0 flex items-center justify-end pr-16">
      <div className="w-[380px] flex flex-col items-stretch justify-center px-9 py-10 rounded-2xl"
           style={{
             background: 'rgba(0,0,0,0.72)',
             backdropFilter: 'blur(18px)',
             WebkitBackdropFilter: 'blur(18px)',
             border: '1px solid rgba(255,255,255,0.08)',
             boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
           }}>

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

          {/* Botón rojo INICIAR SESIÓN */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full mt-1 py-3.5 rounded-lg font-black text-sm tracking-widest uppercase
              transition-all duration-150 flex items-center justify-center text-white
              ${focusedElement === 'submit'
                ? 'bg-red-500 ring-4 ring-red-400/50 scale-[1.02] shadow-lg shadow-red-600/40'
                : 'bg-red-600 hover:bg-red-500'}
            `}
          >
            {isLoading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'INICIAR SESIÓN'
            }
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-white/80">
          <button type="button" className="hover:underline hover:text-white transition">
            Olvidé mi contraseña?
          </button>
          <button type="button" className="hover:underline hover:text-white transition">
            Crear una cuenta
          </button>
        </div>
      </div>{/* fin panel glassmorphism */}
      </div>{/* fin flex container */}

    </div>
  );
};
