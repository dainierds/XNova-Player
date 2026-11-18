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

// ─── Backdrops LANDSCAPE de películas y series top (TMDB w1280) ──────────────
// Usamos los backdrop_path oficiales de TMDB (imágenes 16:9 cinématicas)
const BD = 'https://image.tmdb.org/t/p/w1280';
const BG_POSTERS: string[] = [
  `${BD}/s3TBrRGB1iav7gFOCNx3H31MoES.jpg`,  // Inception
  `${BD}/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg`,  // Interstellar
  `${BD}/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg`,  // The Dark Knight
  `${BD}/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg`,  // Avengers: Endgame
  `${BD}/qdIMHd4sEfJSckfVJfKQvisL02a.jpg`,  // Dune
  `${BD}/f83f07c3ef6DmPbBODpVSFb3jJE.jpg`,  // Oppenheimer
  `${BD}/Am6ox7ljH3OBvGl6i4FXMQ5RLKO.jpg`,  // Parasite
  `${BD}/9zB6naHxvRBpqMGMTIFDnRHblHA.jpg`,  // Barbie
  `${BD}/1inZm0xxXrpRfN0LxwE2zvIvYig.jpg`,  // John Wick
  `${BD}/sO9VHHgcVTKHQtEJbU2EKWCAJQD.jpg`,  // Spider-Man NWH
  `${BD}/suopoADq0k8YZr4dQXcU6pToj6s.jpg`,  // House of Dragon
  `${BD}/8YFL5QQVPy3AgrEQxNYVSgiPEbe.jpg`,  // The Last of Us
  `${BD}/eSzmqqoRJmSBpBNHynGrniKKABz.jpg`,  // Stranger Things
  `${BD}/84XPpjGvxNyExjSuLQe1SzRA8BC.jpg`,  // Breaking Bad
  `${BD}/pFkSBhSVFjKjYCp7mXa5mLQilDQ.jpg`,  // Wednesday
  `${BD}/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg`,   // The Boys
  `${BD}/9PqD3wSIjntyJDBzMNuxuKHpzMp.jpg`,  // Squid Game
  `${BD}/oV4hMCJ2RxFrXqcg7NrN89FRMRH.jpg`,  // Peaky Blinders
  `${BD}/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg`,  // Game of Thrones
  `${BD}/9BBTo108mahw2eKPSWCGpjwUMQ4.jpg`,   // Better Call Saul
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
              className="w-full h-full object-cover"
              loading={i < 9 ? 'eager' : 'lazy'}
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0';
              }}
            />
          </div>
        ))}
      </div>

      {/* Overlay oscuro sobre el grid */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Gradiente hacia la derecha para oscurecer donde está el panel */}
      <div className="absolute inset-y-0 right-0 w-[500px] bg-gradient-to-l from-black via-black/90 to-transparent" />

      {/* ══════════════════════════════════════════════
          PANEL DE LOGIN — derecha, centrado verticalmente
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
      </div>

    </div>
  );
};
