import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import TrickSelector from '@/components/trickSelector';
import { Colors } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CustomButton } from './CustomButton';

// Trick Options (moved from 1v1.tsx)
const STANCE_OPTIONS = ["Forward", "Switch"];
const SPIN_DIRECTION_OPTIONS = ["Natural", "Unnatural"];
const NUMBER_OF_FLIPS_OPTIONS = ["Single", "Double"];
const AXIS_OPTIONS = ["Bio", "Rodeo", "Cork", "Misty", "On Axis"];
const DEGREE_OF_ROTATION_OPTIONS = ["180", "360", "540", "720", "900", "1080", "1260", "1440"];
const GRAB_OPTIONS = ["Mute", "Safety", "Blunt", "Nose", "Stale", "Japan", "Critical", "Octo"];


interface TrickCallModalProps {
    isVisible: boolean;
    onClose: () => void;
    otherPlayerName: string;
    onTrickCall: (trickString: string) => void;
}

// Trick State Interface
interface TrickState {
    stance: string | null;
    spinDirection: string | null;
    numberOfFlips: string | null;
    axis: string | null;
    degreeOfRotation: string | null;
    grab: string | null;
}

// Assuming your trickModalStyles are defined here or imported
const trickModalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.overlay },
    scrollViewContent: { flexGrow: 1, justifyContent: 'center' },
    modalView: { margin: 20, width: '90%', backgroundColor: Colors.white, borderRadius: 20, padding: 35, alignItems: 'center', elevation: 5 },
    closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: Colors.darkBlue },
    subtitle: { fontSize: 16, color: Colors.textGrey, marginBottom: 20 },
    summaryContainer: { width: '100%', padding: 15, marginVertical: 20, backgroundColor: Colors.lightBlue, borderRadius: 10, alignItems: 'center' },
    summaryText: { fontSize: 14, color: Colors.darkText, marginBottom: 5 },
    currentTrick: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: Colors.darkBlue },
});

export const TrickCallModal: React.FC<TrickCallModalProps> = ({ isVisible, onClose, otherPlayerName, onTrickCall }) => {
    const [trick, setTrick] = React.useState<TrickState>({
        stance: null, spinDirection: null, numberOfFlips: null, axis: null, degreeOfRotation: null, grab: null
    });

    // Reset state on modal open
    React.useEffect(() => {
        if (isVisible) {
            setTrick({ stance: null, spinDirection: null, numberOfFlips: null, axis: null, degreeOfRotation: null, grab: null });
        }
    }, [isVisible]);

    const handleCallTrick = () => {
        const { stance, spinDirection, axis, degreeOfRotation, grab, numberOfFlips } = trick;

        if (stance && spinDirection && axis && degreeOfRotation && grab) {
            if (axis !== 'On Axis' && !numberOfFlips) {
                Alert.alert('Incomplete Trick', 'Please select the number of flips for off-axis tricks.');
                return;
            }

            const stancePart = stance !== 'Forward' ? stance : '';
            const spinDirectionPart = spinDirection !== 'Natural' ? spinDirection : '';
            const flipsPart = numberOfFlips || '';

            const trickParts = [stancePart, spinDirectionPart, flipsPart, axis, degreeOfRotation, grab].filter(Boolean);
            const trickString = trickParts.join(' ');

            onTrickCall(trickString);
        } else {
            Alert.alert('Incomplete Trick', 'Please select all required trick components.');
        }
    };

    const updateTrick = (key: keyof TrickState, value: string | null) => {
        setTrick(prev => {
            const newState = { ...prev, [key]: value };
            // Clear flips if axis is set to On Axis
            if (key === 'axis' && value === 'On Axis') {
                newState.numberOfFlips = null;
            }
            return newState;
        });
    };

    const previewTrick = `${trick.stance || 'Stance'} ${trick.spinDirection || 'Spin'} ${trick.numberOfFlips || ''} ${trick.axis || 'Axis'} ${trick.degreeOfRotation || 'Degree'} ${trick.grab || 'Grab'}`;

    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={trickModalStyles.centeredView}>
                <ScrollView contentContainerStyle={trickModalStyles.scrollViewContent}>
                    <ThemedView style={trickModalStyles.modalView}>
                        <TouchableOpacity style={trickModalStyles.closeButton} onPress={onClose}>
                            <AntDesign name="close-circle" size={24} color={Colors.textGrey} />
                        </TouchableOpacity>

                        <ThemedText style={trickModalStyles.title}>Build Your Trick</ThemedText>
                        <ThemedText style={trickModalStyles.subtitle}>Set a challenge for {otherPlayerName}.</ThemedText>

                        <TrickSelector label="Stance" options={STANCE_OPTIONS} selectedValue={trick.stance} onSelect={(v) => updateTrick('stance', v)} />
                        <TrickSelector label="Spin Direction" options={SPIN_DIRECTION_OPTIONS} selectedValue={trick.spinDirection} onSelect={(v) => updateTrick('spinDirection', v)} />
                        <TrickSelector label="Axis" options={AXIS_OPTIONS} selectedValue={trick.axis} onSelect={(v) => updateTrick('axis', v)} />
                        <TrickSelector
                            label="Number of Flips"
                            options={NUMBER_OF_FLIPS_OPTIONS}
                            selectedValue={trick.numberOfFlips}
                            onSelect={(v) => updateTrick('numberOfFlips', v)}
                            disabled={trick.axis === "On Axis"}
                        />
                        <TrickSelector label="Degree of Rotation" options={DEGREE_OF_ROTATION_OPTIONS} selectedValue={trick.degreeOfRotation} onSelect={(v) => updateTrick('degreeOfRotation', v)} />
                        <TrickSelector label="Grab" options={GRAB_OPTIONS} selectedValue={trick.grab} onSelect={(v) => updateTrick('grab', v)} />

                        <View style={trickModalStyles.summaryContainer}>
                            <ThemedText style={trickModalStyles.summaryText}>Preview:</ThemedText>
                            <ThemedText style={trickModalStyles.currentTrick}>{previewTrick}</ThemedText>
                        </View>

                        <CustomButton title="Set Trick and Start Round" onPress={handleCallTrick} isPrimary={true} style={{ width: '60%' }} />
                    </ThemedView>
                </ScrollView>
            </View>
        </Modal>
    );
};