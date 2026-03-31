import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Replacement for MMKV (Expo Go compatible)
export const storage = {
    set: (key: string, value: string) => {
        AsyncStorage.setItem(key, value);
    },
    getString: async (key: string) => {
        return await AsyncStorage.getItem(key);
    },
    delete: (key: string) => {
        AsyncStorage.removeItem(key);
    },
    clearAll: () => {
        AsyncStorage.clear();
    }
};

// SecureStorage remains the same (it works in Expo Go!)
export const SecureStorage = {
    async getItem(key: string) {
        return await SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string) {
        await SecureStore.setItemAsync(key, value);
    },
    async removeItem(key: string) {
        await SecureStore.deleteItemAsync(key);
    },
};

export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user_data';