import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/api';

// Types matching the web app Prisma schema
interface Permit {
    id: string;
    permitNumber: string;
    status: string;
    wasteType: string;
    estimatedWeight?: number | null;
    vehicleNumber?: string | null;
    driverName?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    createdAt: string;
    plant?: {
        id: string;
        name: string;
        code: string;
        city: string;
    };
    project?: {
        id: string;
        name: string;
        address: string;
        city: string;
    } | null;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

interface PermitsResponse {
    data: Permit[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface UsePermitsParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export function usePermits(params: UsePermitsParams = {}) {
    return useQuery({
        queryKey: ['permits', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.status) searchParams.set('status', params.status);
            if (params.search) searchParams.set('search', params.search);

            const response = await api.get<ApiResponse<Permit[]>>(`/permits?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function usePermit(id: string) {
    return useQuery({
        queryKey: ['permit', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Permit>>(`/permits/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

interface CreatePermitData {
    wasteType: string;
    estimatedWeight?: number;
    estimatedVolume?: number;
    wasteDescription?: string;
    projectId?: string;
    plantId: string;
    pickupAddress: string;
    pickupCity: string;
    pickupState: string;
    pickupPincode: string;
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    licenseNumber?: string;
    validFrom?: string;
    validUntil?: string;
}

export function useCreatePermit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePermitData) => {
            const response = await api.post<ApiResponse<Permit>>('/permits', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
        },
    });
}
