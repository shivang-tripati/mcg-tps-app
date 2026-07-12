// hooks/use-permits.ts - FULLY FIXED WITH TYPE SAFETY

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { api, UPLOAD_FILE_PATH } from '../lib/api';
import type { CreatePermitInput } from '../schemas/index';
import { ApiResponse } from '../types/api';
import Toast from 'react-native-toast-message';
import { AxiosError } from 'axios';

// ✅ Type guard to check if error is AxiosError
function isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError)?.isAxiosError === true;
}

// ✅ Type guard to check if error is network error
function isNetworkError(error: unknown): boolean {
    if (isAxiosError(error)) {
        return error.message === 'Network Error' || 
               error.code === 'ECONNABORTED' ||
               !error.response;
    }
    return false;
}

// ✅ Safe function to get error response data
function getErrorResponseData(error: unknown): any {
    if (isAxiosError(error) && error.response) {
        return error.response.data;
    }
    return null;
}

// ✅ Safe function to get error message from response
function getErrorMessage(error: unknown): string {
    // Check if it's an AxiosError with response
    if (isAxiosError(error)) {
        // Network error
        if (isNetworkError(error)) {
            return 'Unable to connect to the server. Please check your network.';
        }
        
        // Get response data safely
        const responseData = getErrorResponseData(error);
        
        // Check for error in response data
        if (responseData) {
            // Check for nested error object
            if (responseData.error?.message) {
                return responseData.error.message;
            }
            // Check for direct message
            if (responseData.message) {
                return responseData.message;
            }
            // Check for error message in data
            if (responseData.data?.message) {
                return responseData.data.message;
            }
        }
        
        // HTTP status code errors
        switch (error.response?.status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Your session has expired. Please log in again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'Resource not found.';
            case 413:
                return 'File is too large. Please upload a smaller file.';
            case 415:
                return 'Unsupported file type. Please upload a valid image or PDF.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return error.message || 'An unexpected error occurred.';
        }
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    if (typeof error === 'string') {
        return error;
    }
    
    return 'An unexpected error occurred.';
}

export interface UploadFileResult {
    url: string;
    path: string;
    fileName: string;
    size: number;
    mimeType: string;
}

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
    wasteEvidences?: Array<{
        id: string;
        fileName: string;
        filePath: string;
        description?: string | null;
        mimeType?: string | null;
    }>;
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
            try {
                const searchParams = new URLSearchParams();
                if (params.page) searchParams.set('page', params.page.toString());
                if (params.limit) searchParams.set('limit', params.limit.toString());
                if (params.status) searchParams.set('status', params.status);
                if (params.search) searchParams.set('search', params.search);

                const response = await api.get<ApiResponse<Permit[]>>(
                    `/permits?${searchParams.toString()}`,
                    { timeout: 15000 }
                );
                
                return response.data;
            } catch (error: unknown) {
                console.error('Permits API Error:', error);
                
                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new Error('Unable to connect to the server. Please check your network.');
                    }
                    
                    const status = error.response?.status;
                    if (status === 401) {
                        throw new Error('Your session has expired. Please log in again.');
                    }
                    if (status === 403) {
                        throw new Error('You do not have permission to view permits.');
                    }
                    if (status === 500) {
                        throw new Error('Server error. Please try again later.');
                    }
                    if (status === 429) {
                        throw new Error('Too many requests. Please try again later.');
                    }
                }
                
                throw new Error(getErrorMessage(error));
            }
        },
        retry: (failureCount, error) => {
            if (isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401 || status === 403 || status === 404) {
                    return false;
                }
            }
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 30000,
        gcTime: 300000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
}

export function usePermit(id: string) {
    return useQuery({
        queryKey: ['permit', id],
        queryFn: async () => {
            try {
                const response = await api.get<ApiResponse<Permit>>(`/permits/${id}`);
                return response.data;
            } catch (error: unknown) {
                console.error('Permit Detail API Error:', error);
                
                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new Error('Unable to connect to the server.');
                    }
                    
                    const status = error.response?.status;
                    if (status === 404) {
                        throw new Error('Permit not found.');
                    }
                    if (status === 401) {
                        throw new Error('Your session has expired. Please log in again.');
                    }
                    if (status === 403) {
                        throw new Error('You do not have permission to view this permit.');
                    }
                }
                
                throw new Error(getErrorMessage(error));
            }
        },
        enabled: !!id,
        retry: 2,
        retryDelay: 1000,
        staleTime: 60000,
    });
}

