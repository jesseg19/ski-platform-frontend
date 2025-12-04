// --- LeaderboardModal.tsx ---

import { ThemedText } from '@/components/themed-text';
import { leaderboardStyles } from '@/constants/AppStyles';
import { Theme } from '@/constants/theme';

import { LeaderboardEntry } from '@/hooks/useLeaderboard'; // Import interface from hook
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Modal, Pressable, TouchableOpacity, View } from 'react-native';

// --- Leaderboard Item Component (Refactored to live next to the modal) ---
interface LeaderboardItemProps {
    item: LeaderboardEntry;
    index: number;
    tab: 'allTime' | 'monthly';
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ item, index, tab }) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    let rankColor = isTopThree ? (rank === 1 ? Theme.gold : rank === 2 ? Theme.silver : Theme.bronze) : Theme.darkText;

    const statsText = tab === 'monthly' ? `${item.monthlyEloGain} this month` : `${item.eloRating} elo`;

    return (
        <TouchableOpacity
            onPress={() => router.push({ pathname: "/(tabs)/profile/OtherPlayerProfileScreen", params: { playerId: item.userId.toString() } })}
            activeOpacity={0.8}
        >
            <View style={[leaderboardStyles.itemContainer, {
                backgroundColor: isTopThree ? rankColor + '30' : Theme.background
            }]}>
                {/* Rank Section */}
                <View style={leaderboardStyles.rankSection}>
                    <ThemedText style={[leaderboardStyles.rankText, { color: rankColor }]}>
                        #{rank}
                    </ThemedText>
                </View>
                {/* Info Section */}
                <View style={leaderboardStyles.infoSection}>
                    <ThemedText style={leaderboardStyles.username}>{item.username}</ThemedText>
                </View>
                {/* ELO/Stats Section */}
                <View style={leaderboardStyles.eloSection}>
                    <ThemedText style={[leaderboardStyles.eloText, { color: rankColor }]}>
                        {statsText}
                    </ThemedText>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// --- Leaderboard Modal Component ---
interface LeaderboardModalProps {
    isVisible: boolean;
    onClose: () => void;
    data: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    tab: 'allTime' | 'monthly';
    onTabChange: (newTab: 'allTime' | 'monthly') => void;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isVisible, onClose, data, loading, error, tab, onTabChange }) => {

    const renderListContent = () => {
        if (loading) {
            return <ThemedText style={leaderboardStyles.loadingText}>Loading leaderboard...</ThemedText>;
        }
        if (error) {
            return <ThemedText style={[leaderboardStyles.loadingText, { color: 'red' }]}>{error}</ThemedText>;
        }
        if (data.length === 0) {
            return <ThemedText style={leaderboardStyles.loadingText}>No entries found.</ThemedText>;
        }
        return (
            <FlatList
                data={data}
                keyExtractor={(item) => item.username + item.userId.toString()} // Add userId for better key
                renderItem={({ item, index }) => <LeaderboardItem item={item} index={index} tab={tab} />}
                contentContainerStyle={leaderboardStyles.flatListContent}
            />
        );
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={leaderboardStyles.modalOverlay} onPress={onClose}>
                <Pressable style={leaderboardStyles.modalContent} onPress={(e) => e.stopPropagation()}>

                    {/* Modal Header/Title */}
                    <View style={leaderboardStyles.modalHeader}>
                        <ThemedText style={leaderboardStyles.modalTitle}>Global Leaderboard 🏆</ThemedText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={30} color={Theme.darkText} />
                        </TouchableOpacity>
                    </View>

                    {/* Tab Navigation */}
                    <View style={leaderboardStyles.tabContainer}>
                        <TouchableOpacity
                            style={[leaderboardStyles.tabButton, tab === 'allTime' && leaderboardStyles.tabButtonActive]}
                            onPress={() => onTabChange('allTime')}
                        >
                            <ThemedText style={[leaderboardStyles.tabText, tab === 'allTime' && leaderboardStyles.tabTextActive]}>
                                All Time
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[leaderboardStyles.tabButton, tab === 'monthly' && leaderboardStyles.tabButtonActive]}
                            onPress={() => onTabChange('monthly')}
                        >
                            <ThemedText style={[leaderboardStyles.tabText, tab === 'monthly' && leaderboardStyles.tabTextActive]}>
                                Monthly
                            </ThemedText>
                        </TouchableOpacity>
                    </View>

                    {/* List Content */}
                    <View style={leaderboardStyles.listContainer}>
                        {renderListContent()}
                    </View>

                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default LeaderboardModal;
