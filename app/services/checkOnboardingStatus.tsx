import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@laps_onboarding_seen';

export const OnboardingService = {
    // Check if they've seen it
    checkHasSeen: async () => {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    },

    // Mark as seen
    markAsSeen: async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    }
};