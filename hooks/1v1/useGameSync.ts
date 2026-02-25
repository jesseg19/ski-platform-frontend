import api from "@/auth/axios";
import { gameSyncService } from "@/services/GameSyncService";
import { localGameDB } from "@/services/LocalGameDatabase";
import { ActiveGameProps } from "@/types/game.types";
import { User } from "@/types/user.types";
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from "react";

interface GameStateData {
    gameId: number;
    p1Username: string;
    p2Username: string;
    p1UserId: number;
    p2UserId: number;
    p1Letters: number;
    p2Letters: number;
    whosSet: string;
    calledTrick: string;
    currentMessage: string;
}

interface UseGameSyncReturn {
    isOnline: boolean;
    syncInProgress: boolean;
    saveLocalGameState: (gameData: GameStateData) => Promise<void>;
    syncGameState: () => Promise<ActiveGameProps | null>;
}

export const useGameSync = (
    gameId: number,
    user: User | null
): UseGameSyncReturn => {
    const [isOnline, setIsOnline] = useState(true);
    const [syncInProgress, setSyncInProgress] = useState(false);

    const saveLocalGameState = useCallback(async (gameData: GameStateData) => {
        if (gameId <= 0) return;

        try {
            await localGameDB.saveGameState({
                gameId: gameData.gameId,
                p1Username: gameData.p1Username,
                p2Username: gameData.p2Username,
                p1UserId: gameData.p1UserId,
                p2UserId: gameData.p2UserId,
                p1Letters: gameData.p1Letters,
                p2Letters: gameData.p2Letters,
                whosSet: gameData.whosSet,
                calledTrick: gameData.calledTrick,
                currentMessage: gameData.currentMessage,
                lastSyncedAt: Date.now(),
                isDirty: !isOnline,
            });
            console.log('Game state saved locally');
        } catch (error) {
            console.error('Failed to save local state:', error);
        }
    }, [gameId, isOnline]);


    const syncGameState = useCallback(async (): Promise<ActiveGameProps | null> => {
        if (gameId <= 0 || !user || syncInProgress) return null;

        setSyncInProgress(true);
        try {
            // First, sync any unsynced actions
            const result = await gameSyncService.syncGame(gameId, user.username);

            if (result.success) {
                console.log('Game synced successfully');

                // Reload state from server to get latest data
                const response = await api.get(`/api/games/${gameId}`);
                const serverState: ActiveGameProps = response.data;


                // Return the server state so it can be used to update local state
                return serverState;
            } else {
                console.log('Sync completed with warnings:', result.message);
                return null;
            }
        } catch (error) {
            console.error('Sync failed:', error);
            return null;
        } finally {
            setSyncInProgress(false);
        }
    }, [gameId, user]);

    // Network monitoring
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected || false;
            setIsOnline(online);

            if (online && gameId > 0 && !syncInProgress) {
                console.log('Connection restored, syncing game state...');
                setTimeout(() => syncGameState(), 1000);
            }
        });

        return () => unsubscribe();
    }, [gameId, syncGameState]);

    return { isOnline, syncInProgress, saveLocalGameState, syncGameState };
};