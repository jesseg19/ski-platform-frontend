// services/BackgroundLogic.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DIFFICULTY_LEVELS, generateRailTrick, generateTrick } from '../app/(tabs)/game/trickGenerator';

const API_BASE_URL = "https://laps.api.jessegross.ca";
// const API_BASE_URL = "http://192.168.139.1:5000";

// --- 1. TRICK GENERATOR LOGIC ---

export const saveGeneratorSettings = async (mode: 'jumps' | 'rails', difficulty: number) => {
    await AsyncStorage.setItem('gen_mode', mode);
    await AsyncStorage.setItem('gen_difficulty', difficulty.toString());
};

export const generateTrickFromBackground = async () => {
    // Read the user's last saved settings
    const mode = (await AsyncStorage.getItem('gen_mode')) as 'jumps' | 'rails' || 'jumps';
    const difficultyStr = await AsyncStorage.getItem('gen_difficulty');
    const level = difficultyStr ? parseInt(difficultyStr, 10) : 1;

    //get max and min difficulty based on level
    const levelSettings = DIFFICULTY_LEVELS.find(l => l.value === level);
    const maxDifficulty = levelSettings ? levelSettings.maxDifficulty : 100;
    const minDifficulty = levelSettings ? levelSettings.minDifficulty : 10;

    // Generate based on those settings
    if (mode === 'jumps') {
        return generateTrick(maxDifficulty, minDifficulty, level);
    } else {
        return generateRailTrick(level, minDifficulty, maxDifficulty);
    }
};

// ---  GAME LOGIC ---

export const getAuthToken = async () => {
    return await SecureStore.getItemAsync('userAccessToken');
};

export const performGameActionInBackground = async (gameId: number, actionEndpoint: string, payload: any) => {
    try {
        const token = await getAuthToken();
        if (!token) throw new Error("No token in background");

        // Create a fresh Axios instance for the background process
        const bgApi = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const response = await bgApi.post(`/api/games/${gameId}/${actionEndpoint}`, payload);
        return response.data;
    } catch (error) {
        console.error("Background API Error:", error);
        return null;
    }
};