import {
    openDatabaseAsync,
    SQLiteDatabase
} from 'expo-sqlite';

type WebSQLDatabase = SQLiteDatabase;
type SQLError = any;

// --- Interface Definitions ---

interface LocalGameState {
    gameId: number;
    p1Username: string;
    p2Username: string;
    p1UserId: number;
    p2UserId: number;
    p1Letters: number;
    p2Letters: number;
    whosSet: string;
    calledTrick: string | null;
    currentMessage: string | null;
    lastSyncedAt: number | null;
    isDirty: boolean;
}

interface LocalRoundAction {
    id?: number;
    gameId: number;
    roundNumber: number;
    setterUsername: string;
    receiverUsername: string;
    trickDetails: string;
    setterLanded: boolean | null;
    receiverLanded: boolean | null;
    letterAssignedTo: string | null;
    createdAt: number;
    syncedToServer: boolean;
    inputByUsername: string;
}

interface PendingAction {
    id?: number;
    gameId: number;
    actionType: 'PLAYER_ACTION' | 'TRICK_CALL' | 'LETTER_UPDATE' | 'ROUND_RESOLVE';
    payload: string;
    createdAt: number;
    attempts: number;
}
export class LocalGameDatabase {
    [x: string]: any;
    private db: WebSQLDatabase | null = null;

    constructor() {
        this.initDatabase();
    }

    /**
     * Initializes and opens the database asynchronously.
     */
    private async initDatabase() {
        try {
            this.db = await openDatabaseAsync('skiGame.db');
            console.log('Database opened successfully.');

            // Run creation queries
            await this.db.execAsync(`
                PRAGMA foreign_keys = ON;
                -- (Full CREATE TABLE statements from your previous version here)
                CREATE TABLE IF NOT EXISTS game_state (
                  gameId INTEGER PRIMARY KEY, p1Username TEXT NOT NULL, p2Username TEXT NOT NULL, 
                  p1UserId INTEGER NOT NULL, p2UserId INTEGER NOT NULL, p1Letters INTEGER DEFAULT 0, 
                  p2Letters INTEGER DEFAULT 0, whosSet TEXT NOT NULL, calledTrick TEXT, 
                  currentMessage TEXT, lastSyncedAt INTEGER, isDirty INTEGER DEFAULT 0
                );
                
                CREATE TABLE IF NOT EXISTS round_actions (
                  id INTEGER PRIMARY KEY AUTOINCREMENT, gameId INTEGER NOT NULL, roundNumber INTEGER NOT NULL, 
                  setterUsername TEXT NOT NULL, receiverUsername TEXT NOT NULL, trickDetails TEXT NOT NULL, 
                  setterLanded INTEGER, receiverLanded INTEGER, letterAssignedTo TEXT, createdAt INTEGER NOT NULL, 
                  syncedToServer INTEGER DEFAULT 0, inputByUsername TEXT NOT NULL, 
                  FOREIGN KEY (gameId) REFERENCES game_state(gameId)
                );
                
                CREATE TABLE IF NOT EXISTS pending_actions (
                  id INTEGER PRIMARY KEY AUTOINCREMENT, gameId INTEGER NOT NULL, actionType TEXT NOT NULL, 
                  payload TEXT NOT NULL, createdAt INTEGER NOT NULL, attempts INTEGER DEFAULT 0, 
                  FOREIGN KEY (gameId) REFERENCES game_state(gameId)
                );
                
                CREATE TABLE IF NOT EXISTS sync_log (
                  id INTEGER PRIMARY KEY AUTOINCREMENT, gameId INTEGER NOT NULL, syncType TEXT NOT NULL, 
                  syncedAt INTEGER NOT NULL, serverTimestamp INTEGER, conflicts TEXT
                );
            `);
            console.log('Database tables created/verified successfully.');

        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    private getDb(): WebSQLDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Ensure LocalGameDatabase is instantiated before use.');
        }
        return this.db;
    }

    /**
     * Queue a round action for later sync.
     */
    async queueRoundAction(action: LocalRoundAction): Promise<number> {
        const db = this.getDb();

        const setterLandedInt = action.setterLanded === null ? null : (action.setterLanded ? 1 : 0);
        const receiverLandedInt = action.receiverLanded === null ? null : (action.receiverLanded ? 1 : 0);
        const syncedToServerInt = action.syncedToServer ? 1 : 0;

        const result = await db.runAsync(
            `INSERT INTO round_actions 
            (gameId, roundNumber, setterUsername, receiverUsername, trickDetails, 
             setterLanded, receiverLanded, letterAssignedTo, createdAt, syncedToServer, inputByUsername)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                action.gameId,
                action.roundNumber,
                action.setterUsername,
                action.receiverUsername,
                action.trickDetails,
                setterLandedInt,
                receiverLandedInt,
                action.letterAssignedTo,
                action.createdAt,
                syncedToServerInt,
                action.inputByUsername
            ]
        );
        return result.lastInsertRowId;
    }

    /**
     * Get unsynced round actions.
     */
    async getUnsyncedActions(gameId: number): Promise<LocalRoundAction[]> {
        const db = this.getDb();
        // Use a generic type for the rows we get back to handle the INTEGER to BOOLEAN conversion
        const rows = await db.getAllAsync<Omit<LocalRoundAction, 'setterLanded' | 'receiverLanded' | 'syncedToServer'> & { setterLanded: number | null, receiverLanded: number | null, syncedToServer: number }>(
            'SELECT * FROM round_actions WHERE gameId = ? AND syncedToServer = 0 ORDER BY createdAt ASC',
            [gameId]
        );

        return rows.map(row => ({
            ...row,
            setterLanded: row.setterLanded === null ? null : row.setterLanded === 1,
            receiverLanded: row.receiverLanded === null ? null : row.receiverLanded === 1,
            syncedToServer: row.syncedToServer === 1
        }));
    }

    /**
     * Mark action as synced.
     */
    async markActionSynced(actionId: number): Promise<void> {
        const db = this.getDb();
        await db.runAsync(
            'UPDATE round_actions SET syncedToServer = 1 WHERE id = ?',
            [actionId]
        );
    }

    /**
     * Get pending actions.
     */
    async getPendingActions(gameId: number): Promise<PendingAction[]> {
        const db = this.getDb();
        // The PendingAction interface maps directly to the table structure (TEXT, INTEGER, etc.)
        const rows = await db.getAllAsync<PendingAction>(
            'SELECT * FROM pending_actions WHERE gameId = ? ORDER BY createdAt ASC',
            [gameId]
        );
        return rows;
    }

    async saveGameState(state: LocalGameState): Promise<void> {
        const db = this.getDb();
        const isDirtyInt = state.isDirty ? 1 : 0;

        await db.runAsync(
            `INSERT OR REPLACE INTO game_state 
            (gameId, p1Username, p2Username, p1UserId, p2UserId, p1Letters, p2Letters, 
             whosSet, calledTrick, currentMessage, lastSyncedAt, isDirty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                state.gameId, state.p1Username, state.p2Username, state.p1UserId, state.p2UserId,
                state.p1Letters, state.p2Letters, state.whosSet, state.calledTrick,
                state.currentMessage, state.lastSyncedAt, isDirtyInt
            ]
        );
    }

