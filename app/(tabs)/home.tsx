import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import React, { useEffect, useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Import your design components (ThemedView, etc.)

interface FeedGame {
  gameId: number;
  datePlayed: string; // Use string and format in component
  friendUsername: string;
  opponentUsername: string;
  friendFinalLetters: number;
  opponentFinalLetters: number;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
}

const GameFeedItem: React.FC<{ game: FeedGame, onToggleLike: (id: number) => void }> = ({ game, onToggleLike }) => {
  // Display logic for a single game post
  const winnerDisplay = game.friendFinalLetters > game.opponentFinalLetters ?
    game.opponentUsername : game.friendUsername; // S, K, I... are 0, 1, 2, 3
  const scoreText = `${game.friendUsername} (${game.friendFinalLetters}) vs ${game.opponentUsername} (${game.opponentFinalLetters})`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{game.friendUsername} played a game!</Text>
      <Text style={styles.subtitle}>Winner: {winnerDisplay}</Text>
      <Text style={styles.stats}>{scoreText}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onToggleLike(game.gameId)}>
          {/* <Text style={{ color: game.viewerHasLiked ? 'blue' : 'gray' }}>
            {game.viewerHasLiked ? '❤️ Liked' : '🤍 Like'} ({game.likeCount})
          </Text> */}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {/* Navigate to Game Details */ }}>
          {/* <Text style={styles.actionText}>💬 Comments ({game.commentCount})</Text> */}
        </TouchableOpacity>
      </View>
    </View>
  );
};


export default function HomeScreen() {
  const { user } = useAuth();
  const [feedData, setFeedData] = useState<FeedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeed = async () => {
    if (!user) return;
    try {
      const response = await api.get('/api/feed/games');
      setFeedData(response.data);
    } catch (error) {
      console.error('Failed to fetch friend feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (gameId: number) => {
    try {
      await api.post(`/api/feed/${gameId}/like`);

      // Optimistically update the UI
      setFeedData(prevData => prevData.map(game => {
        if (game.gameId === gameId) {
          const newLiked = !game.viewerHasLiked;
          return {
            ...game,
            viewerHasLiked: newLiked,
            likeCount: newLiked ? game.likeCount + 1 : game.likeCount - 1,
          };
        }
        return game;
      }));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }

  useEffect(() => {
    fetchFeed();
  }, [user]);

  if (isLoading) {
    return <Text>Loading Feed...</Text>;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.gameId.toString()}
        renderItem={({ item }) => <GameFeedItem game={item} onToggleLike={handleToggleLike} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No recent games from your friends. Go play!</Text>}
        contentContainerStyle={styles.listContainer}
      />
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
  listContainer: {
    paddingVertical: 10,
    marginTop: 35,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  stats: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
  actionText: {
    color: '#4A90E2',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#777',
  }
});