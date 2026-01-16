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
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage,
        syncRequestMessage
    } = useChallenge();

    // Track processed messages to avoid duplicates
    const processedMessages = useRef<Set<string>>(new Set());

    // Subscribe to game
    useEffect(() => {
        if (gameId > 0 && isOnline) {
            console.log('Subscribing to game:', gameId);
            // Clear processed messages when subscribing to a new game
            processedMessages.current.clear();
            const unsubscribe = subscribeToGame(gameId);
            return unsubscribe;
        }
    }, [gameId, subscribeToGame, isOnline]);

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