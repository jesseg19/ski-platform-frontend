import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  username: string;
  id: number;
}

interface AuthContextType {
  signIn: (accessToken: string, refreshToken: string, userData: User) => void;
  signOut: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for a token on app launch
    const checkTokenAndUser = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('userAccessToken');
        const refreshToken = await SecureStore.getItemAsync('userRefreshToken'); // Load Refresh Token
        const userDataJson = await SecureStore.getItemAsync('userData');

        if (accessToken && refreshToken && userDataJson) {
          const userData = JSON.parse(userDataJson);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking token or user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkTokenAndUser();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string, userData: User) => {
    await SecureStore.setItemAsync('userAccessToken', accessToken);
    await SecureStore.setItemAsync('userRefreshToken', refreshToken);
    await SecureStore.setItemAsync('userData', JSON.stringify(userData));

    setIsAuthenticated(true);
    setUser(userData)
    if (userData)
      router.replace('/(tabs)/game');
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userAccessToken');
    await SecureStore.deleteItemAsync('userRefreshToken');
    await SecureStore.deleteItemAsync('userData');
    setIsAuthenticated(false);
    setUser(null);
    router.replace('/(public)/signup'); // Navigate to a public route
  };

  const value = { signIn, signOut, isAuthenticated, isLoading, user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}