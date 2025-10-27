import { Colors } from '@/constants/theme'; // Adjust path
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
        borderColor: Colors.inputBorder,
    },
    boxBlue: {
        backgroundColor: Colors.darkBlue, // Available
    },
    boxRed: {
        backgroundColor: Colors.danger, // Earned
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    },
});

interface LetterDisplayProps {
    lettersEarned: number;
}

export const LetterDisplay: React.FC<LetterDisplayProps> = ({ lettersEarned }) => (
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
                >
                    <Text style={letterStyles.text}>{letter}</Text>
                </View>
            );
        })}
    </View>
);