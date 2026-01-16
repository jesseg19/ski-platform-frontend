import { useAuth } from "@/auth/AuthContext";
import { ActiveGameProps, GameStatus, GameTrick, PlayerAction } from "@/types/game.types";
import { GameStateContext } from "@/types/hooks.types";
import { getInitialState } from "@/utils/gameStateHelpers";
import { useRef, useState } from "react";

export const useGameState = (initialGameProps: ActiveGameProps | null): GameStateContext => {
    const { user } = useAuth();
    const currentRoundNumber = useRef<number>(1);
    const initialState = getInitialState(initialGameProps, user, currentRoundNumber);

    const [gameId, setGameId] = useState<-1 | number>(initialState.gameId);
    const [p1Username, setP1Username] = useState(initialState.p1Username);
    const [p1User, setP1User] = useState(initialState.p1User);
    const [p2User, setP2User] = useState(initialState.p2User);
    const [p2Username, setP2Username] = useState(initialState.p2Username);
    const [whosSet, setWhosSet] = useState(initialState.whosSet);
    const [p1Letters, setP1Letters] = useState(initialState.p1Letters);
    const [p2Letters, setP2Letters] = useState(initialState.p2Letters);
    const [calledTrick, setCalledTrick] = useState(initialState.calledTrick);
    const [currentMessage, setCurrentMessage] = useState(initialState.currentMessage);
    const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
    const [tricks, setTricks] = useState<GameTrick[]>([]);
    const [lastTryPlayer, setLastTryPlayer] = useState<string | null>(null);
    const [p1Action, setP1Action] = useState<PlayerAction | null>(null);
    const [p2Action, setP2Action] = useState<PlayerAction | null>(null);

    return {
        gameId, setGameId,
        p1Username, setP1Username,
        p1User, setP1User,
        p2User, setP2User,
        p2Username, setP2Username,
        whosSet, setWhosSet,
        p1Letters, setP1Letters,
        p2Letters, setP2Letters,
        calledTrick, setCalledTrick,
        currentMessage, setCurrentMessage,
        gameStatus, setGameStatus,
        tricks, setTricks,
        currentRoundNumber,
        lastTryPlayer, setLastTryPlayer,
        p1Action, setP1Action,
        p2Action, setP2Action
    };
};