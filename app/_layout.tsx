import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { GameProvider } from './context/GameContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <GameProvider>
        <RootLayoutNav />
      </GameProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Hide the splash screen once loading is done
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Use conditional rendering here to prevent the Redirect flash */}
      {!isAuthenticated ? (
        <Stack.Screen name="(public)" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}