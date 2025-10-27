import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@react-navigation/elements';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

interface RecentGame {
    gameId: number;
    userFinalLetters: number;
    opponentFinalLetters: number;
    winnerId: number;
    datePlayed: Date;
    opponentUsername: string;
};

// 1. Define the individual Player object structure
interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2;
}

// 2. Define the individual Trick object structure (assuming this is correct)
interface GameTrick {
    turnNumber: number;
    setterId: number;
    receiverId: number;
    setterLanded: boolean;
    receiverLanded: boolean;
    trickDetails: string;
}

// 3. Define the main PausedGame interface
interface PausedGame {
    gameId: number;
    currentTurnUserId: number | null;
    totalTricks: number;
    players: GamePlayer[];
    tricks: GameTrick[];
    createdAt: string;
    lastActivityAt: string;
    status: string;
}

export default function RecentGames() {
    const { user } = useAuth();
    const [recentGames, setRecentGames] = React.useState<RecentGame[]>([]);
    const [pausedGames, setPausedGames] = React.useState<PausedGame[]>([]);

    const userId = user?.id;
    async function getRecentGames() {
        try {
            const response = await api.get(`/api/profiles/${userId}/recentGames`);
            setRecentGames(response.data);
            console.log('Recent games:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch recent games:', error);
            return null;
        }
    }

    async function getPausedGames() {
        try {
            const response = await api.get(`/api/games/paused`, {
                params: {
                    userId: userId,
                }
            });
            setPausedGames(response.data);
            console.log('Paused games:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch paused games:', error);
            return null;
        }
    }

    async function resumeGame(gameId: number, game: PausedGame) {
        try {
            const response = await api.put(`/api/games/${gameId}/resume`);

            console.log('Game resumed:', response.data);
        } catch (error) {
            console.error('Failed to resume game:', error);
            return null;
        }
        router.push({
            pathname: '/(tabs)/game/1v1',
            // Use a descriptive key like 'activeGame' for the param
            params: { activeGame: JSON.stringify(game) },
        });
    }

    useEffect(() => {
        const fetchData = async () => {
            await getRecentGames();
            await getPausedGames();
        };
        fetchData();
    }, []);


    return (

        <ThemedView style={styles.container}>
            <ScrollView>
                <ThemedText style={styles.title}>Paused Games</ThemedText>
                {pausedGames.map((game) => (
                    <View key={game.gameId} style={styles.gameItem}>
                        <ThemedText style={styles.gameText}>{game.players[0].username} vs {game.players[1].username}</ThemedText>
                        <ThemedText style={styles.gameText}>{game.players[0].finalLetters} - {game.players[1].finalLetters}</ThemedText>
                        <ThemedText>Started at: {game.createdAt} Last Played: {game.lastActivityAt}</ThemedText>
                        <Button onPress={() => {
                            resumeGame(game.gameId, game);
                        }}>
                            Resume Game
                        </Button>
                    </View>
                ))}
                <ThemedText style={styles.title}>Recent Games</ThemedText>
                {recentGames.map((game) => (
                    <View key={game.gameId} style={styles.gameItem}>
                        <ThemedText style={styles.gameText}>{game.opponentUsername}</ThemedText>
                        <ThemedText style={styles.gameText}>{game.userFinalLetters} - {game.opponentFinalLetters}</ThemedText>
                    </View>
                ))}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    gameItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    gameText: {
        fontSize: 16,
    },
});
