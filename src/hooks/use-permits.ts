import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { api, UPLOAD_FILE_PATH } from '../lib/api';
import type { CreatePermitInput, SubmitPermitInput } from '../schemas/index';
import { ApiResponse } from '../types/api';
import Toast from 'react-native-toast-message';
import { AxiosError } from 'axios';
import { PermitDetail, QRCodeData } from '../types/permits';

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



export type PermitFieldErrors = Partial<Record<keyof CreatePermitInput, string | string[]>>;

export class PermitApiError extends Error {
    readonly fieldErrors: PermitFieldErrors;
    readonly status?: number;

    constructor(message: string, fieldErrors: PermitFieldErrors = {}, status?: number) {
        super(message);
        this.name = 'PermitApiError';
        this.fieldErrors = fieldErrors;
        this.status = status;
        Object.setPrototypeOf(this, PermitApiError.prototype);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractPermitFieldErrors(responseData: unknown): PermitFieldErrors {
    if (!isRecord(responseData)) return {};

    const errorObject = isRecord(responseData.error) ? responseData.error : undefined;
    const candidates: unknown[] = [
        errorObject?.fieldErrors,
        errorObject?.details,
        errorObject?.errors,
        responseData.fieldErrors,
        responseData.details,
        responseData.errors,
    ];

    for (const candidate of candidates) {
        if (!isRecord(candidate)) continue;

        const result: PermitFieldErrors = {};
        for (const [field, rawValue] of Object.entries(candidate)) {
            if (typeof rawValue === 'string') {
                result[field as keyof CreatePermitInput] = rawValue;
                continue;
            }

            if (Array.isArray(rawValue)) {
                const messages = rawValue.filter(
                    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
                );
                if (messages.length > 0) {
                    result[field as keyof CreatePermitInput] = messages;
                }
            }
        }

        if (Object.keys(result).length > 0) return result;
    }

    return {};
}

export function usePermits(params: UsePermitsParams = {}) {
    console.log('🔵 [usePermits] Hook called with params:', JSON.stringify(params, null, 2));
    
    return useQuery({
        queryKey: ['permits', params],
        queryFn: async () => {
            console.log('🔄 [usePermits] QueryFn executing...');
            console.log('🔄 [usePermits] API Base URL:', api.defaults.baseURL);
            
            try {
                const searchParams = new URLSearchParams();
                if (params.page) searchParams.set('page', params.page.toString());
                if (params.limit) searchParams.set('limit', params.limit.toString());
                if (params.status) searchParams.set('status', params.status);
                if (params.search) searchParams.set('search', params.search);

                const url = `/permits?${searchParams.toString()}`;
                console.log('📡 [usePermits] Full URL:', `${api.defaults.baseURL}${url}`);
                console.log('📡 [usePermits] Headers:', {
                    Authorization: api.defaults.headers.common['Authorization'] ? 'Bearer [TOKEN]' : 'None',
                    'X-Client-Type': api.defaults.headers.common['X-Client-Type'],
                });
                
                const startTime = Date.now();
                const response = await api.get<ApiResponse<Permit[]>>(
                    url,
                    { timeout: 15000 }
                );
                const duration = Date.now() - startTime;
                
                console.log(`✅ [usePermits] API call completed in ${duration}ms`);
                console.log('📊 [usePermits] Response status:', response.status);
                console.log('📊 [usePermits] Response data:', {
                    success: response.data.success,
                    count: response.data.data?.length ?? 0,
                    hasData: !!response.data.data,
                });
                
                return response.data;
            } catch (error: unknown) {
                console.error('❌ [usePermits] API call failed at:', new Date().toISOString());
                console.error('❌ [usePermits] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                
                if (isAxiosError(error)) {
                    console.error('❌ [usePermits] Axios error details:', {
                        code: error.code,
                        message: error.message,
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        data: error.response?.data,
                        config: {
                            url: error.config?.url,
                            method: error.config?.method,
                            baseURL: error.config?.baseURL,
                            timeout: error.config?.timeout,
                            headers: error.config?.headers,
                        },
                    });
                }
                
                throw error;
            }
        },
        retry: (failureCount, error) => {
            console.log(`🔄 [usePermits] Retry attempt ${failureCount + 1}`);
            console.log('🔄 [usePermits] Error:', {
                isAxiosError: isAxiosError(error),
                message: error instanceof Error ? error.message : 'Unknown error',
            });
            
            if (isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401 || status === 403 || status === 404) {
                    console.log('❌ [usePermits] Not retrying on status:', status);
                    return false;
                }
            }
            return failureCount < 3;
        },
        retryDelay: (attemptIndex) => {
            const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
            console.log(`⏳ [usePermits] Retry delay: ${delay}ms`);
            return delay;
        },
        staleTime: 30000,
        gcTime: 300000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
}

export function usePermit(id?: string) {
  return useQuery<ApiResponse<PermitDetail>, Error>({
    queryKey: ['permit', id],
    enabled: !!id,
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000,
    queryFn: async () => {
      try {
        const response = await api.get<ApiResponse<PermitDetail>>(`/permits/${id}`);
        return response.data;
      } catch (error: unknown) {
        console.error('Permit Detail API Error:', error);

        if (isAxiosError(error)) {
          if (isNetworkError(error)) {
            throw new Error('Unable to connect to the server. Please check your internet connection.');
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
  });
}


export function usePermitQRCode(id?: string, enabled = false) {
  return useQuery<ApiResponse<QRCodeData>, Error>({
    queryKey: ['permit-qrcode', id],
    enabled: !!id && enabled,
    staleTime: 60000,
    retry: 1,
    queryFn: async () => {
      try {
        const response = await api.get<ApiResponse<QRCodeData>>(`/permits/${id}/qrcode`);
        return response.data;
      } catch (error: unknown) {
        console.error('Permit QR API Error:', error);
        throw new Error(getErrorMessage(error));
      }
    },
  });
}

export function useCreatePermit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            data,
            mode,
        }: {
            data: CreatePermitInput;
            mode?: 'draft' | 'submit';
        }) => {
            try {
                const response = await api.post<ApiResponse<Permit>>(
                    `/permits?mode=${mode || 'submit'}`,
                    data,
                    { timeout: 20000 }
                );
                return response.data;
            } catch (error: unknown) {
                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new PermitApiError(
                            'Unable to connect to the server. Check your internet connection.'
                        );
                    }

                    const status = error.response?.status;
                    const responseData = error.response?.data;

                    if (status === 400) {
                        const fieldErrors = extractPermitFieldErrors(responseData);
                        const message =
                            (responseData as any)?.error?.message ||
                            (responseData as any)?.message ||
                            'Please correct the invalid permit details.';

                        throw new PermitApiError(message, fieldErrors, status);
                    }

                    if (status === 401) {
                        throw new PermitApiError(
                            'Your session has expired. Please log in again.',
                            {},
                            status
                        );
                    }

                    if (status === 403) {
                        throw new PermitApiError(
                            'You do not have permission to create permits.',
                            {},
                            status
                        );
                    }

                    if (status === 404) {
                        throw new PermitApiError(
                            'The selected project or plant could not be found.',
                            {},
                            status
                        );
                    }
                }

                throw new PermitApiError(getErrorMessage(error));
            }
        },
        onSuccess: () => {
            // Do not show a success toast here. The screen still has to upload
            // evidence, so it should display success only after the whole flow ends.
            queryClient.invalidateQueries({ queryKey: ['permits'] });
        },
        onError: (error: PermitApiError) => {
            // Field-level errors are rendered beside their inputs by the screen.
            if (Object.keys(error.fieldErrors || {}).length > 0) return;

            Toast.show({
                type: 'error',
                text1: 'Could not create permit',
                text2: error.message,
                position: 'top',
                visibilityTime: 4000,
                autoHide: true,
            });
        },
    });
}


interface SubmitPermitVariables {
    permitId: string;
    data: SubmitPermitInput;
}

export function useSubmitPermit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            permitId,
            data,
        }: SubmitPermitVariables) => {
            try {
                const response = await api.post<ApiResponse<Permit>>(
                    `/permits/${permitId}/submit`,
                    data,
                    { timeout: 20000 }
                );

                if (!response.data.success || !response.data.data) {
                    const message =
                        (response.data as any)?.error?.message ||
                        (response.data as any)?.message ||
                        'Failed to submit permit';

                    throw new PermitApiError(message);
                }

                return response.data;
            } catch (error: unknown) {
                if (error instanceof PermitApiError) {
                    throw error;
                }

                if (isAxiosError(error)) {
                    if (isNetworkError(error)) {
                        throw new PermitApiError(
                            'Unable to connect while submitting the permit. Check your internet connection.'
                        );
                    }

                    const status = error.response?.status;
                    const responseData = error.response?.data;

                    if (status === 400) {
                        const fieldErrors = extractPermitFieldErrors(responseData);
                        const message =
                            (responseData as any)?.error?.message ||
                            (responseData as any)?.message ||
                            'Please correct the invalid submission details.';

                        throw new PermitApiError(message, fieldErrors, status);
                    }

                    if (status === 401) {
                        throw new PermitApiError(
                            'Your session has expired. Please log in again.',
                            {},
                            status
                        );
                    }

                    if (status === 403) {
                        throw new PermitApiError(
                            'You do not have permission to submit this permit.',
                            {},
                            status
                        );
                    }

                    if (status === 404) {
                        throw new PermitApiError(
                            'The permit could not be found.',
                            {},
                            status
                        );
                    }
                }

                throw new PermitApiError(getErrorMessage(error));
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
            queryClient.invalidateQueries({
                queryKey: ['permit', variables.permitId],
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