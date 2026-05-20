import { useState, useEffect } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // 1. Detect if running in standalone mode (App Installed)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(
      mediaQuery.matches || 
      (window.navigator as any).standalone === true || 
      document.referrer.includes('android-app://')
    );

    const handleModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleModeChange);

    // 2. Hear "beforeinstallprompt" event for custom installers
    const handleInstallPrompt = (e: Event) => {
      // Prevent automatic mini-infobar on mobile devices
      e.preventDefault();
      // Store event so it can be triggered later
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // 3. Keep track of user connection status changes
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mediaQuery.removeEventListener('change', handleModeChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return false;

    // Show native prompt dialog
    installPrompt.prompt();

    // Check user decision choice
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] Instalação do app: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable,
    isStandalone,
    isOffline,
    installApp
  };
}
