import { GamePlayer, GameStatus, GameTrick, PlayerAction } from './game.types';
import {
    LastTryMessage,
    LetterUpdateMessage,
    PlayerActionMessage,
    RoundResolvedMessage,
    SyncRequestMessage
} from './websocket.types';

// GameStateContext - Everything useGameState returns
export interface GameStateContext {
    gameId: number | -1;
    setGameId: (id: number | -1) => void;
    p1Username: string;
    setP1Username: (name: string) => void;
    p1User: GamePlayer | null;
    setP1User: (user: GamePlayer | null) => void;
    p2User: GamePlayer | null;
    setP2User: (user: GamePlayer | null) => void;
    p2Username: string;
    setP2Username: (name: string) => void;
    whosSet: string;
    setWhosSet: (name: string) => void;
    p1Letters: number;
    setP1Letters: (letters: number | ((prev: number) => number)) => void;
    p2Letters: number;
    setP2Letters: (letters: number | ((prev: number) => number)) => void;
    calledTrick: string;
    setCalledTrick: (trick: string) => void;
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    gameStatus: GameStatus;
    setGameStatus: (status: GameStatus) => void;
    tricks: GameTrick[];
    setTricks: (tricks: GameTrick[] | ((prev: GameTrick[]) => GameTrick[])) => void;
    currentRoundNumber: React.MutableRefObject<number>;
    lastTryPlayer: string | null;
    setLastTryPlayer: (player: string | null) => void;
    p1Action: PlayerAction | null;
    setP1Action: (action: PlayerAction | null | ((prev: PlayerAction | null) => PlayerAction | null)) => void;
    p2Action: PlayerAction | null;
    setP2Action: (action: PlayerAction | null | ((prev: PlayerAction | null) => PlayerAction | null)) => void;

}

// WebSocket Context
export interface WebSocketContext {
    isOnline: boolean;
    publishLetterUpdate: (gameId: number, userId: number, username: string, newLetterCount: number) => void;
    publishLastTry: (gameId: number, playerOnLastTry: string, message: string) => void;
}

// Sync Utilities
export interface SyncUtils {
    saveLocalGameState: () => Promise<void>;
    syncGameState: () => Promise<void>;
}

// WebSocket Sync Callbacks
export interface WebSocketSyncCallbacks {
    onTrickCall: (trickDetails: string) => void;
    onLetterUpdate: (message: LetterUpdateMessage) => void;
    onRoundResolved: (message: RoundResolvedMessage) => void;
    onLastTry: (message: LastTryMessage) => void;
    onSyncRequest: (message: SyncRequestMessage) => void;
    onPlayerAction?: (message: PlayerActionMessage) => void;
}