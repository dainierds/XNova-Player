import { useEffect, useRef } from 'react';
import { useTvStore, type SpatialZone } from '../store/useTvStore';

export function useTvNavigation(
  counts: { shelf0Count: number; shelf1Count: number; shelf2Count: number },
  onEnterAction?: (zone: SpatialZone, index: number) => void,
  onLongPressOk?: () => void
) {
  const navigateDpad = useTvStore((state) => state.navigateDpad);
  const okPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
          navigateDpad('up', { ...counts, onEnterAction });
          break;
        case 'ArrowDown':
          navigateDpad('down', { ...counts, onEnterAction });
          break;
        case 'ArrowLeft':
          navigateDpad('left', { ...counts, onEnterAction });
          break;
        case 'ArrowRight':
          navigateDpad('right', { ...counts, onEnterAction });
          break;
        case 'Enter':
        case ' ':
          if (!okPressTimer.current) {
            isLongPress.current = false;
            okPressTimer.current = window.setTimeout(() => {
              isLongPress.current = true;
              if (onLongPressOk) {
                onLongPressOk();
              }
            }, 750);
          }
          break;
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          navigateDpad('back', { ...counts, onEnterAction });
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
          navigateDpad('enter', { ...counts, onEnterAction });
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
  }, [navigateDpad, counts, onEnterAction, onLongPressOk]);
}
