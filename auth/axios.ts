import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// const API_BASE_URL = 'http://192.168.139.1:8080';
const API_BASE_URL = "https://ski-platform-backend.onrender.com";


const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('userToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;