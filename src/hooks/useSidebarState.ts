import { useState, useEffect } from 'react';

// Persist sidebar state across navigation
let globalDesktopSidebarOpen = true;

export function useSidebarState() {
  const [desktopSidebarOpen, setDesktopSidebarOpenLocal] = useState(globalDesktopSidebarOpen);

  const setDesktopSidebarOpen = (open: boolean) => {
    globalDesktopSidebarOpen = open;
    setDesktopSidebarOpenLocal(open);
  };

  // Sync with global on mount
  useEffect(() => {
    setDesktopSidebarOpenLocal(globalDesktopSidebarOpen);
  }, []);

  return { desktopSidebarOpen, setDesktopSidebarOpen };
}
