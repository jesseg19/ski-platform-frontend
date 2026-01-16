import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidStyle,
    AndroidVisibility,
    Event,
    EventType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { generateTrickFromBackground, performGameActionInBackground } from './BackgroundLogic';
import { calculateForceLetterPayload, getNextLetterString } from './SharedGameLogic';

// Store current game state for iOS background handling
let currentGameState = {
    gameId: 0,
    p1Name: '',
    p2Name: '',
    p1Letters: '',
    p2Letters: '',
    trick: '',
    whosSet: ''
};

let foregroundServiceActive = false;

export const setupNotificationChannels = async () => {
    await notifee.requestPermission();

    await notifee.createChannel({
        id: 'live-interactive',
        name: 'Live Interactive',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
    });

    await notifee.setNotificationCategories([
        {
            id: 'TRICK_GEN',
            actions: [
                { id: 'GENERATE', title: '🔄 Next Trick', foreground: false },
            ],
        },
        {
            id: 'GAME_1V1',
            actions: [
                { id: 'BTN_P1', title: '+ P1 Letter', foreground: false },
                { id: 'BTN_P2', title: '+ P2 Letter', foreground: false },
                { id: 'DISMISS', title: 'Dismiss', foreground: false },
            ],
        },
        {
            id: 'GAME_OVER',
            actions: [
                { id: 'OPEN_APP', title: 'Open App to Save', foreground: true },
            ],
        },
    ]);
};

export const startLiveNotificationService = async () => {
    try {
        if (Platform.OS === 'android') {
            // Don't start foreground service here - let updateGameNotification handle it
            return;
        }
    } catch (error) {
        console.error('Error starting foreground service:', error);
    }
};

// Store game state for background sync
export const setGameNotificationState = (gameData: {
    gameId: number;
    p1Name: string;
    p2Name: string;
    p1Letters: string;
    p2Letters: string;
    trick: string;
    whosSet: string;
}) => {
    currentGameState = gameData;
};

export const updateGameNotification = async (
    gameId: number,
    p1Name: string,
    p1Letters: string,
    p2Name: string,
    p2Letters: string,
    trick: string,
    whosSet: string,
    isGameOver: boolean = false
) => {
    try {
        // Store state for background handling
        setGameNotificationState({ gameId, p1Name, p2Name, p1Letters, p2Letters, trick, whosSet });

        // Also save to AsyncStorage so it persists across app restarts
        await AsyncStorage.setItem(`gameState_${gameId}`, JSON.stringify({
            gameId,
            p1Name,
            p2Name,
            p1Letters,
            p2Letters,
            trick,
            whosSet,
            isGameOver
        }));

        const notificationData = {
            gameId: gameId.toString(),
            p1Name,
            p2Name,
            whosSet,
            p1Letters,
            p2Letters,
            trick
        };

        if (isGameOver) {
            const winner = p1Letters === 'SKI' ? p2Name : p1Name;

            // Stop foreground service BEFORE displaying game over
            if (Platform.OS === 'android' && foregroundServiceActive) {
                try {
                    await notifee.stopForegroundService();
                    foregroundServiceActive = false;
                } catch (e) {
                    console.log('Foreground service not running');
                }
            }

            await notifee.displayNotification({
                id: 'game-1v1',
                title: '🏆 Game Over!',
                body: `${winner} wins! Open app to save game.`,
                data: notificationData,
                android: {
                    channelId: 'live-interactive',
                    ongoing: false,
                    asForegroundService: false,  // Don't use foreground service for game over
                    onlyAlertOnce: true,
                    color: '#FF9800',
                    category: AndroidCategory.STATUS,
                    smallIcon: 'ic_launcher',
                    style: {
                        type: AndroidStyle.BIGTEXT,
                        text: `Game Over!\n${winner} wins!\n\n${p1Name}: ${p1Letters}\n${p2Name}: ${p2Letters}`,
                    },
                    actions: [
                        { title: 'Open App to Save', pressAction: { id: 'OPEN_APP' } },
                    ],
                },
                ios: {
                    categoryId: 'GAME_OVER',
                    critical: true,
                    sound: 'default',
                },
            });
        } else {
            // Display the game notification with foreground service
            if (Platform.OS === 'android') {
                // Only start foreground service if it's not already active
                if (!foregroundServiceActive) {
                    try {
                        await notifee.displayNotification({
                            id: 'game-1v1',
                            title: `Set: ${trick}`,
                            body: `${p1Name} (${p1Letters}) vs ${p2Name} (${p2Letters})`,
                            data: notificationData,
                            android: {
                                channelId: 'live-interactive',
                                ongoing: true,
                                asForegroundService: true,
                                onlyAlertOnce: true,
                                color: '#FF9800',
                                category: AndroidCategory.STATUS,
                                smallIcon: 'ic_launcher',
                                style: {
                                    type: AndroidStyle.BIGTEXT,
                                    text: `Set: ${trick}\n\n${p1Name}: ${p1Letters}\n${p2Name}: ${p2Letters}`,
                                },
                                actions: [
                                    { title: `+ ${p1Name}`, pressAction: { id: 'BTN_P1' } },
                                    { title: `+ ${p2Name}`, pressAction: { id: 'BTN_P2' } },
                                ],
                            },
                            ios: {
                                categoryId: 'GAME_1V1',
                                critical: true,
                                sound: 'default',
                            },
                        });
                        foregroundServiceActive = true;
                    } catch (error) {
                        console.error('Error starting foreground service:', error);
                        foregroundServiceActive = false;
                        // Fallback: display without foreground service
                        await notifee.displayNotification({
                            id: 'game-1v1',
                            title: `Set: ${trick}`,
                            body: `${p1Name} (${p1Letters}) vs ${p2Name} (${p2Letters})`,
                            data: notificationData,
                            android: {
                                channelId: 'live-interactive',
                                ongoing: false,
                                asForegroundService: false,
                                onlyAlertOnce: true,
                                color: '#FF9800',
                                category: AndroidCategory.STATUS,
                                smallIcon: 'ic_launcher',
                                style: {
                                    type: AndroidStyle.BIGTEXT,
                                    text: `Set: ${trick}\n\n${p1Name}: ${p1Letters}\n${p2Name}: ${p2Letters}`,
                                },
                            },
                        });
                    }
                } else {
                    // Just update the existing notification
                    await notifee.displayNotification({
                        id: 'game-1v1',
                        title: `Set: ${trick}`,
                        body: `${p1Name} (${p1Letters}) vs ${p2Name} (${p2Letters})`,
                        data: notificationData,
                        android: {
                            channelId: 'live-interactive',
                            ongoing: true,
                            asForegroundService: true,
                            onlyAlertOnce: true,
                            color: '#FF9800',
                            category: AndroidCategory.STATUS,
                            smallIcon: 'ic_launcher',
                            style: {
                                type: AndroidStyle.BIGTEXT,
                                text: `Set: ${trick}\n\n${p1Name}: ${p1Letters}\n${p2Name}: ${p2Letters}`,
                            },
                            actions: [
                                { title: `+ ${p1Name}`, pressAction: { id: 'BTN_P1' } },
                                { title: `+ ${p2Name}`, pressAction: { id: 'BTN_P2' } },
                            ],
                        },
                    });
                }
            } else {
                // iOS path
                await notifee.displayNotification({
                    id: 'game-1v1',
                    title: `Set: ${trick}`,
                    body: `${p1Name} (${p1Letters}) vs ${p2Name} (${p2Letters})`,
                    data: notificationData,
                    ios: {
                        categoryId: 'GAME_1V1',
                        critical: true,
                        sound: 'default',
                    },
                });
            }
        }
    } catch (error) {
        console.error('Error updating game notification:', error);
    }
};


