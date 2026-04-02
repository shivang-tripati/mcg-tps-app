import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiResponse } from '../types/api';

interface Plant {
    id: string;
    name: string;
    code: string;
    city: string;
    state: string;
    address: string;
}

interface Project {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode?: string;
    companyId: string;
}

export function usePlants() {
    return useQuery({
        queryKey: ['plants'],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Plant[]>>('/plants');
            return response.data;
        },
    });
}

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.get<ApiResponse<Project[]>>('/projects');
            return response.data;
        },
    });
}
