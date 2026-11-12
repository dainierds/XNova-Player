import React, { useRef, useEffect } from 'react';
import type { MenuSection } from '../../types';
import { BOTTOM_MENU_ITEMS } from '../../store/useTvStore';
import { 
  Film, 
  Tv, 
  MonitorPlay, 
  Radio, 
  Clapperboard, 
  Music, 
  Sliders, 
  Power 
} from 'lucide-react';

interface BottomNavbarProps {
  currentSection: MenuSection;
  focusedIndex: number;
  isFocused: boolean;
  onSelect: (index: number) => void;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  focusedIndex,
  isFocused,
  onSelect,
}) => {
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isFocused && itemsRef.current[focusedIndex]) {
      itemsRef.current[focusedIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [focusedIndex, isFocused]);

  const renderIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Film':
        return <Film className={className} />;
      case 'Tv':
        return <Tv className={className} />;
      case 'MonitorPlay':
        return <MonitorPlay className={className} />;
      case 'Radio':
        return <Radio className={className} />;
      case 'Clapperboard':
        return <Clapperboard className={className} />;
      case 'Music':
        return <Music className={className} />;
      case 'Sliders':
        return <Sliders className={className} />;
      case 'Power':
        return <Power className={className} />;
      default:
        return <Film className={className} />;
    }
  };

  return (
    <nav className="relative z-20 w-full px-14 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar py-2">
        {BOTTOM_MENU_ITEMS.map((item, index) => {
          const isItemFocused = isFocused && index === focusedIndex;

          return (
            <div
              key={item.id}
              ref={(el) => { itemsRef.current[index] = el; }}
              onClick={() => onSelect(index)}
              className={`
                flex-1 min-w-[120px] max-w-[170px] h-20 rounded-lg flex flex-col items-center justify-center cursor-pointer
                transition-all duration-200 ease-out select-none
                ${isItemFocused
                  ? 'bg-gradient-to-t from-cyan-600 to-cyan-500 text-white scale-105 shadow-xl shadow-cyan-500/50 ring-2 ring-white z-20'
                  : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/50'}
              `}
            >
              {renderIcon(
                item.icon,
                `w-6 h-6 mb-1.5 transition-transform ${isItemFocused ? 'scale-110 drop-shadow' : 'text-zinc-400'}`
              )}
              <span
                className={`text-xs font-bold tracking-wide ${
                  isItemFocused ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
