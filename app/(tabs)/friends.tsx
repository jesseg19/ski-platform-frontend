import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { OpponentSearch } from '@/components/opponent-search';
import { Feather } from '@expo/vector-icons';


const Colors = {
    lightBlue: '#EAF7FE', // Main background
    greenButton: '#85E34A', // Used for "View Match" buttons
    darkBlue: '#406080', // Logo and main icons
    textGrey: '#555',
    darkText: '#333',
    white: '#FFFFFF',
    cardBackground: '#FFFFFF',
    separator: '#EEE',
    profileText: '#2D3E50',
    rankText: '#6A7E9A',
    overlay: 'rgba(255, 255, 255, 0.7)', // Overlay for background image
};

interface User {
    id: number;
    username: string;
}
interface UserSearchResult {
    id: number;
    username: string;
}

// Define the shape of a Pending Friend Request (returned in /api/friends/pending)
interface PendingRequest {
    id: number;
    requester: User; // The user who sent the request
    receiver: User; // The current user
    status: 'PENDING';
    createdAt: string;
}

// Define the shape of the selected user (optional, but good practice)
interface SelectedUser {
    username: string;
}

export default function FriendsScreen() {
    const [addFriendsModalVisible, setAddFriendsModalVisible] = React.useState(false);
    const [friendRequestStatus, setFriendRequestStatus] = React.useState(''); // To show success/error message

    const [friendsList, setFriendsList] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [selectedUserToFriend, setSelectedUserToFriend] = React.useState<UserSearchResult | null>(null);

    const closeAddFriendsModal = () => {
        setAddFriendsModalVisible(false);
        setSelectedUserToFriend(null);
        setFriendRequestStatus('');
    }

    // *** NEW HANDLER: Send API Request ***
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
            // Optionally, close the modal after a delay
            setTimeout(closeAddFriendsModal, 2000);

        } catch (error: any) {
            console.error('Failed to send friend request:', error);
            // Display a helpful error message from the API response if possible
            const errorMessage = error.response?.data?.message || 'Failed to send request. Already friends or request pending?';
            setFriendRequestStatus(errorMessage);
        }
    };

    const addFriends = () => {
        // In a real app, this would lead to a dedicated settings/edit page
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

    // --- NEW: Friend Response Logic (Endpoint 2) ---
    const handleRespondToRequest = async (requestId: number, action: 'accept' | 'decline') => {
        try {
            await api.post('/api/friends/respond', {
                requestId: requestId,
                action: action,
            });

            // Refresh the lists to update the UI
            refreshData();

        } catch (error) {
            console.error(`Failed to ${action} request ${requestId}:`, error);
            // Handle error (e.g., show an alert to the user)
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Friends</ThemedText>
            <TouchableOpacity onPress={(addFriends)} style={styles.iconButton}>
                <Feather name="user-plus" size={24} color={Colors.darkBlue} />
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
                            {/* ACCESS THE REQUESTER'S USERNAME */}
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
                            {/* FRIEND LIST ALREADY HAS USER OBJECTS */}
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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.overlay }}>
                    <View style={{ width: '85%', backgroundColor: Colors.white, borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>

                        <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: Colors.darkBlue, marginBottom: 20 }}>Add Friend</ThemedText>

                        <OpponentSearch
                            // Pass the current selected user to maintain the text input state
                            selectedUsername={selectedUserToFriend?.username || ''}
                            // Set the selected user in local state when a search result is tapped
                            onUserSelect={setSelectedUserToFriend}
                        />

                        {/* Display status messages */}
                        {friendRequestStatus ? (
                            <ThemedText style={{ color: friendRequestStatus.includes('sent') ? Colors.greenButton : 'red', marginTop: 15, textAlign: 'center' }}>
                                {friendRequestStatus}
                            </ThemedText>
                        ) : null}

                        {/* Send Request Button */}
                        <TouchableOpacity
                            style={{
                                marginTop: 20,
                                backgroundColor: Colors.greenButton,
                                padding: 15,
                                borderRadius: 12,
                                alignItems: 'center',
                                // Disable if no user is selected or if a request is already pending
                                opacity: selectedUserToFriend?.id && selectedUserToFriend.id > 0 ? 1 : 0.5
                            }}
                            onPress={handleSendFriendRequest}
                            disabled={!selectedUserToFriend?.id || selectedUserToFriend.id <= 0 || friendRequestStatus.includes('Sending')}
                        >
                            <ThemedText style={{ color: Colors.white, fontWeight: 'bold', fontSize: 16 }}>
                                Send Friend Request to {selectedUserToFriend?.username || 'User'}
                            </ThemedText>
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={{ marginTop: 15, alignItems: 'center' }}
                            onPress={closeAddFriendsModal}
                        >
                            <ThemedText style={{ color: Colors.rankText, fontSize: 14 }}>Cancel</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    iconButton: {
        padding: 5,
    },
    sectionContainer: {
        maxHeight: '40%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
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
    },
    noDataText: {
        textAlign: 'center',
        color: '#888',
        padding: 10,
    },
    // Styles for Accepted Friends List
    friendItem: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        fontSize: 16,
    },
    // Styles for Pending Requests
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingHorizontal: 8,
    },
    requesterText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1, // Allows the username to take up available space
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
        backgroundColor: 'green',
    },
    declineButton: {
        backgroundColor: 'red',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
});