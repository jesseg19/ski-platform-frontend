import { useAuth } from "@/auth/AuthContext";
import api from "@/auth/axios";
import { GameStateContext } from "@/types/hooks.types";
import { useCallback, useRef } from "react";
import { Alert } from "react-native";

export const useGameLogic = (
    gameState: GameStateContext,
    isOnline: boolean,
    publishTrickCall: (gameId: number, setter: string, trick: string) => void,
    publishPlayerAction: (gameId: number, userId: number, action: 'land' | 'fail') => void,
    onGameStateUpdate: () => Promise<void>
) => {
    const { user } = useAuth();
    // We keep this to prevent rapid-fire taps, but the server is the source of truth
    const isProcessing = useRef(false);

    /**
     * Called by the setter to define the trick.
     */
    const setTrick = useCallback(async (gameId: number, setterUsername: string, trickDetails: string) => {
        try {
            // Update UI immediately for responsiveness
            gameState.setCalledTrick(trickDetails);

            if (isOnline) {
                await api.post(`/api/games/${gameId}/setTrick`, {
                    setterUsername,
                    trickDetails
                });
                // Broadcast to opponent via WS for immediate UI sync
                publishTrickCall(gameId, setterUsername, trickDetails);
            }
        } catch (error) {
            console.error("Error setting trick:", error);
            Alert.alert("Error", "Failed to set trick. Please try again.");
        }
    }, [isOnline, publishTrickCall, gameState]);

    /**
     * Called when either player lands or falls. 
     * The backend will resolve the round once both players have submitted.
     */
    const submitResult = useCallback(async (gameId: number, trickId: number, landed: boolean) => {
        if (isProcessing.current) return;
        isProcessing.current = true;

        try {
            if (isOnline) {
                console.log(`Submitting action to DB useGameLogic: user ${user?.username}, trickId ${trickId}, Landed: ${landed}`);

                await api.post(`/api/games/${gameId}/submitAction`, {
                    user: user?.id,
                    trickId,
                    landed
                });

                // Inform the opponent so their UI can show "Opponent has moved"
                publishPlayerAction(gameId, user?.id || 0, landed ? 'land' : 'fail');
            }
        } catch (error) {
            console.error("Error submitting result:", error);
            Alert.alert("Error", "Failed to submit result.");
        } finally {
            // Short timeout to prevent double-taps
            setTimeout(() => { isProcessing.current = false; }, 500);
        }
    }, [isOnline, publishPlayerAction, user]);

    /**
     * Refactored to use the same logic: just tell the server what happened.
     */
    const handleLastTryAction = useCallback(async (action: 'land' | 'fail') => {
        const currentTrick = gameState.tricks[gameState.tricks.length - 1];
        if (!currentTrick) return;

        // In SKI, a "last try" is just another submission of a result
        // but triggered by a specific UI state.
        await submitResult(gameState.gameId, currentTrick.id, action === 'land');
    }, [gameState.tricks, gameState.gameId, submitResult]);

    const addLetterToPlayer = useCallback(async (playerToReceiveLetter: string) => {
        if (gameState.gameId < 0 || gameState.gameStatus === 'gameOver') return;

        //  Identify roles and landing status to force the letter
        // If we want 'playerToReceiveLetter' to get the letter:
        // Case A: Setter is the one getting the letter -> Setter failed, Receiver landed.
        // Case B: Receiver is the one getting the letter -> Setter landed, Receiver failed.
        const isSetterGettingLetter = playerToReceiveLetter === gameState.whosSet;
        const setterLanded = !isSetterGettingLetter;
        const receiverLanded = isSetterGettingLetter;

        const setterUser = gameState.whosSet === gameState.p1Username ? gameState.p1User : gameState.p2User;
        const receiverUser = gameState.whosSet === gameState.p1Username ? gameState.p2User : gameState.p1User;

        if (!isOnline) {
            // Handle offline logic or Alert user that manual letters require sync
            return;
        }

        try {
            // Set the "Auto-Letter" Trick
            const trickResponse = await api.post(`/api/games/${gameState.gameId}/setTrick`, {
                setterUsername: gameState.whosSet,
                trickDetails: "Manual Letter Added"
            });

            // We need the trickId from the state or response to submit actions
            // Assuming your getGameState returns the latest trick just created:
            const updatedState = await api.get(`/api/games/${gameState.gameId}`);
            const currentTrickId = updatedState.data.tricks[updatedState.data.tricks.length - 1].id;

            //  Submit landing results for both players to trigger finalizeRoundLogic
            await api.post(`/api/games/${gameState.gameId}/submitAction`, {
                trickId: currentTrickId,
                userId: setterUser?.userId,
                landed: setterLanded
            });

            await api.post(`/api/games/${gameState.gameId}/submitAction`, {
                trickId: currentTrickId,
                userId: receiverUser?.userId,
                landed: receiverLanded
            });


            const finalStateResponse = await api.get(`/api/games/${gameState.gameId}`);
            const data = finalStateResponse.data;

            // Find the players in the response and update local state
            data.players.forEach((p: any) => {
                if (p.username === gameState.p1Username) gameState.setP1Letters(p.finalLetters);
                if (p.username === gameState.p2Username) gameState.setP2Letters(p.finalLetters);
            });

            // Update the turn indicator (important for the S.K.I. rules switch)
            const nextSetter = data.players.find((p: any) => p.userId === data.currentTurnUserId);
            if (nextSetter) gameState.setWhosSet(nextSetter.username);

            await onGameStateUpdate();
            gameState.setCurrentMessage(`Letter added to ${playerToReceiveLetter}`);

        } catch (error) {
            console.error("Failed to manually add letter via trick:", error);
            Alert.alert("Error", "Could not synchronize the manual letter.");
        }
    }, [gameState, isOnline]);
    return {
        setTrick,
        submitResult,
        handleLastTryAction,
        addLetterToPlayer,
        isProcessing: isProcessing.current
    };
};