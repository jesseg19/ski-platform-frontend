import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import UserSearchModal from '@/components/UserSearchModal';
import { Theme } from '@/constants/theme';
import { useChallengeCount } from '@/hooks/useChallengeCount';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gameSyncService } from '../../services/GameSyncService';



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
  const { signOut, updateToken, user, updateUsername } = useAuth();
  const [searchModalVisible, setSearchModalVisible] = React.useState(false);

  const [isEditingUsername, setIsEditingUsername] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const { challengeCount, isLoading } = useChallengeCount();

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

  const handleEditPress = () => {
    if (isEditingUsername) {
      handleSaveUsername();
    } else {
      setIsEditingUsername(true);
    }
  };

  const handleSaveUsername = async () => {
    if (!profileData || newUsername.trim() === '' || newUsername === profileData.username) {
      setIsEditingUsername(false); // Exit editing if nothing changed or it's empty
      return;
    }

    try {
      const response = await api.put('/api/profiles/update', {
        username: newUsername,
      });
      const { username: updatedUsername, token: newJwtToken } = response.data;
      const oldUsername = profileData!.username;
      // Update local state on success
      setProfileData(prevData => ({
        ...prevData!,
        username: updatedUsername,
      }));

      updateToken(newJwtToken);
      updateUsername(updatedUsername);

      if (oldUsername !== updatedUsername) {
        await gameSyncService.updateUsernameInLocalRecords(oldUsername, updatedUsername);
      }

      setIsEditingUsername(false);
      router.replace('/(tabs)/game');

      alert('Username updated successfully!');

    } catch (error) {
      console.error('Failed to update username:', error);
      alert('Failed to update username. Please try again.');
      setNewUsername(profileData.username);

      setIsEditingUsername(false);
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      const data = await getProfileData();
      if (data) {
        setProfileData(data);
        setNewUsername(data.username);
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
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile/notifications')}
            style={styles.iconButton}
          >
            <Feather name="bell" size={24} color={Theme.darkText} />

            {/* The Notification Badge */}
            {challengeCount > 0 && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {challengeCount > 9 ? '9+' : challengeCount}
                </ThemedText>
              </View>
            )}
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
            <TouchableOpacity onPress={handleEditPress} style={styles.iconButton}>
              {/* Conditional icon: 'check' (save) when editing, 'edit' otherwise */}
              <Feather
                name={isEditingUsername ? "check" : "edit"}
                size={24}
                color={Theme.darkText}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile/friends')} style={styles.iconButton}>
              <Feather name="user-plus" size={24} color={Theme.darkText} />
            </TouchableOpacity>
            {/* Search Icon  */}
            <TouchableOpacity onPress={() => setSearchModalVisible(true)} style={styles.iconButton}>
              <Feather name="search" size={24} color={Theme.darkText} />
            </TouchableOpacity>

          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>

          {/* Profile Header Block */}
          <View style={styles.profileHeaderBlock}>
            {/* Avatar */}
            <Image
              source={require('@/assets/images/avatar.png')}
              style={styles.avatar}
            />
            {isEditingUsername ? (
              <TextInput
                style={[styles.username, styles.usernameInput]}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Enter new username"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSaveUsername}
              />
            ) : (
              <ThemedText style={styles.username}>{profileData?.username}</ThemedText>
            )}
            <ThemedText style={styles.rank}>ELO: {profileData?.eloRating}</ThemedText>
            {/* <ThemedText style={styles.bio}>{profileData?.bio}</ThemedText> */}

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
                source={require('@/assets/images/avatar.png')}
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
        <UserSearchModal
          isVisible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
        />
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
    paddingTop: 20,
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
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: Theme.background,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
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
    paddingBottom: 0,
  },
  // --- Profile Header Block ---
  profileHeaderBlock: {
    alignItems: 'center',
    paddingVertical: 0,
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
  usernameInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.primary,
    paddingVertical: 2,
    minWidth: 150,
    textAlign: 'center',
  },
  rank: {
    fontSize: 16,
    color: Theme.darkText,
    marginBottom: 4,
  },
  // bio: {
  //   fontSize: 14,
  //   color: Theme.darkText,
  //   marginBottom: 10,
  // },

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
    marginBottom: 5,
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