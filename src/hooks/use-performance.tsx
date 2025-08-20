import { useEffect, useState } from 'react';

export function usePerformance() {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check network information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const checkConnection = () => {
        const slowConnectionTypes = ['slow-2g', '2g', '3g'];
        const isSlow = slowConnectionTypes.includes(connection.effectiveType) || 
                      connection.downlink < 1.5;
        setIsSlowConnection(isSlow);
      };

      checkConnection();
      connection.addEventListener('change', checkConnection);

      return () => {
        connection.removeEventListener('change', checkConnection);
      };
    }
  }, []);

  return { isSlowConnection };
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}