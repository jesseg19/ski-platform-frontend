// components/ChallengeModal.tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface GameTrick {
    turnNumber: number;
    setterId: number;
    setterUsername: string;
    receiverId: number;
    receiverUsername: string;
    setterLanded: boolean;
    receiverLanded: boolean;
    letterAssignedToId: number | null;
    letterAssignedToUsername: number | null;
    trickDetails: string;
}

interface GameTricksModalProps {
    isVisible: boolean;
    onClose: () => void;
    tricks: GameTrick[];
    p1Username: string;
    p2Username: string;
}
export const GameTricksModal: React.FC<GameTricksModalProps> = ({ isVisible, onClose, tricks, p1Username, p2Username }) => {
    return (
        <Modal visible={isVisible} animationType="slide" transparent={true}>
            <ScrollView style={styles.centeredView}>
                <ThemedView style={styles.modalView}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <AntDesign name="close-circle" size={24} color="gray" />
                    </TouchableOpacity>
                    <ThemedText style={styles.modalTitle}>Trick History</ThemedText>
                    <View style={styles.trickList}>
                        {tricks.length === 0 ? (
                            <ThemedText style={styles.noTricksText}>No tricks performed yet.</ThemedText>
                        ) : (
                            tricks.map((trick) => (
                                <View key={trick.turnNumber} style={styles.trickItem}>
                                    <ThemedText style={styles.trickName}>{trick.trickDetails}</ThemedText>
                                    <ThemedText style={styles.trickDetails}>
                                        Set by: {trick.setterUsername}
                                    </ThemedText>
                                    <ThemedText style={styles.trickDetails}>
                                        {trick.letterAssignedToUsername ? "Letter Given to: " + trick.letterAssignedToUsername : ''}
                                    </ThemedText>
                                </View>
                            ))
                        )}
                    </View>
                </ThemedView>
            </ScrollView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 300,
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    trickList: {
        width: '100%',
    },
    trickItem: {
        marginBottom: 15,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    trickName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    trickDetails: {
        fontSize: 14,
        marginBottom: 2,
    },
    noTricksText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});