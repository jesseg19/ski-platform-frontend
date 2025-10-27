import React from 'react';
import { Button, StyleSheet } from 'react-native';


import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';



export default function SettingsScreen() {
    const { signOut } = useAuth();

    return (
        <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText>Settings Screen</ThemedText>
            <Button onPress={() => router.back()} title="Go Back" />
            <Button onPress={() => signOut()} title="Sign out" />
        </ThemedView>

    );

}

const styles = StyleSheet.create({

});
