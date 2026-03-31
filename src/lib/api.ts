import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, SecureStorage, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './storage';
import { Platform } from 'react-native';

// Replace with your actual development machine IP for Android Emulator
// For iOS Simulator, localhost works.

/**
 * IMPORTANT FOR EXPO GO:
 * When using a physical phone, 'localhost' won't work.
 * You must use your computer's actual local IP address.
 * Example: 'http://[IP_ADDRESS]/api/v1'
 */


const IP_ADDRESS = '192.168.0.103';
const PORT = '3000';
const DEV_API_URL = `http://${IP_ADDRESS}:${PORT}/api/v1`;

export const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
    },
});

// Request Interceptor
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getString(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't retried yet
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            (originalRequest as any)._retry = true;

            try {
                const refreshToken = await SecureStorage.getItem(REFRESH_TOKEN_KEY);

                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Call refresh endpoint
                // Note: We use a new axios instance to avoid infinite loops
                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, newRefreshToken } = response.data.data;

                // Update storage
                storage.set(AUTH_TOKEN_KEY, accessToken);
                if (newRefreshToken) {
                    await SecureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                }

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                // Refresh failed - logout user
                storage.delete(AUTH_TOKEN_KEY);
                await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
                // Navigation to login should be handled by the UI listening to storage/auth state
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
