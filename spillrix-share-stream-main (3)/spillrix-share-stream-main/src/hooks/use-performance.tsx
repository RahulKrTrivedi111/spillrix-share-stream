import { useEffect, useState } from 'react';

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }

  interface NetworkInformation extends EventTarget {
    readonly downlink: number;
    readonly effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
    readonly rtt: number;
    readonly saveData: boolean;
    onchange: ((this: NetworkInformation, ev: Event) => void) | null;
    addEventListener<K extends keyof NetworkInformationEventMap>(type: K, listener: (this: NetworkInformation, ev: NetworkInformationEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof NetworkInformationEventMap>(type: K, listener: (this: NetworkInformation, ev: NetworkInformationEventMap[K]) => void, options?: boolean | EventListenerOptions): void;
  }

  interface NetworkInformationEventMap {
    'change': Event;
  }
}

export function usePerformance() {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check network information if available
    if ('connection' in navigator) {
      const connection = navigator.connection as NetworkInformation;
      
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
