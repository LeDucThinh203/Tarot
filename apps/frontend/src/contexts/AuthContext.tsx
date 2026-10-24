import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types/api';
import { authApi, getAccessToken, setAccessToken, usersApi } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guestSession, setGuestSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void authApi.refresh().then(async (token) => {
      if (!token) return;
      const profile = await authApi.me();
      if (active) {
        if (profile.isGuest) setGuestSession(true);
        else setUser(profile);
      }
    }).catch(() => { setAccessToken(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ensureGuestSession = useCallback(async () => {
    if (user || (guestSession && getAccessToken())) return;
    const session = await authApi.guest();
    setAccessToken(session.accessToken);
    setGuestSession(true);
  }, [user, guestSession]);

  const signIn = useCallback(async (input: { identifier: string; password: string }) => {
    const session = await authApi.login(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setGuestSession(false);
  }, []);
  const signUp = useCallback(async (input: { email: string; username: string; password: string; displayName: string }) => {
    const session = await authApi.register(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setGuestSession(false);
  }, []);
  const updateProfile = useCallback(async (displayName: string) => {
    const profile = await usersApi.updateProfile(displayName);
    setUser((current) => current ? { ...current, ...profile } : current);
  }, []);
  const signOut = useCallback(async () => {
    try { await authApi.logout(); } finally { setAccessToken(null); setUser(null); setGuestSession(false); }
  }, []);
  const value = useMemo(() => ({ user, guestSession, loading, ensureGuestSession, signIn, signUp, updateProfile, signOut }), [user, guestSession, loading, ensureGuestSession, signIn, signUp, updateProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
