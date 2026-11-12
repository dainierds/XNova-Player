import React, { useState } from 'react';
import { UserCheck, Lock, X } from 'lucide-react';
import { StorageService } from '../../services/storage';

interface ProfileSelectorModalProps {
  isOpen: boolean;
  currentProfile: 'adult' | 'kids';
  onClose: () => void;
  onProfileChanged: (profile: 'adult' | 'kids') => void;
}

export const ProfileSelectorModal: React.FC<ProfileSelectorModalProps> = ({
  isOpen,
  currentProfile,
  onClose,
  onProfileChanged,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [targetProfile, setTargetProfile] = useState<'adult' | 'kids'>('adult');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectProfile = (profile: 'adult' | 'kids') => {
    if (profile === 'adult' && currentProfile === 'kids') {
      // Requiere PIN para cambiar a perfil adulto
      setTargetProfile(profile);
      setIsVerifyingPin(true);
      setPinInput('');
      setErrorMsg('');
    } else {
      StorageService.setActiveProfile(profile);
      onProfileChanged(profile);
      onClose();
    }
  };

  const handleVerifyPin = async () => {
    const savedPin = await StorageService.getParentalPin();
    if (pinInput === savedPin) {
      await StorageService.setActiveProfile(targetProfile);
      onProfileChanged(targetProfile);
      setIsVerifyingPin(false);
      onClose();
    } else {
      setErrorMsg('PIN incorrecto. Intenta de nuevo.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-8 animate-fadeIn">
      <div className="bg-[#0f1319] border border-zinc-700/80 rounded-2xl w-full max-w-md p-6 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <span>Seleccionar Perfil</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isVerifyingPin ? (
          <div className="py-6 space-y-4">
            {/* Tarjeta Perfil Adulto */}
            <div
              onClick={() => handleSelectProfile('adult')}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                currentProfile === 'adult'
                  ? 'bg-red-950/30 border-red-500 shadow-md shadow-red-950/40'
                  : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 font-bold text-sm">
                  AD
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Perfil Adulto</h3>
                  <p className="text-xs text-zinc-400">Acceso completo a todos los canales y películas</p>
                </div>
              </div>
              {currentProfile === 'adult' && (
                <span className="text-xs text-red-400 font-bold">Activo</span>
              )}
            </div>

            {/* Tarjeta Perfil Niños */}
            <div
              onClick={() => handleSelectProfile('kids')}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                currentProfile === 'kids'
                  ? 'bg-cyan-950/30 border-cyan-500 shadow-md shadow-cyan-950/40'
                  : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-cyan-600/30 border border-cyan-500 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  KD
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Perfil Niños</h3>
                  <p className="text-xs text-zinc-400">Contenido apto para toda la familia y animaciones</p>
                </div>
              </div>
              {currentProfile === 'kids' && (
                <span className="text-xs text-cyan-400 font-bold">Activo</span>
              )}
            </div>
          </div>
        ) : (
          /* Formulario de PIN de Control Parental */
          <div className="py-6 space-y-4 text-center">
            <div className="flex justify-center text-red-400 mb-2">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-base font-bold text-white">Control Parental</h3>
            <p className="text-xs text-zinc-400">
              Ingresa el código PIN de 4 dígitos para acceder al perfil Adulto (PIN por defecto: 0000):
            </p>

            <div className="flex justify-center my-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-36 text-center tracking-[12px] text-2xl font-mono py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-red-500"
              />
            </div>

            {errorMsg && <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>}

            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setIsVerifyingPin(false)}
                className="px-5 py-2 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyPin}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Confirmar PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
