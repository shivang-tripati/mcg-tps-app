import { create } from 'zustand';
import { storage, AUTH_TOKEN_KEY, USER_KEY, SecureStorage, REFRESH_TOKEN_KEY } from './storage';
import { router } from 'expo-router';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string | null;
}

// lib/auth-store.ts
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isNewRegistration: boolean; // Add this
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
    clearNewRegistration: () => void; // Add this
}

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isNewRegistration: false, // Initialize

    login: async (accessToken, refreshToken, user) => {
        try {
            if (!accessToken || !refreshToken || !user) {
                console.error("❌ Login failed: Missing data");
                return;
            }

            const tokenStr = String(accessToken);
            const refreshStr = String(refreshToken);
            const userStr = JSON.stringify(user);

            await Promise.all([
                SecureStorage.setItem(AUTH_TOKEN_KEY, tokenStr),
                storage.set(USER_KEY, userStr),
                SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshStr)
            ]);

            // Set isNewRegistration to true when logging in from registration
            // We'll detect this from the login call
            set({ 
                user, 
                isAuthenticated: true,
                isNewRegistration: true // Flag for first-time login
            });

        } catch (error) {
            console.error("❌ Error during login storage process:", error);
        }
    },

    // Add this method for regular login (not from registration)
    loginRegular: async (accessToken: string, refreshToken: string, user: User) => {
        // Same as login but sets isNewRegistration: false
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
                isNewRegistration: false // Not a new registration
            });
        } catch (error) {
            console.error("❌ Error during login storage process:", error);
        }
    },

    clearNewRegistration: () => {
        set({ isNewRegistration: false });
    },

    logout: async () => {
        try {
            await api_logout_safe();
        } catch { }

        await SecureStorage.removeItem(AUTH_TOKEN_KEY);
        await storage.delete(USER_KEY);
        await SecureStorage.removeItem(REFRESH_TOKEN_KEY);

        set({ 
            user: null, 
            isAuthenticated: false,
            isNewRegistration: false 
        });
        router.replace('/(auth)/login');
    },

    hydrate: async () => {
        try {
            const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);
            const userStr = await storage.getString(USER_KEY);

            if (token && userStr) {
                const user = JSON.parse(userStr);
                set({ 
                    user, 
                    isAuthenticated: true, 
                    isLoading: false,
                    isNewRegistration: false // Reset on hydration
                });
            } else {
                set({ 
                    user: null, 
                    isAuthenticated: false, 
                    isLoading: false,
                    isNewRegistration: false 
                });
            }
        } catch (e) {
            console.error("Hydration failed:", e);
            set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false,
                isNewRegistration: false 
            });
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

/**
 * Safe logout API call — fire-and-forget.
 * We import api lazily to avoid circular dependency issues.
 */
async function api_logout_safe() {
    try {
        const { api } = require('./api');
        await api.post('/auth/logout');
    } catch { }
}