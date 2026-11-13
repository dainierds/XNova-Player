import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Sparkles, 
  Crown, 
  Layers, 
  AlertCircle 
} from 'lucide-react';
import { BRANDING } from '../../config/branding';
import { useAuthStore } from '../../store/useAuthStore';

interface TvLoginScreenProps {
  onOpenAdminPanel: () => void;
}

type FocusedElement = 
  | 'username'
  | 'password'
  | 'toggle_eye'
  | 'submit'
  | 'demo_basic'
  | 'demo_gold'
  | 'demo_premium';

export const TvLoginScreen: React.FC<TvLoginScreenProps> = ({ onOpenAdminPanel }) => {
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
    // Cerrar teclado nativo desenfocando los inputs
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

  const handleQuickDemo = (user: string, pass: string) => {
    userInputRef.current?.blur();
    passInputRef.current?.blur();
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      login(user, pass);
      setIsLoading(false);
    }, 250);
  };

  // 🎮 Motor de Navegación D-Pad Oficial para TV
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el usuario está escribiendo dentro de un input nativo con su teclado en pantalla,
      // permitir que Enter envíe el formulario si presiona 'Next' / 'Done'.
      if (e.key === 'Enter') {
        if (focusedElement === 'username') {
          // Si está en usuario y pulsa Enter, saltar a contraseña
          passInputRef.current?.focus();
          setFocusedElement('password');
          return;
        } else if (focusedElement === 'password') {
          // Si está en contraseña y pulsa Enter, enviar formulario
          handleSubmit();
          return;
        } else if (focusedElement === 'submit') {
          handleSubmit();
          return;
        } else if (focusedElement === 'toggle_eye') {
          setShowPassword((prev) => !prev);
          return;
        } else if (focusedElement === 'demo_basic') {
          handleQuickDemo('cliente_basic', '123');
          return;
        } else if (focusedElement === 'demo_gold') {
          handleQuickDemo('cliente_gold', '123');
          return;
        } else if (focusedElement === 'demo_premium') {
          handleQuickDemo('cliente_premium', '123');
          return;
        }
      }

      // Si usa las flechas del control remoto:
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Desenfocar inputs para que el teclado de Android no robe las flechas
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
            } else if (focusedElement === 'submit') {
              setFocusedElement('demo_gold');
            }
            break;

          case 'ArrowUp':
            if (focusedElement === 'demo_basic' || focusedElement === 'demo_gold' || focusedElement === 'demo_premium') {
              setFocusedElement('submit');
            } else if (focusedElement === 'submit') {
              setFocusedElement('password');
            } else if (focusedElement === 'password' || focusedElement === 'toggle_eye') {
              setFocusedElement('username');
            }
            break;

          case 'ArrowRight':
            if (focusedElement === 'password') {
              setFocusedElement('toggle_eye');
            } else if (focusedElement === 'demo_basic') {
              setFocusedElement('demo_gold');
            } else if (focusedElement === 'demo_gold') {
              setFocusedElement('demo_premium');
            }
            break;

          case 'ArrowLeft':
            if (focusedElement === 'toggle_eye') {
              setFocusedElement('password');
            } else if (focusedElement === 'demo_premium') {
              setFocusedElement('demo_gold');
            } else if (focusedElement === 'demo_gold') {
              setFocusedElement('demo_basic');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElement, username, password]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E1A] text-white flex flex-col items-center justify-between p-6 select-none font-sans overflow-hidden">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-violet-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ── CABECERA: Logotipo e Icono Ajustados ── */}
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

      {/* ── FORMULARIO PRINCIPAL: 100% Nativo con el Teclado de Google ── */}
      <main className="relative z-10 w-full max-w-md bg-[#0E1526]/95 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl flex flex-col justify-center my-auto">
        <div className="text-center mb-4">
          <h1 className="text-xl font-black tracking-tight text-white">Iniciar Sesión</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
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

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3.5">
          {/* Campo Usuario */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Usuario
            </label>
            <div 
              onClick={() => {
                setFocusedElement('username');
                userInputRef.current?.focus();
              }}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
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
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Contraseña
            </label>
            <div 
              onClick={() => {
                setFocusedElement('password');
                passInputRef.current?.focus();
              }}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
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
              w-full mt-2 py-3.5 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 shadow-xl
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

        {/* ── Selector de Acceso Rápido (DEMO) ── */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <span className="block text-[10px] font-bold text-zinc-400 text-center uppercase tracking-wider mb-2.5">
            Acceso rápido para probar cada paquete:
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_basic', '123')}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                focusedElement === 'demo_basic'
                  ? 'bg-sky-500/30 border-sky-300 ring-2 ring-sky-300 scale-105 shadow-md shadow-sky-500/30'
                  : 'bg-sky-500/10 border-sky-500/30'
              }`}
            >
              <span className="text-[11px] font-bold text-sky-400">BASIC</span>
              <span className="text-[9px] text-zinc-400">1 Lista</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_gold', '123')}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                focusedElement === 'demo_gold'
                  ? 'bg-amber-500/30 border-amber-300 ring-2 ring-amber-300 scale-105 shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400">GOLD</span>
              </div>
              <span className="text-[9px] text-zinc-400">2 Listas</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_premium', '123')}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                focusedElement === 'demo_premium'
                  ? 'bg-purple-500/30 border-purple-300 ring-2 ring-purple-300 scale-105 shadow-md shadow-purple-500/30'
                  : 'bg-purple-500/10 border-purple-500/30'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-purple-400" />
                <span className="text-[11px] font-bold text-purple-400">PREMIUM</span>
              </div>
              <span className="text-[9px] text-zinc-400">3 Listas</span>
            </button>
          </div>
        </div>
      </main>

      {/* Espaciador inferior */}
      <div className="h-2 shrink-0" />
    </div>
  );
};
