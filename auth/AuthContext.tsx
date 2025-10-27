import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  username: string;
  id: number;
}

interface AuthContextType {
  signIn: (token: string, userData: User) => void;
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
        const token = await SecureStore.getItemAsync('userToken');
        const userDataJson = await SecureStore.getItemAsync('userData');

        if (token && userDataJson) {
          console.log("Token and user found on launch:", token, userDataJson);
          const userData = JSON.parse(userDataJson);
          setUser(userData);
          console.log(user);
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

  const signIn = async (token: string, userData: User) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData)
    router.replace('/home'); // Navigate to a protected route
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    setIsAuthenticated(false);
    setUser(null);
    router.replace('/(public)/signup'); // Navigate to a public route
  };

  const value = { signIn, signOut, isAuthenticated, isLoading, user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}