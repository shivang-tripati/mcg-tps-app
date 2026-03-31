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
}

export const useAuth = create<AuthState>((set) => ({
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
                storage.set(AUTH_TOKEN_KEY, tokenStr),
                storage.set(USER_KEY, userStr),
                SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshStr)
            ]);

            set({ user, isAuthenticated: true });
            router.replace('/(tabs)/dashboard');
        } catch (error) {
            console.error("❌ Error during login storage process:", error);
        }
    },

    logout: async () => {
        await storage.delete(AUTH_TOKEN_KEY);
        await storage.delete(USER_KEY);
        await SecureStorage.removeItem(REFRESH_TOKEN_KEY);

        set({ user: null, isAuthenticated: false });
        router.replace('/(auth)/login');
    },

    hydrate: async () => {
        try {
            // MUST await these because we moved from MMKV to AsyncStorage
            const token = await storage.getString(AUTH_TOKEN_KEY);
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
}));