import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../api/axios';

// ── Role → home route map (single source of truth) ───────────────────────────
export const ROLE_HOME = {
  citizen:     '/citizen',
  eoc:         '/eoc',
  rescue_team: '/rescue',
  hospital:    '/facility',
  shelter:     '/facility',
  volunteer:   '/citizen',
  ngo:         '/citizen',
  admin:       '/eoc',
};

const AuthContext = createContext(null);

/**
 * user shape: { id, name, role }
 * Access token lives in memory only — never localStorage/sessionStorage.
 * The httpOnly refresh-token cookie is managed by the browser transparently.
 */
export function AuthProvider({ children }) {
  const [user,setUser]= useState(null);
  const [accessToken,setToken] = useState(null);
  const [isLoading,setIsLoading] = useState(true); // true while restoring session on boot
  const navigate = useNavigate();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const applySession = useCallback((userData, token) => {
    setToken(token);
    setAuthToken(token);
    setUser({ id: userData._id, name: userData.name, role: userData.role });
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
  }, []);

  // ── Silent session restore on app mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: refreshData } = await api.post('/auth/refresh');
        setAuthToken(refreshData.accessToken);
        setToken(refreshData.accessToken);

        const { data: meData } = await api.get('/auth/me');
        setUser({
          id:   meData.user._id,
          name: meData.user.name,
          role: meData.user.role,
        });
      } catch {
        // No valid cookie — user needs to log in
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    applySession(data.user, data.accessToken);
    navigate(ROLE_HOME[data.user.role] ?? '/citizen', { replace: true });
  }, [applySession, navigate]);

  // ── register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    applySession(data.user, data.accessToken);
    navigate(ROLE_HOME[data.user.role] ?? '/citizen', { replace: true });
  }, [applySession, navigate]);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort — clear client state regardless
    }
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
