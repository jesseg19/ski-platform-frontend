export interface User {
    userId: number;
    username: string;
}

export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SENDING';

export interface ChallengeDto {
    id: number;
    challenger: User;
    challenged: User;
    status: Exclude<ChallengeStatus, 'SENDING'>;
    gameId: number;
}

export interface PlayerActionMessage {
    gameId: number;
    userId: number;
    action: 'land' | 'fail';
}

export interface TrickCallMessage {
    gameId: number;
    setterUsername: string;
    trickDetails: string;
    timestamp: number;
}

export interface LetterUpdateMessage {
    gameId: number;
    userId: number;
    username: string;
    newLetterCount: number;
    timestamp: number;
}

export interface RoundResolvedMessage {
    gameId: number;
    setterUsername: string;
    receiverUsername: string;
    setterLanded: boolean;
    receiverLanded: boolean;
    letterAssignedToUsername: string | null;
    p1Letters: number;
    p2Letters: number;
    timestamp: number;
}

export interface LastTryMessage {
    gameId: number;
    playerOnLastTry: string;
    message: string;
    timestamp: number;
}

export interface GameStatusMessage {
    gameId: number;
    status: string;
    timestamp: number;
}

export interface SyncRequestMessage {
    gameId: number;
    requester: string;
}