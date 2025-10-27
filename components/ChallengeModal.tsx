// components/ChallengeModal.tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useChallenge } from '../app/context/ChallengeContext';

// Assuming you have styles defined elsewhere, using placeholders here
const modalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalView: { width: '80%', padding: 25, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    modalText: { marginBottom: 20, textAlign: 'center' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    customButton: { padding: 10, borderRadius: 5, width: '45%' },
    primaryButton: { backgroundColor: 'green' },
    secondaryButton: { backgroundColor: 'red' },
    primaryButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
    secondaryButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
    closeButton: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
});

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    isPrimary?: boolean;
    disabled?: boolean;
    style?: object;
}

// Re-using the CustomButton definition from your prompt for consistency
const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, isPrimary = true, disabled = false, style }) => (
    <TouchableOpacity
        style={[modalStyles.customButton, isPrimary ? modalStyles.primaryButton : modalStyles.secondaryButton, style, disabled && { opacity: 0.5 }]}
        onPress={onPress}
        disabled={disabled}
    >
        <ThemedText style={isPrimary ? modalStyles.primaryButtonText : modalStyles.secondaryButtonText}>
            {title}
        </ThemedText>
    </TouchableOpacity>
);


export const ChallengeModal: React.FC = () => {
    const { incomingChallenge, respondToChallenge } = useChallenge();
    const isVisible = !!incomingChallenge;

    const handleAccept = () => {
        respondToChallenge('ACCEPTED');
    };

    const handleReject = () => {
        respondToChallenge('REJECTED');
    };

    if (!incomingChallenge) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleReject} // Allow dismissing by physical back button
        >
            <View style={modalStyles.centeredView}>
                <ThemedView style={modalStyles.modalView}>
                    <AntDesign name="user" size={40} color="orange" style={{ marginBottom: 15 }} />

                    <ThemedText style={modalStyles.modalTitle}>Incoming Challenge!</ThemedText>

                    <ThemedText style={modalStyles.modalText}>
                        <ThemedText style={{ fontWeight: 'bold' }}>
                            {incomingChallenge.challenger.username}
                        </ThemedText>
                        {' '}is challenging you to a game of SKI!
                    </ThemedText>

                    <View style={modalStyles.buttonContainer}>
                        <CustomButton
                            title="Accept"
                            onPress={handleAccept}
                            isPrimary={true}
                        />
                        <CustomButton
                            title="Decline"
                            onPress={handleReject}
                            isPrimary={false}
                            style={{ backgroundColor: 'red' }}
                        />
                    </View>
                </ThemedView>
            </View>
        </Modal>
    );
};