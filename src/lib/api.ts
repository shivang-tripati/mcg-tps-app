import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, SecureStorage, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './storage';

// Dev fallback — only used in development builds
const DEV_API_URL = __DEV__ ? 'http://192.168.1.14:3000/api/v1' : process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
    },
    timeout: 15000, // 15 seconds timeout
});

export const UPLOAD_FILE_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH ?? '/upload';

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void, reject: (reason?: any) => void }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle Offline / Network Error
        if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
            return Promise.reject(new Error('Network error. Please check your connection and try again.'));
        }

        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            (originalRequest as any)._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await SecureStorage.getItem(REFRESH_TOKEN_KEY);

                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, newRefreshToken } = response.data.data;

                await SecureStorage.setItem(AUTH_TOKEN_KEY, accessToken);
                if (newRefreshToken) {
                    await SecureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                }

                api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                originalRequest.headers.Authorization = 'Bearer ' + accessToken;

                processQueue(null, accessToken);

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                await SecureStorage.removeItem(AUTH_TOKEN_KEY);
                await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
