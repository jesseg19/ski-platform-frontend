import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


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

    useEffect(() => {
        if (viewedPlayerId) {
            getProfileData(viewedPlayerId.toString());
        }
    }, [viewedPlayerId]);

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

                    {/* S.K.I. Logo */}
                    {/* <View style={styles.logoContainer}>
                        {/* <Image source={require('@/assets/images/logo.png')} style={styles.mountainLogo} /> 
                        <ThemedText style={styles.logoText}>S.K.I.</ThemedText>
                    </View> */}

                </View>

                <ScrollView contentContainerStyle={styles.scrollViewContent}>

                    {/* Profile Header Block */}
                    <View style={styles.profileHeaderBlock}>
                        <Image source={require('@/assets/images/avatar.webp')} style={styles.avatar} />
                        <ThemedText style={styles.username}>{profileData.username}</ThemedText>
                        <ThemedText style={styles.rank}>ELO: {profileData.eloRating}</ThemedText>
                        <ThemedText style={styles.bio}>{profileData.bio || 'No bio available.'}</ThemedText>
                    </View>

                    {profileData.totalMatchesAgainst > 0 && (
                        <ComparisonCard
                            username={profileData.username}
                            totalMatches={profileData.totalMatchesAgainst}
                            winsAgainst={profileData.winsAgainst}
                            winsFor={profileData.winsFor}
                        />
                    )}

                    {/* Key Stats Card (Unchanged) */}
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
                        <ProfileCard title="Recent Game" actionText="View All" onActionPress={() => { alert('View their full match history!'); }}>
                            <View style={styles.recentTrickRow}>
                                <Image source={require('@/assets/images/avatar.webp')} style={styles.recentTrickAvatar} />
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


    // --- NEW Comparison Styles ---
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
});