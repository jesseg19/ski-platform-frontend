import React, { createContext, useContext, useMemo, useState } from 'react';

// Define the shape of the context data
interface GameContextType {
    // A unique key that forces a component refresh when it changes
    gameKey: number;
    // Function to increment the key, resetting the game state
    resetGameKey: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Custom hooks
export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

// Provider component
export function GameProvider({ children }: { children: React.ReactNode }) {
    //  a simple counter/timestamp as the key
    const [gameKey, setGameKey] = useState(Date.now());

    // Function to update the key, triggering the reset
    const resetGameKey = () => {
        setGameKey(Date.now());
    };

    const value = useMemo(() => ({ gameKey, resetGameKey }), [gameKey]);

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}