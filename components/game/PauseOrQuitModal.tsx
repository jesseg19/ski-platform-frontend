import { mainStyles } from "@/constants/AppStyles";
import { GameStatus } from "@/types/game.types";
import { Modal, View } from "react-native";
import { CustomButton } from "../CustomButton";
import { ThemedText } from "../themed-text";

interface PauseOrQuitModalProps {
    isVisible: boolean;
    onClose: (visible: boolean) => void;
    onPause: () => void;
    onQuit: () => void;
    gameStatus: GameStatus;
}

export const PauseOrQuitModal = ({
    isVisible,
    onClose,
    onPause,
    onQuit,
    gameStatus,
}: PauseOrQuitModalProps) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={() => onClose(false)}
        >
            <View style={mainStyles.modalOverlay}>
                <View style={mainStyles.modalContent}>
                    <ThemedText style={mainStyles.modalTitle}>Pause or Quit</ThemedText>
                    <ThemedText style={mainStyles.modalMessage}>Do you want to pause the game or quit?</ThemedText>
                    <View style={mainStyles.modalButtons}>
                        <CustomButton title="Pause" onPress={onPause} disabled={gameStatus !== 'playing'} />
                        <CustomButton title="Quit" onPress={onQuit} disabled={gameStatus === 'pending'} />
                        <CustomButton title="Back to game" onPress={() => onClose(false)} isPrimary={false} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};