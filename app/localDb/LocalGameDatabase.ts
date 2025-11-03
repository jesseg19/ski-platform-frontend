import {
    openDatabaseAsync,
    SQLiteDatabase
} from 'expo-sqlite';

type WebSQLDatabase = SQLiteDatabase;
type SQLError = any;

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


// --- Helper Functions for Transaction Handling  ---

const transactionErrorCallback = (error: SQLError) => {
    console.error('SQL Transaction Error: ', error);
    // In modern API, error handling often moves to the try/catch block 
    // around the executeSqlAsync call, but we'll keep this pattern for now.
    return true;
};

// --- LocalGameDatabase Class ---

export class LocalGameDatabase {
    // Initialize db as potentially null, and it will be set by the init method
    private db: WebSQLDatabase | null = null;

    constructor() {
        this.initDatabase(); // Still call init, but it's now async
    }

    /**
     * Initializes and opens the database asynchronously.
     */
    private async initDatabase() {
        try {
            this.db = await openDatabaseAsync('skiGame.db');
            console.log('Database opened successfully.');

            // Run creation queries after DB is open
            await this.db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS game_state (
          gameId INTEGER PRIMARY KEY,
          p1Username TEXT NOT NULL,
          p2Username TEXT NOT NULL,
          p1UserId INTEGER NOT NULL,
          p2UserId INTEGER NOT NULL,
          p1Letters INTEGER DEFAULT 0,
          p2Letters INTEGER DEFAULT 0,
          whosSet TEXT NOT NULL,
          calledTrick TEXT,
          currentMessage TEXT,
          lastSyncedAt INTEGER,
          isDirty INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS round_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gameId INTEGER NOT NULL,
          roundNumber INTEGER NOT NULL,
          setterUsername TEXT NOT NULL,
          receiverUsername TEXT NOT NULL,
          trickDetails TEXT NOT NULL,
          setterLanded INTEGER,
          receiverLanded INTEGER,
          letterAssignedTo TEXT,
          createdAt INTEGER NOT NULL,
          syncedToServer INTEGER DEFAULT 0,
          inputByUsername TEXT NOT NULL,
          FOREIGN KEY (gameId) REFERENCES game_state(gameId)
        );
        
        CREATE TABLE IF NOT EXISTS pending_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gameId INTEGER NOT NULL,
          actionType TEXT NOT NULL,
          payload TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          attempts INTEGER DEFAULT 0,
          FOREIGN KEY (gameId) REFERENCES game_state(gameId)
        );
        
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gameId INTEGER NOT NULL,
          syncType TEXT NOT NULL,
          syncedAt INTEGER NOT NULL,
          serverTimestamp INTEGER,
          conflicts TEXT
        );
      `);
            console.log('Database tables created/verified successfully.');

        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    // Helper to ensure DB is initialized before every operation
    private getDb(): WebSQLDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Ensure LocalGameDatabase is instantiated and awaited correctly.');
        }
        return this.db;
    }

    /**
     * Save or update game state locally.
     */
    async saveGameState(state: LocalGameState): Promise<void> {
        const db = this.getDb();
        const isDirtyInt = state.isDirty ? 1 : 0;

        await db.runAsync(
            `INSERT OR REPLACE INTO game_state 
      (gameId, p1Username, p2Username, p1UserId, p2UserId, p1Letters, p2Letters, 
       whosSet, calledTrick, currentMessage, lastSyncedAt, isDirty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                state.gameId,
                state.p1Username,
                state.p2Username,
                state.p1UserId,
                state.p2UserId,
                state.p1Letters,
                state.p2Letters,
                state.whosSet,
                state.calledTrick,
                state.currentMessage,
                state.lastSyncedAt,
                isDirtyInt
            ]
        );
    }

    /**
     * Get local game state by ID.
     */
    async getGameState(gameId: number): Promise<LocalGameState | null> {
        const db = this.getDb();
        const row = await db.getFirstAsync<Omit<LocalGameState, 'isDirty'> & { isDirty: number }>(
            'SELECT * FROM game_state WHERE gameId = ?',
            [gameId]
        );

        if (row) {
            return {
                gameId: row.gameId,
                p1Username: row.p1Username,
                p2Username: row.p2Username,
                p1UserId: row.p1UserId,
                p2UserId: row.p2UserId,
                p1Letters: row.p1Letters,
                p2Letters: row.p2Letters,
                whosSet: row.whosSet,
                calledTrick: row.calledTrick === undefined ? null : row.calledTrick,
                currentMessage: row.currentMessage === undefined ? null : row.currentMessage,
                lastSyncedAt: row.lastSyncedAt === undefined ? null : row.lastSyncedAt,
                isDirty: row.isDirty === 1
            };
        }
        return null;
    }


    async removePendingAction(actionId: number): Promise<void> {
        const db = this.getDb();
        await db.runAsync('DELETE FROM pending_actions WHERE id = ?', [actionId]);
    }
}

export const localGameDB = new LocalGameDatabase();