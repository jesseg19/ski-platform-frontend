import { mainStyles } from "@/constants/AppStyles";
import { Theme } from "@/constants/theme";
import { GameStatus } from "@/types/game.types";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CustomButton } from "../CustomButton";
import { ThemedText } from "../themed-text";

interface GameControlsProps {
    gameStatus: GameStatus;
    tricks: any[];
    onRemoveLastTrick: () => void;
    onViewTrickHistory: () => void;
    onExit: () => void;
}

export const GameControls = ({
    gameStatus,
    tricks,
    onRemoveLastTrick,
    onViewTrickHistory,
    onExit
}: GameControlsProps) => {
    return (
        <>
            <View style={{ height: 50, flexDirection: 'row', justifyContent: 'space-between' }}>
                <CustomButton
                    title="Remove Last Trick"
                    style={{ backgroundColor: Theme.danger }}
                    onPress={onRemoveLastTrick}
                    disabled={tricks.length === 0 || gameStatus === 'gameOver'}
                />
                <CustomButton
                    title="View Trick History"
                    disabled={gameStatus === 'pending'}
                    onPress={onViewTrickHistory}
                    isPrimary={false}
                />
            </View>

            <View style={mainStyles.backButtonContainer}>
                <TouchableOpacity onPress={onExit}>
                    <ThemedText style={mainStyles.backButtonText}>Exit Game</ThemedText>
                </TouchableOpacity>
            </View>
        </>
    );
};