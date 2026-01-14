import { GameProvider } from '@/app/context/GameContext';
import { ChallengeProvider } from '@/app/context/WebSocketProvider';
import { Stack } from 'expo-router';


export default function MainStackLayout() {
  return (
    <ChallengeProvider>
      <GameProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Game Selection', headerShown: false }} />
          <Stack.Screen name="1v1" options={{ title: '1v1 Match', headerShown: false }} />
          <Stack.Screen name="trickGenerator" options={{ title: 'Trick Generator', headerShown: false }} />
        </Stack>
      </GameProvider>
    </ChallengeProvider>
  );
}