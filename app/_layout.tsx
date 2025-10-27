import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { GameProvider } from './context/GameContext';


function InitialLoadingScreen() {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once loading is complete, let the router take over.
  // The index.tsx or your group layouts will handle the final redirect based on isAuthenticated.
  return (
    <Stack>
      <Stack.Screen name="(public)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GameProvider>
        <InitialLoadingScreen />
      </GameProvider>
    </AuthProvider>
  );
}