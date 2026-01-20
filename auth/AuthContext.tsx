import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { registerForPushNotificationsAsync, sendPushTokenToBackend } from '../services/NotificationService';
import { setSignOutCallback, setTokenRefreshCallback } from './axios';

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
  tokenRefreshed: number;
  updateToken: (newAccessToken: string) => void;
  updateUsername: (newUsername: string) => void;
  refreshAccessToken: () => void
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
  const [tokenRefreshed, setTokenRefreshed] = useState(0);

  const API_BASE_URL = 'https://laps.api.jessegross.ca'

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('userAccessToken');
    await SecureStore.deleteItemAsync('userRefreshToken');
    await SecureStore.deleteItemAsync('userData');
    setIsAuthenticated(false);
    setUser(null);
    router.replace('/(public)/signup'); // Navigate to a public route
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      await SecureStore.setItemAsync('userAccessToken', data.accessToken);
      setTokenRefreshed(prev => prev + 1);

      return data.accessToken;
    } catch (error) {
      await signOut();
      throw error;
    }
  }, [signOut]);

  useEffect(() => {
    // Register sign out callback for axios interceptor
    setSignOutCallback(signOut);
  }, [signOut]);

  useEffect(() => {
    // Check for a token on app launch
    const checkTokenAndUser = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('userAccessToken');
        const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
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

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          sendPushTokenToBackend(token);
        }
      });
    }
  }, [user]); // Run when the user object is set

  useEffect(() => {
    // Listener for when the user taps on the notification (app is in foreground, background, or closed)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      if (data.type === 'NEW_CHALLENGE') {
        // Navigate the user to the challenge screen 
        router.navigate('/(tabs)/profile/notifications');
      }
    });

    return () => {
      // Clean up the subscription when the component unmounts
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Link the Axios interceptor to our state refresher
    setTokenRefreshCallback(() => {
      setTokenRefreshed(prev => prev + 1);
    });
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

  const updateToken = (newAccessToken: string) => {
    SecureStore.setItemAsync('userAccessToken', newAccessToken);
    setTokenRefreshed(prev => prev + 1);
  };
  const updateUsername = useCallback(async (newUsername: string) => {
    setUser(prevUser => {
      if (!prevUser) return null;

      // Create the new user object with the updated username
      const newUser = { ...prevUser, username: newUsername };

      //Persist the updated user data to SecureStore
      SecureStore.setItemAsync('userData', JSON.stringify(newUser))
        .catch(error => {
          console.error('Failed to update userData in SecureStore:', error);
        });

      // Update the in-memory state
      return newUser;
    });
  }, []);



  const value = { signIn, signOut, isAuthenticated, isLoading, user, tokenRefreshed, updateToken, updateUsername, refreshAccessToken };



  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}