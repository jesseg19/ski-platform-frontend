import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';


export default function PublicLayout() {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return <Redirect href="/(tabs)/game" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
