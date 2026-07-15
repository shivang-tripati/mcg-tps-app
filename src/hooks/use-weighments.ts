import { useQuery } from '@tanstack/react-query';
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