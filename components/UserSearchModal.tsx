import api from '@/auth/axios';
import { ThemedText } from '@/components/themed-text';
import { Theme } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserSearchResult {
    id: number;
    username: string;
}

interface UserSearchModalProps {
    isVisible: boolean;
    onClose: () => void;
}

interface SearchItemProps {
    user: UserSearchResult;
    onCloseModal: () => void;
}

const SearchItem: React.FC<SearchItemProps> = ({ user, onCloseModal }) => {

    const handlePress = () => {
        onCloseModal();

        router.push({
            pathname: "/(tabs)/profile/OtherPlayerProfileScreen",
            params: { playerId: user.id.toString() }
        });
    };

    return (
        <TouchableOpacity style={modalStyles.itemContainer} onPress={handlePress}>
            <ThemedText style={modalStyles.itemUsername}>{user.username}</ThemedText>
            <Feather name="chevron-right" size={20} color={Theme.darkText} />
        </TouchableOpacity>
    );
};

// --- Main Search Modal Component ---
const UserSearchModal: React.FC<UserSearchModalProps> = ({ isVisible, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (query: string) => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get<UserSearchResult[]>(`/api/games/search?q=${query}`);
            setResults(response.data);
        } catch (error) {
            console.error('User search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounce the search input to limit API calls during fast typing
    React.useEffect(() => {
        const handler = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300); // Wait 300ms after the user stops typing

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);


    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={modalStyles.container}>

                {/* Search Bar and Close Button */}
                <View style={modalStyles.header}>
                    <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                        <Feather name="arrow-left" size={24} color={Theme.darkText} />
                    </TouchableOpacity>
                    <TextInput
                        style={modalStyles.searchInput}
                        placeholder="Search for users..."
                        placeholderTextColor={Theme.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus={true}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={modalStyles.clearButton}>
                            <Feather name="x-circle" size={20} color={Theme.placeholder} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Results */}
                {loading ? (
                    <ThemedText style={modalStyles.statusText}>Searching...</ThemedText>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => <SearchItem user={item} onCloseModal={onClose} />}
                        ListEmptyComponent={() => (
                            <ThemedText style={modalStyles.statusText}>
                                {searchQuery.length < 2 ? 'Start typing to search users...' : 'No users found.'}
                            </ThemedText>
                        )}
                        contentContainerStyle={modalStyles.listContent}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
};

export default UserSearchModal;


// --- Styles for the Modal ---
const modalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
    },
    closeButton: {
        paddingRight: 15,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 18,
        color: Theme.darkText,
    },
    clearButton: {
        paddingLeft: 10,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.border,
    },
    itemUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.darkText,
    },
    statusText: {
        textAlign: 'center',
        marginTop: 20,
        color: Theme.darkText,
    }
});