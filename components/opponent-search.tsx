import { Theme } from '@/constants/theme';
import { AntDesign } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDebounce } from 'use-debounce';
import api from '../auth/axios';


// Placeholder for ThemedText
interface ThemedTextProps {
    children: React.ReactNode;
    style?: any;
}
const ThemedText: React.FC<ThemedTextProps> = ({ children, style }) => (
    <Text style={style}>{children}</Text>
);


interface UserSearchResult {
    id: number;
    username: string;
    eloRating?: string;
    profileImageUrl?: string;
}

interface OpponentSearchProps {
    onUserSelect: (user: UserSearchResult) => void;
    selectedUsername: string;
}

export const OpponentSearch: React.FC<OpponentSearchProps> = ({ onUserSelect, selectedUsername }) => {
    const [searchTerm, setSearchTerm] = useState(selectedUsername);
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [hasSelectedUser, setHasSelectedUser] = useState(!!selectedUsername);

    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

    // --- Search Function ---
    const fetchUsers = useCallback(async (query: string) => {
        // If query is short, clear results and stop
        if (query.length < 3) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get('/api/games/search', { params: { q: query } });
            const data: UserSearchResult[] = response.data;
            setResults(data);
        } catch (error) {
            console.error('User search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- EFFECT: Trigger search when debounced term changes ---
    React.useEffect(() => {

        if (hasSelectedUser) {
            // Clear results list to ensure it's hidden after selection
            setResults([]);
            return;
        }
        // Only search if the new debounced term is NOT the one that was selected
        if (debouncedSearchTerm.length >= 3) {
            fetchUsers(debouncedSearchTerm);
        } else if (debouncedSearchTerm.length < 3) {
            setResults([]);
        }
    }, [debouncedSearchTerm, fetchUsers, hasSelectedUser]);

    // --- Sync internal searchTerm with parent's selectedUsername (e.g., on parent clear) ---
    React.useEffect(() => {
        if (searchTerm !== selectedUsername) {
            setSearchTerm(selectedUsername);
            setHasSelectedUser(!!selectedUsername);
        }
    }, [selectedUsername]);


    const handleUserSelect = (user: UserSearchResult) => {
        setResults([]);
        setSearchTerm(user.username);
        setHasSelectedUser(true);
        onUserSelect(user);
    };

    const handleTextChange = (text: string) => {
        setSearchTerm(text);

        // If the text changes and it's not the already selected name, 
        // we assume the user is starting a new search.
        if (text !== selectedUsername) {
            setHasSelectedUser(false); // User is actively searching/typing
            // Clear parent selection to invalidate 'Start Game' button 
            // until a new, valid selection is made from the results list.
            onUserSelect({ id: -1, username: '' });
        }
    }

    const handleClearSelection = () => {
        setSearchTerm('');
        setResults([]);
        setHasSelectedUser(false);
        onUserSelect({ id: -1, username: '' });
    }

    const renderItem = ({ item }: { item: UserSearchResult }) => (
        <TouchableOpacity
            style={searchStyles.resultItem}
            onPress={() => { handleUserSelect(item); setResults([]); }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Simplified profile image logic for display,------ not yet implemented ----- */}
                    <Image
                        source={{ uri: item.profileImageUrl || 'https://via.placeholder.com/40' }}
                        style={searchStyles.profileImage}
                    />
                    <View>
                        <ThemedText style={searchStyles.usernameText}>{item.username}</ThemedText>
                        <ThemedText style={searchStyles.eloText}>Rating: {item.eloRating}</ThemedText>
                    </View>
                </View>
                <AntDesign name="arrow-right" size={16} color={Theme.primary} />
            </View>
        </TouchableOpacity>
    );

    // Determines if the results list should be visible
    const showResults = results.length > 0 && !hasSelectedUser;

    // Determines if the input is in a 'locked' state (selected user is present and not actively typing)
    const isLocked = selectedUsername && hasSelectedUser;



    return (
        <View style={searchStyles.container}>
            <View style={searchStyles.searchInputWrapper}>
                <AntDesign name="search" size={18} color={Theme.darkText} style={searchStyles.searchIcon} />
                <TextInput
                    style={searchStyles.searchInput}
                    placeholder="Search username..."
                    placeholderTextColor={Theme.darkText}
                    value={searchTerm}
                    onChangeText={handleTextChange}
                    editable={!isLocked}
                />
            </View>

            {/* Results / Status Container */}
            {(isLoading || showResults) && (
                <View style={searchStyles.resultsContainer}>
                    {isLoading && (
                        <View style={searchStyles.statusBox}>
                            <ActivityIndicator size="small" color={Theme.primary} />
                            <ThemedText style={searchStyles.statusText}>Searching...</ThemedText>
                        </View>
                    )}

                    {showResults && (
                        <FlatList
                            data={results}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            style={searchStyles.list}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}

                    {!isLoading && results.length === 0 && debouncedSearchTerm.length >= 3 && !hasSelectedUser && (
                        <View style={searchStyles.statusBox}>
                            <ThemedText style={searchStyles.statusText}>No users found for &quot;{debouncedSearchTerm}&quot;</ThemedText>
                        </View>
                    )}
                </View>
            )}

            {/* If a user is selected, show a clear button */}
            {isLocked && (
                <TouchableOpacity
                    style={searchStyles.clearButton}
                    onPress={handleClearSelection}
                >
                    <AntDesign name="close-circle" size={16} color={Theme.darkText} />
                    <ThemedText style={searchStyles.clearButtonText}>Change User</ThemedText>
                </TouchableOpacity>
            )}

        </View>
    );
};

const searchStyles = StyleSheet.create({
    container: {
        width: '100%',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.border,
        paddingHorizontal: 15,
        height: 55,
        marginBottom: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Theme.darkText,
        height: '100%',
    },
    resultsContainer: {
        backgroundColor: Theme.cardBackground,
        borderRadius: 12,
        marginTop: 5,
        borderWidth: 1,
        borderColor: Theme.border,
        maxHeight: 200,
        overflow: 'hidden',
    },
    list: {
        maxHeight: 200,
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomColor: Theme.border,
        borderBottomWidth: 1,
        backgroundColor: Theme.secondary,
    },
    usernameText: {
        fontSize: 16,
        color: Theme.darkText,
        fontWeight: '500',
    },
    eloText: {
        fontSize: 14,
        color: Theme.darkText,
        fontWeight: '400',
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
    },
    statusText: {
        marginLeft: 10,
        color: Theme.darkText,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 15,
        gap: 5,
    },
    clearButtonText: {
        fontSize: 14,
        color: Theme.darkText,
        fontWeight: '500',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        display: 'flex',
        flexDirection: 'row',
    }
});
export default OpponentSearch;