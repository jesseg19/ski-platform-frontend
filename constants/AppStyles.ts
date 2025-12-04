import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from './theme';

const { width } = Dimensions.get('window');

// --- Reusable Sizing Constants ---
const SPACING = 15;
const BORDER_RADIUS = 12;
const BUTTON_HEIGHT = 60;
const BUTTON_WIDTH = 120;
const FONT_SIZE_LARGE = 24;
const FONT_SIZE_HUGE = 36;

export const AppStyles = StyleSheet.create({
    // --- Layout/Container Styles ---
    screenPadding: {
        padding: SPACING,
    },
    card: {
        padding: SPACING,
        borderRadius: BORDER_RADIUS,
        marginVertical: SPACING / 2,
    },

    // --- Game-Specific Styles for 1v1.tsx ---
    playerContainerLarge: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        padding: SPACING,
        marginHorizontal: SPACING / 2,
        marginTop: SPACING,
        borderRadius: BORDER_RADIUS,
        borderWidth: 2,
        height: 220,
    },
    playerNameText: {
        fontSize: FONT_SIZE_LARGE,
        fontWeight: 'bold',
        marginBottom: SPACING / 2,
    },
    actionButtonsGroup: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 25,
        width: width * 0.4,
        alignSelf: 'center',
        marginTop: SPACING,
    },

    // Custom button style (since RN Button component is limited in styling)
    actionButtonBase: {
        borderRadius: BORDER_RADIUS / 2,
        height: BUTTON_HEIGHT,
        width: BUTTON_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },

    letterDisplay: {
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: SPACING,
    },


    // --- Text Styles (Can be combined with ThemedText) ---
    titleText: {
        fontSize: FONT_SIZE_HUGE,
        fontWeight: '900',
    },
    subtitleText: {
        fontSize: FONT_SIZE_LARGE,
        fontWeight: '600',
    }
});

// --- Stylesheet for Main Game View ---
export const mainStyles = StyleSheet.create({
    fullScreen: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '120%',
        paddingTop: 50, // To account for safe areas and notches
    },
    scrollViewContent: {
        paddingTop: 50,
        paddingHorizontal: 15,
        paddingBottom: 40,
    },
    statusCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Theme.cardBackground,
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    statusTitle: {
        fontSize: 18,
        color: Theme.darkText,
    },
    callSetButton: {
        backgroundColor: Theme.primary,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,

    },
    callSetButtonText: {
        color: Theme.lightText,
        fontWeight: 'bold',
        fontSize: 14,
    },
    trickDisplayCard: {
        backgroundColor: Theme.lightText,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        alignItems: 'center',
    },
    trickLabel: {
        fontSize: 14,
        color: Theme.darkText,
    },
    trickValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Theme.darkText,
        textAlign: 'center',
        marginTop: 5,
    },
    messageCard: {
        backgroundColor: Theme.lightText,
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    messageText: {
        fontSize: 16,
        textAlign: 'center',
        color: Theme.darkText,
    },
    playerContainer: {
        backgroundColor: Theme.background,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    playerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.border,
    },
    playerNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
    playerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    gameOverCard: {
        backgroundColor: Theme.danger,
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        alignItems: 'center',
    },
    backButtonContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    backButtonText: {
        fontSize: 14,
        color: Theme.darkText,
        textDecorationLine: 'underline',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Theme.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Theme.background,
        borderRadius: 20,
        padding: 25,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.darkText,
        marginBottom: 15,
    },
    modalMessage: {
        fontSize: 16,
        color: Theme.darkText,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },

});

// --- Stylesheet for Letter Display ---
export const letterStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    box: {
        width: 35,
        height: 35,
        marginHorizontal: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    boxBlue: {
        backgroundColor: Theme.primary, // Blue for available
    },
    boxRed: {
        backgroundColor: Theme.danger, // Red for earned
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
    },
});

// --- Stylesheet for Trick Call Modal ---
export const trickModalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        backgroundColor: Theme.overlay,
        justifyContent: 'center',
    },
    scrollViewContent: {
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    modalView: {
        backgroundColor: Theme.background,
        borderRadius: 20,
        padding: 25,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.darkText,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: Theme.lightText,
        marginBottom: 20,
        textAlign: 'center',
    },
    summaryContainer: {
        width: '100%',
        backgroundColor: Theme.lightText,
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    summaryText: {
        fontSize: 14,
        color: Theme.lightText,
        marginBottom: 5,
    },
    currentTrick: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.darkText,
    }
});

// --- Stylesheet for Opponent Search Modal  ---
export const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.overlay,
    },
    modalView: {
        margin: 20,
        backgroundColor: Theme.background,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.darkText,
        marginBottom: 25,
    },
    playerInfo: {
        width: '100%',
        marginBottom: 10,
    },
    playerLabel: {
        fontSize: 14,
        color: Theme.lightText,
        fontWeight: '600',
        marginBottom: 5,
    },
    playerUsername: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.darkText,
        backgroundColor: Theme.lightText,
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    buttonContainer: {
        width: '100%',
        marginTop: 20,
        gap: 10,
    },
    customButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: Theme.primary,

    },
    secondaryButton: {
        backgroundColor: Theme.background,
        borderWidth: 1,
        borderColor: Theme.border,
    },
    primaryButtonText: {
        color: Theme.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButtonText: {
        color: Theme.lightText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    }
});

export const leaderboardStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: Theme.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.background,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        paddingTop: 20,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Theme.lightText,
        borderRadius: 10,
        marginBottom: 15,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabButtonActive: {
        backgroundColor: Theme.darkText,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.darkText,
    },
    tabTextActive: {
        color: Theme.background,
    },
    listContainer: {
        flex: 1,
    },
    flatListContent: {
        paddingBottom: 20,
        gap: 10,
    },
    loadingText: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 16,
        color: Theme.lightText,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.lightText,
        alignItems: 'center',
    },
    rankSection: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoSection: {
        flex: 1,
        paddingLeft: 10,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.darkText,
    },
    eloSection: {
        width: 100,
        alignItems: 'flex-end',
    },
    eloText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});