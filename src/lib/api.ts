import axios, {
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';

import {
    SecureStorage,
    AUTH_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
} from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOAD_PATH =
    process.env.EXPO_PUBLIC_UPLOAD_PATH ?? '/upload';

if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
}

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
    },
    timeout: 30000,
});

/**
 * Separate Axios instance for refreshing the token.
 *
 * This instance intentionally has no authentication interceptors,
 * preventing an infinite refresh loop.
 */
const refreshApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
    },
    timeout: 30000,
});

export const UPLOAD_FILE_PATH = UPLOAD_PATH;

interface RetryableRequestConfig
    extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface RefreshTokenPayload {
    accessToken?: string;
    refreshToken?: string;
    newRefreshToken?: string;
}

interface RefreshResponse {
    data?: RefreshTokenPayload;
    accessToken?: string;
    refreshToken?: string;
    newRefreshToken?: string;
}

interface QueueItem {
    resolve: (token: string) => void;
    reject: (reason?: unknown) => void;
}

type SessionInvalidHandler = () => void | Promise<void>;

type SessionInvalidError = Error & {
    isSessionInvalid?: boolean;
};

type NetworkAwareError = AxiosError & {
    isNetworkError?: boolean;
};

/*
|--------------------------------------------------------------------------
| Session invalidation
|--------------------------------------------------------------------------
*/

let onSessionInvalid: SessionInvalidHandler | null = null;
let isInvalidatingSession = false;

/**
 * Register this once from the root layout/auth provider.
 *
 * The handler should:
 * - reset the auth store
 * - reset onboarding state
 * - clear query cache
 * - navigate to the login screen
 */
export function registerSessionInvalidHandler(
    handler: SessionInvalidHandler
): () => void {
    onSessionInvalid = handler;

    return () => {
        if (onSessionInvalid === handler) {
            onSessionInvalid = null;
        }
    };
}

function createSessionInvalidError(
    message: string
): SessionInvalidError {
    const error = new Error(message) as SessionInvalidError;
    error.isSessionInvalid = true;

    return error;
}

async function invalidateSession(): Promise<void> {
    if (isInvalidatingSession) {
        return;
    }

    isInvalidatingSession = true;

    try {
        await Promise.all([
            SecureStorage.removeItem(AUTH_TOKEN_KEY),
            SecureStorage.removeItem(REFRESH_TOKEN_KEY),
        ]);

        delete api.defaults.headers.common.Authorization;

        if (onSessionInvalid) {
            try {
                await onSessionInvalid();
            } catch (handlerError) {
                console.error(
                    'Session invalid handler failed:',
                    handlerError
                );
            }
        }
    } catch (error) {
        console.error('Failed to invalidate session:', error);
    } finally {
        isInvalidatingSession = false;
    }
}

/*
|--------------------------------------------------------------------------
| Refresh queue
|--------------------------------------------------------------------------
*/

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(
    error: unknown,
    token?: string
): void {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
            return;
        }

        if (!token) {
            reject(
                createSessionInvalidError(
                    'Token refresh completed without an access token'
                )
            );
            return;
        }

        resolve(token);
    });

    failedQueue = [];
}

/*
|--------------------------------------------------------------------------
| Utility functions
|--------------------------------------------------------------------------
*/

function shouldSkipRefresh(url?: string): boolean {
    if (!url) {
        return false;
    }

    return (
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout')
    );
}

function isRefreshTokenRejected(status?: number): boolean {
    return status === 401 || status === 403;
}

export function isNetworkError(
    error: unknown
): boolean {
    const currentError = error as {
        isNetworkError?: boolean;
        message?: string;
        code?: string;
        response?: unknown;
    };

    return Boolean(
        currentError?.isNetworkError ||
            currentError?.message === 'Network Error' ||
            currentError?.code === 'ECONNABORTED' ||
            currentError?.code === 'ETIMEDOUT' ||
            !currentError?.response
    );
}

function normalizeNetworkError(
    error: AxiosError
): NetworkAwareError {
    const networkError = error as NetworkAwareError;

    networkError.isNetworkError = true;

    if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
    ) {
        networkError.message =
            'The request timed out. Please check your internet connection and try again.';
    } else {
        networkError.message =
            'Network connection error. Please check your internet connection.';
    }

    return networkError;
}

