// lib/auth-store.ts - FIXED

import { create } from 'zustand';
import { storage, AUTH_TOKEN_KEY, USER_KEY, SecureStorage, REFRESH_TOKEN_KEY } from './storage';
import { router, usePathname } from 'expo-router';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string | null;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isNewRegistration: boolean;
    tokenValid: boolean | null;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    loginRegular: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
    clearNewRegistration: () => void;
    validateToken: () => Promise<boolean>;
    setTokenValid: (valid: boolean) => void;
    setLogoutInProgress: (inProgress: boolean) => void;
}

// ✅ Track logout state globally to prevent multiple redirects
let logoutInProgress = false;

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isNewRegistration: false,
    tokenValid: null,

    login: async (accessToken, refreshToken, user) => {
        try {
            if (!accessToken || !refreshToken || !user) {
                console.error("❌ Login failed: Missing data");
                return;
            }

            await Promise.all([
                SecureStorage.setItem(AUTH_TOKEN_KEY, String(accessToken)),
                storage.set(USER_KEY, JSON.stringify(user)),
                SecureStorage.setItem(REFRESH_TOKEN_KEY, String(refreshToken))
            ]);

            set({
                user,
                isAuthenticated: true,
                isNewRegistration: true,
                tokenValid: true
            });

        } catch (error) {
            console.error("❌ Error during login storage process:", error);
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isNewRegistration: false,
                tokenValid: false,
            });
        }
    },

    loginRegular: async (accessToken, refreshToken, user) => {
        try {
            if (!accessToken || !refreshToken || !user) return;

            await Promise.all([
                SecureStorage.setItem(AUTH_TOKEN_KEY, String(accessToken)),
                storage.set(USER_KEY, JSON.stringify(user)),
                SecureStorage.setItem(REFRESH_TOKEN_KEY, String(refreshToken))
            ]);

            set({
                user,
                isAuthenticated: true,
                isNewRegistration: false,
                tokenValid: true
            });
        } catch (error) {
            console.error("❌ Error during login storage process:", error);
        }
    },

    clearNewRegistration: () => {
        set({ isNewRegistration: false });
    },

    setTokenValid: (valid: boolean) => {
        set({ tokenValid: valid });
    },

    setLogoutInProgress: (inProgress: boolean) => {
        logoutInProgress = inProgress;
    },

    logout: async () => {
        // ✅ Prevent multiple logout calls
        if (logoutInProgress) {
            return;
        }

        logoutInProgress = true;

        try {
            // Clear storage
            await SecureStorage.removeItem(AUTH_TOKEN_KEY);
            await storage.delete(USER_KEY);
            await SecureStorage.removeItem(REFRESH_TOKEN_KEY);

            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isNewRegistration: false,
                tokenValid: false,
            });
        } catch (error) {
            console.error("❌ Error during logout process:", error);
            set({
                user: null,
                isAuthenticated: false,
                isNewRegistration: false,
                tokenValid: false
            });
        }

        // ✅ Use a timeout to prevent navigation issues
        setTimeout(() => {
            try {
                router.replace('/(auth)/login');
            } catch (error) {
                console.error("❌ Error during logout navigation:", error);
            } finally {
                logoutInProgress = false;
            }
        }, 100);
    },

    hydrate: async () => {
        console.log('💧 Hydrating auth state...');
        try {
            const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);
            const userStr = await storage.getString(USER_KEY);

            if (token && userStr) {
                const user = JSON.parse(userStr);
                console.log('✅ Found stored auth data for user:', user.email);
                set({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                    isNewRegistration: false,
                    tokenValid: null
                });
            } else {
                console.log('ℹ️ No stored auth data found');
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isNewRegistration: false,
                    tokenValid: false
                });
            }
        } catch (e) {
            console.error("❌ Hydration failed:", e);
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isNewRegistration: false,
                tokenValid: false
            });
        }
    },

    validateToken: async () => {
        console.log('🔍 Validating token...');

        if (!get().isAuthenticated) {
            set({ tokenValid: false });
            return false;
        }

        try {
            const token =
                await SecureStorage.getItem(AUTH_TOKEN_KEY);

            if (!token) {
                console.log('❌ No access token found');

                set({
                    tokenValid: false,
                    isAuthenticated: false,
                    user: null,
                });

                return false;
            }

            const {
                api,
            } = require('./api');

            const response = await api.get('/auth/me', {
                timeout: 10000,
            });

            if (response.status >= 200 && response.status < 300) {
                console.log('✅ Token/session is valid');

                set({ tokenValid: true });
                return true;
            }

            set({ tokenValid: false });
            return false;
        } catch (error: any) {
            const {
                isNetworkError,
            } = require('./api');

            /*
             * Do not invalidate or remove the stored session when
             * the backend cannot be reached.
             */
            if (isNetworkError(error)) {
                console.log(
                    '🌐 Could not validate session because the server is unreachable'
                );

                set({
                    tokenValid: null,
                });

                return false;
            }

            const status = error?.response?.status;

            if (status === 401 || status === 403) {
                console.log(
                    '🔴 Session is invalid or expired'
                );

                /*
                 * The API interceptor normally handles invalid
                 * refresh tokens and invokes the logout handler.
                 *
                 * Keep the in-memory status invalid here.
                 */
                set({
                    tokenValid: false,
                });

                return false;
            }

            /*
             * A backend 500/502/503 should not log the user out.
             */
            console.error(
                'Token validation server error:',
                error
            );

            set({
                tokenValid: null,
            });

            return false;
        }
    },

    updateUser: (partial) => {
        const current = get().user;
        if (current) {
            const updated = { ...current, ...partial };
            set({ user: updated });
            storage.set(USER_KEY, JSON.stringify(updated));
        }
    },
}));