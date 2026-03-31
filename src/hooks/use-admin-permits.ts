import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/api';
import {
    PermitDetail,
    ApprovePermitPayload,
    RejectPermitPayload,
    RecordWeighmentPayload,
    QRCodeData
} from '../types/admin';

// Reusing Permit interface from use-permits.ts if possible, but PermitDetail is more comprehensive
// Defining a simpler ListPermit for the list view if needed, or using PermitDetail
export interface AdminPermitListItem {
    id: string;
    permitNumber: string;
    status: string;
    wasteType: string;
    vehicleNumber?: string | null;
    createdAt: string;
    plant?: { name: string; city: string };
    project?: { name: string; company: { name: string } } | null;
}

interface AdminPermitsResponse {
    data: AdminPermitListItem[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface UseAdminPermitsParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export function useAdminPermits(params: UseAdminPermitsParams = {}) {
    return useQuery({
        queryKey: ['admin-permits', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.status) searchParams.set('status', params.status);
            if (params.search) searchParams.set('search', params.search);

            const response = await api.get<ApiResponse<AdminPermitListItem[]>>(`/permits?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function useAdminPermit(id: string) {
    return useQuery({
        queryKey: ['admin-permit', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<PermitDetail>>(`/permits/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

export function usePermitQRCode(id: string, enabled: boolean) {
    return useQuery({
        queryKey: ['permit-qrcode', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<QRCodeData>>(`/permits/${id}/qrcode`);
            return response.data;
        },
        enabled: !!id && enabled,
    });
}

// MUTATIONS

export function useApprovePermit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ApprovePermitPayload }) => {
            const response = await api.post<ApiResponse<PermitDetail>>(`/permits/${id}/approve`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-permit', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useRejectPermit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: RejectPermitPayload }) => {
            const response = await api.post<ApiResponse<PermitDetail>>(`/permits/${id}/reject`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-permit', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useStartTransit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post<ApiResponse<PermitDetail>>(`/permits/${id}/transit`);
            return response.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['admin-permit', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useRecordWeighment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: RecordWeighmentPayload) => {
            const response = await api.post<ApiResponse<any>>('/weighments', data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-permit', variables.permitId] });
            queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
        },
    });
}

export function useCompletePermit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.post<ApiResponse<PermitDetail>>(`/permits/${id}/complete`);
            return response.data;
        },
        onSuccess: (data, id) => {
            queryClient.invalidateQueries({ queryKey: ['admin-permit', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}
