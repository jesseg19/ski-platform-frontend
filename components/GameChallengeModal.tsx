import { OpponentSearch } from '@/components/opponent-search';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import React, { useCallback } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import { useChallenge } from '../app/context/WebSocketProvider';
import { useAuth } from '../auth/AuthContext';
import { CustomButton } from './CustomButton';

interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2; // Can restrict to 1 or 2 if that's standard
}

interface GameChallengeModalProps {
    isVisible: boolean;
    onClose: () => void;
    p1Username: string;
    p2User: GamePlayer;
    setP2User: (user: GamePlayer) => void;
    onChallengeStart: (opponentUsername: string) => void;
    onBackToMenu: () => void;
}

// Assuming your modalStyles are defined here or imported
const modalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.overlay },
    modalView: { width: '85%', padding: 25, borderRadius: 15, alignItems: 'center', backgroundColor: Colors.white, elevation: 20 },
    closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: Colors.darkBlue },
    playerInfo: { marginBottom: 15, width: '100%' },
    playerLabel: { fontSize: 14, color: Colors.textGrey },
    playerUsername: { fontSize: 18, fontWeight: 'bold', color: Colors.darkText, paddingVertical: 5 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
});

export const GameChallengeModal: React.FC<GameChallengeModalProps> = ({
    isVisible,
    onClose,
    p1Username,
    p2User,
    setP2User,
    onChallengeStart,
    onBackToMenu,
}) => {
    const { user } = useAuth();
    const { isConnected, sendChallenge, sentChallengeStatus } = useChallenge();

    const handleUserSelect = useCallback((userSearchResult: any) => {
        const gamePlayer: GamePlayer = {
            userId: userSearchResult.id || userSearchResult.userId,
            username: userSearchResult.username,
            finalLetters: 0, // Default value
            playerNumber: 2 // Default to player 2 for opponent
        };
        setP2User(gamePlayer);
    }, [setP2User]);

    const handleStartChallenge = useCallback(() => {
        if (!user?.id) {
            Alert.alert('Authentication Error', 'User ID is missing. Please log in again.');
            return;
        }

        if (!p2User.userId || p2User.userId <= 0 || !p2User.username) {
            Alert.alert('Selection Error', 'Please select a valid opponent.');
            return;
        }

        if (p1Username === p2User.username) {
            Alert.alert('Usernames must be different for each player.');
            return;
        }

        if (!isConnected) {
            Alert.alert('Connection Error', 'Not connected to the server. Please wait for connection or try again.');
            return;
        }

        sendChallenge(p2User.userId);
        onChallengeStart(p2User.username); // Notify parent to update message/UI

    }, [user?.id, p2User.userId, p2User.username, isConnected, sendChallenge, p1Username, onChallengeStart]);


    const isChallengePending = sentChallengeStatus?.status === 'PENDING';

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={modalStyles.centeredView}>
                <ThemedView style={modalStyles.modalView}>
                    <ThemedText style={modalStyles.playerLabel}>Opponent Username (Player 2):</ThemedText>
                    <OpponentSearch
                        onUserSelect={handleUserSelect}
                        selectedUsername={p2User.username}
                    />
                    <View style={modalStyles.playerInfo}>
                        <ThemedText style={modalStyles.playerLabel}>Your Username (Player 1):</ThemedText>
                        <ThemedText style={modalStyles.playerUsername}>{p1Username}</ThemedText>
                    </View>

                    {isChallengePending && (
                        <ThemedText style={{ color: Colors.darkBlue, marginTop: 15, fontWeight: 'bold' }}>
                            Challenge Sent! Waiting for {p2User.username} to accept...
                        </ThemedText>
                    )}

                    <View style={modalStyles.buttonContainer}>
                        <CustomButton
                            title={isChallengePending ? 'Waiting...' : 'Start Challenge'}
                            onPress={handleStartChallenge}
                            isPrimary={true}
                            style={{ flex: 1, marginRight: 10 }}
                            disabled={p2User.userId === -1 || isChallengePending}
                        />
                        <CustomButton
                            title="Back to Menu"
                            onPress={onBackToMenu}
                            isPrimary={false}
                            style={{ flex: 1 }}
                        />
                    </View>

                </ThemedView>
            </View>
        </Modal>
    );
};