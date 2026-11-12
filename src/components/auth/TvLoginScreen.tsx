import React, { useState } from 'react';
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

export const TvLoginScreen: React.FC<TvLoginScreenProps> = ({ onOpenAdminPanel }) => {
  const { login } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<'username' | 'password'>('username');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales inválidas.');
      } else if (res.isAdmin) {
        onOpenAdminPanel();
      }
    }, 400);
  };

  // Acceso rápido para probar los 3 tipos de planes
  const handleQuickDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      login(user, pass);
      setIsLoading(false);
    }, 300);
  };

  // Teclas para el teclado virtual de TV
  const KEYBOARD_KEYS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '_'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '@', '-'],
  ];

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

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E1A] flex flex-col items-center justify-center p-6 text-white select-none overflow-y-auto">
      {/* Resplandor decorativo de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-violet-600/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Contenedor Principal */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        {/* Icono Oficial de la App */}
        <div className="mb-5 flex flex-col items-center">
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-2xl" />
            <img
              src={BRANDING.assets.icon512}
              alt={BRANDING.name}
              className="relative w-20 h-20 object-contain drop-shadow-2xl rounded-2xl"
            />
          </div>
          <span className="text-xs tracking-widest uppercase text-cyan-400 font-bold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Centro de Streaming Premium</span>
          </span>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="w-full max-w-lg bg-[#0E1526]/90 border border-white/10 backdrop-blur-xl rounded-2xl p-7 shadow-2xl shadow-black/80">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white">Iniciar Sesión</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Ingresa tus credenciales asignadas por tu administrador
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="mb-5 flex items-center space-x-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Usuario */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Usuario
              </label>
              <div 
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
                  activeField === 'username'
                    ? 'border-cyan-400 bg-white/10 ring-2 ring-cyan-400/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
                onClick={() => {
                  setActiveField('username');
                  setShowKeyboard(true);
                }}
              >
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setActiveField('username')}
                  placeholder="Tu usuario asignado"
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Contraseña
              </label>
              <div 
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
                  activeField === 'password'
                    ? 'border-cyan-400 bg-white/10 ring-2 ring-cyan-400/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
                onClick={() => {
                  setActiveField('password');
                  setShowKeyboard(true);
                }}
              >
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setActiveField('password')}
                  placeholder="Tu contraseña secreta"
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  className="text-zinc-400 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón Ingresar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition transform active:scale-95 flex items-center justify-center space-x-2 focus:ring-4 focus:ring-cyan-400 focus:outline-none disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ENTRAR A MI CONTENIDO</span>
                </>
              )}
            </button>
          </form>

          {/* Selector de Acceso Rápido para Pruebas de Paquetes */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="block text-[11px] font-semibold text-zinc-400 text-center uppercase tracking-wider mb-2.5">
              Acceso rápido para probar cada paquete:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('cliente_basic', '123')}
                className="flex flex-col items-center p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition text-center group"
              >
                <span className="text-[10px] font-bold text-sky-400 group-hover:text-sky-300">
                  BASIC
                </span>
                <span className="text-[9px] text-zinc-400">1 Lista Activa</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('cliente_gold', '123')}
                className="flex flex-col items-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-center group"
              >
                <div className="flex items-center space-x-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 group-hover:text-amber-300">
                    GOLD
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400">2 Listas Activas</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('cliente_premium', '123')}
                className="flex flex-col items-center p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition text-center group"
              >
                <div className="flex items-center space-x-1">
                  <Layers className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 group-hover:text-purple-300">
                    PREMIUM
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400">3 Listas Activas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Teclado Virtual para Control Remoto TV (Desplegable) */}
        {showKeyboard && (
          <div className="w-full max-w-xl mt-4 bg-[#0E1526]/95 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xl animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs text-zinc-400 font-medium">
                Escribiendo en: <strong className="text-cyan-400">{activeField === 'username' ? 'Usuario' : 'Contraseña'}</strong>
              </span>
              <button
                onClick={() => setShowKeyboard(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
              >
                Ocultar Teclado
              </button>
            </div>
            
            <div className="space-y-1">
              {KEYBOARD_KEYS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center space-x-1">
                  {row.map((char) => (
                    <button
                      key={char}
                      onClick={() => handleKeyPress(char)}
                      className="w-10 h-9 rounded-lg bg-white/10 hover:bg-cyan-500/30 active:bg-cyan-500 text-white font-mono text-sm font-semibold transition focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              ))}
              <div className="flex justify-center space-x-1 pt-1">
                <button
                  onClick={() => handleKeyPress(' ')}
                  className="px-8 h-9 rounded-lg bg-white/10 hover:bg-cyan-500/30 text-white text-xs font-semibold transition"
                >
                  Espacio
                </button>
                <button
                  onClick={handleBackspace}
                  className="px-4 h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Delete className="w-3.5 h-3.5" />
                  <span>Borrar</span>
                </button>
                <button
                  onClick={() => handleSubmit()}
                  className="px-4 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Listo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
