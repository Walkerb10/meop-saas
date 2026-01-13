import { useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = '2ae7fd34-1277-4b62-bebe-b995ec39222e';

// Global singleton for Vapi instance - pre-initialized on app load
let globalVapi: Vapi | null = null;
let isInitialized = false;

export function getVapiInstance(): Vapi {
  if (!globalVapi) {
    console.log('🚀 Pre-initializing Vapi SDK...');
    globalVapi = new Vapi(VAPI_PUBLIC_KEY);
    isInitialized = true;
  }
  return globalVapi;
}

export function useVapiPreload() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Pre-initialize Vapi on first render
      getVapiInstance();
      initialized.current = true;
      
      // Also request mic permissions early (user gesture may still be needed)
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          // Stop the stream immediately - we just wanted to warm up permissions
          stream.getTracks().forEach(track => track.stop());
          console.log('🎤 Mic permissions pre-warmed');
        })
        .catch(() => {
          // Ignore - permissions will be requested when user clicks
        });
    }
  }, []);

  return { isInitialized };
}
