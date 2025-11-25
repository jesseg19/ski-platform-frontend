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

    startBackgroundSync() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(async () => {
            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected && !this.syncInProgress) {
                this.syncAllGames();
            }
        }, 30000);
    }

    stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async isOnline(): Promise<boolean> {
        const netInfo = await NetInfo.fetch();
        return netInfo.isConnected || false;
    }

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

            const unsyncedActions = await this.db.getUnsyncedActions(gameId);

            if (unsyncedActions.length === 0) {
                // Still update local state from server
                await this.updateLocalFromServer(gameId);
                return { success: true, syncedActions: 0 };
            }

            const serverState = await this.fetchServerGameState(gameId);
            const conflicts = await this.detectConflicts(unsyncedActions, serverState);

            if (conflicts.length > 0) {
                console.log('Conflicts detected:', conflicts);
                await this.resolveConflicts(conflicts, gameId);
            }

            let syncedCount = 0;
            for (const action of unsyncedActions) {
                try {
                    await this.syncRoundAction(action);
                    await this.db.markActionSynced(action.id!);
                    syncedCount++;
                } catch (error: any) {
                    if (error.response?.data === "Round already resolved") {
                        await this.db.markActionSynced(action.id!);
                        console.log('Round already resolved, marking as synced');
                    } else {
                        console.error('Failed to sync action:', error);
                    }
                }
            }

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

    private async fetchServerGameState(gameId: number): Promise<any> {
        try {
            const response = await api.get(`/api/games/${gameId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch server state:', error);
            throw error;
        }
    }

    private async detectConflicts(localActions: any[], serverState: any): Promise<ConflictInfo[]> {
        const conflicts: ConflictInfo[] = [];
        const serverTricks = serverState.tricks || [];

        for (const localAction of localActions) {
            const serverTrick = serverTricks.find(
                (t: any) => t.turnNumber === localAction.roundNumber
            );

            if (serverTrick) {
                const hasConflict =
                    serverTrick.setterLanded !== localAction.setterLanded ||
                    serverTrick.receiverLanded !== localAction.receiverLanded ||
                    serverTrick.letterAssignedToUsername !== localAction.letterAssignedTo;

                if (hasConflict) {
                    conflicts.push({
                        roundNumber: localAction.roundNumber,
                        localData: localAction,
                        serverData: serverTrick,
                        resolution: 'SERVER_WINS'
                    });
                }
            }
        }

        return conflicts;
    }

    private async resolveConflicts(conflicts: ConflictInfo[], gameId: number): Promise<void> {
        for (const conflict of conflicts) {
            if (conflict.resolution === 'SERVER_WINS') {
                console.log(`Conflict resolved: Server wins for round ${conflict.roundNumber}`);
            }
        }

        if (conflicts.length > 0) {
            Alert.alert(
                'Game State Synced',
                `Your device was out of sync. ${conflicts.length} round(s) were updated from the server.`,
                [{ text: 'OK' }]
            );
        }
    }

    private async syncRoundAction(action: any): Promise<void> {
        try {
            await api.post(`/api/games/${action.gameId}/resolveRound`, {
                setterUsername: action.setterUsername,
                receiverUsername: action.receiverUsername,
                trickDetails: action.trickDetails,
                setterLanded: action.setterLanded,
                receiverLanded: action.receiverLanded,
                letterAssignToUsername: action.letterAssignedTo,
                inputByUsername: action.inputByUsername,
                clientTimestamp: action.createdAt
            });
            console.log('Synced round action:', action.roundNumber);
        } catch (error) {
            console.error('Failed to sync round action:', error);
            throw error;
        }
    }

    private async updateLocalFromServer(gameId: number): Promise<void> {
        try {
            const serverState = await this.fetchServerGameState(gameId);
            const localState = await this.db.getGameState(gameId);

            if (localState && serverState.players) {
                const p1 = serverState.players.find((p: any) => p.username === localState.p1Username);
                const p2 = serverState.players.find((p: any) => p.username === localState.p2Username);

                // Determine current setter from last trick or currentTurnUserId
                let whosSet = localState.whosSet;
                if (serverState.tricks && serverState.tricks.length > 0) {
                    const lastTrick = serverState.tricks[serverState.tricks.length - 1];
                    const lastSetter = serverState.players.find((p: any) => p.userId === lastTrick.setterId);
                    if (lastSetter) {
                        whosSet = lastSetter.username;
                    }
                } else if (serverState.currentTurnUserId) {
                    const currentTurnUser = serverState.players.find((p: any) => p.userId === serverState.currentTurnUserId);
                    if (currentTurnUser) {
                        whosSet = currentTurnUser.username;
                    }
                }

                await this.db.saveGameState({
                    ...localState,
                    p1Letters: p1?.finalLetters || 0,
                    p2Letters: p2?.finalLetters || 0,
                    whosSet: whosSet,
                    lastSyncedAt: Date.now(),
                    isDirty: false
                });
            }
        } catch (error) {
            console.error('Failed to update local from server:', error);
        }
    }

    private async syncAllGames(): Promise<void> {
        // console.log('Background sync triggered');
    }

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

        const online = await this.isOnline();
        if (online) {
            this.syncGame(gameId, inputByUsername);
        }
    }
}

export const gameSyncService = new GameSyncService();