/*
|--------------------------------------------------------------------------
| Request interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
    async (
        config: InternalAxiosRequestConfig
    ): Promise<InternalAxiosRequestConfig> => {
        try {
            const accessToken =
                await SecureStorage.getItem(AUTH_TOKEN_KEY);

            if (accessToken) {
                config.headers.Authorization =
                    `Bearer ${accessToken}`;
            } else {
                delete config.headers.Authorization;
            }

            /*
             * Let Axios set the multipart boundary automatically
             * when uploading FormData.
             */
            if (
                typeof FormData !== 'undefined' &&
                config.data instanceof FormData
            ) {
                delete config.headers['Content-Type'];
            }

            return config;
        } catch (error) {
            console.error(
                'Request interceptor error:',
                error
            );

            return config;
        }
    },
    error => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Response interceptor
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
    response => response,

    async (error: AxiosError) => {
        /*
         * Network failures have no usable HTTP response.
         *
         * Do not remove tokens for network failures.
         */
        if (isNetworkError(error)) {
            return Promise.reject(
                normalizeNetworkError(error)
            );
        }

        const originalRequest = error.config as
            | RetryableRequestConfig
            | undefined;

        const status = error.response?.status;

        if (
            status !== 401 ||
            !originalRequest ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        /*
         * Never try refreshing when an auth endpoint itself
         * returns 401.
         */
        if (shouldSkipRefresh(originalRequest.url)) {
            return Promise.reject(error);
        }

        /*
         * While another request is refreshing, queue this request.
         * It will be retried with the new access token.
         */
        if (isRefreshing) {
            originalRequest._retry = true;

            return new Promise<string>((resolve, reject) => {
                failedQueue.push({
                    resolve,
                    reject,
                });
            }).then(accessToken => {
                originalRequest.headers.Authorization =
                    `Bearer ${accessToken}`;

                return api(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            console.log('Attempting token refresh...');

            const refreshToken =
                await SecureStorage.getItem(
                    REFRESH_TOKEN_KEY
                );

            if (!refreshToken) {
                const missingTokenError =
                    createSessionInvalidError(
                        'Refresh token is missing'
                    );

                processQueue(missingTokenError);
                await invalidateSession();

                return Promise.reject(missingTokenError);
            }

            const response =
                await refreshApi.post<RefreshResponse>(
                    '/auth/refresh',
                    {
                        refreshToken,
                    }
                );

            /*
             * Supports both:
             *
             * {
             *   data: {
             *     accessToken,
             *     refreshToken
             *   }
             * }
             *
             * and:
             *
             * {
             *   accessToken,
             *   refreshToken
             * }
             */
            const tokenData: RefreshTokenPayload =
                response.data?.data ?? response.data;

            const accessToken =
                tokenData?.accessToken;

            const nextRefreshToken =
                tokenData?.refreshToken ??
                tokenData?.newRefreshToken ??
                refreshToken;

            if (!accessToken) {
                throw createSessionInvalidError(
                    'Refresh response did not contain an access token'
                );
            }

            await SecureStorage.setItem(
                AUTH_TOKEN_KEY,
                accessToken
            );

            if (nextRefreshToken) {
                await SecureStorage.setItem(
                    REFRESH_TOKEN_KEY,
                    nextRefreshToken
                );
            }

            api.defaults.headers.common.Authorization =
                `Bearer ${accessToken}`;

            originalRequest.headers.Authorization =
                `Bearer ${accessToken}`;

            processQueue(null, accessToken);

            return api(originalRequest);
        } catch (refreshError: unknown) {
            let finalError = refreshError;

            const axiosRefreshError =
                axios.isAxiosError(refreshError)
                    ? refreshError
                    : null;

            const refreshStatus =
                axiosRefreshError?.response?.status;

            const sessionInvalidError =
                refreshError as SessionInvalidError;

            const shouldLogout =
                isRefreshTokenRejected(refreshStatus) ||
                sessionInvalidError?.isSessionInvalid === true;

            /*
             * Preserve tokens when:
             * - internet is unavailable
             * - the request times out
             * - backend is temporarily unavailable
             * - backend returns 5xx
             */
            if (
                axiosRefreshError &&
                isNetworkError(axiosRefreshError)
            ) {
                finalError =
                    normalizeNetworkError(
                        axiosRefreshError
                    );
            }

            console.error(
                'Token refresh failed:',
                finalError
            );

            processQueue(finalError);

            /*
             * Only invalidate the session when the refresh
             * token is missing, rejected, expired, revoked,
             * or the refresh response is unusable.
             */
            if (shouldLogout) {
                await invalidateSession();
            }

            return Promise.reject(finalError);
        } finally {
            isRefreshing = false;
        }
    },
);

/*
|--------------------------------------------------------------------------
| Error message helper
|--------------------------------------------------------------------------
*/

export function getErrorMessage(
    error: unknown
): string {
    if (isNetworkError(error)) {
        return 'Network connection error. Please check your internet connection and try again.';
    }

    const currentError = error as {
        response?: {
            data?: {
                error?: {
                    message?: string;
                };
                message?: string;
            };
        };
        message?: string;
    };

    if (
        currentError?.response?.data?.error?.message
    ) {
        return currentError.response.data.error.message;
    }

    if (currentError?.response?.data?.message) {
        return currentError.response.data.message;
    }

    if (currentError?.message) {
        return currentError.message;
    }

    return 'An unexpected error occurred. Please try again.';
}