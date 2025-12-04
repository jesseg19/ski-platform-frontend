import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const GAME_LETTERS = ['S', 'K', 'I'];

const letterStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    box: {
        width: 35,
        height: 35,
        marginHorizontal: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    boxBlue: {
        backgroundColor: Theme.primary,
    },
    boxRed: {
        backgroundColor: Theme.danger,
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    },
});

interface LetterDisplayProps {
    lettersEarned: number;
    onPress?: () => void;
}

export const LetterDisplay: React.FC<LetterDisplayProps> = ({ lettersEarned, onPress }) => (
    <View style={letterStyles.container}>
        {GAME_LETTERS.map((letter, index) => {
            const isEarned = index < lettersEarned;
            return (
                <View
                    key={letter}
                    style={[
                        letterStyles.box,
                        isEarned ? letterStyles.boxRed : letterStyles.boxBlue,
                    ]}
                    onTouchEnd={onPress}
                >
                    <Text style={letterStyles.text}>{letter}</Text>
                </View>
            );
        })}
    </View>
);