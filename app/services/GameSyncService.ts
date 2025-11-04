import api from '@/auth/axios';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { LocalGameDatabase, localGameDB } from './LocalGameDatabase';

interface SyncResult {
    success: boolean;
    conflicts?: ConflictInfo[];
    syncedActions: number;
}

interface ConflictInfo {
    roundNumber: number;
    localData: any;
    serverData: any;
    resolution: 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';
}

export class GameSyncService {
    private db: LocalGameDatabase;
    private syncInProgress: boolean = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.db = localGameDB;
        this.startBackgroundSync();
    }

    // Start periodic background sync (every 30 seconds when connected)
    startBackgroundSync() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(async () => {
            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected && !this.syncInProgress) {
                // Sync all active games
                this.syncAllGames();
            }
        }, 30000); // 30 seconds
    }

    stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Check if online
    async isOnline(): Promise<boolean> {
        const netInfo = await NetInfo.fetch();
        return netInfo.isConnected || false;
    }

    // Sync a specific game
    async syncGame(gameId: number, currentUser: string): Promise<SyncResult> {
        if (this.syncInProgress) {
            console.log('Sync already in progress');
            return { success: false, syncedActions: 0 };
        }

        this.syncInProgress = true;

        try {
            const online = await this.isOnline();
            if (!online) {
                console.log('Offline - skipping sync');
                return { success: false, syncedActions: 0 };
            }

            // Get unsynced actions from local DB
            const unsyncedActions = await this.db.getUnsyncedActions(gameId);

            if (unsyncedActions.length === 0) {
                console.log('No actions to sync');
                return { success: true, syncedActions: 0 };
            }

            // Get current server state
            const serverState = await this.fetchServerGameState(gameId);

            // Detect and resolve conflicts
            const conflicts = await this.detectConflicts(unsyncedActions, serverState);

            if (conflicts.length > 0) {
                console.log('Conflicts detected:', conflicts);
                // For now, server wins on conflicts (can be customized)
                await this.resolveConflicts(conflicts, gameId);
            }

            // Sync each unsynced action
            let syncedCount = 0;
            for (const action of unsyncedActions) {
                try {
                    await this.syncRoundAction(action);
                    await this.db.markActionSynced(action.id!);
                    syncedCount++;
                } catch (error) {
                    console.error('Failed to sync action:', error);
                    // Continue with other actions
                }
            }

            // Sync pending actions (player actions, trick calls)
            const pendingActions = await this.db.getPendingActions(gameId);
            for (const pending of pendingActions) {
                try {
                    await this.syncPendingAction(pending);
                    await this.db.removePendingAction(pending.id!);
                } catch (error) {
                    console.error('Failed to sync pending action:', error);
                }
            }

            // Update local state with server state
            await this.updateLocalFromServer(gameId);

            return {
                success: true,
                syncedActions: syncedCount,
                conflicts: conflicts.length > 0 ? conflicts : undefined
            };

        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, syncedActions: 0 };
        } finally {
            this.syncInProgress = false;
        }
    }

    // Fetch current game state from server
    private async fetchServerGameState(gameId: number): Promise<any> {
        try {
            const response = await api.get(`/api/games/${gameId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch server state:', error);
            throw error;
        }
    }

    // Detect conflicts between local and server state
    private async detectConflicts(localActions: any[], serverState: any): Promise<ConflictInfo[]> {
        const conflicts: ConflictInfo[] = [];

        // Check if server has more recent tricks that conflict with local actions
        const serverTricks = serverState.tricks || [];

        for (const localAction of localActions) {
            const serverTrick = serverTricks.find(
                (t: any) => t.turnNumber === localAction.roundNumber
            );

            if (serverTrick) {
                // Check for conflicts
                const hasConflict =
                    serverTrick.setterLanded !== localAction.setterLanded ||
                    serverTrick.receiverLanded !== localAction.receiverLanded ||
                    serverTrick.letterAssignedToUsername !== localAction.letterAssignedTo;

                if (hasConflict) {
                    conflicts.push({
                        roundNumber: localAction.roundNumber,
                        localData: localAction,
                        serverData: serverTrick,
                        resolution: 'SERVER_WINS' // Default strategy
                    });
                }
            }
        }

        return conflicts;
    }

    // Resolve conflicts (customizable strategy)
    private async resolveConflicts(conflicts: ConflictInfo[], gameId: number): Promise<void> {
        for (const conflict of conflicts) {
            if (conflict.resolution === 'SERVER_WINS') {
                // Mark local action as synced (effectively discarding it)
                // The server data will be used when updating local state
                console.log(`Conflict resolved: Server wins for round ${conflict.roundNumber}`);
            }
        }

        // Notify user if there were conflicts
        if (conflicts.length > 0) {
            Alert.alert(
                'Game State Synced',
                `Your device was out of sync. ${conflicts.length} round(s) were updated from the server.`,
                [{ text: 'OK' }]
            );
        }
    }

    // Sync a single round action to server
    private async syncRoundAction(action: any): Promise<void> {
        try {
            await api.post(`/api/games/${action.gameId}/resolveRound`, {
                setterUsername: action.setterUsername,
                receiverUsername: action.receiverUsername,
                trickDetails: action.trickDetails,
                setterLanded: action.setterLanded,
                receiverLanded: action.receiverLanded,
                letterAssignToUsername: action.letterAssignedTo
            });
            console.log('Synced round action:', action.roundNumber);
        } catch (error) {
            console.error('Failed to sync round action:', error);
            throw error;
        }
    }

    // Sync a pending action (player action, trick call, etc.)
    private async syncPendingAction(action: any): Promise<void> {
        const payload = JSON.parse(action.payload);

        try {
            switch (action.actionType) {
                case 'PLAYER_ACTION':
                    // These are handled via WebSocket, may not need REST sync
                    break;
                case 'TRICK_CALL':
                    // Sync trick call if needed
                    break;
                case 'LETTER_UPDATE':
                    await api.put(
                        `/api/games/${action.gameId}/players/${payload.userId}/letters?letterCount=${payload.letterCount}`,
                        {}
                    );
                    break;
                default:
                    console.warn('Unknown action type:', action.actionType);
            }
        } catch (error) {
            console.error('Failed to sync pending action:', error);
            throw error;
        }
    }

    // Update local database with server state
    private async updateLocalFromServer(gameId: number): Promise<void> {
        try {
            const serverState = await this.fetchServerGameState(gameId);

            // Update local game state
            const localState = await this.db.getGameState(gameId);
            if (localState) {
                const p1 = serverState.players.find((p: any) => p.username === localState.p1Username);
                const p2 = serverState.players.find((p: any) => p.username === localState.p2Username);

                await this.db.saveGameState({
                    ...localState,
                    p1Letters: p1?.finalLetters || 0,
                    p2Letters: p2?.finalLetters || 0,
                    lastSyncedAt: Date.now(),
                    isDirty: false
                });
            }
        } catch (error) {
            console.error('Failed to update local from server:', error);
        }
    }

    // Sync all games (for background sync)
    private async syncAllGames(): Promise<void> {
        // This would sync all active games the user is in
        // Implementation depends on how you track active games
        console.log('Background sync triggered');
    }

    // Save action locally first (optimistic update)
    async saveActionLocally(
        gameId: number,
        roundNumber: number,
        setterUsername: string,
        receiverUsername: string,
        trickDetails: string,
        setterLanded: boolean | null,
        receiverLanded: boolean | null,
        letterAssignedTo: string | null,
        inputByUsername: string
    ): Promise<void> {
        await this.db.queueRoundAction({
            gameId,
            roundNumber,
            setterUsername,
            receiverUsername,
            trickDetails,
            setterLanded,
            receiverLanded,
            letterAssignedTo,
            createdAt: Date.now(),
            syncedToServer: false,
            inputByUsername
        });

        // Try immediate sync if online
        const online = await this.isOnline();
        if (online) {
            this.syncGame(gameId, inputByUsername);
        }
    }
}

export const gameSyncService = new GameSyncService();