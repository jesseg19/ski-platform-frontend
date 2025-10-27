import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import * as SecureStore from 'expo-secure-store';
import SockJS from 'sockjs-client';

// const SOCKET_URL = 'http://192.168.139.1:8080/ws';
const SOCKET_URL = 'http://192.168.2.97:8080/ws';
// const SOCKET_URL = 'https://ski-platform-backend.onrender.com/ws';


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

interface ChallengeContextValue {
    isConnected: boolean;
    isSending: boolean;
    incomingChallenge: ChallengeDto | null;
    sentChallengeStatus: Partial<ChallengeDto> & { status: ChallengeStatus } | null;
    sendChallenge: (challengedId: number) => Promise<void>;
    respondToChallenge: (action: 'ACCEPTED' | 'REJECTED') => Promise<void>;
    resetSentChallenge: () => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

interface ChallengeProviderProps {
    children: React.ReactNode;
}

export const ChallengeProvider = ({ children }: ChallengeProviderProps) => {
    const { user } = useAuth();
    const router = useRouter();
    console.log("ChallengeProvider user:", user);

    const [isConnected, setIsConnected] = useState(false);
    const [incomingChallenge, setIncomingChallenge] = useState<ChallengeDto | null>(null);
    const [sentChallengeStatus, setSentChallengeStatus] = useState<Partial<ChallengeDto> & { status: ChallengeStatus } | null>(null);
    const [isSending, setIsSending] = useState(false);

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
            console.log('Token (first 30 chars):', token.substring(0, 30) + '...');

            // Pass token as query parameter for SockJS
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

    const handleChallengeUpdate = (challengeDto: ChallengeDto): void => {
        if (challengeDto.challenged.userId === user?.id && challengeDto.status === 'PENDING') {
            setIncomingChallenge(challengeDto);
        } else if (challengeDto.challenger.userId === user?.id) {
            setSentChallengeStatus(challengeDto);

            if (challengeDto.status === 'ACCEPTED') {
                const gameId: number | undefined = challengeDto.game?.id;
                if (gameId) {
                    Alert.alert('Challenge Accepted!', `${challengeDto.challenged.username} is ready to play.`);
                    router.push(`/game/1v1`);
                } else {
                    console.error("Game ID missing from accepted challenge response.");
                    Alert.alert("Error", "Challenge accepted, but couldn't start the game.");
                }
            } else if (challengeDto.status === 'REJECTED') {
                Alert.alert('Challenge Rejected', `${challengeDto.challenged.username} rejected your challenge.`);
            }
        }
    };

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

    const respondToChallenge = useCallback(async (action: 'ACCEPTED' | 'REJECTED') => {
        if (!incomingChallenge) return;

        try {
            const response = await api.put(`/api/games/challenges/${incomingChallenge.id}`, { action });

            if (action === 'ACCEPTED') {
                const gameId = response.data.game?.id;
                if (gameId) {
                    router.push({
                        pathname: '/game/1v1',
                        params: { gameId: gameId }
                    });
                } else {
                    console.error("Game ID missing from accepted challenge API response.");
                    Alert.alert("Error", "Accepted, but couldn't start the game.");
                }
            } else if (action === 'REJECTED') {
                Alert.alert('Challenge Declined', `You have declined the challenge from ${incomingChallenge.challenger.username}.`);
            }
        } catch (error) {
            console.error(`Failed to ${action} challenge:`, error);
            Alert.alert('Error', `Could not ${action} the challenge.`);
        } finally {
            setIncomingChallenge(null);
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
        resetSentChallenge
    }), [isConnected, isSending, incomingChallenge, sentChallengeStatus, sendChallenge, respondToChallenge, resetSentChallenge]);

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