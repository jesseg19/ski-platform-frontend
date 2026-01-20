import { useChallenge } from "@/app/context/WebSocketProvider";
import { WebSocketSyncCallbacks } from "@/types/hooks.types";
import { useEffect, useRef } from "react";

export const useWebSocketSync = (
    gameId: number,
    isOnline: boolean,
    callbacks: WebSocketSyncCallbacks
) => {
    const {
        subscribeToGame,
        isConnected,
        requestGameState,
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage,
        syncRequestMessage
    } = useChallenge();

    // Track processed messages to avoid duplicates
    const processedMessages = useRef<Set<string>>(new Set());

    // Effect 1: Handle Subscription
    useEffect(() => {
        // Only subscribe if we have a valid ID and the socket is actually CONNECTED
        if (gameId > 0 && isConnected) {
            console.log('Initiating subscription for:', gameId);

            // Clear old message tracking
            processedMessages.current.clear();

            // Pass the required callback
            const unsubscribe = subscribeToGame(gameId, (data) => {
                console.log("Subscription callback received data:", data);
                // If your backend sends a full game update here, you could call:
                // callbacks.onGameUpdate?.(data);
            });

            return () => {
                if (unsubscribe) {
                    console.log('Cleaning up subscription for:', gameId);
                    unsubscribe();
                }
            };
        }
    }, [gameId, isConnected, subscribeToGame]);

    // Effect 2: Initial State Request
    useEffect(() => {
        // Only request state if we are actually connected
        // This prevents the "No underlying connection" crash
        if (gameId > 0 && isConnected) {
            console.log('Requesting game state sync...');
            requestGameState(gameId);
        }
    }, [gameId, isConnected, requestGameState]);

    // Handle trick call messages
    useEffect(() => {
        if (trickCallMessage && trickCallMessage.gameId === gameId) {
            const messageKey = `trick-${trickCallMessage.gameId}-${trickCallMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received trick call:', trickCallMessage);
                processedMessages.current.add(messageKey);
                callbacks.onTrickCall(trickCallMessage.trickDetails);
            }
        }
    }, [trickCallMessage, gameId, callbacks]);

    // Handle letter updates
    useEffect(() => {
        if (letterUpdateMessage && letterUpdateMessage.gameId === gameId) {
            const messageKey = `letter-${letterUpdateMessage.gameId}-${letterUpdateMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received letter update:', letterUpdateMessage);
                processedMessages.current.add(messageKey);
                callbacks.onLetterUpdate(letterUpdateMessage);
            }
        }
    }, [letterUpdateMessage, gameId, callbacks]);

    // Handle round resolved messages
    useEffect(() => {
        if (roundResolvedMessage && roundResolvedMessage.gameId === gameId) {
            const messageKey = `round-${roundResolvedMessage.gameId}-${roundResolvedMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received round resolution:', roundResolvedMessage);
                processedMessages.current.add(messageKey);
                callbacks.onRoundResolved(roundResolvedMessage);
            }
        }
    }, [roundResolvedMessage, gameId, callbacks]);


    // Handle last try messages
    useEffect(() => {
        if (lastTryMessage && lastTryMessage.gameId === gameId) {
            const messageKey = `lasttry-${lastTryMessage.gameId}-${lastTryMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received last try message:', lastTryMessage);
                processedMessages.current.add(messageKey);
                callbacks.onLastTry(lastTryMessage);
            }
        }
    }, [lastTryMessage, gameId, callbacks]);

    // Handle sync request messages
    useEffect(() => {
        if (syncRequestMessage && syncRequestMessage.gameId === gameId) {
            const messageKey = `sync-${syncRequestMessage.gameId}-${syncRequestMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received sync request:', syncRequestMessage);
                processedMessages.current.add(messageKey);
                callbacks.onSyncRequest(syncRequestMessage);
            }
        }
    }, [syncRequestMessage, gameId, callbacks]);

    // Handle player action messages
    useEffect(() => {
        if (playerActionMessage && playerActionMessage.gameId === gameId && callbacks.onPlayerAction) {
            const messageKey = `action-${playerActionMessage.gameId}-${playerActionMessage.timestamp}`;
            if (!processedMessages.current.has(messageKey)) {
                console.log('Received player action:', playerActionMessage);
                processedMessages.current.add(messageKey);
                callbacks.onPlayerAction(playerActionMessage);
            }
        }
    }, [playerActionMessage, gameId, callbacks]);

    return {
        isSubscribed: gameId > 0 && isOnline
    };
};