import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api, getErrorMessage, isNetworkError } from '../lib/api';
import {
  ApiResponse,
  UseWeighmentsParams,
  WeighmentDetail,
  WeighmentListItem,
} from '../types/weighments';

function buildQuery(params: UseWeighmentsParams) {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('limit', String(params.limit ?? 10));

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.status?.trim()) {
    searchParams.set('status', params.status.trim());
  }

  if (params.paymentStatus?.trim()) {
    searchParams.set('paymentStatus', params.paymentStatus.trim());
  }

  return searchParams.toString();
}

function normalizeApiError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (isNetworkError(error)) {
      return new Error('Unable to connect to the server. Please check your internet connection.');
    }

    const status = error.response?.status;

    if (status === 404) {
      return new Error('Weighment not found.');
    }

    if (status === 401) {
      return new Error('Your session has expired. Please log in again.');
    }

    if (status === 403) {
      return new Error('You do not have permission to view weighments.');
    }
  }

  return new Error(getErrorMessage(error) || fallback);
}

// ============================================================
// QUERY HOOKS
// ============================================================

export function useWeighments(params: UseWeighmentsParams) {
  return useQuery<ApiResponse<WeighmentListItem[]>, Error>({
    queryKey: ['weighments', params],
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      try {
        const query = buildQuery(params);
        const response = await api.get<ApiResponse<WeighmentListItem[]>>(`/weighments?${query}`);
        return response.data;
      } catch (error: unknown) {
        console.error('Weighments API Error:', error);
        throw normalizeApiError(error, 'Failed to load weighments.');
      }
    },
  });
}

export function useWeighment(id?: string) {
  return useQuery<ApiResponse<WeighmentDetail>, Error>({
    queryKey: ['weighment', id],
    enabled: !!id,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      try {
        const response = await api.get<ApiResponse<WeighmentDetail>>(`/weighments/${id}`);
        return response.data;
      } catch (error: unknown) {
        console.error('Weighment Detail API Error:', error);
        throw normalizeApiError(error, 'Failed to load weighment.');
      }
    },
  });
}

// ============================================================
// MUTATION HOOKS FOR WEIGHMENT ACTIONS
// ============================================================

interface MarkPaidPayload {
  paymentAmount: number;
  paymentMethod?: string;
  paymentReference: string;
}

interface RejectPayload {
  reason: string;
}

/**
 * Hook for recording a new weighment
 */
export function useRecordWeighment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      permitId: string;
      plantId: string;
      firstWeight?: number;
      secondWeight?: number;
      firstWeighmentAt?: string;
      secondWeighmentAt?: string;
      notes?: string;
    }) => {
      const response = await api.post<ApiResponse<any>>('/weighments', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['weighments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permit', variables.permitId] });
      queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      console.error('Record weighment error:', error);
    },
  });
}

/**
 * Hook for marking a weighment as paid
 */
export function useMarkWeighmentPaid(weighmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MarkPaidPayload) => {
      const response = await api.post<ApiResponse<any>>(`/weighments/${weighmentId}/mark-paid`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighment', weighmentId] });
      queryClient.invalidateQueries({ queryKey: ['weighments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
    },
    onError: (error: any) => {
      console.error('Mark paid error:', error);
    },
  });
}

/**
 * Hook for approving a weighment
 */
export function useApproveWeighment(weighmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<any>>(`/weighments/${weighmentId}/approve`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighment', weighmentId] });
      queryClient.invalidateQueries({ queryKey: ['weighments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      console.error('Approve weighment error:', error);
    },
  });
}

/**
 * Hook for rejecting a weighment
 */
export function useRejectWeighment(weighmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RejectPayload) => {
      const response = await api.post<ApiResponse<any>>(`/weighments/${weighmentId}/reject`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighment', weighmentId] });
      queryClient.invalidateQueries({ queryKey: ['weighments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
    },
    onError: (error: any) => {
      console.error('Reject weighment error:', error);
    },
  });
}

/**
 * Combined hook for all weighment actions
 */
export function useWeighmentActions(weighmentId: string) {
  const markPaid = useMarkWeighmentPaid(weighmentId);
  const approve = useApproveWeighment(weighmentId);
  const reject = useRejectWeighment(weighmentId);

  return {
    markPaid,
    approve,
    reject,
  };
}

/**
 * Hook for completing a permit (when weighment is approved)
 */
export function useCompletePermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permitId: string) => {
      const response = await api.post<ApiResponse<any>>(`/permits/${permitId}/complete`);
      return response.data;
    },
    onSuccess: (_, permitId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-permit', permitId] });
      queryClient.invalidateQueries({ queryKey: ['admin-permits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error: any) => {
      console.error('Complete permit error:', error);
    },
  });
}

// ============================================================
// EXPORT TYPES
// ============================================================

export type {
  MarkPaidPayload,
  RejectPayload,
};