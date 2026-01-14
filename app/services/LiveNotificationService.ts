// services/LiveNotificationService.ts
import { GRAB_LIST, JUMP_BASES } from '@/constants/tricks';
import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidStyle,
    AndroidVisibility,
    Event,
    EventType,
} from '@notifee/react-native';
import { generateTrickFromBackground, performGameActionInBackground } from './BackgroundLogic';
import { calculateForceLetterPayload, getNextLetterString } from './SharedGameLogic';

// --- TRICK GENERATION LOGIC (Simplified for Background) ---
// We replicate the logic here so it can run without React Components
const generateRandomTrick = () => {
    const base = JUMP_BASES[1][Math.floor(Math.random() * JUMP_BASES[1].length)]; // Default to level 2 for quick gen
    const grab = GRAB_LIST[Math.floor(Math.random() * GRAB_LIST.length)];
    return `${base.name} ${grab.name}`;
};

// --- CHANNEL SETUP ---
export const setupNotificationChannels = async () => {
    await notifee.requestPermission();

    // Channel 1: High Priority for Lock Screen Visibility
    await notifee.createChannel({
        id: 'live-interactive',
        name: 'Live Interactive',
        importance: AndroidImportance.HIGH, // Shows on lock screen
        visibility: AndroidVisibility.PUBLIC, // Visible content
        sound: 'default',
    });

    // Define iOS Categories
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
            ],
        },
    ]);
};

// --- DISPLAY: TRICK GENERATOR ---
export const updateTrickNotification = async (text: string) => {
    await notifee.displayNotification({
        id: 'trick-gen',
        title: '🏂 Trick Generator',
        body: text,
        android: {
            channelId: 'live-interactive',
            ongoing: true, // Prevents swipe-away
            asForegroundService: true, // Key for "Live" feel
            color: '#2196F3',
            actions: [
                { title: '🔄 Roll Again', pressAction: { id: 'GENERATE' } },
                { title: 'Exit', pressAction: { id: 'STOP' } },
            ],
            // Crucial: This prevents the phone from vibrating/ringing on every update
            onlyAlertOnce: true,
        },
        ios: {
            categoryId: 'TRICK_GEN',
            critical: true,
            sound: 'default'
        },
    });
};

// --- DISPLAY: GAME ---
export const updateGameNotification = async (
    gameId: number,
    p1Name: string, p1Letters: string,
    p2Name: string, p2Letters: string,
    trick: string,
    whosSet: string
) => {
    await notifee.displayNotification({
        id: 'game-1v1',
        title: `Set: ${trick}`,
        body: `${p1Name} (${p1Letters}) vs ${p2Name} (${p2Letters})`,
        data: { gameId: gameId.toString(), p1Name, p2Name, whosSet, p1Letters, p2Letters, trick },
        android: {
            channelId: 'live-interactive',
            ongoing: true,
            asForegroundService: true,
            onlyAlertOnce: true,
            color: '#FF9800',
            category: AndroidCategory.STATUS,
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
        },
    });
};

export const stopLiveNotification = async () => {
    try {
        // This explicitly tells Android to stop the foreground service 
        // associated with this notification ID
        await notifee.stopForegroundService();
        await notifee.cancelNotification('game-1v1');
        await notifee.cancelAllNotifications();
    } catch (err) {
        console.error("Error stopping notification:", err);
    }
};

