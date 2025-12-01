// --- useLeaderboard.ts ---

import api from '@/auth/axios';
import { useCallback, useState } from 'react';

// Interfaces for data types (copied from original)
export interface LeaderboardEntry {
    userId: number;
    eloRating: number;
    username: string;
    monthlyEloGain: number;
}

// The Hook
export const useLeaderboard = () => {
    const [monthlyData, setMonthlyData] = useState<LeaderboardEntry[]>([]);
    const [allTimeData, setAllTimeData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAllTimeLeaderboard = useCallback(async () => {
        if (allTimeData.length > 0) return; // Simple Caching

        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/leaderboard/all-time');
            setAllTimeData(response.data);
        } catch (err) {
            console.error("Error fetching all-time leaderboard:", err);
            setError("Failed to load All Time Leaderboard.");
        } finally {
            setLoading(false);
        }
    }, [allTimeData.length]);

    const fetchMonthlyLeaderboard = useCallback(async () => {
        if (monthlyData.length > 0) return; // Simple Caching

        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/leaderboard/monthly');
            setMonthlyData(response.data);
        } catch (err) {
            console.error("Error fetching monthly leaderboard:", err);
            setError("Failed to load Monthly Leaderboard.");
        } finally {
            setLoading(false);
        }
    }, [monthlyData.length]);

    return {
        monthlyData,
        allTimeData,
        loading,
        error,
        fetchAllTimeLeaderboard,
        fetchMonthlyLeaderboard,
    };
};