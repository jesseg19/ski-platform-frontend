import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, LayoutAnimation, Platform, StyleSheet, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../../constants/theme';

// Enable LayoutAnimation for smooth list item expansion
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2;
}

interface GameTrick {
    turnNumber: number;
    setterId: number;
    setterUsername: string;
    receiverId: number;
    receiverUsername: string;
    setterLanded: boolean;
    receiverLanded: boolean;
    letterAssignedToId: number | null;
    letterAssignedToUsername: number | null;
    trickDetails: string;
}

interface PausedGame {
    gameId: number;
    currentTurnUserId: number | null;
    totalTricks: number;
    players: GamePlayer[];
    createdAt: string;
    lastActivityAt: string;
    status: 'paused' | 'active';
}

interface RecentGame {
    gameId: number;
    winnerId: number;
    datePlayed: string;
    userLetters: number;
    opponentLetters: number;
    opponentUsername: string;
};

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


// Component for rendering a single trick in the expanded list
const TrickItem: React.FC<{ trick: GameTrick; players: GamePlayer[] }> = ({ trick, players }) => {
    const setter = trick.setterUsername;
    const receiver = trick.receiverUsername;
    const getOutcome = () => {
        if (trick.setterLanded && trick.receiverLanded) return { icon: 'checkmark-circle', color: Theme.success, text: 'Both Landed' };
        if (trick.setterLanded && !trick.receiverLanded) return { icon: 'close-circle', color: Theme.danger, text: `${receiver} got letter` };
        if (!trick.setterLanded && trick.receiverLanded) return { icon: 'close-circle', color: Theme.danger, text: `${setter} got letter` };
        return { icon: 'arrow-forward-circle', color: Theme.warning, text: 'TURN OVER' };
    };

    const outcome = getOutcome();

    return (
        <View style={trickListStyles.trickItem}>
            <View style={trickListStyles.header}>
                <ThemedText style={trickListStyles.turnNumber}>Turn #{trick.turnNumber}</ThemedText>
                <View style={[trickListStyles.outcomeBadge, { backgroundColor: outcome.color + '20' }]}>
                    <Ionicons name={outcome.icon as any} size={14} color={outcome.color} />
                    <ThemedText style={[trickListStyles.outcomeText, { color: outcome.color }]}>
                        {outcome.text}
                    </ThemedText>
                </View>
            </View>
            <ThemedText style={trickListStyles.trickDetails}>
                {trick.trickDetails}
            </ThemedText>
            <View style={trickListStyles.resultSummary}>
                <ThemedText style={trickListStyles.resultText}>Setter: {setter} ({trick.setterLanded ? 'Landed' : 'Fell'})</ThemedText>
                <ThemedText style={trickListStyles.resultText}>Receiver: {receiver} ({trick.receiverLanded ? 'Landed' : 'Fell'})</ThemedText>
            </View>
        </View>
    );
};


