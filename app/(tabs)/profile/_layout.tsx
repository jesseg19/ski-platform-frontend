import { ChallengeProvider } from "@/app/context/WebSocketProvider";
import { Stack } from "expo-router";


export default function ProfileLayout() {
    return (
        <ChallengeProvider>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Profile', headerShown: false }} />
                <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
                <Stack.Screen name="notifications" options={{ title: 'Notifications', headerShown: false }} />
                <Stack.Screen name="recentGames" options={{ title: 'Recent Games', headerShown: false }} />
                <Stack.Screen name="friends" options={{ title: 'Friends', headerShown: false }} />
            </Stack>
        </ChallengeProvider>
    );
}