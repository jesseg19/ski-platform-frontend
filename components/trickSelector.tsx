import { Colors } from '@/constants/theme'; // Assuming you have a theme setup
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TrickSelectorProps {
    label: string;
    options: string[];
    selectedValue: string | null;
    onSelect: (value: string) => void;
    disabled?: boolean;
}

const TrickSelector: React.FC<TrickSelectorProps> = ({
    label,
    options,
    selectedValue,
    onSelect,
    disabled = false,
}) => {
    return (
        <View style={[styles.container, disabled && { opacity: 0.6 }]}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.buttonGroup}>
                {options.map((option) => {
                    const isSelected = option === selectedValue;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.button,
                                isSelected ? styles.buttonActive : styles.buttonInactive,
                            ]}
                            onPress={() => onSelect(option)}
                            disabled={disabled}
                        >
                            <Text style={isSelected ? styles.textActive : styles.textInactive}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    buttonGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8, // Use gap for spacing between buttons
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
    },
    buttonActive: {
        backgroundColor: Colors.light.tint, // Use your app's main color
        borderColor: Colors.light.tint,
    },
    buttonInactive: {
        backgroundColor: '#fff',
        borderColor: '#ccc',
    },
    textActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    textInactive: {
        color: '#666',
    },
});

export default TrickSelector;