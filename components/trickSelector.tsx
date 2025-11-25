import { Colors } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons'; // Import an icon
import React, { useState } from 'react'; // Import useState
import {
    FlatList, // Import FlatList
    Modal, // Import Modal
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback, // Import TouchableWithoutFeedback
    View,
} from 'react-native';

interface TrickSelectorProps {
    label: string;
    options: string[];
    selectedValue: string | null;
    onSelect: (value: string | null) => void; // Allow null for deselecting/placeholders
    disabled?: boolean;
    placeholder?: string; // Add placeholder prop
}

const TrickSelector: React.FC<TrickSelectorProps> = ({
    label,
    options,
    selectedValue,
    onSelect,
    disabled = false,
    placeholder = "-- Select --", // Default placeholder
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleSelect = (option: string) => {
        onSelect(option);
        setModalVisible(false);
    };

    return (
        <View style={[styles.container, disabled && { opacity: 0.6 }]}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
            >
                <Text style={[styles.dropdownButtonText, !selectedValue && styles.placeholderText]}>
                    {selectedValue || placeholder}
                </Text>
                <AntDesign name="down" size={16} color={Colors.textGrey} />
            </TouchableOpacity>

            <Modal
                transparent={true}
                animationType="fade"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <FlatList
                                data={options}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.optionButton}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text style={styles.optionText}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '500', // Changed weight for new style
        marginBottom: 8,
        color: Colors.textGrey, // Use theme color
    },
    // New styles for dropdown button
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: Colors.white, // Use theme color
        borderWidth: 1,
        borderColor: Colors.lightGrey, // Use theme color
        borderRadius: 8,
        height: 50, // Fixed height for consistency
    },
    dropdownButtonText: {
        fontSize: 16,
        color: Colors.darkText, // Use theme color
    },
    placeholderText: {
        color: Colors.textGrey, // Use theme color
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: Colors.white, // Use theme color
        borderRadius: 10,
        maxHeight: '60%',
        overflow: 'hidden',
    },
    optionButton: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGrey, // Use theme color
    },
    optionText: {
        fontSize: 16,
        color: Colors.darkText, // Use theme color
        textAlign: 'center',
    },
    // Removing old button group styles
    // buttonGroup: { ... },
    // button: { ... },
    // buttonActive: { ... },
    // buttonInactive: { ... },
    // textActive: { ... },
    // textInactive: { ... },
});

export default TrickSelector;