    async getGameState(gameId: number): Promise<LocalGameState | null> {
        const db = this.getDb();
        const row = await db.getFirstAsync<Omit<LocalGameState, 'isDirty'> & { isDirty: number }>(
            'SELECT * FROM game_state WHERE gameId = ?',
            [gameId]
        );
        if (row) {
            return {
                ...row,
                calledTrick: row.calledTrick ?? null,
                currentMessage: row.currentMessage ?? null,
                lastSyncedAt: row.lastSyncedAt ?? null,
                isDirty: row.isDirty === 1
            } as LocalGameState;
        }
        return null;
    }

    async removePendingAction(actionId: number): Promise<void> {
        const db = this.getDb();
        await db.runAsync('DELETE FROM pending_actions WHERE id = ?', [actionId]);
    }

    async addPendingAction(action: PendingAction): Promise<number> {
        const db = this.getDb();
        const result = await db.runAsync(
            `INSERT INTO pending_actions (gameId, actionType, payload, createdAt, attempts)
             VALUES (?, ?, ?, ?, ?)`,
            [action.gameId, action.actionType, action.payload, action.createdAt, action.attempts]
        );
        return result.lastInsertRowId;
    }

    /**
 * Deletes all round actions and game state data for a specific game ID.
 * This is used when a game is finished or quit, to remove it from local sync.
 */
    async clearGameData(gameId: number): Promise<void> {
        const db = this.getDb();

        // We run the DELETE commands sequentially to ensure data integrity
        // (though they are not strictly dependent on each other, it's safer).

        try {
            //  Delete all round actions for this game
            await db.runAsync('DELETE FROM round_actions WHERE gameId = ?', [gameId]);
            console.log(`Cleared round_actions for gameId ${gameId}`);

            // Delete all pending actions for this game
            await db.runAsync('DELETE FROM pending_actions WHERE gameId = ?', [gameId]);
            console.log(`Cleared pending_actions for gameId ${gameId}`);

            // Delete the main game state record
            await db.runAsync('DELETE FROM game_state WHERE gameId = ?', [gameId]);
            console.log(`Cleared game_state for gameId ${gameId}`);

            // Optionally clear sync log
            await db.runAsync('DELETE FROM sync_log WHERE gameId = ?', [gameId]);
            console.log(`Cleared sync_log for gameId ${gameId}`);

        } catch (error) {
            console.error(`Failed to clear game data for gameId ${gameId}:`, error);
            throw error; // Re-throw the error to be caught by handleSaveGame
        }
    }

    async updateUsernameInGameStates(oldUsername: string, newUsername: string): Promise<void> {
        const db = this.getDb();
        await db.runAsync(
            `UPDATE game_state 
         SET p1Username = CASE WHEN p1Username = ? THEN ? ELSE p1Username END,
             p2Username = CASE WHEN p2Username = ? THEN ? ELSE p2Username END,
             whosSet = CASE WHEN whosSet = ? THEN ? ELSE whosSet END
         WHERE p1Username = ? OR p2Username = ? OR whosSet = ?`,
            [
                oldUsername, newUsername,
                oldUsername, newUsername,
                oldUsername, newUsername,

                oldUsername,
                oldUsername,
                oldUsername
            ]
        );
    }

    async updateUsernameInActions(oldUsername: string, newUsername: string): Promise<void> {
        const db = this.getDb();
        await db.runAsync(
            `UPDATE round_actions 
         SET setterUsername = CASE WHEN setterUsername = ? THEN ? ELSE setterUsername END,
             receiverUsername = CASE WHEN receiverUsername = ? THEN ? ELSE receiverUsername END,
             letterAssignedTo = CASE WHEN letterAssignedTo = ? THEN ? ELSE letterAssignedTo END,
             inputByUsername = CASE WHEN inputByUsername = ? THEN ? ELSE inputByUsername END
         WHERE setterUsername = ? 
            OR receiverUsername = ? 
            OR letterAssignedTo = ? 
            OR inputByUsername = ?`,
            [
                oldUsername, newUsername,
                oldUsername, newUsername,
                oldUsername, newUsername,
                oldUsername, newUsername,

                oldUsername,
                oldUsername,
                oldUsername,
                oldUsername
            ]
        );
    }
}

export const localGameDB = new LocalGameDatabase();