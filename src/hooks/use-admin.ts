import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/api';
import { Company, Plant, AdminUser, Weighment, Project, AdminStats } from '../types/admin';

// ============================================================
// ADMIN STATS
// ============================================================

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const response = await api.get<ApiResponse<AdminStats>>('/dashboard/stats');
            return response.data;
        },
    });
}

// ============================================================
// COMPANIES
// ============================================================

interface UseCompaniesParams {
    page?: number;
    limit?: number;
    search?: string;
}

export function useCompanies(params: UseCompaniesParams = {}) {
    return useQuery({
        queryKey: ['companies', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.search) searchParams.set('search', params.search);

            const response = await api.get<ApiResponse<Company[]>>(`/companies?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function useCompany(id: string) {
    return useQuery({
        queryKey: ['company', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Company>>(`/companies/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

// ============================================================
// PROJECTS
// ============================================================

interface UseProjectsParams {
    page?: number;
    limit?: number;
    companyId?: string;
}

export function useProjects(params: UseProjectsParams = {}) {
    return useQuery({
        queryKey: ['projects', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.companyId) searchParams.set('companyId', params.companyId);

            const response = await api.get<ApiResponse<Project[]>>(`/projects?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

// ============================================================
// PLANTS
// ============================================================

interface UsePlantsParams {
    page?: number;
    limit?: number;
    search?: string;
}

export function usePlants(params: UsePlantsParams = {}) {
    return useQuery({
        queryKey: ['plants', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.search) searchParams.set('search', params.search);

            const response = await api.get<ApiResponse<Plant[]>>(`/plants?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function usePlant(id: string) {
    return useQuery({
        queryKey: ['plant', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Plant>>(`/plants/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

// ============================================================
// USERS
// ============================================================

interface UseUsersParams {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
}

export function useUsers(params: UseUsersParams = {}) {
    return useQuery({
        queryKey: ['users', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.role) searchParams.set('role', params.role);
            if (params.search) searchParams.set('search', params.search);

            const response = await api.get<ApiResponse<AdminUser[]>>(`/users?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function useUser(id: string) {
    return useQuery({
        queryKey: ['user', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<AdminUser>>(`/users/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

// ============================================================
// WEIGHMENTS
// ============================================================

interface UseWeighmentsParams {
    page?: number;
    limit?: number;
    status?: string;
    plantId?: string;
}

export function useWeighments(params: UseWeighmentsParams = {}) {
    return useQuery({
        queryKey: ['weighments', params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.set('page', params.page.toString());
            if (params.limit) searchParams.set('limit', params.limit.toString());
            if (params.status) searchParams.set('status', params.status);
            if (params.plantId) searchParams.set('plantId', params.plantId);

            const response = await api.get<ApiResponse<Weighment[]>>(`/weighments?${searchParams.toString()}`);
            return response.data;
        },
    });
}

export function useWeighment(id: string) {
    return useQuery({
        queryKey: ['weighment', id],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Weighment>>(`/weighments/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}
