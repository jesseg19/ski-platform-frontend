import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { gameSyncService } from './GameSyncService';
import { localGameDB } from './LocalGameDatabase';

interface UseOfflineGameProps {
    gameId: number;
    username: string;
}

interface UseOfflineGameReturn {
    isOnline: boolean;
    lastSyncTime: Date | null;
    syncInProgress: boolean;
    pendingSyncCount: number;
    syncGame: () => Promise<void>;
    saveLocalState: (state: any) => Promise<void>;
    loadLocalState: () => Promise<any>;
}

export function useOfflineGame({ gameId, username }: UseOfflineGameProps): UseOfflineGameReturn {
    const [isOnline, setIsOnline] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected || false;
            setIsOnline(online);

            // Auto-sync when coming back online
            if (online && !syncInProgress && pendingSyncCount > 0) {
                syncGame();
            }
        });

        return () => unsubscribe();
    }, [syncInProgress, pendingSyncCount]);

    // Check pending sync count on mount and periodically
    useEffect(() => {
        const checkPending = async () => {
            try {
                const unsynced = await localGameDB.getUnsyncedActions(gameId);
                setPendingSyncCount(unsynced.length);
            } catch (error) {
                console.error('Failed to check pending syncs:', error);
            }
        };

        checkPending();
        const interval = setInterval(checkPending, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [gameId]);

    // Sync function
    const syncGame = useCallback(async () => {
        if (syncInProgress || !isOnline) return;

        setSyncInProgress(true);
        try {
            const result = await gameSyncService.syncGame(gameId, username);

            if (result.success) {
                setLastSyncTime(new Date());
                setPendingSyncCount(0);

                if (result.conflicts && result.conflicts.length > 0) {
                    Alert.alert(
                        'Game Synced',
                        `Synced ${result.syncedActions} action(s). ${result.conflicts.length} conflict(s) resolved.`,
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
            Alert.alert(
                'Sync Failed',
                'Unable to sync game data. Will retry automatically.',
                [{ text: 'OK' }]
            );
        } finally {
            setSyncInProgress(false);
        }
    }, [gameId, username, syncInProgress, isOnline]);

    // Save local state
    const saveLocalState = useCallback(async (state: any) => {
        try {
            await localGameDB.saveGameState(state);
        } catch (error) {
            console.error('Failed to save local state:', error);
        }
    }, []);

    // Load local state
    const loadLocalState = useCallback(async () => {
        try {
            return await localGameDB.getGameState(gameId);
        } catch (error) {
            console.error('Failed to load local state:', error);
            return null;
        }
    }, [gameId]);

    return {
        isOnline,
        lastSyncTime,
        syncInProgress,
        pendingSyncCount,
        syncGame,
        saveLocalState,
        loadLocalState,
    };
}
