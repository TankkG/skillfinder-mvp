import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthResult,
  ProfessionalProfile,
  PublicUser,
} from '@skillfinder/shared';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getRefreshToken,
  setAuthTokens,
  setSessionListener,
  setUnauthorizedListener,
} from '../api/client';
import {
  authApi,
  type ClientRegistrationPayload,
  type ProfessionalRegistrationPayload,
} from '../api/services';

const ACCESS_KEY = 'skillfinder.accessToken';
const REFRESH_KEY = 'skillfinder.refreshToken';

interface AuthContextValue {
  user: PublicUser | null;
  professionalProfile: ProfessionalProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  registerClient: (payload: ClientRegistrationPayload) => Promise<AuthResult>;
  registerProfessional: (
    payload: ProfessionalRegistrationPayload,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfessionalProfile: (profile: ProfessionalProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const persistSession = async (result: AuthResult): Promise<void> => {
  setAuthTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  await AsyncStorage.multiSet([
    [ACCESS_KEY, result.accessToken],
    [REFRESH_KEY, result.refreshToken],
  ]);
};

const clearSession = async (): Promise<void> => {
  setAuthTokens({ accessToken: null, refreshToken: null });
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [professionalProfile, setProfessionalProfile] =
    useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionListener((result) => {
      setUser(result.user);
      if (result.professionalProfile !== undefined) {
        setProfessionalProfile(result.professionalProfile);
      }
      void AsyncStorage.multiSet([
        [ACCESS_KEY, result.accessToken],
        [REFRESH_KEY, result.refreshToken],
      ]);
    });
    setUnauthorizedListener(() => {
      setUser(null);
      setProfessionalProfile(null);
      void clearSession();
    });

    const restore = async () => {
      try {
        const entries = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
        const access = entries[0][1];
        const refresh = entries[1][1];
        if (!access || !refresh) return;
        setAuthTokens({ accessToken: access, refreshToken: refresh });
        const me = await authApi.me();
        setUser(me.user);
        setProfessionalProfile(me.professionalProfile);
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    };

    void restore();

    return () => {
      setSessionListener(null);
      setUnauthorizedListener(null);
    };
  }, []);

  const applyResult = useCallback(async (result: AuthResult) => {
    await persistSession(result);
    setUser(result.user);
    setProfessionalProfile(result.professionalProfile ?? null);
    return result;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      return applyResult(result);
    },
    [applyResult],
  );

  const registerClient = useCallback(
    async (payload: ClientRegistrationPayload) => {
      const result = await authApi.registerClient(payload);
      return applyResult(result);
    },
    [applyResult],
  );

  const registerProfessional = useCallback(
    async (payload: ProfessionalRegistrationPayload) => {
      const result = await authApi.registerProfessional(payload);
      return applyResult(result);
    },
    [applyResult],
  );

  const logout = useCallback(async () => {
    const token = getRefreshToken();
    try {
      if (token) await authApi.logout(token);
    } catch {
      // El cierre local debe completarse aunque falle el servidor.
    }
    await clearSession();
    setUser(null);
    setProfessionalProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await authApi.me();
    setUser(me.user);
    setProfessionalProfile(me.professionalProfile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      professionalProfile,
      loading,
      login,
      registerClient,
      registerProfessional,
      logout,
      refreshProfile,
      setProfessionalProfile,
    }),
    [
      user,
      professionalProfile,
      loading,
      login,
      registerClient,
      registerProfessional,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
};
