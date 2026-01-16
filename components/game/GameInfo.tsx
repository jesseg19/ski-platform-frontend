import { mainStyles } from "@/constants/AppStyles";
import { ThemedText } from "../themed-text";
import { ThemedView } from "../themed-view";

interface GameInfoProps {
    calledTrick: string;
    currentMessage: string;
}

export const GameInfo = ({ calledTrick, currentMessage }: GameInfoProps) => {
    return (
        <>
            <ThemedView style={mainStyles.trickDisplayCard}>
                <ThemedText style={mainStyles.trickLabel}>Current Trick:</ThemedText>
                <ThemedText style={mainStyles.trickValue}>{calledTrick}</ThemedText>
            </ThemedView>

            <ThemedView style={mainStyles.messageCard}>
                <ThemedText style={mainStyles.messageText}>{currentMessage}</ThemedText>
            </ThemedView>
        </>
    );
};