import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import api, { setTokenRefreshCallback } from '@/auth/axios';
import * as SecureStore from 'expo-secure-store';
import SockJS from 'sockjs-client';

const SOCKET_URL = 'https://laps.api.jessegross.ca/ws';
// const SOCKET_URL = 'http://192.168.139.1:5000/ws';

interface User {
    userId: number;
    username: string;
}

type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SENDING';

interface ChallengeDto {
    id: number;
    challenger: User;
    challenged: User;
    status: Exclude<ChallengeStatus, 'SENDING'>;
    gameId: number;
}

interface PlayerActionMessage {
    timestamp: any;
    gameId: number;
    userId: number;
    action: 'land' | 'fail';
}

interface TrickCallMessage {
    gameId: number;
    setterUsername: string;
    trickDetails: string;
    timestamp: number;
}

interface LetterUpdateMessage {
    gameId: number;
    userId: number;
    username: string;
    newLetterCount: number;
    timestamp: number;
}

interface RoundResolvedMessage {
    gameId: number;
    setterUsername: string;
    receiverUsername: string;
    setterLanded: boolean;
    receiverLanded: boolean;
    p1Letters: number;
    p2Letters: number;
    letterAssignedToUsername: string | null;
    timestamp: number;
}

interface LastTryMessage {
    gameId: number;
    playerOnLastTry: string;
    message: string;
    timestamp: number;
}

interface GameStatusMessage {
    gameId: number;
    status: string;
    timestamp: number;
}

interface SyncRequestMessage {
    timestamp: any;
    gameId: number;
    requester: string;
}

interface ChallengeContextValue {
    isConnected: boolean;
    isSending: boolean;
    incomingChallenge: ChallengeDto | null;
    sentChallengeStatus: Partial<ChallengeDto> & { status: ChallengeStatus } | null;
    sendChallenge: (challengedId: number) => Promise<void>;
    respondToChallenge: (action: 'ACCEPTED' | 'REJECTED', challengeId?: number) => Promise<void>;
    resetSentChallenge: () => void;
    subscribeToGame: (gameId: number, callback: (message: any) => void) => () => void;
    publishPlayerAction: (gameId: number, userId: number, action: 'land' | 'fail') => void;
    publishTrickCall: (gameId: number, setterUsername: string, trickDetails: string) => void;
    publishLastTry: (gameId: number, playerOnLastTry: string, message: string) => void;
    playerActionMessage: PlayerActionMessage | null;
    trickCallMessage: TrickCallMessage | null;
    letterUpdateMessage: LetterUpdateMessage | null;
    roundResolvedMessage: RoundResolvedMessage | null;
    lastTryMessage: LastTryMessage | null;
    publishLetterUpdate: (gameId: number, userId: number, username: string, newLetterCount: number) => void;
    publishGameStatus: (gameId: number, status: string) => void;
    syncRequestMessage: SyncRequestMessage | null;
    requestGameState: (gameId: number) => void;

}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

interface ChallengeProviderProps {
    children: React.ReactNode;
}

