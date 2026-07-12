// lib/api.ts - IMPROVED VERSION

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SecureStorage, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './storage';

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
    timeout: 20000, // Reduced from 15000 to 20000
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

// ✅ Request interceptor with better error handling
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        } catch (error) {
            console.error('Request interceptor error:', error);
            return config;
        }
    },
    (error) => Promise.reject(error)
);

// ✅ Response interceptor with better error handling
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;
        
        // ✅ Network errors - handle gracefully
        if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
            console.log('Network error detected:', error.message);
            // Don't reject immediately - let the calling code handle it
            return Promise.reject({
                ...error,
                isNetworkError: true,
                message: 'Network connection error. Please check your internet connection.'
            });
        }

        // ✅ If no response, it's likely a network issue
        if (!error.response) {
            console.log('No response from server - network issue');
            return Promise.reject({
                ...error,
                isNetworkError: true,
                message: 'Cannot connect to server. Please check your connection.'
            });
        }

        // ✅ Handle 401 for non-auth endpoints only
        if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
            // ✅ Skip refresh for login/register endpoints
            if (originalRequest.url?.includes('/auth/login') || 
                originalRequest.url?.includes('/auth/register')) {
                return Promise.reject(error);
            }

            // ✅ Skip refresh for onboarding endpoints - let the app handle it
            if (originalRequest.url?.includes('/projects') || 
                originalRequest.url?.includes('/profile')) {
                console.log('Skipping token refresh for onboarding endpoint:', originalRequest.url);
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
                        if (originalRequest) {
                            originalRequest.headers.Authorization = 'Bearer ' + token;
                            return api(originalRequest);
                        }
                        return Promise.reject(error);
                    })
                    .catch(err => Promise.reject(err));
            }

            (originalRequest as any)._retry = true;
            isRefreshing = true;

            try {
                console.log('Attempting token refresh...');
                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
                    refreshToken,
                }, {
                    timeout: 3000, // Reduced to 3 seconds
                });

                const { accessToken, newRefreshToken } = response.data.data;

                await SecureStorage.setItem(AUTH_TOKEN_KEY, accessToken);
                if (newRefreshToken) {
                    await SecureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                }

                if (originalRequest) {
                    originalRequest.headers.Authorization = 'Bearer ' + accessToken;
                    api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                }

                processQueue(null, accessToken);

                return originalRequest ? api(originalRequest) : Promise.reject(error);
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
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

// ✅ Helper function to check if error is network-related
export const isNetworkError = (error: any): boolean => {
    return error?.isNetworkError || 
           error?.message === 'Network Error' || 
           error?.code === 'ECONNABORTED' ||
           !error?.response;
};

// ✅ Helper function to get user-friendly error message
export const getErrorMessage = (error: any): string => {
    if (isNetworkError(error)) {
        return 'Network connection error. Please check your internet connection and try again.';
    }
    
    if (error?.response?.data?.error?.message) {
        return error.response.data.error.message;
    }
    
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }
    
    if (error?.message) {
        return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
};