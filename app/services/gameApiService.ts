import axios from 'axios';

const API_URL = 'http://192.168.139.1:8080/api/games';
// const API_URL = "https://ski-platform-backend.onrender.com/api/games";

export const gameApiService = {
    /**
     * Check if user has an active game
     */
    checkActiveGame: async (userId: any) => {
        try {
            const response = await axios.get(`${API_URL}/active/check`, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error checking active game:', error);
            throw error;
        }
    },

    /**
     * Get user's active game
     */
    getActiveGame: async (userId: any) => {
        try {
            const response = await axios.get(`${API_URL}/active`, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            console.error('Error getting active game:', error);
            throw error;
        }
    },

    /**
     * Accept a game challenge
     */
    acceptChallenge: async (challengerId: any, acceptorId: any) => {
        try {
            const response = await axios.post(`${API_URL}/accept`, null, {
                params: { challengerId, acceptorId }
            });
            return response.data;
        } catch (error) {
            console.error('Error accepting challenge:', error);
            throw error;
        }
    },

    /**
     * Get full game state
     */
    getGameState: async (gameId: any) => {
        try {
            const response = await axios.get(`${API_URL}/${gameId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    },

    /**
     * Pause a game
     */
    pauseGame: async (gameId: any, userId: any) => {
        try {
            const response = await axios.put(`${API_URL}/${gameId}/pause`, null, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error pausing game:', error);
            throw error;
        }
    },

    /**
     * Resume a paused game
     */
    resumeGame: async (gameId: any, userId: any) => {
        try {
            const response = await axios.put(`${API_URL}/${gameId}/resume`, null, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error resuming game:', error);
            throw error;
        }
    },

    /**
     * Cancel a game
     */
    cancelGame: async (gameId: any, userId: any) => {
        try {
            await axios.delete(`${API_URL}/${gameId}/cancel`, {
                params: { userId }
            });
        } catch (error) {
            console.error('Error cancelling game:', error);
            throw error;
        }
    },

    /**
     * Get all paused games for user
     */
    getPausedGames: async (userId: any) => {
        try {
            const response = await axios.get(`${API_URL}/paused`, {
                params: { userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error getting paused games:', error);
            throw error;
        }
    },

    /**
     * Add a trick to the game
     */
    addTrick: async (gameId: any, trickData: any) => {
        try {
            const response = await axios.post(`${API_URL}/${gameId}/tricks`, trickData);
            return response.data;
        } catch (error) {
            console.error('Error adding trick:', error);
            throw error;
        }
    },

    /**
     * Complete a game
     */
    completeGame: async (gameId: any, completeData: any) => {
        try {
            await axios.post(`${API_URL}/${gameId}/complete`, completeData);
        } catch (error) {
            console.error('Error completing game:', error);
            throw error;
        }
    },

    /**
     * Update player letters
     */
    updatePlayerLetters: async (gameId: any, userId: any, letterCount: any) => {
        try {
            await axios.put(`${API_URL}/${gameId}/players/${userId}/letters`, null, {
                params: { letterCount }
            });
        } catch (error) {
            console.error('Error updating player letters:', error);
            throw error;
        }
    }
};