// --- BACKGROUND EVENT HANDLER  ---
export const handleBackgroundEvent = async ({ type, detail }: Event) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction) {
        const actionId = detail.pressAction.id;

        //  HANDLE TRICK GEN
        if (actionId === 'GENERATE') {
            // Generate new trick using stored settings
            const newTrick = await generateTrickFromBackground();
            // Update the notification immediately
            await updateTrickNotification(newTrick);
        }

        // HANDLE GAME ACTION
        if (actionId === 'BTN_P1' || actionId === 'BTN_P2') {
            const notification = detail.notification;
            const data = notification?.data;
            if (!data) return;

            // 1. EXTRACT CURRENT STATE ONCE
            const gameId = parseInt(data.gameId as string);
            const p1Name = data.p1Name as string;
            const p2Name = data.p2Name as string;
            const trick = data.trick as string;
            const whosSet = data.whosSet as string;

            // 1. Get current letters from data
            let p1Letters = (data.p1Letters as string) || "";
            let p2Letters = (data.p2Letters as string) || "";

            let isGameOver = false;
            let titleText = `Set: ${trick}`;

            // 2. CALCULATE NEW STATE BEFORE DOING ANYTHING ELSE
            if (actionId === 'BTN_P1') {
                p1Letters = getNextLetterString(p1Letters);
                if (p1Letters === 'SKI') isGameOver = true;
            } else {
                p2Letters = getNextLetterString(p2Letters);
                if (p2Letters === 'SKI') isGameOver = true;
            }

            // 3. DEFINE UI STRINGS BASED ON NEW CALCULATION
            const updatedData = { ...data, p1Letters, p2Letters };
            let updatedBody = `${p1Name} (${p1Letters || '-'}) vs ${p2Name} (${p2Letters || '-'})`;
            let expandedText = `Set: ${trick}\n\n${p1Name}: ${p1Letters || 'No letters'}\n${p2Name}: ${p2Letters || 'No letters'}`;

            if (isGameOver) {
                const winner = p1Letters === 'SKI' ? p2Name : p1Name;
                titleText = `🏆 Game Over!`;
                updatedBody = `${winner} wins the game!`;
                expandedText = `${p1Name}: ${p1Letters}\n${p2Name}: ${p2Letters}\n\nOpen app to save results.`;
            }

            // 4. IMMEDIATE UPDATE (Prevents the startForegroundService crash)
            try {
                await notifee.displayNotification({
                    id: 'game-1v1',
                    title: isGameOver ? titleText : "Updating...",
                    body: updatedBody,
                    data: updatedData,
                    android: {
                        channelId: 'live-interactive',
                        ongoing: !isGameOver, // Let them swipe it away if game is over
                        asForegroundService: !isGameOver, // Stop service if game over
                        onlyAlertOnce: true,
                        color: '#FF9800',
                        style: { type: AndroidStyle.BIGTEXT, text: expandedText },
                        progress: isGameOver ? undefined : { indeterminate: true },
                        // Only show buttons if the game isn't over
                        actions: isGameOver ? [] : [
                            { title: `+ ${p1Name}`, pressAction: { id: 'BTN_P1' } },
                            { title: `+ ${p2Name}`, pressAction: { id: 'BTN_P2' } },
                        ],
                    },
                });

                // If game is over, we don't necessarily need the background API call to block the UI
                // but we should still fire it off.
                const targetUser = actionId === 'BTN_P1' ? p1Name : p2Name;
                const payload = calculateForceLetterPayload(p1Name, p2Name, whosSet, targetUser);
                payload.trickDetails = "Added via Lock Screen";

                await performGameActionInBackground(gameId, 'resolveRound', payload);

                // 5. FINAL SUCCESS STATE (Only if game is still going)
                if (!isGameOver) {
                    await notifee.displayNotification({
                        id: 'game-1v1',
                        title: titleText,
                        body: updatedBody,
                        data: updatedData,
                        android: {
                            channelId: 'live-interactive',
                            ongoing: true,
                            asForegroundService: true,
                            onlyAlertOnce: true,
                            color: '#FF9800',
                            style: { type: AndroidStyle.BIGTEXT, text: expandedText },
                            progress: undefined,
                            actions: [
                                { title: `+ ${p1Name}`, pressAction: { id: 'BTN_P1' } },
                                { title: `+ ${p2Name}`, pressAction: { id: 'BTN_P2' } },
                            ],
                        }
                    });
                } else {
                    // If game is over, stop the foreground service but keep the notification
                    await notifee.stopForegroundService();
                }

            } catch (e) {
                console.error("Notification Sync Error:", e);
            }
        } else if (actionId === 'STOP') {
            await stopLiveNotification();
        }
    }
};