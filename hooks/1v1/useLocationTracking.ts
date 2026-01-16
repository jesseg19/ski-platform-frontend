import { GameStatus } from '@/types/game.types';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    // Filter out GPS jitter: ignore movements less than 1.5 meters
    return distance > 1.5 ? distance : 0;
};

export const useLocationTracking = (gameStatus: GameStatus) => {
    const [totalDistance, setTotalDistance] = useState(0);
    const lastLocation = useRef<Location.LocationObjectCoords | null>(null);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Location access is required to verify game movement.");
                return;
            }

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 5, // Updates every 5 meters moved
                },
                (location) => {
                    if (lastLocation.current) {
                        const dist = calculateDistance(
                            lastLocation.current.latitude,
                            lastLocation.current.longitude,
                            location.coords.latitude,
                            location.coords.longitude
                        );
                        setTotalDistance(prev => prev + dist);
                    }
                    lastLocation.current = location.coords;
                }
            );
        };

        if (gameStatus === 'playing') {
            startTracking();
        }

        return () => {
            if (subscription) subscription.remove();
        };
    }, [gameStatus]);

    return { totalDistance };
};