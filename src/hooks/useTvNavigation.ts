import { useEffect, useRef } from 'react';
import { useTvStore } from '../store/useTvStore';

export function useTvNavigation(onLongPressOk?: () => void) {
  const navigateDpad = useTvStore((state) => state.navigateDpad);
  const okPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir el scroll por defecto del navegador en TV
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
          navigateDpad('up');
          break;
        case 'ArrowDown':
          navigateDpad('down');
          break;
        case 'ArrowLeft':
          navigateDpad('left');
          break;
        case 'ArrowRight':
          navigateDpad('right');
          break;
        case 'Enter':
        case ' ': // Espacio o centro del D-pad
          if (!okPressTimer.current) {
            isLongPress.current = false;
            okPressTimer.current = window.setTimeout(() => {
              isLongPress.current = true;
              if (onLongPressOk) {
                onLongPressOk();
              }
            }, 800); // 800ms para pulsación larga (favorito)
          }
          break;
        case 'Escape':
        case 'Backspace':
        case 'GoBack': // Android back keycode estándar en Leanback
          e.preventDefault();
          navigateDpad('back');
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (okPressTimer.current) {
          clearTimeout(okPressTimer.current);
          okPressTimer.current = null;
        }
        if (!isLongPress.current) {
          // Fue un clic normal
          navigateDpad('enter');
        }
        isLongPress.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (okPressTimer.current) {
        clearTimeout(okPressTimer.current);
      }
    };
  }, [navigateDpad, onLongPressOk]);
}
