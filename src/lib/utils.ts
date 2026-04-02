import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";




const IP_ADDRESS = '192.168.0.103';
const PORT = '3000';

// Add this at the top for Shadcn/NativeWind compatibility
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Generate permit number with format: PT-YYYYMMDD-XXXXX
 */
export function generatePermitNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PT-${dateStr}-${random}`;
}

/**
 * Format date for display (India Locale)
 */
export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Calculate time remaining
 */
export function getTimeRemaining(futureDate: Date | string): {
    expired: boolean;
    hours: number;
    minutes: number;
    text: string;
} {
    const now = new Date().getTime();
    const target = new Date(futureDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
        return { expired: true, hours: 0, minutes: 0, text: 'Expired' };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        text = `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
        text = `${hours}h ${minutes}m remaining`;
    } else {
        text = `${minutes}m remaining`;
    }

    return { expired: false, hours, minutes, text };
}

export const getEvidenceUrl = (path: string) => {
    // Note: Use EXPO_PUBLIC prefix for Expo env variables
    const baseUrl = process.env.EXPO_PUBLIC_FILE_BASE_URL || `http://${IP_ADDRESS}:${PORT}`;
    return `${baseUrl}/${path}`;
};

/**
 * Use for `Image` `uri` when the API may return either a storage key (e.g. `evidence/2026/04/uuid.jpg`)
 * or an absolute URL (e.g. CDN / presigned).
 */
export function resolveEvidenceFileUrl(pathOrUrl: string | null | undefined): string {
    if (pathOrUrl == null) return '';
    const s = pathOrUrl.trim();
    if (s === '') return '';
    if (/^(https?:|file:|data:|blob:)/i.test(s)) return s;
    const rel = s.replace(/^\/+/, '');
    return getEvidenceUrl(rel);
}