// --- ChoseGameModeScreen.tsx (Refactored) ---

import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// --- Imports from refactored files ---
import LeaderboardModal from '@/components/LeaderboardModal';
import { useLeaderboard } from '@/hooks/useLeaderboard';

// --- INTERFACES  ---
interface DesignButtonProps {
    title: string;
    description: string;
    onPress: () => void;
    isPrimary: boolean;
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



// --- DesignButton Component (Kept here as it's the screen's main UI element) ---
const DesignButton: React.FC<DesignButtonProps> = ({ title, description, onPress, isPrimary }) => {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.buttonContainer,
                isPrimary ? styles.primaryButton : styles.secondaryButton,
            ]}
        >
            <ThemedText style={[styles.buttonTitle, { color: isPrimary ? Colors.white : Colors.darkBlue }]}>{title}</ThemedText>
            <ThemedText style={[styles.buttonDescription, { color: isPrimary ? Colors.white : Colors.textGrey }]}>{description}</ThemedText>
        </Pressable>
    );
};

export default function ChoseGameModeScreen() {
    const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);
    const [tab, setTab] = useState<'allTime' | 'monthly'>('allTime');

    // Use the custom hook to manage leaderboard state and fetching logic
    const {
        monthlyData,
        allTimeData,
        loading,
        error,
        fetchAllTimeLeaderboard,
        fetchMonthlyLeaderboard,
    } = useLeaderboard();

    // Logic to fetch data ONLY when the modal opens and the data is not already cached
    useEffect(() => {
        if (leaderboardModalVisible) {
            if (tab === 'allTime') {
                fetchAllTimeLeaderboard();
            } else if (tab === 'monthly') {
                fetchMonthlyLeaderboard();
            }
        }
    }, [leaderboardModalVisible, tab, fetchAllTimeLeaderboard, fetchMonthlyLeaderboard]);

    // Handler for opening the modal (Calls the fetch logic via useEffect)
    const handleOpenLeaderboard = () => {
        setLeaderboardModalVisible(true);
    };

    // Handler for changing the tab
    const handleTabChange = useCallback((newTab: 'allTime' | 'monthly') => {
        setTab(newTab);
    }, []);

    // Helper to get the correct data based on the active tab
    const getActiveLeaderboardData = () => {
        return tab === 'allTime' ? allTimeData : monthlyData;
    };

    // Original Navigation Handlers (Untouched as they are specific to this screen's logic)
    const navigateToTrickGenerator = () => {
        router.push('/(tabs)/game/trickGenerator');
    };

    const navigateToChallengeFriend = async () => {
        // ... (Original API logic for checking active game)
        try {
            const response = await api.get('/api/games/active');
            const gameData: ActiveGameProps | null = response.data;
            if (gameData) {
                const activeGameParam = JSON.stringify(gameData);
                router.push({
                    pathname: '/(tabs)/game/1v1',
                    params: { activeGame: activeGameParam },
                });
            } else {
                router.push('/(tabs)/game/1v1');
            }
        } catch (error) {
            console.error("Error checking active game:", error);
            router.push('/(tabs)/game/1v1');
        }
    };

    return (
        <ImageBackground
            source={require('@/assets/images/background.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <ThemedView style={styles.mainContainer}>

                {/* --- Header & Leaderboard Button --- */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <ImageBackground
                            source={require('@/assets/images/logo.png')}
                            style={styles.mountainPlaceholder}
                            resizeMode="contain"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.leaderboardButton}
                        onPress={handleOpenLeaderboard}
                    >
                        <Ionicons name="trophy" size={30} color={Colors.darkBlue} />
                    </TouchableOpacity>
                </View>

                {/* --- Main Game Buttons --- */}
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <DesignButton
                        title="Challenge a Friend"
                        description="Challenge your friends to a game of S.K.I."
                        onPress={navigateToChallengeFriend}
                        isPrimary={true}
                    />
                    <DesignButton
                        title="Trick Generator"
                        description="Get inspired! Generate random tricks to challenge yourself"
                        onPress={navigateToTrickGenerator}
                        isPrimary={false}
                    />
                </ScrollView>
            </ThemedView>

            {/* --- LEADERBOARD MODAL (Presentational Component) --- */}
            <LeaderboardModal
                isVisible={leaderboardModalVisible}
                onClose={() => setLeaderboardModalVisible(false)}
                data={getActiveLeaderboardData()}
                loading={loading}
                error={error}
                tab={tab}
                onTabChange={handleTabChange}
            />

        </ImageBackground>
    );
}

// --- Styles (Only styles not related to the modal are kept here) ---
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '120%',
        paddingTop: 50,
    },
    mainContainer: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        position: 'relative',
        marginBottom: 20,
    },
    leaderboardButton: {
        position: 'absolute',
        right: 20,
        top: 15,
        padding: 5,
        zIndex: 1,
    },
    logoContainer: {
        alignItems: 'center',
    },
    mountainPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 5,
        marginBottom: 5,
    },
    scrollViewContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    buttonContainer: {
        height: 220,
        borderRadius: 15,
        padding: 55,
        alignItems: 'center',
        marginTop: 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    primaryButton: {
        backgroundColor: Colors.greenButton,
    },
    secondaryButton: {
        backgroundColor: Colors.secondaryBlue,
        borderColor: '#DDD',
        borderWidth: 1,
    },
    buttonTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        paddingTop: 10,
        paddingBottom: 20,
        color: Colors.darkText,
    },
    buttonDescription: {
        fontSize: 18,
        textAlign: 'center',
        color: Colors.textGrey,
    },
});