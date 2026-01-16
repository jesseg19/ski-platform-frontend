import { mainStyles } from "@/constants/AppStyles";
import { GameStatus } from "@/types/game.types";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface GameHeaderProps {
    whosSet: string;
    gameStatus: GameStatus;
    onCallNewTrick: () => void;
    isOnline: boolean;
}

export const GameHeader = ({ whosSet, gameStatus, onCallNewTrick, isOnline }: GameHeaderProps) => {
    return (
        <>
            {!isOnline && (
                <ThemedView style={{ backgroundColor: '#ff9800', padding: 8, marginBottom: 10, borderRadius: 4 }}>
                    <ThemedText style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                        ⚠️ OFFLINE MODE - Changes will sync when connection restores
                    </ThemedText>
                </ThemedView>
            )}

            <ThemedView style={mainStyles.statusCard}>
                <ThemedText style={mainStyles.statusTitle}>
                    <Text style={{ fontWeight: 'bold' }}>{whosSet}</Text>&apos;s Set
                </ThemedText>
                <TouchableOpacity
                    style={[mainStyles.callSetButton, { opacity: gameStatus !== 'playing' ? 0.5 : 1 }]}
                    onPress={onCallNewTrick}
                    disabled={gameStatus !== 'playing'}
                >
                    <ThemedText style={mainStyles.callSetButtonText}>
                        CALL NEW TRICK
                    </ThemedText>
                </TouchableOpacity>
            </ThemedView>
        </>
    );
};