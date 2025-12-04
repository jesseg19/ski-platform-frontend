import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CustomButton } from './CustomButton';
import { LetterDisplay } from './LetterDisplay';

interface GameRoundActionsProps {
    playerName: string;
    player: GamePlayer;
    lettersEarned: number;
    playerAction: 'land' | 'fail' | null;
    lastTryPlayer: string | null;
    gameStatus: 'playing' | 'gameOver' | 'pending';
    getActionDisabled: (player: string) => boolean;
    handlePlayerAction: (player: GamePlayer, action: 'land' | 'fail') => void;
    handleLastTryAction: (action: 'land' | 'fail') => Promise<void>;
    addLetterToPlayer: (player: string) => void;
}
interface GamePlayer {
    userId: number;
    username: string;
    finalLetters: number;
    playerNumber: 1 | 2;
}

const mainStyles = StyleSheet.create({
    playerContainer: {
        backgroundColor: Theme.cardBackground,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    playerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
    },
    playerNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
    playerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
});

export const GameRoundActions: React.FC<GameRoundActionsProps> = ({
    playerName,
    player,
    lettersEarned,
    playerAction,
    lastTryPlayer,
    gameStatus,
    getActionDisabled,
    handlePlayerAction,
    handleLastTryAction,
    addLetterToPlayer,
}) => {
    const isPlayerOnLastTry = lastTryPlayer === playerName;
    const isGameOver = gameStatus === 'gameOver';

    const renderActionButtons = () => {
        if (isPlayerOnLastTry) {
            return (
                <>
                    <CustomButton title='✅ LAND (2nd Try)' onPress={() => handleLastTryAction('land')} isPrimary={true} disabled={isGameOver} style={{ flex: 1, marginRight: 8 }} />
                    <CustomButton title='❌ FAIL (Game Over)' onPress={() => handleLastTryAction('fail')} isPrimary={false} disabled={isGameOver} style={{ flex: 1 }} />
                </>
            );
        }

        const disabled = getActionDisabled(playerName);
        return (
            <>
                <CustomButton
                    title={`✅ Land ${playerAction === 'land' ? ' (Voted)' : ''}`}
                    onPress={() => handlePlayerAction(player, 'land')}
                    isPrimary={true}
                    disabled={disabled || playerAction === 'fail'}
                    style={{ flex: 1, marginRight: 8 }}
                />
                <CustomButton
                    title={`❌ Fail ${playerAction === 'fail' ? ' (Voted)' : ''}`}
                    onPress={() => handlePlayerAction(player, 'fail')}
                    isPrimary={false}
                    disabled={disabled || playerAction === 'land'}
                    style={{ flex: 1 }}
                />
            </>
        );
    };

    return (
        <ThemedView style={mainStyles.playerContainer}>
            <View style={mainStyles.playerHeader}>
                <ThemedText style={mainStyles.playerNameText}>{playerName}</ThemedText>
                <LetterDisplay lettersEarned={lettersEarned} onPress={() => addLetterToPlayer(playerName)} />
            </View>
            <View style={mainStyles.playerActions}>
                {renderActionButtons()}
            </View>
        </ThemedView>
    );
};