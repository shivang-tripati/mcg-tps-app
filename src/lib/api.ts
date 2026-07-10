import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, SecureStorage, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOAD_PATH = process.env.EXPO_PUBLIC_UPLOAD_PATH ?? '/upload';

if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
    },
    timeout: 15000,
});

export const UPLOAD_FILE_PATH = UPLOAD_PATH;

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: any) => void }[] = [];

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

        // Network errors - pass through
        if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
            return Promise.reject(error);
        }

        // Handle 401 for non-auth endpoints only
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            // Skip refresh for login/register endpoints
            if (originalRequest.url?.includes('/auth/login') || 
                originalRequest.url?.includes('/auth/register')) {
                return Promise.reject(error);
            }

            const refreshToken = await SecureStorage.getItem(REFRESH_TOKEN_KEY);
            
            if (!refreshToken) {
                await SecureStorage.removeItem(AUTH_TOKEN_KEY);
                await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = 'Bearer ' + token;
                        return api(originalRequest);
                    })
                    .catch(err => Promise.reject(err));
            }

            (originalRequest as any)._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, newRefreshToken } = response.data.data;

                await SecureStorage.setItem(AUTH_TOKEN_KEY, accessToken);
                if (newRefreshToken) {
                    await SecureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                }

                originalRequest.headers.Authorization = 'Bearer ' + accessToken;
                api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;

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