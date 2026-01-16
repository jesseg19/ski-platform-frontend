export const GAME_LETTERS = ['S', 'K', 'I'];
export const MAX_LETTERS = GAME_LETTERS.length;

export const isLastTry = (currentLetters: number): boolean =>
    currentLetters === MAX_LETTERS - 1;

export const formatLetters = (count: number): string => {
    return GAME_LETTERS.slice(0, count).join('.') || 'No letters';
};

export const didPlayerTravelSufficientDistance = (totalDistance: number): boolean => {
    return totalDistance >= 75;
};

export const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance > 1.5 ? distance : 0;
};