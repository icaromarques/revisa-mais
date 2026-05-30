import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApiService } from '@/services/api/auth';

// O User agora vem do nosso próprio banco de dados (PostgreSQL via Backend)
interface AppUser {
  id: string;
  nome: string;
  email: string;
  gcalConnected: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Assim que a aplicação abre, checamos se temos uma sessão ativa no Backend
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authApiService.getSession();
        setUser(response.user);
      } catch (err) {
        console.log("No active session found");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signInWithGoogle = async () => {
    // A API vai redirecionar a janela para o Google
    await authApiService.loginWithGoogle();
  };

  const signInAnonymously = async () => {
    console.warn("Modo Anônimo não suportado na API ainda.");
  };

  const logout = async () => {
    await authApiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signInAnonymously,
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
