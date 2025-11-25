import { IconSymbol } from '@/components/ui/icon-symbol';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '../../auth/AuthContext';


export default function TabLayout() {
  const { isAuthenticated } = useAuth();
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
