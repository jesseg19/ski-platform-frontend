import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChallenge } from '../../context/WebSocketProvider';

interface User {
    userId: number;
    username: string;
}

interface ChallengeNotification {
    id: number;
    challenger: User;
    challenged: User;
    createdAt: Date;
    gameId?: number;
}

interface GameStateDto {
    gameId: number;
    status: string;
    currentTurnUserId: number;
    players: {
        userId: number;
        username: string;
        playerNumber: number;
        finalLetters: number;
    }[];
    tricks: any[];
    totalTricks: number;
}

export default function NotificationsScreen() {
    const [challengeNotifications, setChallengeNotifications] = React.useState<ChallengeNotification[]>([]);
    const [loading, setLoading] = React.useState(false);
    const { incomingChallenge, respondToChallenge } = useChallenge();

    async function getChallengeNotifications() {
        try {
            const response = await api.get(`/api/games/challenges/pending`);
            console.log('Challenge notifications:', response.data);
            setChallengeNotifications(response.data);
        } catch (error) {
            console.error('Error fetching challenge notifications:', error);
            setChallengeNotifications([]);
        }
    }

    React.useEffect(() => {
        getChallengeNotifications();
        console.log('Fetching challenge notifications on mount:', challengeNotifications);
    }, []);

    React.useEffect(() => {
        if (incomingChallenge) {
            const exists = challengeNotifications.some(cn => cn.id === incomingChallenge.id);
            if (!exists) {
                const newNotification: ChallengeNotification = {
                    id: incomingChallenge.id,
                    challenger: incomingChallenge.challenger,
                    challenged: incomingChallenge.challenged,
                    createdAt: new Date(),
                    gameId: incomingChallenge.gameId
                };
                setChallengeNotifications(prev => [newNotification, ...prev]);
            }
        }
    }, [incomingChallenge]);

    const handleDeclineChallenge = (challengeId: number) => async () => {
        const challengeToRespond = challengeNotifications.find(n => n.id === challengeId);

        if (challengeToRespond) {
            try {
                setLoading(true);

                // *** PASS THE CHALLENGE ID ***
                await respondToChallenge('REJECTED', challengeId);

                // Remove the challenge from the local state immediately
                setChallengeNotifications(prev => prev.filter(n => n.id !== challengeId));
                Alert.alert('Challenge Declined', `You have declined the challenge from ${challengeToRespond.challenger.username}.`);
            } catch (error) {
                console.error('Error declining challenge:', error);
                // Don't show error alert if respondToChallenge already showed one
                if (!(error as any)?.response) {
                    Alert.alert('Error', 'Failed to decline challenge');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAcceptChallenge = (challengeId: number) => async () => {
        const challengeToRespond = (challengeNotifications || []).find(n => n.id === challengeId);

        console.log('Attempting to accept challenge:', challengeToRespond);
        if (loading) return;

        if (challengeToRespond) {
            try {
                setLoading(true);

                // First check if user has an active game
                const activeGameCheck = await api.get('/api/games/active/check');

                if (activeGameCheck.data.hasActiveGame) {
                    Alert.alert(
                        'Active Game Exists',
                        'You already have an active game. Please finish or pause it before accepting a new challenge.',
                        [
                            {
                                text: 'Go to Active Game',
                                onPress: async () => {
                                    // Get the active game details
                                    const activeGameResponse = await api.get('/api/games/active');
                                    const gameData: GameStateDto = activeGameResponse.data;

                                    // Navigate to the active game
                                    router.push({
                                        pathname: '/(tabs)/game/1v1',
                                        params: { activeGame: JSON.stringify(gameData) }
                                    });
                                }
                            },
                            { text: 'Cancel', style: 'cancel' }
                        ]
                    );
                    setLoading(false);
                    return;
                }

                await respondToChallenge('ACCEPTED', challengeId);

                setChallengeNotifications(prev => prev.filter(n => n.id !== challengeId));

            } catch (error: any) {
                console.error('Error accepting challenge:', error);

                // Don't show error alert if respondToChallenge already showed one
                if (!error?.response) {
                    Alert.alert('Error', 'Failed to accept challenge. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <AntDesign name="arrow-left" size={24} color={Theme.darkText} />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
                </View>

                <ThemedText style={[styles.placeholder, { display: challengeNotifications.length === 0 ? 'flex' : 'none' }]}>
                    No new notifications
                </ThemedText>

                {challengeNotifications.map((notification) => (

                    <ThemedView key={notification.id} style={styles.card}>
                        <ThemedText style={styles.cardTitle}>
                            Challenge from {notification.challenger.username}
                        </ThemedText>
                        <ThemedText style={styles.cardMessage}>
                            Do you accept the challenge?
                        </ThemedText>
                        <ThemedText style={styles.cardDate}>
                            {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString()}
                        </ThemedText>
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                onPress={handleAcceptChallenge(notification.id)}
                                disabled={loading}
                                style={styles.actionButton}
                            >
                                <ThemedText style={styles.acceptText}>
                                    {loading ? 'Processing...' : 'Accept'}
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDeclineChallenge(notification.id)}
                                disabled={loading}
                                style={styles.actionButton}
                            >
                                <ThemedText style={styles.declineText}>Decline</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
        color: Theme.darkText,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    placeholder: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: Theme.darkText,
    },
    cardMessage: {
        fontSize: 16,
        color: '#555',
        marginBottom: 8,
    },
    cardDate: {
        fontSize: 14,
        color: '#999',
        marginBottom: 12,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
    },
    actionButton: {
        padding: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    acceptText: {
        color: 'green',
        fontWeight: 'bold',
        fontSize: 16,
    },
    declineText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
