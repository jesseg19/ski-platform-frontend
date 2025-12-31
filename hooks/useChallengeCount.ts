import api from '@/auth/axios';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';


export const useChallengeCount = () => {
    const [challengeCount, setChallengeCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChallengeCount = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/games/challenges/pending/count');
            setChallengeCount(response.data);
        } catch (error) {
            console.error('Failed to fetch challenge count:', error);
            setChallengeCount(0);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch the count everytime the screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchChallengeCount();

        }, []));

    return { challengeCount, isLoading, refetch: fetchChallengeCount };
};