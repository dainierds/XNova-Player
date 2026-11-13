import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { BRANDING } from '../../config/branding';
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
    setTimeout(() => {
      const res = login(username, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales incorrectas.');
      } else if (res.isAdmin) {
        onOpenAdminPanel();
      }
    }, 300);
  };

  // 🎮 Motor de Navegación D-Pad Oficial para TV
  useEffect(() => {
    if (disabled) {
      userInputRef.current?.blur();
      passInputRef.current?.blur();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      // Si pulsa Enter/OK:
      if (e.key === 'Enter') {
        if (focusedElement === 'username') {
          // Abrir foco en el input para que aparezca el teclado de Android y no saltar
          userInputRef.current?.focus();
          return;
        } else if (focusedElement === 'password') {
          passInputRef.current?.focus();
          return;
        } else if (focusedElement === 'toggle_eye') {
          setShowPassword((prev) => !prev);
          return;
        } else if (focusedElement === 'submit') {
          handleSubmit();
          return;
        }
      }

      // Con las flechas del control remoto:
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        e.preventDefault();

        switch (e.key) {
          case 'ArrowDown':
            if (focusedElement === 'username') {
              setFocusedElement('password');
            } else if (focusedElement === 'password' || focusedElement === 'toggle_eye') {
              setFocusedElement('submit');
            }
            break;

          case 'ArrowUp':
            if (focusedElement === 'submit') {
              setFocusedElement('password');
            } else if (focusedElement === 'password' || focusedElement === 'toggle_eye') {
              setFocusedElement('username');
            }
            break;

          case 'ArrowRight':
            if (focusedElement === 'password') {
              setFocusedElement('toggle_eye');
            }
            break;

          case 'ArrowLeft':
            if (focusedElement === 'toggle_eye') {
              setFocusedElement('password');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElement, username, password, disabled]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E1A] text-white flex flex-col items-center justify-between p-6 select-none font-sans overflow-hidden">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-violet-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ── CABECERA: Logotipo e Icono Oficiales ── */}
      <header className="relative z-10 flex items-center space-x-3.5 pt-3 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-center p-2 shadow-lg shadow-cyan-500/20">
          <img
            src={BRANDING.assets.icon512}
            alt={BRANDING.name}
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h2 className="text-base font-black tracking-wider text-white">XNOVA PLAYER</h2>
          <span className="text-[10px] tracking-widest uppercase text-cyan-400 font-bold flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Centro de Streaming Premium</span>
          </span>
        </div>
      </header>

      {/* ── FORMULARIO PRINCIPAL: Limpio, seguro y sin botones de paquetes ── */}
      <main className="relative z-10 w-full max-w-md bg-[#0E1526]/95 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex flex-col justify-center my-auto">
        <div className="text-center mb-5">
          <h1 className="text-xl font-black tracking-tight text-white">Iniciar Sesión</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Ingresa tus credenciales asignadas por tu administrador
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-4 flex items-center space-x-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          {/* Campo Usuario */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Usuario
            </label>
            <div 
              onClick={() => {
                setFocusedElement('username');
                userInputRef.current?.focus();
              }}
              className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                focusedElement === 'username'
                  ? 'border-cyan-400 bg-white/15 ring-4 ring-cyan-400/40 shadow-lg shadow-cyan-500/30'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={userInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedElement('username')}
                placeholder="Tu usuario asignado"
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Contraseña
            </label>
            <div 
              onClick={() => {
                setFocusedElement('password');
                passInputRef.current?.focus();
              }}
              className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                focusedElement === 'password'
                  ? 'border-cyan-400 bg-white/15 ring-4 ring-cyan-400/40 shadow-lg shadow-cyan-500/30'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={passInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedElement('password')}
                placeholder="Tu contraseña secreta"
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className={`p-1.5 rounded-lg text-zinc-400 hover:text-white transition ${
                  focusedElement === 'toggle_eye' ? 'ring-2 ring-cyan-400 text-white bg-white/15' : ''
                }`}
                title="Mostrar/Ocultar"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón Ingresar */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full mt-3 py-3.5 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 shadow-xl
              ${focusedElement === 'submit'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black scale-102 ring-4 ring-cyan-300 shadow-cyan-500/50'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'}
            `}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>ENTRAR A MI CONTENIDO</span>
              </>
            )}
          </button>
        </form>
      </main>

      {/* Espaciador inferior */}
      <div className="h-2 shrink-0" />
    </div>
  );
};
