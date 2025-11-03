import { router } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';

// Assuming these are your custom components
import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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


const DesignButton: React.FC<DesignButtonProps> = ({ title, description, onPress, isPrimary }) => {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.buttonContainer,
                isPrimary ? styles.primaryButton : styles.secondaryButton,
            ]}
        >
            <ThemedText style={styles.buttonTitle}>{title}</ThemedText>
            <ThemedText style={styles.buttonDescription}>{description}</ThemedText>
        </Pressable>
    );
};


const Colors = {
    greenButton: '#85E34A', // Primary button
    secondaryBlue: '#F2F8FB', // Secondary button background
    darkBlue: '#406080', // Logo and selected icon
    textGrey: '#555',
    darkText: '#333',

    white: '#FFFFFF',
    overlay: 'rgba(255, 255, 255, 0.7)', // A white overlay for content areas to ensure readability
};

export default function ChoseGameModeScreen() {
    const navigateToTrickGenerator = () => {
        router.push('/(tabs)/game/1vai');
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
                </View>

                <ScrollView contentContainerStyle={styles.scrollViewContent}>

                    <DesignButton
                        title="Challenge a Friend"
                        description="Find friends, send invites, or play a quick match."
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
        backgroundColor: Colors.lightBlue,
        paddingTop: 50, // To account for safe areas and notches
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
    logoContainer: {
        alignItems: 'center',
    },
    mountainPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 5,
        marginBottom: 5,
    },
    logoText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.darkBlue,
    },
    scrollViewContent: {
        paddingHorizontal: 20,
        paddingBottom: 20, // Add space above the tab bar if present
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: Colors.darkText,
        marginBottom: 30,
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#CCC',
        marginHorizontal: 3,
    },
    dotActive: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.darkBlue,
        marginHorizontal: 3,
    },
    // Button Styles
    buttonContainer: {
        borderRadius: 15,
        padding: 60,
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
        // Optional: for a subtle lift look
        borderColor: '#DDD',
        borderWidth: 1,
    },
    buttonTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        paddingBottom: 25,
        color: Colors.darkText,
    },
    buttonDescription: {
        fontSize: 18,
        textAlign: 'center',
        color: Colors.textGrey,
    },
    // Placeholder Nav Bar Styles (optional, as Expo Router handles this)
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#DDD',
        backgroundColor: '#FFF',
    },
});