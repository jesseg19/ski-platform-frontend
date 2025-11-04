import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import * as SecureStore from 'expo-secure-store';
import SockJS from 'sockjs-client';

// const SOCKET_URL = 'https://ski-platform-backend.onrender.com/ws';
const SOCKET_URL = 'http://192.168.2.97:8080/ws';

interface User {
    userId: number;
    username: string;
}

interface Game {
    id: number;
}

type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SENDING';

interface ChallengeDto {
    id: number;
    challenger: User;
    challenged: User;
    status: Exclude<ChallengeStatus, 'SENDING'>;
    game?: Game;
}

// New interfaces for WebSocket messages
interface PlayerActionMessage {
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

interface ActiveGameProps {
    gameId: string;
    currentTurnUserId: number;
    totalTricks: number;
    players: {
        player1: { userId: number; username: string };
        player2: { userId: number; username: string };
    };
    tricks: {
        turnNumber: number;
        setterId: number;
        receiverId: number;
        setterLanded: boolean;
        receiverLanded: boolean;
        trickDetails: string;
    }
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
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

interface ChallengeProviderProps {
    children: React.ReactNode;
}

export const ChallengeProvider = ({ children }: ChallengeProviderProps) => {
    const { user } = useAuth();
    const router = useRouter();

    const [isConnected, setIsConnected] = useState(false);
    const [incomingChallenge, setIncomingChallenge] = useState<ChallengeDto | null>(null);
    const [sentChallengeStatus, setSentChallengeStatus] = useState<Partial<ChallengeDto> & { status: ChallengeStatus } | null>(null);
    const [isSending, setIsSending] = useState(false);

    // New state for live game updates
    const [playerActionMessage, setPlayerActionMessage] = useState<PlayerActionMessage | null>(null);
    const [trickCallMessage, setTrickCallMessage] = useState<TrickCallMessage | null>(null);
    const [letterUpdateMessage, setLetterUpdateMessage] = useState<LetterUpdateMessage | null>(null);
    const [roundResolvedMessage, setRoundResolvedMessage] = useState<RoundResolvedMessage | null>(null);
    const [lastTryMessage, setLastTryMessage] = useState<LastTryMessage | null>(null);

    const clientRef = React.useRef<Client | null>(null);

    useEffect(() => {
        if (!user) {
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
            }
            setIsConnected(false);
            return;
        }

        const connect = async () => {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) {
                console.warn('No user token found, cannot connect WebSocket.');
                return;
            }

            console.log('Connecting to WebSocket...');

            const socketUrlWithToken = `${SOCKET_URL}?token=${encodeURIComponent(token)}`;

            const client = new Client({
                webSocketFactory: () => new SockJS(socketUrlWithToken),
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                debug: (str) => {
                    console.log('STOMP Debug:', str);
                },
                onConnect: () => {
                    setIsConnected(true);
                    console.log('✓ WebSocket Connected!');

                    // Subscribe to challenge updates
                    client.subscribe(`/user/queue/challenges`, (message) => {
                        try {
                            const challengeDto: ChallengeDto = JSON.parse(message.body);
                            console.log('Received challenge update:', challengeDto);
                            handleChallengeUpdate(challengeDto);
                        } catch (e) {
                            console.error('Failed to parse challenge update:', e);
                        }
                    });
                },
                onDisconnect: () => {
                    setIsConnected(false);
                    console.log('WebSocket Disconnected');
                },
                onStompError: (frame) => {
                    console.error('Broker error:', frame);
                    console.error('Error message:', frame.headers?.message);
                },
                onWebSocketError: (event) => {
                    console.error('WebSocket error:', event);
                },
            });

            client.activate();
            clientRef.current = client;
        };

        connect();

        return () => {
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
                console.log('WebSocket Disconnected.');
            }
        };
    }, [user]);

    const subscribeToGame = useCallback((gameId: number) => {
        if (!clientRef.current?.active) {
            console.warn('WebSocket not connected, cannot subscribe to game updates.');
            return () => { };
        }

        const destination = `/topic/game/${gameId}`;
        console.log(`Subscribing to game updates at ${destination}`);

        const subscription = clientRef.current.subscribe(destination, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('Received game message:', data);

                // Determine message type based on properties
                if ('action' in data && 'userId' in data) {
                    // This is a PlayerActionMessage
                    setPlayerActionMessage(data as PlayerActionMessage);
                } else if ('trickDetails' in data && 'setterUsername' in data && !('setterLanded' in data)) {
                    // This is a TrickCallMessage
                    setTrickCallMessage(data as TrickCallMessage);
                } else if ('newLetterCount' in data && 'username' in data) {
                    // This is a LetterUpdateMessage
                    setLetterUpdateMessage(data as LetterUpdateMessage);
                } else if ('setterLanded' in data && 'receiverLanded' in data) {
                    // This is a RoundResolvedMessage
                    setRoundResolvedMessage(data as RoundResolvedMessage);
                }
            } catch (error) {
                console.error('Failed to parse game update:', error);
            }
        });

        return () => {
            subscription.unsubscribe();
            console.log(`Unsubscribed from game updates at ${destination}`);
        };
    }, []);

    const handleChallengeUpdate = (challengeDto: ChallengeDto): void => {
        if (challengeDto.challenged.userId === user?.id && challengeDto.status === 'PENDING') {
            setIncomingChallenge(challengeDto);
        } else if (challengeDto.challenger.userId === user?.id) {
            setSentChallengeStatus(challengeDto);

            if (challengeDto.status === 'ACCEPTED') {
                const gameId: number | undefined = challengeDto.game?.id;
                if (gameId) {
                    Alert.alert('Challenge Accepted!', `${challengeDto.challenged.username} is ready to play.`);
                    router.push({
                        pathname: '/(tabs)/game/1v1',
                        params: { modalVisible: "false" },
                    });
                } else {
                    console.error("Game ID missing from accepted challenge response.");
                    Alert.alert("Error", "Challenge accepted, but couldn't start the game.");
                }
            } else if (challengeDto.status === 'REJECTED') {
                Alert.alert('Challenge Rejected', `${challengeDto.challenged.username} rejected your challenge.`);
            }
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
            action
        };

        console.log('Publishing player action:', message);

        clientRef.current.publish({
            destination: '/app/game/playerAction',
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

        console.log('Publishing trick call:', message);

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

        console.log('Publishing last try:', lastTryMsg);

        // Broadcast directly to the game topic (no backend processing needed)
        const destination = `/topic/game/${gameId}`;
        clientRef.current.publish({
            destination: destination,
            body: JSON.stringify(lastTryMsg)
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
        console.log(`Responding to challenge with action: ${action}`);
        console.log('Current incomingChallenge:', incomingChallenge);
        console.log('Provided challengeId:', challengeId);

        // Use provided challengeId or fall back to incomingChallenge
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
                console.log(response.data);
                console.log('Accepted challenge, starting game with ID:', gameId);
                const activeGame = await api.get('/api/games/active');
                const gameData: ActiveGameProps | null = activeGame.data;
                if (gameId) {
                    setIncomingChallenge(null);


                    router.push({
                        pathname: '/game/1v1',
                        params: { gameId: gameId, activeGame: JSON.stringify(gameData) },
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

            throw error; // Re-throw so NotificationsScreen can handle it
        }
    }, [incomingChallenge, router]);

    const resetSentChallenge = useCallback(() => {
        setSentChallengeStatus(null);
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
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage,
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
        playerActionMessage,
        trickCallMessage,
        letterUpdateMessage,
        roundResolvedMessage,
        lastTryMessage
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
