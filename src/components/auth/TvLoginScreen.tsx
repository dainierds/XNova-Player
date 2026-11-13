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
  AlertCircle,
  Delete,
  Check
} from 'lucide-react';
import { BRANDING } from '../../config/branding';
import { useAuthStore } from '../../store/useAuthStore';

interface TvLoginScreenProps {
  onOpenAdminPanel: () => void;
}

// Elementos navegables con el D-pad:
// 0: Campo Usuario
// 1: Campo Contraseña
// 2: Ver/Ocultar contraseña (botón ojo)
// 3: Botón "ENTRAR A MI CONTENIDO"
// 4: Botón Demo BASIC
// 5: Botón Demo GOLD
// 6: Botón Demo PREMIUM
// 7+: Teclado virtual si está abierto
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
  const [activeField, setActiveField] = useState<'username' | 'password'>('username');
  const [focusedElement, setFocusedElement] = useState<FocusedElement>('username');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyRow, setKeyRow] = useState(0);
  const [keyCol, setKeyCol] = useState(0);

  const userInputRef = useRef<HTMLInputElement>(null);
  const passInputRef = useRef<HTMLInputElement>(null);

  const KEYBOARD_KEYS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '_'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@', '-'],
  ];

  const handleSubmit = () => {
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
    }, 350);
  };

  const handleQuickDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      login(user, pass);
      setIsLoading(false);
    }, 250);
  };

  const handleKeyPress = (char: string) => {
    if (activeField === 'username') {
      setUsername((prev) => prev + char);
    } else {
      setPassword((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    if (activeField === 'username') {
      setUsername((prev) => prev.slice(0, -1));
    } else {
      setPassword((prev) => prev.slice(0, -1));
    }
  };

  // 🎮 Control D-Pad completo e infalible para Android TV / Fire TV
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el teclado virtual está visible, navegar dentro de él
      if (showKeyboard) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.code)) {
          e.preventDefault();
        }

        switch (e.key) {
          case 'ArrowLeft':
            setKeyCol((prev) => Math.max(0, prev - 1));
            break;
          case 'ArrowRight':
            setKeyCol((prev) => Math.min(KEYBOARD_KEYS[keyRow]?.length - 1 || 9, prev + 1));
            break;
          case 'ArrowUp':
            if (keyRow > 0) {
              setKeyRow((prev) => prev - 1);
            } else {
              // Salir del teclado hacia arriba
              setShowKeyboard(false);
              setFocusedElement(activeField);
            }
            break;
          case 'ArrowDown':
            if (keyRow < KEYBOARD_KEYS.length - 1) {
              setKeyRow((prev) => prev + 1);
            }
            break;
          case 'Enter':
          case ' ':
            const char = KEYBOARD_KEYS[keyRow]?.[keyCol];
            if (char) handleKeyPress(char);
            break;
          case 'Escape':
          case 'Backspace':
          case 'GoBack':
            handleBackspace();
            break;
        }
        return;
      }

      // Navegación en el formulario principal
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowDown':
          if (focusedElement === 'username') {
            setFocusedElement('password');
            setActiveField('password');
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
            setActiveField('password');
          } else if (focusedElement === 'password' || focusedElement === 'toggle_eye') {
            setFocusedElement('username');
            setActiveField('username');
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

        case 'Enter':
        case ' ':
          if (focusedElement === 'username') {
            setActiveField('username');
            setShowKeyboard(true);
            userInputRef.current?.focus();
          } else if (focusedElement === 'password') {
            setActiveField('password');
            setShowKeyboard(true);
            passInputRef.current?.focus();
          } else if (focusedElement === 'toggle_eye') {
            setShowPassword((prev) => !prev);
          } else if (focusedElement === 'submit') {
            handleSubmit();
          } else if (focusedElement === 'demo_basic') {
            handleQuickDemo('cliente_basic', '123');
          } else if (focusedElement === 'demo_gold') {
            handleQuickDemo('cliente_gold', '123');
          } else if (focusedElement === 'demo_premium') {
            handleQuickDemo('cliente_premium', '123');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElement, showKeyboard, keyRow, keyCol, activeField, username, password]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E1A] text-white flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-violet-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* ── CABECERA: Logotipo e Icono Ajustados para que NUNCA se corten ── */}
      <header className="relative z-10 flex flex-col items-center shrink-0 pt-2">
        <div className="flex items-center space-x-3">
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
        </div>
      </header>

      {/* ── ZONA CENTRAL: Formulario Compacto y 100% Adaptable ── */}
      <main className="relative z-10 w-full max-w-md bg-[#0E1526]/95 border border-white/10 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col justify-center my-auto">
        <div className="text-center mb-3">
          <h1 className="text-lg font-black tracking-tight text-white">Iniciar Sesión</h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Ingresa tus credenciales asignadas por tu administrador
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-3 flex items-center space-x-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Campo Usuario */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Usuario
            </label>
            <div 
              onClick={() => {
                setActiveField('username');
                setFocusedElement('username');
                setShowKeyboard(true);
              }}
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                focusedElement === 'username'
                  ? 'border-cyan-400 bg-white/15 ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={userInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => {
                  setActiveField('username');
                  setFocusedElement('username');
                }}
                placeholder="Tu usuario asignado"
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Contraseña
            </label>
            <div 
              className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                focusedElement === 'password'
                  ? 'border-cyan-400 bg-white/15 ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'border-white/10 bg-white/5'
              }`}
              onClick={() => {
                setActiveField('password');
                setFocusedElement('password');
                setShowKeyboard(true);
              }}
            >
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={passInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => {
                  setActiveField('password');
                  setFocusedElement('password');
                }}
                placeholder="Tu contraseña secreta"
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className={`p-1 rounded-lg text-zinc-400 hover:text-white transition ${
                  focusedElement === 'toggle_eye' ? 'ring-2 ring-cyan-400 text-white bg-white/10' : ''
                }`}
                title="Mostrar/Ocultar"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Botón Ingresar */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              w-full mt-1 py-3 px-4 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-2
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
        </div>

        {/* ── Selector de Acceso Rápido (DEMO) ── */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="block text-[10px] font-bold text-zinc-400 text-center uppercase tracking-wider mb-2">
            Acceso rápido para probar cada paquete:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_basic', '123')}
              className={`flex flex-col items-center p-1.5 rounded-xl border transition text-center ${
                focusedElement === 'demo_basic'
                  ? 'bg-sky-500/30 border-sky-300 ring-2 ring-sky-300 scale-105'
                  : 'bg-sky-500/10 border-sky-500/30'
              }`}
            >
              <span className="text-[10px] font-bold text-sky-400">BASIC</span>
              <span className="text-[8px] text-zinc-400">1 Lista</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_gold', '123')}
              className={`flex flex-col items-center p-1.5 rounded-xl border transition text-center ${
                focusedElement === 'demo_gold'
                  ? 'bg-amber-500/30 border-amber-300 ring-2 ring-amber-300 scale-105'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400">GOLD</span>
              </div>
              <span className="text-[8px] text-zinc-400">2 Listas</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cliente_premium', '123')}
              className={`flex flex-col items-center p-1.5 rounded-xl border transition text-center ${
                focusedElement === 'demo_premium'
                  ? 'bg-purple-500/30 border-purple-300 ring-2 ring-purple-300 scale-105'
                  : 'bg-purple-500/10 border-purple-500/30'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Layers className="w-2.5 h-2.5 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-400">PREMIUM</span>
              </div>
              <span className="text-[8px] text-zinc-400">3 Listas</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── TECLADO VIRTUAL DE TV (Desplegable y Navegable con D-Pad) ── */}
      {showKeyboard && (
        <footer className="relative z-20 w-full max-w-xl bg-[#0B101D]/98 border border-white/10 rounded-2xl p-2.5 shadow-2xl shrink-0 mb-1">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] text-zinc-400 font-medium">
              Escribiendo: <strong className="text-cyan-400">{activeField === 'username' ? 'Usuario' : 'Contraseña'}</strong>
            </span>
            <button
              onClick={() => setShowKeyboard(false)}
              className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 border border-white/10"
            >
              Ocultar (Arriba)
            </button>
          </div>
          
          <div className="space-y-1">
            {KEYBOARD_KEYS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center space-x-1">
                {row.map((char, cIdx) => {
                  const isKeyFocused = keyRow === rIdx && keyCol === cIdx;
                  return (
                    <button
                      key={char}
                      onClick={() => handleKeyPress(char)}
                      className={`w-9 h-8 rounded-lg font-mono text-xs font-bold transition ${
                        isKeyFocused
                          ? 'bg-cyan-400 text-black scale-110 ring-2 ring-white shadow-md'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex justify-center space-x-1 pt-1">
              <button
                onClick={() => handleKeyPress(' ')}
                className="px-6 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition"
              >
                Espacio
              </button>
              <button
                onClick={handleBackspace}
                className="px-3 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center space-x-1 transition"
              >
                <Delete className="w-3 h-3" />
                <span>Borrar</span>
              </button>
              <button
                onClick={() => {
                  setShowKeyboard(false);
                  handleSubmit();
                }}
                className="px-3 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center space-x-1 transition"
              >
                <Check className="w-3 h-3" />
                <span>Entrar</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Espaciador inferior cuando no hay teclado para centrar perfectamente */}
      {!showKeyboard && <div className="h-2 shrink-0" />}
    </div>
  );
};
