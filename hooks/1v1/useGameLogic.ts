import { useAuth } from "@/auth/AuthContext";
import api from "@/auth/axios";
import { gameSyncService } from "@/services/GameSyncService";
import { localGameDB } from "@/services/LocalGameDatabase";
import { calculateForceLetterPayload } from "@/services/SharedGameLogic";
import { GameStateContext, SyncUtils, WebSocketContext } from "@/types/hooks.types";
import { MAX_LETTERS, isLastTry } from "@/utils/gameHelpers";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";

interface UseGameLogicReturn {
    saveRound: (
        gameId: number,
        setter: string,
        trick: string,
        setterLanded: boolean | null,
        receiverLanded: boolean | null,
        letterGivenTo: string | null
    ) => Promise<void>;
    resolveRound: (setterLanded: boolean, receiverLanded: boolean) => Promise<void>;
    handleLastTryAction: (action: 'land' | 'fail') => Promise<void>;
    addLetterToPlayer: (player: string) => void;
    isProcessingRound: React.RefObject<boolean>;
    lastProcessedRoundKey: React.RefObject<string | null>;
}

export const useGameLogic = (
    gameState: GameStateContext,
    wsContext: WebSocketContext,
    syncUtils: SyncUtils
): UseGameLogicReturn => {
    const { user } = useAuth();
    const isProcessingRound = useRef(false);
    const lastProcessedRoundKey = useRef<string | null>(null);

    const addLetterToPlayer = useCallback((player: string) => {
        if (gameState.gameId < 0) return;
        if (gameState.gameStatus === 'gameOver') return;

        const { setterLanded, receiverLanded } = calculateForceLetterPayload(
            gameState.p1Username,
            gameState.p2Username,
            gameState.whosSet,
            player
        );
        gameState.setCurrentMessage("Letter added, trick skipped");
        saveRound(
            gameState.gameId,
            gameState.whosSet,
            'Letter added without trick',
            setterLanded,
            receiverLanded,
            player
        );
    }, [gameState.gameId, gameState.p1Username, gameState.p2Username, gameState.whosSet]);

    const saveRound = useCallback(async (
        gameId: number,
        setter: string,
        trick: string,
        setterLanded: boolean | null,
        receiverLanded: boolean | null,
        letterGivenTo: string | null
    ) => {
        const receiverName = setter === gameState.p1Username ? gameState.p2Username : gameState.p1Username;
        const roundNumToSave = gameState.currentRoundNumber.current;

        // Check for game over
        if (letterGivenTo === gameState.p1Username && gameState.p1Letters === MAX_LETTERS - 1) {
            gameState.setGameStatus('gameOver');
            gameState.setCurrentMessage(`GAME OVER! ${gameState.p2Username} WINS!`);
        }
        if (letterGivenTo === gameState.p2Username && gameState.p2Letters === MAX_LETTERS - 1) {
            gameState.setGameStatus('gameOver');
            gameState.setCurrentMessage(`GAME OVER! ${gameState.p1Username} WINS!`);
        }

        try {
            if (wsContext.isOnline) {
                try {
                    await api.post(`/api/games/${gameId}/resolveRound`, {
                        setterUsername: setter,
                        receiverUsername: receiverName,
                        trickDetails: trick,
                        setterLanded: setterLanded,
                        receiverLanded: receiverLanded,
                        letterAssignToUsername: letterGivenTo,
                        inputByUsername: user?.username || gameState.p1Username,
                        clientTimestamp: Date.now(),
                    });

                    console.log(`Round ${roundNumToSave} synced to server`);

                    const unsyncedActions = await localGameDB.getUnsyncedActions(gameId);
                    if (unsyncedActions.length > 0) {
                        const lastAction = unsyncedActions[unsyncedActions.length - 1];
                        if (lastAction.id) {
                            await localGameDB.markActionSynced(lastAction.id);
                        }
                    }
                } catch (error: any) {
                    if (error.response?.status === 200 || error.response?.data === "Round already resolved") {
                        console.log("Round already resolved");
                    } else {
                        console.error("Failed to sync round:", error);
                        await gameSyncService.saveActionLocally(
                            gameId, roundNumToSave, setter, receiverName,
                            trick, setterLanded, receiverLanded, letterGivenTo,
                            user?.username || gameState.p1Username
                        );
                    }
                }
            } else {
                await gameSyncService.saveActionLocally(
                    gameId, roundNumToSave, setter, receiverName,
                    trick, setterLanded, receiverLanded, letterGivenTo,
                    user?.username || gameState.p1Username
                );
            }

            gameState.currentRoundNumber.current += 1;

            // Update letter count locally
            if (letterGivenTo) {
                let newCount = 0;
                let userId = 0;

                if (letterGivenTo === gameState.p1Username && gameState.p1Letters < MAX_LETTERS) {
                    newCount = gameState.p1Letters + 1;
                    userId = gameState.p1User?.userId || 0;
                    gameState.setP1Letters(newCount);
                } else if (letterGivenTo === gameState.p2Username && gameState.p2Letters < MAX_LETTERS) {
                    newCount = gameState.p2Letters + 1;
                    userId = gameState.p2User?.userId || 0;
                    gameState.setP2Letters(newCount);
                }

                if (wsContext.isOnline && userId > 0) {
                    wsContext.publishLetterUpdate(gameId, userId, letterGivenTo, newCount);
                }
            }
        } catch (error) {
            console.error("Failed to save round:", error);
            Alert.alert("Error", "Failed to save game progress.");
        }
    }, [gameState, wsContext, user?.username]);

    const resolveRound = useCallback(async (setterLanded: boolean, receiverLanded: boolean) => {
        const roundKey = `${gameState.gameId}-${gameState.currentRoundNumber.current}-${gameState.calledTrick}-${setterLanded}-${receiverLanded}`;

        if (isProcessingRound.current || roundKey === lastProcessedRoundKey.current) {
            console.log('Round already being processed');
            return;
        }

        isProcessingRound.current = true;
        lastProcessedRoundKey.current = roundKey;

        try {
            let playerWhoGotLetter: string | null = null;
            const receiverName = gameState.whosSet === gameState.p1Username ? gameState.p2Username : gameState.p1Username;
            const currentTrick = gameState.calledTrick;

            gameState.setP1Action(null);
            gameState.setP2Action(null);

            // Both land or both fail
            if (setterLanded === receiverLanded) {
                playerWhoGotLetter = null;
                await saveRound(gameState.gameId, gameState.whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);

                if (!setterLanded) {
                    gameState.setWhosSet(receiverName);
                    gameState.setCurrentMessage(`Both missed. ${receiverName}'s set now.`);
                } else {
                    gameState.setCurrentMessage(`Both landed! Game continues.`);
                }
                gameState.setCalledTrick("Awaiting set call...");
            }
            // Setter lands, receiver fails
            else if (setterLanded && !receiverLanded) {
                const receiverLetters = receiverName === gameState.p1Username ? gameState.p1Letters : gameState.p2Letters;

                if (!isLastTry(receiverLetters)) {
                    playerWhoGotLetter = receiverName;
                    await saveRound(gameState.gameId, gameState.whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);
                    gameState.setCurrentMessage(`${gameState.whosSet} landed! ${receiverName} gets a letter.`);
                    gameState.setCalledTrick("Awaiting set call...");
                } else {
                    gameState.setLastTryPlayer(receiverName);
                    const lastTryMsg = `${receiverName} missed! Last letter - 2 attempts.`;
                    gameState.setCurrentMessage(lastTryMsg);
                    if (wsContext.isOnline) {
                        wsContext.publishLastTry(gameState.gameId, receiverName, lastTryMsg);
                    }
                    return;
                }
            }
            // Setter fails, receiver lands
            else if (!setterLanded && receiverLanded) {
                const setterLetters = gameState.whosSet === gameState.p1Username ? gameState.p1Letters : gameState.p2Letters;

                if (!isLastTry(setterLetters)) {
                    playerWhoGotLetter = gameState.whosSet;
                    await saveRound(gameState.gameId, gameState.whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);
                    gameState.setWhosSet(receiverName);
                    gameState.setCurrentMessage(`${gameState.whosSet} fell. ${receiverName}'s set now.`);
                    gameState.setCalledTrick("Awaiting set call...");
                } else {
                    gameState.setLastTryPlayer(gameState.whosSet);
                    const lastTryMsg = `${gameState.whosSet} fell! Last try for ${gameState.whosSet}.`;
                    gameState.setCurrentMessage(lastTryMsg);
                    if (wsContext.isOnline) {
                        wsContext.publishLastTry(gameState.gameId, gameState.whosSet, lastTryMsg);
                    }
                    return;
                }
            }
        } finally {
            setTimeout(() => {
                isProcessingRound.current = false;
            }, 1000);
        }
    }, [gameState, saveRound, wsContext]);

    const handleLastTryAction = async (action: 'land' | 'fail') => {
        const playerOnLastTry = gameState.lastTryPlayer;
        if (!playerOnLastTry || isProcessingRound.current) return;

        isProcessingRound.current = true;

        try {
            const currentSetter = gameState.whosSet;
            const receiverName = currentSetter === gameState.p1Username ? gameState.p2Username : gameState.p1Username;

            let setterLandedFinal: boolean | null = null;
            let receiverLandedFinal: boolean = action === 'land';
            const isSetterOnLastTry = playerOnLastTry === currentSetter;

            if (isSetterOnLastTry) {
                setterLandedFinal = action === 'land';
                receiverLandedFinal = true;
            } else {
                setterLandedFinal = true;
                receiverLandedFinal = action === 'land';
            }

            const trickToSave = `${gameState.calledTrick} (2nd Try)`;

            if (action === 'land') {
                await saveRound(gameState.gameId, currentSetter, trickToSave, setterLandedFinal, receiverLandedFinal, null);

                gameState.setLastTryPlayer(null);
                const newSetter = isSetterOnLastTry ? receiverName : currentSetter;
                gameState.setWhosSet(newSetter);
                gameState.setCurrentMessage(`${playerOnLastTry} survived! ${newSetter}'s set.`);
                gameState.setCalledTrick("Awaiting set call...");
            } else {
                gameState.setGameStatus('gameOver');
                const winnerName = playerOnLastTry === gameState.p1Username ? gameState.p2Username : gameState.p1Username;
                const letterGivenTo = playerOnLastTry;

                if (playerOnLastTry === gameState.p1Username) gameState.setP1Letters(MAX_LETTERS);
                if (playerOnLastTry === gameState.p2Username) gameState.setP2Letters(MAX_LETTERS);

                await saveRound(gameState.gameId, currentSetter, trickToSave, setterLandedFinal, receiverLandedFinal, letterGivenTo);

                gameState.setLastTryPlayer(null);
                gameState.setCurrentMessage(`GAME OVER! ${winnerName} WINS!`);
                gameState.setCalledTrick("Game Over");
            }
        } finally {
            setTimeout(() => {
                isProcessingRound.current = false;
            }, 500);
        }
    };


    return {
        saveRound,
        resolveRound,
        handleLastTryAction,
        addLetterToPlayer,
        isProcessingRound,
        lastProcessedRoundKey
    };
};