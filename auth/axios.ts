import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// const API_BASE_URL = 'http://192.168.139.1:5000';
const API_BASE_URL = "https://laps.api.jessegross.ca";
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/signup'];

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let tokenRefreshCallback: (() => void) | null = null;

export const setTokenRefreshCallback = (callback: () => void) => {
    tokenRefreshCallback = callback;
};

// Callback to handle sign out from interceptor
let signOutCallback: (() => void) | null = null;

export const setSignOutCallback = (callback: () => void) => {
    signOutCallback = callback;
};


// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        const accessToken = await SecureStore.getItemAsync('userAccessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue: { resolve: (value: any) => void, reject: (reason?: any) => void, originalRequest: any }[] = [];

const processQueue = (error: any | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(api(prom.originalRequest));
        }
    });
    failedQueue = [];
};
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = originalRequest.url || '';

        if (AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
            return Promise.reject(error);
        }

        // Condition for refreshing: 403 and not a retry
        if (status === 403 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, originalRequest });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
                if (!refreshToken) {
                    if (signOutCallback) signOutCallback();
                    throw new Error("No refresh token available.");
                }

                const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, { refreshToken });
                const newAccessToken = refreshResponse.data.accessToken;

                await SecureStore.setItemAsync('userAccessToken', newAccessToken);

                if (tokenRefreshCallback) {
                    tokenRefreshCallback();
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError);
                if (signOutCallback) signOutCallback();
                return Promise.reject(new Error("Session expired. Please log in again."));

            } finally {
                isRefreshing = false;
            }
        }

        if (status === 401 && signOutCallback) {
            signOutCallback();
            return Promise.reject(new Error("Authentication required. Signed out."));
        }

        return Promise.reject(error);
    }
);

export default api;