// Main list item component for both Paused and Recent games
const GameListItem: React.FC<{
    game: PausedGame | RecentGame;
    isPaused: boolean;
    userId: number;
    onResume: (gameId: number, game: PausedGame) => void;
}> = ({ game, isPaused, userId, onResume }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [tricks, setTricks] = useState<GameTrick[]>([]);
    const [loadingTricks, setLoadingTricks] = useState(false);


    // Determines display text based on game type
    const opponentName = isPaused
        ? (game as PausedGame).players.find(p => p.userId !== userId)?.username || 'Opponent'
        : (game as RecentGame).opponentUsername;

    const isWinner = !isPaused && (game as RecentGame).winnerId === userId;
    const isLoser = !isPaused && (game as RecentGame).winnerId !== userId;
    const statusText = isPaused ? 'Paused' : (isWinner ? 'Won' : 'Lost');
    const statusColor = isPaused ? Theme.warning : (isWinner ? Theme.success : Theme.danger);
    const statusIcon = isPaused ? 'pause-circle' : (isWinner ? 'trophy' : 'close-circle');

    // Score display
    const userScore = isPaused
        ? (game as PausedGame).players.find(p => p.userId === userId)?.finalLetters || 0
        : (game as RecentGame).userLetters;
    const opponentScore = isPaused
        ? (game as PausedGame).players.find(p => p.userId !== userId)?.finalLetters || 0
        : (game as RecentGame).opponentLetters;

    // Paused games don't have final scores; they display current letters (0-3)
    const scoreDisplay = isPaused
        ? `Letters: ${userScore} - ${opponentScore}`
        : `Final: ${userScore} - ${opponentScore}`;

    const dateDisplay = isPaused
        ? `Last Activity: ${new Date((game as PausedGame).lastActivityAt).toLocaleDateString()}`
        : `Played: ${new Date((game as RecentGame).datePlayed).toLocaleDateString()}`;

    // API Call for Past Game Tricks
    const fetchGameTricks = useCallback(async (gameId: number) => {
        setLoadingTricks(true);
        try {
            const response = await api.get(`/api/profiles/${gameId}/tricks`);
            setTricks(response.data);
        } catch (error) {
            console.error(`Failed to fetch tricks for game ${gameId}:`, error);
            Alert.alert("Error", "Failed to load game history.");
        } finally {
            setLoadingTricks(false);
        }
    }, []);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newExpandedState = !isExpanded;
        setIsExpanded(newExpandedState);

        // Only fetch tricks if it's a past game and we're expanding for the first time
        if (newExpandedState && !isPaused && tricks.length === 0) {
            fetchGameTricks(game.gameId);
        }
    };

    const handleResume = () => {
        if (isPaused) {
            onResume(game.gameId, game as PausedGame);
        } else {
            toggleExpand();
        }
    }

    return (
        <ThemedView style={listStyles.card}>
            <TouchableOpacity onPress={handleResume} style={listStyles.touchTarget}>
                <View style={listStyles.headerRow}>
                    <ThemedText style={listStyles.opponentName}>{opponentName}</ThemedText>
                    <View style={[listStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                        <ThemedText style={[listStyles.statusText, { color: statusColor }]}>
                            {statusText}
                        </ThemedText>
                    </View>
                </View>

                <View style={listStyles.scoreRow}>
                    <ThemedText style={listStyles.scoreText}>{scoreDisplay}</ThemedText>
                </View>

                <View style={listStyles.footerRow}>
                    <ThemedText style={listStyles.dateText}>{dateDisplay}</ThemedText>
                    {isPaused ? (
                        <TouchableOpacity style={listStyles.resumeButton} onPress={() => onResume(game.gameId, game as PausedGame)}>
                            <Ionicons name="play-circle" size={30} color={Theme.primary} />
                        </TouchableOpacity>
                    ) : (
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={24}
                            color={Theme.darkText}
                        />
                    )}
                </View>
            </TouchableOpacity>

            {/* --- Expanded Trick List --- */}
            {isExpanded && !isPaused && (
                <ThemedView style={listStyles.trickListContainer}>
                    <ThemedText style={listStyles.trickListTitle}>Game History</ThemedText>
                    {loadingTricks ? (
                        <ThemedText style={{ textAlign: 'center', color: Theme.darkText }}>Loading tricks...</ThemedText>
                    ) : (
                        tricks.length > 0 ? (
                            <FlatList
                                data={tricks}
                                keyExtractor={(item) => item.turnNumber.toString()}
                                renderItem={({ item }) => (
                                    <TrickItem
                                        trick={item}
                                        players={[
                                            { userId: userId, username: 'You', finalLetters: 0, playerNumber: 1 },
                                            { userId: (game as RecentGame).winnerId === userId ? -1 : (game as RecentGame).winnerId, username: opponentName, finalLetters: 0, playerNumber: 2 }
                                        ]}
                                    />
                                )}
                                scrollEnabled={false}
                            />
                        ) : (
                            <ThemedText style={{ textAlign: 'center', color: Theme.darkText }}>No tricks recorded for this game.</ThemedText>
                        )
                    )}
                </ThemedView>
            )}
        </ThemedView>
    );
};


export default function RecentGames() {
    const { user } = useAuth();
    const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
    const [pausedGames, setPausedGames] = useState<PausedGame[]>([]);
    const [tab, setTab] = useState<'current' | 'past'>('current'); // State for tab navigation
    const [loading, setLoading] = React.useState(false);

    const userId = user?.id;

    // --- API CALLS ---
    const getRecentGames = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await api.get(`/api/profiles/${userId}/recentGames`);
            // Map the API data to the defined RecentGame structure
            const mappedData: RecentGame[] = response.data.map((g: any) => ({
                gameId: g.gameId,
                winnerId: g.winnerId,
                datePlayed: g.datePlayed,
                userLetters: g.userFinalLetters,
                opponentLetters: g.opponentFinalLetters,
                opponentUsername: g.opponentUsername,
            }));
            setRecentGames(mappedData);
        } catch (error) {
            console.error('Failed to fetch recent games:', error);
        }
    }, [userId]);

    const getPausedGames = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await api.get(`/api/games/paused`, {
                params: { userId: userId }
            });
            setPausedGames(response.data);
        } catch (error) {
            console.error('Failed to fetch paused games:', error);
        }
    }, [userId]);

    // --- GAME RESUME HANDLER ---
    const resumeGame = useCallback(async (gameId: number, game: PausedGame) => {
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
        try {
            await api.put(`/api/games/${gameId}/resume`);

            router.push({
                pathname: '/(tabs)/game/1v1',
                params: { activeGame: JSON.stringify(game) },
            });

            //remove from paused games list
            setPausedGames(prev => prev.filter(g => g.gameId !== gameId));
        } catch (error) {
            Alert.alert("Error", "Failed to resume game. Please check your connection.");
            console.error('Failed to resume game:', error);
        }
    }, []);

    // --- EFFECT ---
    useEffect(() => {
        const fetchData = async () => {
            if (userId) {
                await getRecentGames();
                await getPausedGames();
            }
        };
        fetchData();
    }, [userId, getRecentGames, getPausedGames]);

    const renderList = (data: (PausedGame | RecentGame)[], isPausedList: boolean) => (
        <FlatList
            data={data}
            keyExtractor={(item) => item.gameId.toString()}
            renderItem={({ item }) => (
                <GameListItem
                    game={item}
                    isPaused={isPausedList}
                    userId={userId!}
                    onResume={resumeGame}
                />
            )}
            contentContainerStyle={listStyles.flatListContent}
            ListEmptyComponent={() => (
                <ThemedView style={listStyles.emptyContainer}>
                    <MaterialIcons name={isPausedList ? "pause-circle-outline" : "history"} size={50} color={Theme.darkText} />
                    <ThemedText style={listStyles.emptyText}>
                        {isPausedList ? "You have no paused games. Start a new challenge!" : "You have no recorded past games."}
                    </ThemedText>
                </ThemedView>
            )}
        />
    );

    return (
        <SafeAreaView style={mainStyles.container}>
            <View style={mainStyles.header}>
                <TouchableOpacity onPress={() => router.back()} style={mainStyles.iconButton}>
                    <AntDesign name="arrow-left" size={24} color={Theme.darkText} />
                </TouchableOpacity>
                <ThemedText style={mainStyles.headerTitle}>Recent Games</ThemedText>
            </View>

            {/* --- Tab Navigation --- */}
            <View style={mainStyles.tabContainer}>
                <TouchableOpacity
                    style={[mainStyles.tabButton, tab === 'current' && mainStyles.tabButtonActive]}
                    onPress={() => setTab('current')}
                >
                    <ThemedText style={[mainStyles.tabText, tab === 'current' && mainStyles.tabTextActive]}>
                        Current ({pausedGames.length})
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[mainStyles.tabButton, tab === 'past' && mainStyles.tabButtonActive]}
                    onPress={() => setTab('past')}>
                    <ThemedText style={[mainStyles.tabText, tab === 'past' && mainStyles.tabTextActive]}>
                        Past ({recentGames.length})
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* --- List Content --- */}
            <ThemedView style={mainStyles.listContent}>
                {tab === 'current' && renderList(pausedGames, true)}
                {tab === 'past' && renderList(recentGames, false)}
            </ThemedView>

        </SafeAreaView >
    );
}

