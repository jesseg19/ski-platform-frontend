import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

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
    subscribeToGame: (gameId: number) => () => void;
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
    const { user, tokenRefreshed, signOut, refreshAccessToken } = useAuth();
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

    const clientRef = React.useRef<Client | null>(null);

    useEffect(() => {
        if (!user) {
            if (clientRef.current?.active) clientRef.current.deactivate();
            setIsConnected(false);
            return;
        }

        let isMounted = true;

        const connect = async () => {
            // 1. Get the fresh token first
            const token = await SecureStore.getItemAsync('userAccessToken');
            if (!token || !isMounted) return;

            // 2. Close old connection
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
            }

            // 3. Create new client with the token we just grabbed
            const client = new Client({
                // Note: No 'async' here!
                webSocketFactory: () => new SockJS(`${SOCKET_URL}?token=${encodeURIComponent(token)}`),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                onConnect: () => {
                    if (!isMounted) return;
                    console.log('WebSocket Connected');
                    setIsConnected(true);

                    client.subscribe(`/user/queue/challenges`, (message) => {
                        handleChallengeUpdate(JSON.parse(message.body));
                    });
                },
                onDisconnect: () => setIsConnected(false),
                onStompError: async (frame) => {
                    const error = frame.headers?.message || '';
                    if (error.includes('401') || error.includes('403') || error.includes('Authentication')) {
                        console.log('WebSocket auth error, refreshing token...');
                        client.deactivate();

                        try {
                            await refreshAccessToken();
                            // tokenRefreshed will increment, triggering reconnection
                        } catch (e) {
                            console.error('Failed to refresh token:', e);
                            // signOut already called in refreshAccessToken
                        }
                    }
                }
            });

            client.activate();
            clientRef.current = client;
        };

        connect();

        return () => {
            isMounted = false;
            if (clientRef.current) {
                clientRef.current.deactivate();
            }
        };
    }, [user, tokenRefreshed]);

    useEffect(() => {
        setTokenRefreshCallback(() => {
            console.log('Token refreshed, Websokcet will reconnect')
        })
    })

    const subscribeToGame = useCallback((gameId: number) => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot subscribe to game updates.');
            return () => { };
        }

        const destination = `/topic/game/${gameId}`;

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
            } catch (error) {
                console.error('Failed to parse game update:', error);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

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
        if (!clientRef.current?.active) return;

        // Broadcast a request for the current state to everyone in the game topic
        clientRef.current.publish({
            destination: `/app/game/requestSync`, // Your backend should broadcast this to /topic/game/{gameId}
            body: JSON.stringify({ gameId, requester: user?.username })
        });
    }, [user]);

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
        requestGameState
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
        requestGameState
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