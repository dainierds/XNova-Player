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
    <div className="fixed inset-0 z-50 flex overflow-hidden select-none font-sans bg-[#0A0E1A]">

      {/* ══════════════════════════════════════════════
          LISTÓN IZQUIERDO: Columna sólida de inicio de sesión
          Incrustado directamente en el fondo, sin imágenes detrás
          ══════════════════════════════════════════════ */}
      <div className="w-[420px] shrink-0 h-full bg-[#0A0E1A] border-r border-white/10 z-20 flex flex-col justify-center px-11 relative">

        {/* Logo oficial XNova (X en gradiente cyan/azul con pata blanca neón) */}
        <div className="flex items-center space-x-3 mb-6">
          <svg className="w-10 h-10 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" viewBox="0 0 100 100" fill="none">
            {/* Trazo superior izquierdo al centro y a pata inferior izquierda (CYAN ELÉCTRICO) */}
            <path
              d="M20 18 L50 50 L20 82"
              stroke="#22D3EE"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Trazo superior derecho al centro (AZUL ZAFIRO) */}
            <path
              d="M80 18 L50 50"
              stroke="#2563EB"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Pata inferior derecha (BLANCO NEÓN) */}
            <path
              d="M50 50 L80 82"
              stroke="#FFFFFF"
              strokeWidth="14"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]"
            />
          </svg>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-wider text-white flex items-center gap-1.5">
              <span>XNOVA</span>
              <span className="text-cyan-400 font-extrabold">PLAYER</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-cyan-300/70 font-semibold">
              PREMIUM STREAMING
            </span>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black tracking-wide text-white mb-6 uppercase">
          INICIAR SESIÓN
        </h1>

        {/* Error */}
        {errorMessage && (
          <div className="mb-4 flex items-center space-x-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs px-3 py-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-3.5">

          {/* Campo Usuario */}
          <div
            onClick={() => { setFocusedElement('username'); userInputRef.current?.focus(); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg cursor-pointer transition-all duration-150 border ${
              focusedElement === 'username'
                ? 'bg-[#131F38] border-cyan-400 ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-500/20'
                : 'bg-[#0E172A]/80 border-white/10 hover:bg-[#131F38]/60 hover:border-white/20'
            }`}
          >
            <User className={`w-5 h-5 shrink-0 ${focusedElement === 'username' ? 'text-cyan-400' : 'text-zinc-400'}`} />
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
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg cursor-pointer transition-all duration-150 border ${
              focusedElement === 'password' || focusedElement === 'toggle_eye'
                ? 'bg-[#131F38] border-cyan-400 ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-500/20'
                : 'bg-[#0E172A]/80 border-white/10 hover:bg-[#131F38]/60 hover:border-white/20'
            }`}
          >
            <Lock className={`w-5 h-5 shrink-0 ${focusedElement === 'password' ? 'text-cyan-400' : 'text-zinc-400'}`} />
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
                focusedElement === 'toggle_eye' ? 'ring-2 ring-cyan-400 text-cyan-300' : ''
              }`}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Botón cyan/azul INICIAR SESIÓN */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full mt-2 py-3.5 rounded-lg font-black text-sm tracking-widest uppercase
              transition-all duration-150 flex items-center justify-center text-white
              ${focusedElement === 'submit'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 ring-4 ring-cyan-400/60 scale-[1.02] shadow-2xl shadow-cyan-500/50'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-950/50'}
            `}
          >
            {isLoading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'INICIAR SESIÓN'
            }
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex flex-col items-center gap-2.5 text-xs text-zinc-400">
          <button type="button" className="hover:underline hover:text-cyan-300 transition">
            ¿Olvidé mi contraseña?
          </button>
          <button type="button" className="hover:underline hover:text-cyan-300 transition">
            Crear una cuenta
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          LADO DERECHO: Grid cinemático de películas (2 columnas)
          ══════════════════════════════════════════════ */}
      <div className="flex-1 h-full relative overflow-hidden bg-black">
        {/* Degradado suave de desvanecimiento entre el listón y las películas */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/80 to-transparent z-10 pointer-events-none" />

        <div
          className="w-full h-full overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridAutoRows: '33.4vh',
            gap: '3px',
          }}
        >
          {[...BG_POSTERS, ...BG_POSTERS].map((url, i) => (
            <div
              key={i}
              className="overflow-hidden relative"
              style={{ background: `hsl(${(i * 41) % 360}, 20%, 10%)` }}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover transition-opacity duration-300"
                loading={i < 8 ? 'eager' : 'lazy'}
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

        {/* Overlay oscuro sobre el grid para profundidad cinematográfica */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </div>

    </div>
  );
};
