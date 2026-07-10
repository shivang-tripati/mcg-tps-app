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

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (accessToken, refreshToken, user) => {
        try {
            // 1. Validate inputs before touching storage
            if (!accessToken || !refreshToken || !user) {
                console.error("❌ Login failed: Missing data", {
                    hasToken: !!accessToken,
                    hasRefresh: !!refreshToken,
                    hasUser: !!user
                });
                return; // Exit early to avoid the crashes you saw
            }

            // 2. Ensure everything is a string
            const tokenStr = String(accessToken);
            const refreshStr = String(refreshToken);
            const userStr = JSON.stringify(user);

            // 3. Execute storage saves
            await Promise.all([
                SecureStorage.setItem(AUTH_TOKEN_KEY, tokenStr),
                storage.set(USER_KEY, userStr),
                SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshStr)
            ]);

            set({ user, isAuthenticated: true });

            // Navigation is now handled by the root layout's onboarding-aware logic
            // The layout will detect isAuthenticated=true and route accordingly
        } catch (error) {
            console.error("❌ Error during login storage process:", error);
        }
    },

    logout: async () => {
        try {
            // Try to call the logout API (ignore errors)
            await api_logout_safe();
        } catch { }

        await SecureStorage.removeItem(AUTH_TOKEN_KEY);
        await storage.delete(USER_KEY);
        await SecureStorage.removeItem(REFRESH_TOKEN_KEY);

        set({ user: null, isAuthenticated: false });
        router.replace('/(auth)/login');
    },

    hydrate: async () => {
        try {
            // MUST await these because we moved from MMKV to AsyncStorage
            const token = await SecureStorage.getItem(AUTH_TOKEN_KEY);
            const userStr = await storage.getString(USER_KEY);

            if (token && userStr) {
                const user = JSON.parse(userStr);
                set({ user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch (e) {
            console.error("Hydration failed:", e);
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    updateUser: (partial) => {
        const current = get().user;
        if (current) {
            const updated = { ...current, ...partial };
            set({ user: updated });
            // Persist to storage
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