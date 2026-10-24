import { createContext, useContext } from 'react';
import type { User } from '../types/api';

export type AuthContextValue = { user: User | null; guestSession: boolean; loading: boolean; ensureGuestSession: () => Promise<void>; signIn: (input: { identifier: string; password: string }) => Promise<void>; signUp: (input: { email: string; username: string; password: string; displayName: string }) => Promise<void>; updateProfile: (displayName: string) => Promise<void>; signOut: () => Promise<void> };
export const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
