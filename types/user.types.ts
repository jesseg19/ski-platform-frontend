export interface User {
    username: string;
    id: number;
}

export interface AuthContextType {
    signIn: (accessToken: string, refreshToken: string, userData: User) => void;
    signOut: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    tokenRefreshed: number;
    updateToken: (newAccessToken: string) => void;
    updateUsername: (newUsername: string) => void;
}