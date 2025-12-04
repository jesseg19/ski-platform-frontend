import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Assuming these are your custom components
import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';



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

// --- Custom Components ---

interface ProfileCardProps {
  title: string;
  children: React.ReactNode;
  actionText?: string;
  onActionPress?: () => void;
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


// --- Page Implementation ---

export default function ProfileScreen() {
  const [profileData, setProfileData] = React.useState<UserProfile | null>(null);
  const { signOut } = useAuth();
  async function getProfileData() {
    try {
      const response = await api.get('/api/profiles/me');
      setProfileData(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      return null;
    }
  }

  const handleSettingsPress = () => {
    router.push('/(tabs)/profile/settings');
  };

  const handleViewMatch = () => {
    alert('Navigating to Match Details...');
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProfileData();
      if (data) {
        setProfileData(data);
      }
    };

    fetchData();
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.mainContainer}>
        {/* Header with Logo and Action Icons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile/notifications')} style={styles.iconButton}>
            <Feather name="bell" size={24} color={Theme.darkText} />
          </TouchableOpacity>

          {/* S.K.I. Logo */}
          {/* <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.mountainLogo}
            />
            <ThemedText style={styles.logoText}>S.K.I.</ThemedText>
          </View> */}

          {/* Settings/Edit Profile Icon */}
          <View style={{ flexDirection: 'row', gap: 15 }}>
            {/* <TouchableOpacity onPress={handleSettingsPress} style={styles.iconButton}>
              <Feather name="settings" size={24} color={Theme.darkText} />
            </TouchableOpacity> */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile/friends')} style={styles.iconButton}>
              <Feather name="user-plus" size={24} color={Theme.darkText} />
            </TouchableOpacity>

          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>

          {/* Profile Header Block */}
          <View style={styles.profileHeaderBlock}>
            {/* Avatar */}
            <Image
              source={require('@/assets/images/avatar.webp')}
              style={styles.avatar}
            />
            <ThemedText style={styles.username}>{profileData?.username}</ThemedText>
            <ThemedText style={styles.rank}>ELO: {profileData?.eloRating}</ThemedText>
            <ThemedText style={styles.bio}>{profileData?.bio}</ThemedText>

          </View>

          {/* Key Stats Card */}
          <ProfileCard title="Key Stats">
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.gamesPlayed}</ThemedText>
                <ThemedText style={styles.statLabel}>Games Played</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.gamesPlayed && profileData?.gamesWon ? ((profileData.gamesWon / profileData.gamesPlayed) * 100).toFixed(0) : 0}%</ThemedText>
                <ThemedText style={styles.statLabel}>Wins</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.favoriteTrick}</ThemedText>
                <ThemedText style={styles.statLabel}>Favorite Trick</ThemedText>
              </View>
            </View>
          </ProfileCard>

          {/* Recent Games Card */}
          <ProfileCard title="Recent Game" actionText="View All" onActionPress={() => { router.push('/(tabs)/profile/recentGames') }}>
            <View style={styles.recentTrickRow}>
              {/* Player Avatar */}
              <Image
                source={require('@/assets/images/avatar.webp')}
                style={styles.recentTrickAvatar}
              />
              <View style={styles.recentTrickDetails}>
                <ThemedText style={styles.recentTrickOpponent}>{profileData?.recentGame?.opponentUsername}</ThemedText>
              </View>
              <View style={styles.recentTrickScoreBox}>
                <ThemedText style={styles.recentTrickScoreValue}>{profileData?.recentGame?.userFinalLetters} - {profileData?.recentGame?.opponentFinalLetters}</ThemedText>
              </View>
              {/* <TouchableOpacity
                style={styles.viewMatchButton}
                onPress={handleViewMatch}
              >
                <ThemedText style={styles.viewMatchText}>View Match</ThemedText>
              </TouchableOpacity> */}
            </View>
          </ProfileCard>

          {/* Achievements / Badges Card */}
          {/* <ProfileCard title="Achievements / Badges" actionText="View All" onActionPress={() => router.push('/(tabs)/profile/achievements')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
              {profileData?.achievements.map((item, index) => (
                <View key={index} style={styles.achievementItem}>
                  <View style={styles.achievementIconBox}>
                    <Ionicons name={item.icon as any} size={28} color={Theme.secondary} />
                  </View>
                  <ThemedText style={styles.achievementTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </ProfileCard> */}

          <TouchableOpacity onPress={() => signOut()} style={styles.signOutButton}>
            <ThemedText style={styles.signOutText}>Sign out</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '120%',
    paddingTop: 50,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // --- Header Styles ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconButton: {
    padding: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mountainLogo: {
    width: 50,
    height: 40,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.primary,
  },
  // --- ScrollView Content ---
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // --- Profile Header Block ---
  profileHeaderBlock: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Theme.cardBackground,
    marginBottom: 8,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
  rank: {
    fontSize: 16,
    color: Theme.darkText,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: Theme.darkText,
    marginBottom: 10,
  },
  // --- Pagination Dots ---
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CCC',
    marginHorizontal: 3,
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.secondary,
    marginHorizontal: 3,
  },
  // --- Card Styles ---
  card: {
    backgroundColor: Theme.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
  cardActionText: {
    fontSize: 14,
    color: Theme.darkText,
    fontWeight: '600',
  },

  // --- Stats Row Styles ---
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
  statLabel: {
    fontSize: 12,
    color: Theme.darkText,
    marginTop: 2,
  },
  // --- Recent Trick Styles ---
  recentTrickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  recentTrickAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  recentTrickDetails: {
    flex: 1,
  },
  recentTrickOpponent: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.darkText,
  },
  recentTrickScore: {
    fontSize: 12,
    color: Theme.darkText,
  },
  recentTrickScoreBox: {
    backgroundColor: Theme.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  recentTrickScoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
  viewMatchButton: {
    backgroundColor: Theme.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  viewMatchText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
  // --- Achievements Styles ---
  achievementsScroll: {
    paddingVertical: 5,
  },
  achievementItem: {
    alignItems: 'center',
    width: 80, // Fixed width for scroll items
    marginRight: 15,
  },
  achievementIconBox: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  achievementTitle: {
    fontSize: 10,
    textAlign: 'center',
    borderRadius: 10,
  },
  signOutButton: {
    marginTop: 20,
    backgroundColor: Theme.secondary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.darkText,
  },
});