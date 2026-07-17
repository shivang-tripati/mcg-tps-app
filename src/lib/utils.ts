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
    console.log("baseUrl ", `${baseUrl}/uploads/${path}`)
    return `${baseUrl}/uploads/${path}`;  // might change later and resturn from relative static url from server
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

const getTimeLeftWithDetails = (verification: any) => {
    if (!verification?.timeRemaining) return null;

    const timeLeft = verification.timeRemaining;
    const validFrom = verification.permit?.validFrom;
    const validUntil = verification.permit?.validUntil;

    // Calculate percentage
    let percentage = 100;
    let days = 0;
    let hours = timeLeft.hours || 0;
    let minutes = timeLeft.minutes || 0;
    let text = timeLeft.text || 'Expired';

    if (validFrom && validUntil) {
        const start = new Date(validFrom).getTime();
        const end = new Date(validUntil).getTime();
        const now = Date.now();

        if (now < start) {
            percentage = 100;
        } else if (now > end) {
            percentage = 0;
            text = 'Expired';
        } else {
            const total = end - start;
            const elapsed = now - start;
            const remaining = total - elapsed;
            percentage = Math.round((remaining / total) * 100);

            // Calculate days, hours, minutes
            days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            // Format text
            if (days > 0) {
                text = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                text = `${hours}h ${minutes}m`;
            } else {
                text = `${minutes}m`;
            }
        }
    }

    return {
        text,
        hours,
        minutes,
        days,
        percentage,
    };
};

export const calculateTimeLeft = (validFrom: string | null | undefined, validUntil: string | null | undefined) => {
    if (!validFrom || !validUntil) return null;

    const start = new Date(validFrom).getTime();
    const end = new Date(validUntil).getTime();
    const now = Date.now();

    if (now > end) {
        return {
            text: 'Expired',
            hours: 0,
            minutes: 0,
            days: 0,
            percentage: 0,
        };
    }

    const total = end - start;
    const elapsed = now - start;
    const remaining = total - elapsed;
    const percentage = Math.round((remaining / total) * 100);

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    if (days > 0) {
        text = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        text = `${hours}h ${minutes}m`;
    } else {
        text = `${minutes}m`;
    }

    return {
        text,
        days,
        hours,
        minutes,
        percentage,
    };
};



export function parseDateTimeField(val: string | undefined): Date {
    if (!val) return new Date();
    // Handles format: "2024-01-15T14:30"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
        return new Date(`${val}:00`);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

export function mergeDateAndTime(datePart: Date, timeSource: Date): Date {
    const out = new Date(datePart);
    out.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
    return out;
}

export function formatLocalDateTime(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
