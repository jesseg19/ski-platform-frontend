import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { OpponentSearch } from '@/components/opponent-search';
import { Theme } from '@/constants/theme';
import { AntDesign, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface User {
    id: number;
    username: string;
}
interface UserSearchResult {
    id: number;
    username: string;
}

interface PendingRequest {
    id: number;
    requester: User; // The user who sent the request
    receiver: User; // The current user
    status: 'PENDING';
    createdAt: string;
}
interface SelectedUser {
    username: string;
}

export default function FriendsScreen() {
    const [addFriendsModalVisible, setAddFriendsModalVisible] = React.useState(false);
    const [friendRequestStatus, setFriendRequestStatus] = React.useState('');

    const [friendsList, setFriendsList] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [selectedUserToFriend, setSelectedUserToFriend] = React.useState<UserSearchResult | null>(null);

    const closeAddFriendsModal = () => {
        setAddFriendsModalVisible(false);
        setSelectedUserToFriend(null);
        setFriendRequestStatus('');
    }

    const handleSendFriendRequest = async () => {
        if (!selectedUserToFriend || selectedUserToFriend.id === -1) {
            setFriendRequestStatus('Please select a valid user first.');
            return;
        }

        try {
            setFriendRequestStatus('Sending request...');
            await api.post('/api/friends/request', {
                receiverUsername: selectedUserToFriend.username,
            });

            setFriendRequestStatus(`Friend request sent to ${selectedUserToFriend.username}!`);
            setTimeout(closeAddFriendsModal, 500);

        } catch (error: any) {
            console.error('Failed to send friend request:', error);
            const errorMessage = error.response?.data?.message || 'Failed to send request. Already friends or request pending?';
            setFriendRequestStatus(errorMessage);
        }
    };

    const addFriends = () => {
        setAddFriendsModalVisible(true);
    }


    const handleshowFriendList = async () => {
        try {
            const response = await api.get('/api/friends/list');
            setFriendsList(response.data);
            console.log('Friend list:', response.data);
        } catch (error) {
            console.error('Failed to fetch friend list:', error);
        }
    };


    const pendingFriendRequests = async () => {
        try {
            const response = await api.get('/api/friends/pending');
            setPendingRequests(response.data);
            console.log('Pending friend request from:', response.data);
        } catch (error) {
            console.error('Failed to fetch pending friend requests:', error);
        }
    };
    const refreshData = () => {
        handleshowFriendList();
        pendingFriendRequests();
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleRespondToRequest = async (requestId: number, action: 'accept' | 'decline') => {
        try {
            await api.post('/api/friends/respond', {
                requestId: requestId,
                action: action,
            });
            refreshData();

        } catch (error) {
            console.error(`Failed to ${action} request ${requestId}:`, error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <AntDesign name="arrow-left" size={24} color={Theme.darkText} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Friends</ThemedText>
            </View>
            <ThemedText style={styles.title}>Friends</ThemedText>
            <TouchableOpacity onPress={(addFriends)} style={styles.iconButton}>
                <Feather name="user-plus" size={24} color={Theme.darkText} />
            </TouchableOpacity>

            {/* --- PENDING REQUESTS SECTION --- */}
            <ThemedText style={styles.pendingRequestsTitle}>Pending Friend Requests ({pendingRequests.length})</ThemedText>
            <ScrollView style={styles.sectionContainer} contentContainerStyle={styles.scrollViewContent}>
                {pendingRequests.length === 0 ? (
                    <ThemedText style={styles.noDataText}>No pending friend requests.</ThemedText>
                ) : (
                    pendingRequests.map((request) => (
                        // Key off the request ID
                        <ThemedView key={request.id} style={styles.requestItem}>
                            <ThemedText style={styles.requesterText}>
                                {request.requester.username}
                            </ThemedText>
                            <ThemedView style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.acceptButton]}
                                    onPress={() => handleRespondToRequest(request.id, 'accept')}
                                >
                                    <ThemedText style={styles.buttonText}>Accept</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.declineButton]}
                                    onPress={() => handleRespondToRequest(request.id, 'decline')}
                                >
                                    <ThemedText style={styles.buttonText}>Decline</ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        </ThemedView>
                    ))
                )}
            </ScrollView>

            {/* --- ACCEPTED FRIENDS SECTION --- */}
            <ThemedText style={styles.pendingRequestsTitle}>Your Friends ({friendsList.length})</ThemedText>
            <ScrollView style={styles.sectionContainer} contentContainerStyle={styles.scrollViewContent}>
                {friendsList.length === 0 ? (
                    <ThemedText style={styles.noDataText}>You have no friends yet. Add some!</ThemedText>
                ) : (
                    friendsList.map(friend => (
                        <ThemedText key={friend.id} style={styles.friendItem}>
                            {friend.username}
                        </ThemedText>
                    ))
                )}
            </ScrollView>

            {/* Add Friends Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addFriendsModalVisible}
                onRequestClose={closeAddFriendsModal}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.overlay }}>
                    <View style={{ width: '85%', backgroundColor: Theme.cardBackground, borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>

                        <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: Theme.primary, marginBottom: 20 }}>Add Friend</ThemedText>

                        <OpponentSearch
                            selectedUsername={selectedUserToFriend?.username || ''}
                            onUserSelect={setSelectedUserToFriend}
                        />

                        {/* Display status messages */}
                        {friendRequestStatus ? (
                            <ThemedText style={{ color: friendRequestStatus.includes('sent') ? Theme.primary : 'red', marginTop: 15, textAlign: 'center' }}>
                                {friendRequestStatus}
                            </ThemedText>
                        ) : null}

                        {/* Send Request Button */}
                        <TouchableOpacity
                            style={{
                                marginTop: 20,
                                backgroundColor: Theme.primary,
                                padding: 15,
                                borderRadius: 12,
                                alignItems: 'center',
                                // Disable if no user is selected or if a request is already pending
                                opacity: selectedUserToFriend?.id && selectedUserToFriend.id > 0 ? 1 : 0.5
                            }}
                            onPress={handleSendFriendRequest}
                            disabled={!selectedUserToFriend?.id || selectedUserToFriend.id <= 0 || friendRequestStatus.includes('Sending')}
                        >
                            <ThemedText style={{ color: Theme.cardBackground, fontWeight: 'bold', fontSize: 16 }}>
                                Send Friend Request to {selectedUserToFriend?.username || 'User'}
                            </ThemedText>
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={{ marginTop: 15, alignItems: 'center' }}
                            onPress={closeAddFriendsModal}
                        >
                            <ThemedText style={{ color: Theme.darkText, fontSize: 14 }}>Cancel</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
        color: Theme.darkText,
    },
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: Theme.darkText,
    },
    iconButton: {
        padding: 5,
    },
    sectionContainer: {
        maxHeight: '40%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.border,
        borderRadius: 8,
    },
    scrollViewContent: {
        padding: 8,
    },
    pendingRequestsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 8,
        color: Theme.darkText,
    },
    noDataText: {
        textAlign: 'center',
        color: Theme.placeholder,
        padding: 10,
    },
    friendItem: {
        color: Theme.darkText,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
        fontSize: 16,
    },
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
        paddingHorizontal: 8,
    },
    requesterText: {
        color: Theme.darkText,
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 5,
    },
    acceptButton: {
        backgroundColor: Theme.success,
    },
    declineButton: {
        backgroundColor: Theme.danger,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
});