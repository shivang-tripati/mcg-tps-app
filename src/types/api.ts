export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
