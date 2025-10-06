import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

interface AuthContextType {
  signIn: (token: string) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for a token on app launch
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      setIsAuthenticated(!!token);
    };
    checkToken();
  }, []);

  const signIn = async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    setIsAuthenticated(true);
    router.replace('/(app)/home'); // Navigate to a protected route
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setIsAuthenticated(false);
    router.replace('/(public)/login'); // Navigate to a public route
  };

  const value = { signIn, signOut, isAuthenticated };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}