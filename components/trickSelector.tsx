import { Theme } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface TrickSelectorProps {
    label: string;
    options: string[];
    selectedValue: string | null;
    onSelect: (value: string | null) => void;
    disabled?: boolean;
    placeholder?: string;
}

const TrickSelector: React.FC<TrickSelectorProps> = ({
    label,
    options,
    selectedValue,
    onSelect,
    disabled = false,
    placeholder = "-- Select --",
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
                <AntDesign name="down" size={16} color={Theme.darkText} />
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
        fontWeight: '500',
        marginBottom: 8,
        color: Theme.darkText,
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: Theme.background,
        borderWidth: 1,
        borderColor: Theme.lightText,
        borderRadius: 8,
        height: 50,
    },
    dropdownButtonText: {
        fontSize: 16,
        color: Theme.darkText,
    },
    placeholderText: {
        color: Theme.darkText,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.overlay,
    },
    modalContent: {
        width: '80%',
        backgroundColor: Theme.cardBackground,
        borderRadius: 10,
        maxHeight: '60%',
        overflow: 'hidden',
    },
    optionButton: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: Theme.lightText,
    },
    optionText: {
        fontSize: 16,
        color: Theme.darkText,
        textAlign: 'center',
    },
});

export default TrickSelector;