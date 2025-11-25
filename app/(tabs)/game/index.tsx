import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Custom component for the main action buttons
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

//Leaderboard interfaces
interface LeaderboardEntry {
    userId: number;
    eloRating: number;
    username: string;
    monthlyEloGain: number;
}

//     private long userId;
// private String username;
// private int eloRating;
// private int monthlyEloGain;


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

// --- COLOR PALETTE ---
const Colors = {
    greenButton: '#85E34A', // Primary button
    secondaryBlue: '#F2F8FB', // Secondary button background
    darkBlue: '#406080', // Logo and selected icon
    textGrey: '#555',
    darkText: '#333',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)', // Darker overlay for modals
    modalBackground: '#FFFFFF',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    lightGrey: '#F5F5F5', // For non-ranked rows
};

interface LeaderboardItemProps {
    item: LeaderboardEntry;
    index: number;
    tab: 'allTime' | 'monthly';
}
const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ item, index, tab }) => {
    const rank = index + 1;
    let rankColor = Colors.lightGrey;
    let eloColor = Colors.darkText;

    if (rank === 1) {
        rankColor = Colors.gold;
        eloColor = Colors.gold;
    } else if (rank === 2) {
        rankColor = Colors.silver;
        eloColor = Colors.silver;
    } else if (rank === 3) {
        rankColor = Colors.bronze;
        eloColor = Colors.bronze;
    }

    let stats = "";
    if (tab === 'monthly') {
        stats = `${item.monthlyEloGain} this month`;
    } else if (tab === 'allTime') {
        stats = `${item.eloRating} elo`;
    }
    return (
        <TouchableOpacity onPress={() => router.push({ pathname: "/(tabs)/profile/OtherPlayerProfileScreen", params: { playerId: item.userId.toString() } })}>
            <ThemedView style={[leaderboardStyles.itemContainer, { backgroundColor: rank <= 3 ? rankColor + '30' : Colors.white }]}>
                <View style={leaderboardStyles.rankSection}>
                    <ThemedText style={[leaderboardStyles.rankText, { color: rank <= 3 ? eloColor : Colors.textGrey }]}>
                        #{rank}
                    </ThemedText>
                </View>
                <View style={leaderboardStyles.infoSection}>
                    <ThemedText style={leaderboardStyles.username}>{item.username}</ThemedText>
                </View>
                <View style={leaderboardStyles.eloSection}>
                    <ThemedText style={[leaderboardStyles.eloText, { color: rank <= 3 ? eloColor : Colors.darkBlue }]}>
                        {stats}
                    </ThemedText>
                </View>
            </ThemedView>
        </TouchableOpacity>
    );
};

