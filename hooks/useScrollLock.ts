
import { useEffect } from 'react';

/**
 * Hook personnalisé pour empêcher le défilement de la page (body scroll lock).
 * Utile pour les modales, les menus mobiles, etc.
 */
export const useScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    // Sauvegarder le style original
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Bloquer le scroll
    document.body.style.overflow = 'hidden';

    // Nettoyage lors du démontage ou si isLocked devient false
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
};
