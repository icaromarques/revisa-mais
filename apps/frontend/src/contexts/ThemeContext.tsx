import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from '@/lib/api';
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  isThemePreference,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getInitialState(): { theme: ThemePreference; resolvedTheme: ResolvedTheme } {
  const theme = readStoredTheme();
  const resolvedTheme = typeof window !== 'undefined' ? resolveTheme(theme) : 'dark';
  return { theme, resolvedTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>(() => getInitialState().theme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getInitialState().resolvedTheme);

  const applyTheme = useCallback((preference: ThemePreference) => {
    const resolved = resolveTheme(preference);
    applyThemeToDocument(resolved);
    setThemeState(preference);
    setResolvedTheme(resolved);
    persistTheme(preference);
  }, []);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = resolveTheme('system');
      applyThemeToDocument(resolved);
      setResolvedTheme(resolved);
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    apiClient
      .get('/usuarios/me')
      .then(({ data }) => {
        if (cancelled) return;
        const serverTheme = data?.settings?.theme;
        if (isThemePreference(serverTheme)) {
          applyTheme(serverTheme);
        }
      })
      .catch(() => {
        // Keep local preference when profile fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, applyTheme]);

  const setTheme = useCallback(
    (preference: ThemePreference) => {
      applyTheme(preference);

      if (user) {
        apiClient.patch('/usuarios/perfil/settings', { theme: preference }).catch(() => {
          // Theme is already applied locally; sync will retry on next login
        });
      }
    },
    [applyTheme, user],
  );

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { DEFAULT_THEME, type ThemePreference, type ResolvedTheme };
