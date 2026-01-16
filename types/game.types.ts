export type GameStatus = 'playing' | 'gameOver' | 'pending';
export type PlayerAction = 'land' | 'fail';

export interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2;
}

export interface GameTrick {
    turnNumber: number;
    setterId: number;
    setterUsername: string;
    receiverId: number;
    receiverUsername: string;
    setterLanded: boolean;
    receiverLanded: boolean;
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