export function useCreatePermit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ data, mode }: { data: CreatePermitInput; mode?: 'draft' | 'submit' }) => {
            try {
                const response = await api.post<ApiResponse<Permit>>(
                    `/permits?mode=${mode || 'submit'}`,
                    data,
                    { timeout: 20000 }
                );
                return response.data;
            } catch (error: unknown) {
                console.error('Create Permit Error:', error);
                
                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new Error('Network error. Please check your connection.');
                    }
                    
                    const status = error.response?.status;
                    if (status === 400) {
                        const responseData = error.response?.data;
                        // ✅ Safely check for error messages
                        const message = 
                            (responseData as any)?.error?.message || 
                            (responseData as any)?.message || 
                            'Invalid permit data';
                        throw new Error(message);
                    }
                    if (status === 401) {
                        throw new Error('Your session has expired. Please log in again.');
                    }
                    if (status === 403) {
                        throw new Error('You do not have permission to create permits.');
                    }
                }
                
                throw new Error(getErrorMessage(error));
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
            Toast.show({
                type: 'success',
                text1: 'Permit Created',
                text2: data?.data?.permitNumber 
                    ? `Permit ${data.data.permitNumber} created successfully`
                    : 'Permit created successfully',
                position: 'top',
                visibilityTime: 3000,
                autoHide: true,
            });
        },
        onError: (error: Error) => {
            Toast.show({
                type: 'error',
                text1: 'Create Permit Failed',
                text2: error.message || 'Could not create permit. Please try again.',
                position: 'top',
                visibilityTime: 4000,
                autoHide: true,
            });
        },
    });
}

export function useUploadPermitWasteEvidence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ permitId, uri }: { permitId: string; uri: string }) => {
            try {
                const formData = new FormData();
                const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
                const mime =
                    ext === 'png'
                        ? 'image/png'
                        : ext === 'webp'
                          ? 'image/webp'
                          : ext === 'pdf'
                            ? 'application/pdf'
                            : 'image/jpeg';
                const name = `evidence.${ext}`;
                formData.append('file', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name,
                    type: mime,
                } as any);
                formData.append('type', 'waste_evidence');

                const uploadRes = await api.post<ApiResponse<UploadFileResult>>(
                    UPLOAD_FILE_PATH, 
                    formData,
                    {
                        timeout: 30000,
                        transformRequest: (data, headers) => {
                            if (data instanceof FormData) {
                                delete (headers as Record<string, unknown>)['Content-Type'];
                            }
                            return data;
                        },
                    }
                );

                const uploadBody = uploadRes.data;
                if (!uploadBody.success || !uploadBody.data) {
                    const errorMsg = 
                        (uploadBody as any)?.error?.message || 
                        (uploadBody as any)?.message || 
                        'File upload failed';
                    throw new Error(errorMsg);
                }

                const u = uploadBody.data;

                const evidenceRes = await api.post<ApiResponse<unknown>>(
                    `/permits/${permitId}/evidence`,
                    {
                        permitId,
                        fileName: u.fileName,
                        filePath: u.path,
                        fileSize: u.size,
                        mimeType: u.mimeType,
                        description: 'Initial evidence',
                    },
                    { timeout: 15000 }
                );

                const evidenceBody = evidenceRes.data;
                if (!evidenceBody.success) {
                    const errorMsg = 
                        (evidenceBody as any)?.error?.message || 
                        (evidenceBody as any)?.message || 
                        'Failed to register waste evidence';
                    throw new Error(errorMsg);
                }
                
                return evidenceBody;
            } catch (error: unknown) {
                console.error('Upload Evidence Error:', error);
                
                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new Error('Network error while uploading. Please try again.');
                    }
                    
                    const status = error.response?.status;
                    if (status === 413) {
                        throw new Error('File is too large. Please upload a smaller file.');
                    }
                    if (status === 415) {
                        throw new Error('Unsupported file type. Please upload a valid image or PDF.');
                    }
                    if (status === 401) {
                        throw new Error('Your session has expired. Please log in again.');
                    }
                    if (status === 403) {
                        throw new Error('You do not have permission to upload evidence.');
                    }
                }
                
                throw new Error(getErrorMessage(error));
            }
        },
        onSuccess: (_, { permitId }) => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
            queryClient.invalidateQueries({ queryKey: ['permit', permitId] });
            Toast.show({
                type: 'success',
                text1: 'Evidence Uploaded',
                text2: 'Waste evidence uploaded successfully',
                position: 'top',
                visibilityTime: 3000,
                autoHide: true,
            });
        },
        onError: (error: Error) => {
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: error.message || 'Could not upload evidence',
                position: 'top',
                visibilityTime: 4000,
                autoHide: true,
            });
        },
    });
}