export const ChallengeProvider = ({ children }: ChallengeProviderProps) => {
    const { user, tokenRefreshed, isLoading, signOut, refreshAccessToken } = useAuth();
    const router = useRouter();

    const [isConnected, setIsConnected] = useState(false);
    const [incomingChallenge, setIncomingChallenge] = useState<ChallengeDto | null>(null);
    const [sentChallengeStatus, setSentChallengeStatus] = useState<Partial<ChallengeDto> & { status: ChallengeStatus } | null>(null);
    const [isSending, setIsSending] = useState(false);

    const [playerActionMessage, setPlayerActionMessage] = useState<PlayerActionMessage | null>(null);
    const [trickCallMessage, setTrickCallMessage] = useState<TrickCallMessage | null>(null);
    const [letterUpdateMessage, setLetterUpdateMessage] = useState<LetterUpdateMessage | null>(null);
    const [roundResolvedMessage, setRoundResolvedMessage] = useState<RoundResolvedMessage | null>(null);
    const [lastTryMessage, setLastTryMessage] = useState<LastTryMessage | null>(null);
    const [syncRequestMessage, setSyncRequestMessage] = useState<SyncRequestMessage | null>(null);

    const clientRef = useRef<Client | null>(null);
    const tokenRef = useRef<string | null>(null);

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('App came to foreground, checking connection...');
                // If we are not connected, try to refresh token immediately. 
                // This ensures we don't try to connect with an old token.
                if (!clientRef.current?.connected) {
                    try {
                        console.log('Forcing token refresh on app resume...');
                        await refreshAccessToken();
                        // Note: triggering refreshAccessToken will increment 'tokenRefreshed'
                        // which triggers the main useEffect below to reconnect.
                    } catch (e) {
                        console.log('Failed to refresh token on resume:', e);
                    }
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, [refreshAccessToken]);
    useEffect(() => {
        // If no user, kill any existing connection and exit
        if (isLoading || !user) {
            return;
        }
        let client: Client | null = null;
        let isMounted = true;

        const connect = async () => {
            // Get the fresh token first
            const token = await SecureStore.getItemAsync('userAccessToken');
            if (!token || !isMounted) return;

            // Update the Ref immediately so any retries use this new token
            tokenRef.current = token;

            // Close old connection
            if (clientRef.current) {
                await clientRef.current.deactivate();
                clientRef.current = null;
            }

            // Create new client with the token we just grabbed
            client = new Client({
                // Use the Ref inside the factory. 
                // SockJS is called every time StompJS tries to reconnect.
                // Using tokenRef.current ensures it always picks up the latest token found by 'connect'
                webSocketFactory: () => {
                    const currentToken = tokenRef.current;
                    return new SockJS(`${SOCKET_URL}?token=${encodeURIComponent(currentToken || '')}`);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                onConnect: () => {
                    if (!isMounted) return;
                    console.log('WebSocket Connected');
                    setIsConnected(true);

                    client?.subscribe(`/user/queue/challenges`, (message) => {
                        handleChallengeUpdate(JSON.parse(message.body));
                    });
                },
                onDisconnect: () => {
                    if (isMounted) setIsConnected(false);
                },
                onStompError: async (frame) => {
                    console.log('STOMP Error:', frame.headers['message']);
                    // If we get an auth error, we deactivate and trigger a refresh
                    if (frame.headers['message']?.includes('401') || frame.headers['message']?.includes('Auth')) {
                        if (clientRef.current) clientRef.current.deactivate();
                        try {
                            await refreshAccessToken();
                        } catch (e) {
                            console.error('Socket auth refresh failed');
                        }
                    }
                },
                onWebSocketClose: () => {
                    if (isMounted) setIsConnected(false);
                    // Note: If the handshake fails (401/403) before STOMP connects, 
                    // it lands here, NOT in onStompError.
                    // The AppState listener and tokenRef fix largely handle the recovery.
                }
            });

            if (isMounted) {
                client.activate();
                clientRef.current = client;
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [user?.id, tokenRefreshed, isLoading]);

    useEffect(() => {
        setTokenRefreshCallback(() => {
            console.log('Token refreshed, Websokcet will reconnect')
        })
    }, []);

    const subscribeToGame = useCallback((gameId: number, callback: (message: any) => void): () => void => {
        if (!clientRef.current || !clientRef.current.connected || !isConnected) {
            console.warn(`Subscription deferred: Socket not connected for game ${gameId}`);
            return () => {
                console.log("Cleanup called, but no subscription was active.");
            };
        }

        try {
            const destination = `/topic/game/${gameId}`;
            console.log(`Subscribing to game destination: ${destination}`);

            // Create the single subscription
            const subscription = clientRef.current.subscribe(destination, (message) => {
                try {
                    const data = JSON.parse(message.body);

                    if ('action' in data && 'userId' in data && !('trickDetails' in data)) {
                        setPlayerActionMessage(data as PlayerActionMessage);
                    } else if ('trickDetails' in data && 'setterUsername' in data && !('setterLanded' in data)) {
                        setTrickCallMessage(data as TrickCallMessage);
                    } else if ('newLetterCount' in data && 'username' in data) {
                        setLetterUpdateMessage(data as LetterUpdateMessage);
                    } else if ('setterLanded' in data && 'receiverLanded' in data) {
                        setRoundResolvedMessage(data as RoundResolvedMessage);
                    } else if ('playerOnLastTry' in data) {
                        setLastTryMessage(data as LastTryMessage);
                    } else if ('requester' in data && 'gameId' in data && !('trickDetails' in data)) {
                        setSyncRequestMessage(data as SyncRequestMessage);
                    }
                    // else if (data === 'LAST_TRY_TRIGGER') {
                    //     setLastTryMessage({ gameId: gameId, playerOnLastTry: data.playerOnLastTry, message: data.message, timestamp: Date.now() });
                    // }

                    if (callback) {
                        callback(data);
                    }
                } catch (parseError) {
                    console.error('Failed to parse socket message body:', parseError);
                }
            });

            return () => {
                console.log(`Unsubscribing from game: ${gameId}`);
                subscription.unsubscribe();
            };

        } catch (error) {
            console.error('Failed to subscribe to game:', error);
            return () => { };
        }
    }, [isConnected]);

    const handleChallengeUpdate = (challengeDto: ChallengeDto): void => {
        if (challengeDto.challenged.userId === user?.id && challengeDto.status === 'PENDING') {
            // Incoming challenge for current user
            setIncomingChallenge(challengeDto);
        } else if (challengeDto.challenger.userId === user?.id) {
            setSentChallengeStatus(challengeDto);
        }
        if (challengeDto.status === 'ACCEPTED') {
            const gameId: number | undefined = challengeDto.gameId;
            if (gameId) {
                // Clear the waiting state immediately
                setSentChallengeStatus(null);

                Alert.alert('Challenge Accepted!', `${challengeDto.challenged.username} is ready to play.`, [
                    {
                        text: 'Start Game',
                        onPress: () => {
                            // Fetch game data and navigate
                            api.get(`/api/games/${gameId}`)
                                .then(response => {
                                    const gameData = response.data;

                                    router.replace({
                                        pathname: '/(tabs)/game/1v1',
                                        params: {
                                            activeGame: JSON.stringify(gameData),
                                            modalVisible: "false",
                                            gameStatus: "playing"

                                        },
                                    });
                                })
                                .catch(error => {
                                    console.error('Error fetching game data after acceptance:', error);
                                    Alert.alert("Error", "Challenge accepted, but couldn't load the game data.");
                                });
                        }
                    }
                ]);
            } else {
                console.error("Game ID missing from accepted challenge response.");
                Alert.alert("Error", "Challenge accepted, but couldn't start the game.");
            }
        } else if (challengeDto.status === 'REJECTED') {
            Alert.alert('Challenge Rejected', `${challengeDto.challenged.username} rejected your challenge.`);
            setSentChallengeStatus(null);
        }

    };

    const publishPlayerAction = useCallback((gameId: number, userId: number, action: 'land' | 'fail'): void => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot publish player action.');
            return;
        }

        const message: PlayerActionMessage = {
            gameId,
            userId,
            action,
            timestamp: undefined
        };

        clientRef.current.publish({
            destination: '/app/game/playerAction',
            body: JSON.stringify(message)
        });
    }, []);

    const publishLetterUpdate = useCallback((gameId: number, userId: number, username: string, newLetterCount: number): void => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot publish letter update.');
            return;
        }

        const message: LetterUpdateMessage = {
            gameId,
            userId,
            username,
            newLetterCount,
            timestamp: Date.now()
        };

        const destination = `/topic/game/${gameId}`;
        clientRef.current.publish({
            destination: destination,
            body: JSON.stringify(message)
        });
    }, []);

    const publishTrickCall = useCallback((gameId: number, setterUsername: string, trickDetails: string): void => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot publish trick call.');
            return;
        }

        const message: TrickCallMessage = {
            gameId,
            setterUsername,
            trickDetails,
            timestamp: Date.now()
        };

        clientRef.current.publish({
            destination: '/app/game/trickCall',
            body: JSON.stringify(message)
        });
    }, []);

    const publishLastTry = useCallback((gameId: number, playerOnLastTry: string, message: string): void => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot publish last try.');
            return;
        }

        const lastTryMsg: LastTryMessage = {
            gameId,
            playerOnLastTry,
            message,
            timestamp: Date.now()
        };

        const destination = `/topic/game/${gameId}`;
        clientRef.current.publish({
            destination: destination,
            body: JSON.stringify(lastTryMsg)
        });
    }, []);

    const publishGameStatus = useCallback((gameId: number, status: string): void => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot publish game status.');
            return;
        }

        const message: GameStatusMessage = {
            gameId,
            status,
            timestamp: Date.now()
        };

        const destination = `/topic/game/${gameId}`;
        clientRef.current.publish({
            destination: destination,
            body: JSON.stringify(message)
        });
    }, []);

    const sendChallenge = useCallback(async (challengedId: number) => {
        if (!isConnected) {
            Alert.alert('Connection Error', 'Not connected to the server. Please try again.');
            return;
        }
        if (isSending) return;

        setIsSending(true);
        setSentChallengeStatus({ status: 'PENDING' });

        try {
            await api.post('/api/games/challenges', { challengedId });
        } catch (error) {
            console.error('Failed to send challenge:', error);
            Alert.alert('Error', 'Could not send the challenge.');
            setSentChallengeStatus(null);
        } finally {
            setIsSending(false);
        }
    }, [isConnected, isSending]);

    const respondToChallenge = useCallback(async (action: 'ACCEPTED' | 'REJECTED', challengeId?: number) => {
        const targetChallengeId = challengeId || incomingChallenge?.id;

        if (!targetChallengeId) {
            console.error('No challenge ID available to respond to');
            Alert.alert('Error', 'No challenge found to respond to.');
            return;
        }

        try {
            const response = await api.put(`/api/games/challenges/${targetChallengeId}`, { action });

            if (action === 'ACCEPTED') {
                const gameId = response.data.gameId;

                if (gameId) {
                    setIncomingChallenge(null);

                    // Fetch game data
                    const gameResponse = await api.get(`/api/games/${gameId}`);
                    const gameData = gameResponse.data;

                    router.replace({
                        pathname: '/(tabs)/game/1v1',
                        params: {
                            activeGame: JSON.stringify(gameData),
                            modalVisible: "false"
                        },
                    });
                } else {
                    console.error("Game ID missing from accepted challenge API response.");
                    Alert.alert("Error", "Accepted, but couldn't start the game.");
                }
            } else if (action === 'REJECTED') {
                setIncomingChallenge(null);
            }
        } catch (error: any) {
            console.error(`Failed to ${action} challenge:`, error);

            if (error.response?.status === 400) {
                Alert.alert(
                    'Cannot Accept',
                    error.response?.data?.message || 'Either you or the challenger already has an active game.'
                );
            } else if (error.response?.status === 409) {
                Alert.alert('Error', 'This challenge is no longer available.');
            } else {
                Alert.alert('Error', `Could not ${action} the challenge.`);
            }

            throw error;
        }
    }, [incomingChallenge, router]);

    const resetSentChallenge = useCallback(() => {
        setSentChallengeStatus(null);
    }, []);

    const requestGameState = useCallback((gameId: number) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish({
                destination: '/app/game.requestSync',
                body: JSON.stringify({ gameId }),
            });
        } else {
            // Instead of just warning, wait 1 second and try one last time
            console.log("WS not ready, queuing sync request...");
            setTimeout(() => {
                if (clientRef.current?.connected) {
                    clientRef.current.publish({
                        destination: '/app/game.requestSync',
                        body: JSON.stringify({ gameId }),
                    });
                }
            }, 1500);
        }
    }, []);

    const value = useMemo(() => ({
        isConnected,
        isSending,
        incomingChallenge,
        sentChallengeStatus,
        sendChallenge,
        respondToChallenge,
        resetSentChallenge,
        subscribeToGame,
        publishPlayerAction,
        publishTrickCall,
        publishLastTry,
        publishLetterUpdate,
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage,
        publishGameStatus,
        syncRequestMessage,
        requestGameState,
    }), [
        isConnected,
        isSending,
        incomingChallenge,
        sentChallengeStatus,
        sendChallenge,
        respondToChallenge,
        resetSentChallenge,
        subscribeToGame,
        publishPlayerAction,
        publishTrickCall,
        publishLastTry,
        publishLetterUpdate,
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage,
        publishGameStatus,
        syncRequestMessage,
        requestGameState,
    ]);

    return (
        <ChallengeContext.Provider value={value}>
            {children}
        </ChallengeContext.Provider>
    );
};

export const useChallenge = (): ChallengeContextValue => {
    const context = useContext(ChallengeContext);
    if (!context) {
        throw new Error('useChallenge must be used within a ChallengeProvider');
    }
    return context;
};