import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, useColorScheme } from 'react-native';
import { AppStyles } from '../constants/AppStyles';

import { Colors } from '../constants/theme';

interface GameActionButtonProps {
    title: string;
    onPress: () => void;
    colorType: 'success' | 'danger';
    disabled: boolean;
    style?: ViewStyle;
}

const GameActionButton: React.FC<GameActionButtonProps> = ({ title, onPress, colorType, disabled, style }) => {
    const scheme = useColorScheme();
    const color = Colors[scheme ?? 'light'][colorType];
    const disabledColor = scheme === 'dark' ? '#333' : '#ddd';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                AppStyles.actionButtonBase,
                { backgroundColor: disabled ? disabledColor : color },
                style,
                disabled && styles.disabled,
            ]}
        >
            <Text style={[styles.buttonText, disabled && styles.disabledText]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    button: {
        marginVertical: 35,
    },
    disabled: {
        opacity: 0.6,
    },
    disabledText: {
        color: '#888',
    }
});

export default GameActionButton;