import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Assuming these are your custom components
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useEffect } from 'react';



interface UserProfile {
  //in db
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

}

// //     private Long gameId;
//     private LocalDateTime datePlayed;
//     private String opponentUsername;
// //    private String opponentProfilePictureUrl; // Assuming you add this to the User entity later
//     private Integer userFinalLetters;
//     private Integer opponentFinalLetters;
//     private Long winnerId;


// --- Color Palette (Based on the design) ---
const Colors = {
  lightBlue: '#EAF7FE', // Main background
  greenButton: '#85E34A', // Used for "View Match" buttons
  darkBlue: '#406080', // Logo and main icons
  textGrey: '#555',
  darkText: '#333',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  separator: '#EEE',
  profileText: '#2D3E50',
  rankText: '#6A7E9A',
  overlay: 'rgba(255, 255, 255, 0.7)', // Overlay for background image
};

// --- Custom Components ---

// A sleek card component for sections
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
    <View style={styles.cardContent}>
      {children}
    </View>
  </ThemedView>
);


// --- Page Implementation ---

export default function ProfileScreen() {

  const [profileData, setProfileData] = React.useState<UserProfile | null>(null); // Replace 'any' with actual profile data type




  async function getProfileData() {
    // This function would fetch and return profile data from an API or state
    try {
      const response = await api.get('/api/profiles/me');
      setProfileData(response.data);
      console.log('Profile data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      return null;
    }
  }



  const handleSettingsPress = () => {
    // In a real app, this would lead to a dedicated settings/edit page
    router.push('/(tabs)/profile/settings');
  };


  const handleViewMatch = () => {
    // Navigate to the match details page
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
      resizeMode="cover" // Or 'stretch', 'contain'
    >
      <ThemedView style={styles.mainContainer}>
        {/* Header with Logo and Action Icons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile/notifications')} style={styles.iconButton}>
            <Feather name="bell" size={24} color={Colors.darkBlue} />
          </TouchableOpacity>

          {/* S.K.I. Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo.png')} // Replace with your mountain logo
              style={styles.mountainLogo}
            />
            <ThemedText style={styles.logoText}>S.K.I.</ThemedText>
          </View>

          {/* Settings/Edit Profile Icon */}
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={handleSettingsPress} style={styles.iconButton}>
              <Feather name="settings" size={24} color={Colors.darkBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile/friends')} style={styles.iconButton}>
              <Feather name="user-plus" size={24} color={Colors.darkBlue} />
            </TouchableOpacity>

          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>

          {/* Profile Header Block */}
          <View style={styles.profileHeaderBlock}>
            {/* Avatar */}
            <Image
              source={require('@/assets/images/avatar.jpg')} // Replace with user's avatar
              style={styles.avatar}
            />
            <ThemedText style={styles.username}>{profileData?.username}</ThemedText>
            <ThemedText style={styles.rank}>{profileData?.eloRating}</ThemedText>
            <ThemedText style={styles.bio}>{profileData?.bio}</ThemedText>

            {/* Placeholder for Edit Profile Button (removed, moved to settings) */}
          </View>

          {/* Pagination Dots Placeholder (for profile carousel if needed) */}
          <View style={styles.paginationDots}>
            <View style={styles.dotActive} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Key Stats Card */}
          <ProfileCard title="Key Stats" actionText="View Stats" onActionPress={handleViewMatch}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.gamesPlayed}</ThemedText>
                <ThemedText style={styles.statLabel}>Games Played</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.gamesPlayed && profileData?.gamesWon ? (profileData.gamesPlayed / profileData.gamesWon) : 0}%</ThemedText>
                <ThemedText style={styles.statLabel}>Wins</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{profileData?.favoriteTrick}</ThemedText>
                <ThemedText style={styles.statLabel}>Favorite Trick</ThemedText>
              </View>
            </View>
          </ProfileCard>

          {/* Recent Tricks/Games Card */}
          <ProfileCard title="Recent Games" actionText="View All" onActionPress={() => { router.push('/(tabs)/profile/recentGames') }}>
            <View style={styles.recentTrickRow}>
              {/* Player Avatar */}
              <Image
                source={require('@/assets/images/avatar.jpg')} // Replace with player avatar
                style={styles.recentTrickAvatar}
              />
              <View style={styles.recentTrickDetails}>
                <ThemedText style={styles.recentTrickOpponent}>{profileData?.recentGame?.opponentUsername}</ThemedText>
                <ThemedText style={styles.recentTrickScore}>some text</ThemedText>
              </View>
              <View style={styles.recentTrickScoreBox}>
                <ThemedText style={styles.recentTrickScoreValue}>{profileData?.recentGame?.userFinalLetters} - {profileData?.recentGame?.opponentFinalLetters}</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.viewMatchButton}
                onPress={handleViewMatch}
              >
                <ThemedText style={styles.viewMatchText}>View Match</ThemedText>
              </TouchableOpacity>
            </View>
          </ProfileCard>

          {/* Achievements / Badges Card */}
          {/* <ProfileCard title="Achievements / Badges" actionText="View All" onActionPress={() => router.push('/(tabs)/profile/achievements')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
              {profileData?.achievements.map((item, index) => (
                <View key={index} style={styles.achievementItem}>
                  <View style={styles.achievementIconBox}>
                    <Ionicons name={item.icon as any} size={28} color={Colors.darkBlue} />
                  </View>
                  <ThemedText style={styles.achievementTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </ProfileCard> */}


        </ScrollView>
      </ThemedView>
    </ImageBackground>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '120%',
    paddingTop: 50, // To account for safe areas and notches
  },
  mainContainer: {
    flex: 1,
    paddingTop: 50,
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
    width: 25,
    height: 20,
    resizeMode: 'contain',
    tintColor: Colors.darkBlue,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkBlue,
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
    borderColor: Colors.white,
    marginBottom: 8,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.profileText,
  },
  rank: {
    fontSize: 16,
    color: Colors.rankText,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: Colors.textGrey,
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
    backgroundColor: Colors.darkBlue,
    marginHorizontal: 3,
  },
  // --- Card Styles ---
  card: {
    backgroundColor: Colors.cardBackground,
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
    color: Colors.darkText,
  },
  cardActionText: {
    fontSize: 14,
    color: Colors.darkBlue,
    fontWeight: '600',
  },
  cardContent: {
    // padding will be applied by the card itself
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
    color: Colors.darkText,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textGrey,
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
    color: Colors.darkText,
  },
  recentTrickScore: {
    fontSize: 12,
    color: Colors.textGrey,
  },
  recentTrickScoreBox: {
    backgroundColor: Colors.lightBlue,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  recentTrickScoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkBlue,
  },
  viewMatchButton: {
    backgroundColor: Colors.greenButton,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  viewMatchText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.white,
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
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  achievementTitle: {
    fontSize: 10,
    textAlign: 'center',
    color: Colors.textGrey,
  },
});