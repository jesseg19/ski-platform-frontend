// services/NotificationService.ts

import api from '@/auth/axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Get Token and Request Permissions
export async function registerForPushNotificationsAsync() {
    let token;

    if (Device.isDevice) {
        // Request Permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification! You will not receive challenge notifications.');
            return;
        }

        // Get the token
        try {
            const pushToken = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
            });
            token = pushToken.data;
            console.log("Expo Push Token:", token);
        } catch (e) {
            console.error("Error getting Expo Push Token:", e);
            return;
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}

// 2. Send Token to Backend
export async function sendPushTokenToBackend(token: string | undefined) {
    if (!token) return;

    try {
        // Assume you have an endpoint to save the push token associated with the current user
        await api.post('/api/profiles/save-push-token', {
            token: token,
            platform: Platform.OS, // Helpful for backend segmentation
        });
        console.log('Push token successfully sent to backend.');
    } catch (error) {
        console.error('Failed to send push token to backend:', error);
    }
}