import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';


interface UserDto {
    id: number;
    username: string;
}

interface ChallengeNotification {
    id: number;
    challenger: UserDto;
    challenged: UserDto;
    createdAt: Date;
    gameId?: number; // Added for when challenge is accepted
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
    }, []);

    const handleDeclineChallenge = (challengeId: number) => async () => {
        if (loading) return;

        try {
            setLoading(true);
            await api.put(`/api/games/challenges/${challengeId}`, {
                action: 'REJECTED'
            });
            console.log('Challenge declined:', challengeId);
            await getChallengeNotifications();
        } catch (error) {
            console.error('Error declining challenge:', error);
            Alert.alert('Error', 'Failed to decline challenge');
        } finally {
            setLoading(false);
        }
    }

    const handleAcceptChallenge = (challengeId: number) => async () => {
        if (loading) return;

        try {
            setLoading(true);

            // First check if user has an active game
            const activeGameCheck = await api.get('/api/games/active/check');
            console.log('Active game check:', activeGameCheck.data);

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
                return;
            }

            // Accept the challenge
            const response = await api.put(`/api/games/challenges/${challengeId}`, {
                action: 'ACCEPTED'
            });
            console.log('Challenge accepted:', response.data);

            // The response should contain the game information
            const challengeData = response.data;

            if (challengeData.gameId) {
                Alert.alert(
                    'Challenge Accepted!',
                    'Your game has started.',
                    [
                        {
                            text: 'Play Now',
                            onPress: async () => {
                                // Fetch the full game state
                                const gameResponse = await api.get(`/api/games/${challengeData.gameId}`);
                                const gameData: GameStateDto = gameResponse.data;

                                // Navigate to the game with the full game state
                                router.push({
                                    pathname: '/(tabs)/game/1v1',
                                    params: { activeGame: JSON.stringify(gameData) }
                                });
                            }
                        }
                    ]
                );
            } else {
                // Fallback: just refresh and show success
                Alert.alert('Success', 'Challenge accepted! The game will start shortly.');
            }

            await getChallengeNotifications();

        } catch (error: any) {
            console.error('Error accepting challenge:', error);

            if (error.response?.status === 400) {
                Alert.alert(
                    'Cannot Accept',
                    error.response?.data?.message || 'Either you or the challenger already has an active game.'
                );
            } else if (error.response?.status === 409) {
                Alert.alert('Error', 'This challenge is no longer available.');
            } else {
                Alert.alert('Error', 'Failed to accept challenge. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header with Logo and Action Icons */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <AntDesign name="arrow-left" size={24} color={Colors.darkBlue} />
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
                        {new Date(notification.createdAt).toLocaleString()}
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
        </ThemedView>
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
        paddingTop: 10,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
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