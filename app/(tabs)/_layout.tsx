import { IconSymbol } from '@/components/ui/icon-symbol';
import notifee from '@notifee/react-native';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { handleBackgroundEvent, setupNotificationChannels } from '../../services/LiveNotificationService';

notifee.registerForegroundService((notification) => {
  return new Promise(() => { });
});
// Register Background Handler 
notifee.onBackgroundEvent(handleBackgroundEvent);



export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  // 2. MOVE THIS EFFECT TO THE TOP - It must run even if redirecting
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Force stop any lingering background services when app is seen
        notifee.stopForegroundService().catch(() => { });
      }
    });

    // Also fire it immediately on mount in case we were opened from a notification
    if (AppState.currentState === 'active') {
      notifee.stopForegroundService().catch(() => { });
    }

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setupNotificationChannels();
    return notifee.onForegroundEvent(handleBackgroundEvent);
  }, []);

  if (!isAuthenticated) {
    return <Redirect href="/(public)/signup" />;
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Play Game',
          headerShown: false,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="play" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={color} />,

        }}
      />
    </Tabs>
  );
}
