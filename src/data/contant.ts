
export const PAYMENT_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',  // Amber 500
  PAID: '#16a34a',     // Green 600 (Using COMPLETED color for paid)
  FAILED: '#ef4444',   // Red 500 (Using REJECTED color)
  REFUNDED: '#94a3b8', // Slate 400 (Using CANCELLED/DRAFT color)
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',        // Slate 400
  SUBMITTED: '#f59e0b',    // Amber 500
  UNDER_REVIEW: '#f59e0b', // Amber 500
  PENDING: '#f59e0b',      // Amber 500
  APPROVED: '#22c55e',     // Green 500
  IN_TRANSIT: '#3b82f6',   // Blue 500
  COMPLETED: '#16a34a',    // Green 600
  EXPIRED: '#ef4444',      // Red 500
  REJECTED: '#ef4444',     // Red 500
  CANCELLED: '#94a3b8',    // Slate 400
}; 

export const PRIMARY = '#772d59'; // Hex equivalent of hsl(325 45% 32%)
export const MUTED = '#6b7280';   // Hex equivalent of hsl(220 9% 46%)
export const BORDER = '#e5e7eb';  // Hex equivalent of hsl(220 13% 91%)
export const CARD = '#ffffff';
export const BG = '#f9f9f9';      // Hex equivalent of hsl(0 0% 98%)
export const TEXT = '#030712';    // Hex equivalent of hsl(224 71% 4%)
