import { Alert } from 'react-native';
import { gameApiService } from '../services/gameApiService';

/**
 * Handler for accepting game challenges
 * Use this in your challenge notification component
 */
export const handleAcceptChallenge = async (challengerId, acceptorId, navigation) => {
    try {
        // First check if acceptor has an active game
        const activeGameCheck = await gameApiService.checkActiveGame(acceptorId);

        if (activeGameCheck.hasActiveGame) {
            Alert.alert(
                'Active Game',
                'You already have an active game. Please finish or pause it first.',
                [
                    {
                        text: 'Go to Active Game',
                        onPress: () => {
                            navigation.navigate('ActiveGame', {
                                gameId: activeGameCheck.activeGameId,
                                userId: acceptorId
                            });
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        // Accept the challenge and create the game
        const gameState = await gameApiService.acceptChallenge(challengerId, acceptorId);

        Alert.alert(
            'Challenge Accepted!',
            'Your game has started.',
            [
                {
                    text: 'Play Now',
                    onPress: () => {
                        navigation.navigate('ActiveGame', {
                            gameId: gameState.gameId,
                            userId: acceptorId
                        });
                    }
                }
            ]
        );

    } catch (error) {
        if (error.response?.status === 400) {
            Alert.alert(
                'Cannot Accept',
                'Either you or the challenger already has an active game.'
            );
        } else {
            Alert.alert('Error', 'Failed to accept challenge. Please try again.');
        }
    }
};