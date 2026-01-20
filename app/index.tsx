import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';



export default function Index() {
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      // Use a brief delay to ensure the UI has time to render the loading screen

      await new Promise(resolve => setTimeout(resolve, 500));

      if (token) {
        // User is authenticated, navigate to the app's main page
        router.replace('/(tabs)/game');
      } else {
        // No token, navigate to the login page
        router.replace('/(public)/signup');
      }
    };

    checkAuthStatus();
  }, []);





  // Show a loading indicator while we check the authentication status
  // This prevents a brief flash of the default redirect
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    </SafeAreaProvider>
  );
}