// --- STYLESHEETS ---

const mainStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.secondary,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
        color: Theme.darkText,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 16,
    },
    iconButton: {
        padding: 8,
        marginLeft: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Theme.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: Theme.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.darkText,
    },
    tabTextActive: {
        color: Theme.primary,
    },
    listContent: {
        flex: 1,
    }
});

const listStyles = StyleSheet.create({
    flatListContent: {
        padding: 15,
        gap: 15,
    },
    card: {
        backgroundColor: Theme.cardBackground,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        overflow: 'hidden',
    },
    touchTarget: {
        padding: 15,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    opponentName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: 'bold',
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
    },
    scoreText: {
        fontSize: 15,
        color: Theme.darkText,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
    },
    dateText: {
        fontSize: 12,
        color: Theme.darkText,
    },
    resumeButton: {
        paddingHorizontal: 5,
    },
    trickListContainer: {
        paddingHorizontal: 15,
        paddingBottom: 15,
        backgroundColor: Theme.secondary,
        borderTopWidth: 1,
        borderTopColor: Theme.border,
        marginHorizontal: 0,
    },
    trickListTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.primary,
        paddingTop: 10,
        paddingBottom: 5,
    },
    emptyContainer: {
        marginTop: 50,
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
        color: Theme.darkText,
    }
});

const trickListStyles = StyleSheet.create({
    trickItem: {
        paddingVertical: 10,
        backgroundColor: Theme.cardBackground,
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
        borderLeftWidth: 4,
        borderLeftColor: Theme.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    turnNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.primary,
    },
    outcomeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    outcomeText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: 'bold',
    },
    trickDetails: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.darkText,
        marginBottom: 5,
    },
    resultSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: Theme.border,
        paddingTop: 5,
    },
    resultText: {
        fontSize: 13,
        color: Theme.darkText,
    }
});