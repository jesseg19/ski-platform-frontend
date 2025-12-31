import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../auth/AuthContext';
import { useChallenge } from '../../context/WebSocketProvider';


// --- Profile Card Component ---

interface ProfileCardProps {
    title: string;
    children: React.ReactNode;
    actionText?: string;
    onActionPress?: () => void;
}

interface UserProfile {
    id: number;
    username: string;
    eloRating: string;
    bio: string;

    //computed
    gamesPlayed: number;
    gamesWon: number;

    favoriteTrick: string;
    recentGame: {
        gameId: number;
        userFinalLetters: number;
        opponentFinalLetters: number;
        winnerId: number;
        datePlayed: Date;
        opponentUsername: string;
    };
    achievements: { icon: string; title: string }[];
    totalMatchesAgainst: number;
    winsAgainst: number; // VIEWED PLAYER'S wins against the current user
    winsFor: number; // CURRENT USER'S wins against the viewed player

}

const ProfileCard: React.FC<ProfileCardProps> = ({ title, children, actionText, onActionPress }) => (
    <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>{title}</ThemedText>
            {actionText && onActionPress && (
                <TouchableOpacity onPress={onActionPress}>
                    <ThemedText style={styles.cardActionText}>{actionText}</ThemedText>
                </TouchableOpacity>
            )}
        </View>
        <View>
            {children}
        </View>
    </ThemedView>
);

// --- Stat Comparison Card ---

interface ComparisonCardProps {
    username: string;
    totalMatches: number;
    winsAgainst: number;
    winsFor: number;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ username, totalMatches, winsAgainst, winsFor }) => {
    // Calculate the win percentage for the viewed player against the current user
    const winPercentage = totalMatches > 0 ? ((winsFor / totalMatches) * 100).toFixed(0) : 0;

    return (
        <ProfileCard title={`VS. YOU Stats`} >
            <View style={styles.comparisonContainer}>
                <View style={styles.comparisonStat}>
                    <ThemedText style={styles.comparisonValue}>{totalMatches}</ThemedText>
                    <ThemedText style={styles.comparisonLabel}>Total Matches</ThemedText>
                </View>

                <View style={styles.borderVertical} />

                <View style={styles.comparisonStat}>
                    <ThemedText style={[styles.comparisonValue, { color: Theme.success }]}>{winsAgainst}</ThemedText>
                    <ThemedText style={styles.comparisonLabel}>{username}&apos;s Wins</ThemedText>
                </View>

                <View style={styles.borderVertical} />

                <View style={styles.comparisonStat}>
                    <ThemedText style={[styles.comparisonValue, { color: Theme.primary }]}>{winsFor}</ThemedText>
                    <ThemedText style={styles.comparisonLabel}>Your Wins</ThemedText>
                </View>

                <View style={styles.borderVertical} />

                <View style={styles.comparisonStat}>
                    <ThemedText style={styles.comparisonValue}>{winPercentage}%</ThemedText>
                    <ThemedText style={styles.comparisonLabel}>Win Rate</ThemedText>
                </View>
            </View>
        </ProfileCard>
    );
};

// --- Page Implementation ---