export const updateTrickNotification = async (text: string) => {
    await notifee.displayNotification({
        id: 'trick-gen',
        title: '🏂 Trick Generator',
        body: text,
        android: {
            channelId: 'live-interactive',
            ongoing: true,
            asForegroundService: true,
            color: '#2196F3',
            actions: [
                { title: '🔄 Roll Again', pressAction: { id: 'GENERATE' } },
                { title: 'Exit', pressAction: { id: 'STOP' } },
            ],
            onlyAlertOnce: true,
        },
        ios: {
            categoryId: 'TRICK_GEN',
            critical: true,
            sound: 'default'
        },
    });
};

export const stopLiveNotification = async () => {
    try {
        await notifee.cancelNotification('game-1v1');
        await notifee.cancelNotification('trick-gen');
        if (Platform.OS === 'android') {
            try {
                await notifee.stopForegroundService();
                foregroundServiceActive = false;
            } catch (e) {
                console.log('Foreground service not running');
            }
        }
    } catch (err) {
        console.error("Error stopping notification:", err);
    }
};

// Handle background event for iOS and Android
export const handleBackgroundEvent = async ({ type, detail }: Event) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction) {
        const actionId = detail.pressAction.id;

        if (actionId === 'GENERATE') {
            const newTrick = await generateTrickFromBackground();
            await updateTrickNotification(newTrick);
        }

        // Handle game letter actions
        if (actionId === 'BTN_P1' || actionId === 'BTN_P2') {
            try {
                const notification = detail.notification;
                const data = notification?.data || currentGameState;

                const gameId = parseInt(data.gameId as string || currentGameState.gameId.toString());
                const p1Name = data.p1Name as string || currentGameState.p1Name;
                const p2Name = data.p2Name as string || currentGameState.p2Name;
                const trick = data.trick as string || currentGameState.trick;
                const whosSet = data.whosSet as string || currentGameState.whosSet;

                let p1Letters = (data.p1Letters as string) || currentGameState.p1Letters || "";
                let p2Letters = (data.p2Letters as string) || currentGameState.p2Letters || "";

                let isGameOver = false;

                // Calculate new state
                if (actionId === 'BTN_P1') {
                    p1Letters = getNextLetterString(p1Letters);
                    if (p1Letters === 'SKI') isGameOver = true;
                } else {
                    p2Letters = getNextLetterString(p2Letters);
                    if (p2Letters === 'SKI') isGameOver = true;
                }

                // Update stored state
                currentGameState = { gameId, p1Name, p2Name, p1Letters, p2Letters, trick, whosSet };

                // Send to backend FIRST, before updating notification
                const targetUser = actionId === 'BTN_P1' ? p1Name : p2Name;
                const payload = calculateForceLetterPayload(p1Name, p2Name, whosSet, targetUser);
                payload.trickDetails = "Letter added without trick";

                await performGameActionInBackground(gameId, 'resolveRound', payload);

                // NOW update notification with new state
                await updateGameNotification(
                    gameId,
                    p1Name,
                    p1Letters,
                    p2Name,
                    p2Letters,
                    trick,
                    whosSet,
                    isGameOver
                );
            } catch (e) {
                console.error("Notification Action Error:", e);
            }
        } else if (actionId === 'STOP') {
            await stopLiveNotification();
        } else if (actionId === 'DISMISS') {
            await stopLiveNotification();
        } else if (actionId === 'OPEN_APP') {
            // App will open automatically
            console.log('Opening app from game over notification');
        }
    }
};