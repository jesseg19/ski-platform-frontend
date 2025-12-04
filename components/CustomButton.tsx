import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

// Define base styles used by the button
const buttonStyles = {
    customButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    } as ViewStyle,
    primaryButton: {
        backgroundColor: Theme.success,
    } as ViewStyle,
    secondaryButton: {
        backgroundColor: Theme.darkText,
    } as ViewStyle,
};

const textStyles = {
    primaryButtonText: {
        color: Theme.lightText,
        fontWeight: 'bold',
        fontSize: 16,
    } as TextStyle,
    secondaryButtonText: {
        color: Theme.lightText,
        fontWeight: 'bold',
        fontSize: 16,
    } as TextStyle,
};

const styles = StyleSheet.create(buttonStyles);
const textStyleSheet = StyleSheet.create(textStyles);

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    isPrimary?: boolean;
    disabled?: boolean;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
}

export const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, isPrimary = true, disabled = false, style, textStyle }) => (
    <TouchableOpacity
        style={[
            styles.customButton,
            isPrimary ? styles.primaryButton : styles.secondaryButton,
            style,
            disabled && { opacity: 0.5 }
        ]}
        onPress={onPress}
        disabled={disabled}
    >
        <ThemedText style={[isPrimary ? textStyleSheet.primaryButtonText : textStyleSheet.secondaryButtonText, textStyle]}>
            {title}
        </ThemedText>
    </TouchableOpacity>
);