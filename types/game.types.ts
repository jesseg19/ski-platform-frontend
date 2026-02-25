export type GameStatus = 'playing' | 'gameOver' | 'pending' | 'completed' | 'lastTry';
export type PlayerAction = 'land' | 'fail';

export interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2;
}

export interface GameTrick {
    id: number;
    turnNumber: number;
    setterId: number;
    setterUsername: string;
    receiverId: number;
    receiverUsername: string;
    setterLanded: boolean | null
    receiverLanded: boolean | null
    letterAssignedToId: number | null;
    letterAssignedToUsername: string | null;
    trickDetails: string;
}

export interface ActiveGameProps {
    gameId: number;
    currentTurnUserId: number | null;
    totalTricks: number;
    players: GamePlayer[];
    tricks: GameTrick[];
    createdAt: string;
    lastActivityAt: string;
    status: string;
}