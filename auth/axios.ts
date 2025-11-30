import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

// const API_BASE_URL = 'http://192.168.139.1:8080';
// const API_BASE_URL = "http://Laps-api-env.eba-7fvwzsz2.us-east-2.elasticbeanstalk.com";
const API_BASE_URL = "https://laps.api.jessegross.ca";



const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

        // Condition for refreshing: 403 and not a retry
        if (status === 403 && !originalRequest._retry) {

            if (isRefreshing) {
                // If refreshing, queue the request and return a promise
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, originalRequest });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true; // Start the lock

            try {
                const refreshToken = await SecureStore.getItemAsync('userRefreshToken');
                if (!refreshToken) {
                    useAuth().signOut();
                    throw new Error("No refresh token available.");
                }

                const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, { refreshToken });
                const newAccessToken = refreshResponse.data.accessToken;

                await SecureStore.setItemAsync('userAccessToken', newAccessToken);
                //  Update default header for future requests
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                // Update original request header
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Process the queue with the new token
                processQueue(null, newAccessToken);

                // Resend the original request
                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError);
                useAuth().signOut();
                return Promise.reject(refreshError);

            } finally {
                isRefreshing = false; // Release the lock
            }
        }
        return Promise.reject(error);
    }
);

export default api;