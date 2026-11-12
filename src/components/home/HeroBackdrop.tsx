import React from 'react';

interface HeroBackdropProps {
  backdropUrl: string;
  title: string;
}

export const HeroBackdrop: React.FC<HeroBackdropProps> = ({ backdropUrl, title }) => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden select-none bg-black">
      {/* Imagen panorámica de fondo */}
      <img
        key={backdropUrl}
        src={backdropUrl}
        alt={title}
        className="w-full h-full object-cover object-center transform scale-100 transition-opacity duration-700 ease-out opacity-90 animate-fadeIn"
      />

      {/* Gradiente izquierdo para que el texto resalte con máximo contraste */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090b0ee6] via-[#090b0e99] to-transparent w-[65%]" />

      {/* Gradiente inferior para fusionarse con el carrusel y barra de navegación */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#080A0E] via-[#080A0E]/70 to-transparent h-full" />

      {/* Viñeta sutil en los bordes para inmersión cinematográfica en TV */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] pointer-events-none" />
    </div>
  );
};
