import { AntDesign } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDebounce } from 'use-debounce'; // Assuming this hook is available
import api from '../auth/axios'; // Assuming your API client is here


// Placeholder for ThemedText
interface ThemedTextProps {
    children: React.ReactNode;
    style?: any;
}
const ThemedText: React.FC<ThemedTextProps> = ({ children, style }) => (
    <Text style={style}>{children}</Text>
);

// --- Color Palette ---
const Colors = {
    greenButton: '#85E34A',
    darkBlue: '#406080',
    textGrey: '#555',
    darkText: '#333',
    white: '#FFFFFF',
    lightBlue: '#F0F8FF', // Used for list items background
    inputBorder: '#D0E0F0',
    inputBackground: '#F9FCFF',
};

interface UserSearchResult {
    id: number;
    username: string;
    eloRating?: string;
    profileImageUrl?: string;
}

interface OpponentSearchProps {
    onUserSelect: (user: UserSearchResult) => void;
    selectedUsername: string; // The username selected by the parent component
}

export const OpponentSearch: React.FC<OpponentSearchProps> = ({ onUserSelect, selectedUsername }) => {
    // We use internal state for the text input
    const [searchTerm, setSearchTerm] = useState(selectedUsername);
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- NEW STATE: Tracks if a selection has been made via the search list ---
    // This helps differentiate between actively typing and having made a confirmed selection
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
        // Only search if the new debounced term is NOT the one that was selected
        if (debouncedSearchTerm.length >= 3 && debouncedSearchTerm !== selectedUsername) {
            setHasSelectedUser(false); // User is typing, not selected
            fetchUsers(debouncedSearchTerm);
        } else if (debouncedSearchTerm.length < 3) {
            setResults([]);
            setHasSelectedUser(false);
        }
    }, [debouncedSearchTerm, fetchUsers, selectedUsername]);

    // --- Sync internal searchTerm with parent's selectedUsername (e.g., on parent clear) ---
    React.useEffect(() => {
        if (searchTerm !== selectedUsername) {
            setSearchTerm(selectedUsername);
            setHasSelectedUser(!!selectedUsername);
        }
    }, [selectedUsername]);


    const handleUserSelect = (user: UserSearchResult) => {
        setResults([]); // Clear the list
        setSearchTerm(user.username); // Set input to selected username
        setHasSelectedUser(true); // Mark as selected
        onUserSelect(user); // Notify parent (this is the crucial step)
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

        // No need for a separate isSearching state, just let the useEffect handle it.
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
            onPress={() => handleUserSelect(item)}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Simplified profile image logic for display */}
                <Image
                    source={{ uri: item.profileImageUrl || 'https://via.placeholder.com/40' }}
                    style={searchStyles.profileImage}
                />
                <View>
                    <ThemedText style={searchStyles.usernameText}>{item.username}</ThemedText>
                    {item.eloRating && <ThemedText style={searchStyles.eloText}>Rating: {item.eloRating}</ThemedText>}
                </View>
            </View>
            <AntDesign name="arrow-right" size={16} color={Colors.darkBlue} />
        </TouchableOpacity>
    );

    // Determines if the results list should be visible
    const showResults = results.length > 0 && !hasSelectedUser;

    // Determines if the input is in a 'locked' state (selected user is present and not actively typing)
    const isLocked = selectedUsername && hasSelectedUser;



    return (
        <View style={searchStyles.container}>
            <View style={searchStyles.searchInputWrapper}>
                <AntDesign name="search" size={18} color={Colors.textGrey} style={searchStyles.searchIcon} />
                <TextInput
                    style={searchStyles.searchInput}
                    placeholder="Search username..."
                    placeholderTextColor={Colors.textGrey}
                    value={searchTerm}
                    onChangeText={handleTextChange}
                    // Input is ONLY editable if no user has been explicitly selected (i.e., not 'locked')
                    editable={!isLocked}
                />
            </View>

            {/* Results / Status Container */}
            {(isLoading || showResults) && (
                <View style={searchStyles.resultsContainer}>
                    {isLoading && (
                        <View style={searchStyles.statusBox}>
                            <ActivityIndicator size="small" color={Colors.darkBlue} />
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
                    <AntDesign name="close-circle" size={16} color={Colors.textGrey} />
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
        backgroundColor: Colors.inputBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
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
        color: Colors.darkText,
        height: '100%',
    },
    resultsContainer: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        marginTop: 5,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        maxHeight: 200, // Constrain height
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
        borderBottomColor: Colors.inputBorder,
        borderBottomWidth: 1,
        backgroundColor: Colors.lightBlue,
    },
    usernameText: {
        fontSize: 16,
        color: Colors.darkText,
        fontWeight: '500',
    },
    eloText: {
        fontSize: 14,
        color: Colors.textGrey,
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
        color: Colors.textGrey,
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
        color: Colors.textGrey,
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