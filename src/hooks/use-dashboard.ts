import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/api';
import { DashboardData } from '../types/dashboard';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await api.get<ApiResponse<DashboardData>>('/dashboard/user-stats');
            return response.data;
        },
    });
}