export default function OtherPlayerProfileScreen() {
    const { playerId: playerIdParam } = useLocalSearchParams();
    const viewedPlayerId = Array.isArray(playerIdParam) ? playerIdParam[0] : playerIdParam;

    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();
    const { isConnected, sendChallenge } = useChallenge();
    const [isChallengePending, setIsChallengePending] = useState(false);

    async function getProfileData(id: string) {
        if (!id) return;
        try {
            const response = await api.get(`/api/profiles/${id}`);
            setProfileData(response.data);
        } catch (error) {
            console.error('Failed to fetch other player profile data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Function to check if a challenge is already pending (from modal logic)
    const checkChallengeStatus = async (challengerId: number, challengedId: number) => {
        if (!challengerId || !challengedId || challengerId === challengedId) {
            setIsChallengePending(false);
            return;
        }
        try {
            // This is the same endpoint from your modal logic
            const response = await api.get(`api/games/challenges/pending/challenger`);
            const pendingChallenges = response.data;

            const sentChallenge = pendingChallenges.find((challenge: any) => {
                return challenge.challenger.id === challengerId
                    && challenge.challenged.id === challengedId
                    && challenge.status === 'PENDING';
            });

            setIsChallengePending(!!sentChallenge);
        } catch (error) {
            console.error("Error fetching pending challenges:", error);
            setIsChallengePending(false);
        }
    };

    // NEW: Challenge Handler
    const handleDirectChallenge = async () => {
        if (!profileData || !viewedPlayerId) return;

        // --- 1. Validation Checks (Adapted from the modal) ---
        if (!user?.id) {
            Alert.alert('Authentication Error', 'User ID is missing. Please log in again.');
            return;
        }

        const challengerId = user.id;
        const challengedId = profileData.id;
        const challengedUsername = profileData.username;

        // Self-challenge check is implicitly covered since this page only views others.

        if (!isConnected) {
            Alert.alert('Connection Error', 'Not connected to the server. Please wait for connection or try again.');
            return;
        }

        // --- 2. Check for Pending Challenge ---
        // Run the status check synchronously before sending a new one
        await checkChallengeStatus(challengerId, challengedId);

        if (isChallengePending) {
            Alert.alert(
                'Challenge Pending',
                `You have already sent a challenge to ${challengedUsername}. Waiting for them to accept.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // --- 3. Confirmation Alert and Challenge Send ---
        Alert.alert(
            'Challenge User',
            `Are you sure you want to challenge ${challengedUsername} to a game?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Challenge!',
                    onPress: () => {
                        // Optimistically set pending state
                        setIsChallengePending(true);

                        // Send the challenge via WebSocket
                        sendChallenge(challengedId);

                        // Success message
                        Alert.alert(
                            'Challenge Sent!',
                            `A challenge has been sent to ${challengedUsername}.`,
                            [{ text: 'OK' }]
                        );
                    },
                    style: 'default',
                },
            ]
        );
    };

    useEffect(() => {
        const fetchData = async () => {
            if (viewedPlayerId) {
                await getProfileData(viewedPlayerId.toString());
                // After fetching the profile, check for pending challenges
                if (user?.id) {
                    await checkChallengeStatus(user.id, parseInt(viewedPlayerId.toString()));
                }
            }
        };

        fetchData();
    }, [viewedPlayerId, user?.id]);

    if (loading) {
        return <ThemedView style={styles.mainContainer}><Text>Loading Profile...</Text></ThemedView>;
    }

    if (!profileData) {
        return <ThemedView style={styles.mainContainer}><Text>Profile Not Found.</Text></ThemedView>;
    }


    return (
        <ImageBackground
            source={require('@/assets/images/background.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.mainContainer}>
                <View style={styles.header}>
                    {/* Back Button */}
                    <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={styles.iconButton}>
                        <Feather name="arrow-left" size={28} color={Theme.darkText} />
                    </TouchableOpacity>

                </View>

                <ScrollView contentContainerStyle={styles.scrollViewContent}>

                    {/* Profile Header Block */}
                    <View style={styles.profileHeaderBlock}>
                        <Image source={require('@/assets/images/avatar.png')} style={styles.avatar} />
                        <ThemedText style={styles.username}>{profileData.username}</ThemedText>
                        <ThemedText style={styles.rank}>ELO: {profileData.eloRating}</ThemedText>
                        <ThemedText style={styles.bio}>{profileData.bio || 'No bio available.'}</ThemedText>

                        <TouchableOpacity
                            style={[
                                styles.challengeButton,
                                isChallengePending && styles.challengeButtonPending
                            ]}
                            onPress={handleDirectChallenge}
                            disabled={isChallengePending} // Disable if a challenge is already sent
                        >
                            <ThemedText style={styles.challengeButtonText}>
                                {isChallengePending ? 'Challenge Sent!' : 'Challenge'}
                            </ThemedText>
                            {!isChallengePending && (
                                <Feather name="zap" size={20} color={Theme.darkText} style={{ marginLeft: 8 }} />
                            )}
                        </TouchableOpacity>


                    </View>

                    {profileData.totalMatchesAgainst > 0 && (
                        <ComparisonCard
                            username={profileData.username}
                            totalMatches={profileData.totalMatchesAgainst}
                            winsAgainst={profileData.winsAgainst}
                            winsFor={profileData.winsFor}
                        />
                    )}

                    {/* Key Stats Card  */}
                    <ProfileCard title="Key Stats">
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <ThemedText style={styles.statValue}>{profileData.gamesPlayed}</ThemedText>
                                <ThemedText style={styles.statLabel}>Games Played</ThemedText>
                            </View>
                            <View style={styles.statItem}>
                                <ThemedText style={styles.statValue}>{profileData.gamesPlayed ? (profileData.gamesWon / profileData.gamesPlayed * 100).toFixed(0) : 0}%</ThemedText>
                                <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
                            </View>
                            <View style={styles.statItem}>
                                <ThemedText style={styles.statValue}>{profileData.favoriteTrick || 'N/A'}</ThemedText>
                                <ThemedText style={styles.statLabel}>Favorite Trick</ThemedText>
                            </View>
                        </View>
                    </ProfileCard>

                    {/* Recent Tricks/Games Card */}
                    {profileData.recentGame && (
                        <ProfileCard title="Recent Game" actionText="View All" onActionPress={() => { router.push({ pathname: '/(tabs)/profile/recentGames', params: { targetUserId: profileData.id, targetUsername: profileData.username } }) }}>
                            <View style={styles.recentTrickRow}>
                                <Image source={require('@/assets/images/avatar.png')} style={styles.recentTrickAvatar} />
                                <View style={styles.recentTrickDetails}>
                                    <ThemedText style={styles.recentTrickOpponent}>vs. {profileData.recentGame.opponentUsername}</ThemedText>
                                    <ThemedText style={styles.recentTrickScore}>Played: {new Date(profileData.recentGame.datePlayed).toLocaleDateString()}</ThemedText>
                                </View>
                                <View style={styles.recentTrickScoreBox}>
                                    <ThemedText style={styles.recentTrickScoreValue}>{profileData.recentGame.userFinalLetters} - {profileData.recentGame.opponentFinalLetters}</ThemedText>
                                </View>
                            </View>
                        </ProfileCard>
                    )}
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}


const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '120%', },
    mainContainer: { flex: 1, backgroundColor: 'transparent', },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, },
    iconButton: { padding: 5, },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, },
    logoText: { fontSize: 18, fontWeight: 'bold', color: Theme.primary, },
    scrollViewContent: { paddingHorizontal: 20, paddingBottom: 40, },
    profileHeaderBlock: { alignItems: 'center', paddingVertical: 10, },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Theme.cardBackground, marginBottom: 8, },
    username: { fontSize: 22, fontWeight: 'bold', color: Theme.darkText, },
    rank: { fontSize: 16, color: Theme.darkText, marginBottom: 4, },
    bio: { fontSize: 14, color: Theme.darkText, marginBottom: 10, },
    card: { backgroundColor: Theme.cardBackground, borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3, },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.darkText, },
    cardActionText: { fontSize: 14, color: Theme.primary, fontWeight: '600', },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', },
    statItem: { alignItems: 'center', flex: 1, },
    statValue: { fontSize: 18, fontWeight: 'bold', color: Theme.darkText, },
    statLabel: { fontSize: 12, color: Theme.darkText, marginTop: 2, },
    recentTrickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, },
    recentTrickAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, },
    recentTrickDetails: { flex: 1, },
    recentTrickOpponent: { fontSize: 16, fontWeight: '600', color: Theme.darkText, },
    recentTrickScore: { fontSize: 12, color: Theme.darkText, },
    recentTrickScoreBox: { backgroundColor: Theme.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10, },
    recentTrickScoreValue: { fontSize: 14, fontWeight: 'bold', color: Theme.primary, },


    comparisonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 5,
    },
    comparisonStat: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 5,
    },
    comparisonValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.darkText,
        marginBottom: 2,
    },
    comparisonLabel: {
        fontSize: 10,
        color: Theme.darkText,
        textAlign: 'center',
    },
    borderVertical: {
        width: 1,
        height: '80%',
        backgroundColor: Theme.border,
    },

    challengeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginTop: 15,
        marginBottom: 10,
        width: '60%',
    },
    challengeButtonPending: {
        backgroundColor: Theme.border,
    },
    challengeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
});