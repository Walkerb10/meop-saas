import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Generate a unique ID for this tab/window
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const TAB_SESSION_KEY = 'current_tab_session';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if this is a new tab - if no tab marker exists in sessionStorage, 
    // this is a new tab and we should require login
    const existingTabId = sessionStorage.getItem(TAB_SESSION_KEY);
    
    if (!existingTabId) {
      // New tab - mark it and sign out to require fresh login
      sessionStorage.setItem(TAB_SESSION_KEY, TAB_ID);
      supabase.auth.signOut().then(() => {
        setLoading(false);
      });
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    sessionStorage.removeItem(TAB_SESSION_KEY);
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