export default function ChoseGameModeScreen() {

    const [leaderboardModalVisible, setLeaderboardModalVisible] = React.useState(false);
    const [tab, setTab] = useState<'allTime' | 'monthly'>('allTime');
    const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const getAllTimeLeaderboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/leaderboard/all-time');
            setAllTimeLeaderboard(response.data);
        } catch (error) {
            console.error("Error fetching all-time leaderboard:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const getMonthlyLeaderboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/leaderboard/monthly');
            setMonthlyLeaderboard(response.data);
        } catch (error) {
            console.error("Error fetching monthly leaderboard:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data when modal opens or tab changes
    useEffect(() => {
        if (leaderboardModalVisible) {
            if (tab === 'allTime' && allTimeLeaderboard.length === 0) {
                getAllTimeLeaderboard();
            } else if (tab === 'monthly' && monthlyLeaderboard.length === 0) {
                getMonthlyLeaderboard();
            }
        }
    }, [leaderboardModalVisible, tab, allTimeLeaderboard.length, monthlyLeaderboard.length, getAllTimeLeaderboard, getMonthlyLeaderboard]);

    const renderList = (data: LeaderboardEntry[]) => {
        if (loading) {
            return <ThemedText style={leaderboardStyles.loadingText}>Loading leaderboard...</ThemedText>;
        }
        if (data.length === 0) {
            return <ThemedText style={leaderboardStyles.loadingText}>No entries found.</ThemedText>;
        }
        return (
            <FlatList
                data={data}
                keyExtractor={(item) => item.username}
                renderItem={({ item, index }) => <LeaderboardItem item={item} index={index} tab={tab} />}
                contentContainerStyle={leaderboardStyles.flatListContent}
            />
        );
    };

    const navigateToTrickGenerator = () => {
        router.push('/(tabs)/game/trickGenerator');
    };

    const navigateToChallengeFriend = async () => {
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

    const handleOpenLeaderboard = () => {
        setLeaderboardModalVisible(true);
    };

    return (
        <ImageBackground
            source={require('@/assets/images/background.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <ThemedView style={styles.mainContainer}>

                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <ImageBackground
                            source={require('@/assets/images/logo.png')}
                            style={styles.mountainPlaceholder}
                            resizeMode="contain"
                        />
                    </View>

                    {/* --- LEADERBOARD BUTTON --- */}
                    <TouchableOpacity
                        style={styles.leaderboardButton}
                        onPress={handleOpenLeaderboard}
                    >
                        <Ionicons name="trophy" size={30} color={Colors.darkBlue} />
                    </TouchableOpacity>

                </View>

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

            {/* --- LEADERBOARD MODAL --- */}
            <Modal
                visible={leaderboardModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLeaderboardModalVisible(false)}
            >
                <Pressable style={leaderboardStyles.modalOverlay} onPress={() => setLeaderboardModalVisible(false)}>
                    <Pressable style={leaderboardStyles.modalContent} onPress={(e) => e.stopPropagation()}>

                        {/* Modal Header/Title */}
                        <View style={leaderboardStyles.modalHeader}>
                            <ThemedText style={leaderboardStyles.modalTitle}>Global Leaderboard</ThemedText>
                            <TouchableOpacity onPress={() => setLeaderboardModalVisible(false)}>
                                <Ionicons name="close" size={30} color={Colors.darkText} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Navigation */}
                        <View style={leaderboardStyles.tabContainer}>
                            <TouchableOpacity
                                style={[leaderboardStyles.tabButton, tab === 'allTime' && leaderboardStyles.tabButtonActive]}
                                onPress={() => setTab('allTime')}
                            >
                                <ThemedText style={[leaderboardStyles.tabText, tab === 'allTime' && leaderboardStyles.tabTextActive]}>
                                    All Time
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[leaderboardStyles.tabButton, tab === 'monthly' && leaderboardStyles.tabButtonActive]}
                                onPress={() => setTab('monthly')}
                            >
                                <ThemedText style={[leaderboardStyles.tabText, tab === 'monthly' && leaderboardStyles.tabTextActive]}>
                                    Monthly
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        {/* List Content */}
                        <View style={leaderboardStyles.listContainer}>
                            {renderList(tab === 'allTime' ? allTimeLeaderboard : monthlyLeaderboard)}
                        </View>

                    </Pressable>
                </Pressable>
            </Modal>

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '120%',
        paddingTop: 50, // To account for safe areas and notches
    },
    mainContainer: {
        flex: 1,
        paddingTop: 50, // To account for safe areas and notches
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
    backButton: {
        position: 'absolute',
        left: 20,
        top: 0, // Align with the top of the logo container if centered
        padding: 5,
        zIndex: 1, // Ensure it's tappable
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
        paddingBottom: 20, // Add space above the tab bar if present
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
    listContent: {
        flex: 1,
        backgroundColor: Colors.overlay,
    },
});

const leaderboardStyles = StyleSheet.create({
    // --- MODAL STYLES ---
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.modalBackground,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        paddingTop: 20,
        height: '80%', // Takes up 80% of the screen
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.darkText,
    },
    // --- TAB STYLES ---
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.lightGrey,
        borderRadius: 10,
        marginBottom: 15,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabButtonActive: {
        backgroundColor: Colors.darkBlue,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.darkText,
    },
    tabTextActive: {
        color: Colors.white,
    },
    // --- LIST STYLES ---
    listContainer: {
        flex: 1,
    },
    flatListContent: {
        paddingBottom: 20,
        gap: 10,
    },
    loadingText: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 16,
        color: Colors.textGrey,
    },
    // --- LIST ITEM STYLES ---
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.lightGrey,
        alignItems: 'center',
    },
    rankSection: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoSection: {
        flex: 1,
        paddingLeft: 10,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.darkText,
    },
    statsText: {
        fontSize: 12,
        color: Colors.textGrey,
        marginTop: 2,
    },
    eloSection: {
        width: 70,
        alignItems: 'flex-end',
    },
    eloText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    eloLabel: {
        fontSize: 10,
        color: Colors.textGrey,
    }
});