import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { api, UPLOAD_FILE_PATH } from '../lib/api';
import { normalizeDateTime } from '../schemas/index';
import type { CreatePermitInput } from '../schemas/index';
import { ApiResponse } from '../types/api';

/** Response body from generic `POST` upload (matches your `createSuccessResponse` payload). */
export interface UploadFileResult {
    url: string;
    path: string;
    fileName: string;
    size: number;
    mimeType: string;
}

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
    wasteEvidences?: Array<{
        id: string;
        fileName: string;
        filePath: string;
        description?: string | null;
        mimeType?: string | null;
    }>;
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

function buildCreatePermitPayload(data: CreatePermitInput): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...data };

    if (data.validFrom) {
        const d = normalizeDateTime(data.validFrom);
        payload.validFrom = d ? d.toISOString() : data.validFrom;
    }
    if (data.validUntil) {
        const d = normalizeDateTime(data.validUntil);
        payload.validUntil = d ? d.toISOString() : data.validUntil;
    }

    return Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
    );
}

export function useCreatePermit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreatePermitInput) => {
            const response = await api.post<ApiResponse<Permit>>(
                '/permits',
                buildCreatePermitPayload(data)
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
        },
    });
}

/**
 * 1) `POST` multipart to your upload route (`file` + `type: waste_evidence`).
 * 2) `POST` JSON to `/permits/:permitId/evidence` with path metadata (same as web `uploadEvidenceAsync`).
 */
export function useUploadPermitWasteEvidence() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ permitId, uri }: { permitId: string; uri: string }) => {
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

            const uploadRes = await api.post<ApiResponse<UploadFileResult>>(UPLOAD_FILE_PATH, formData, {
                transformRequest: (data, headers) => {
                    if (data instanceof FormData) {
                        delete (headers as Record<string, unknown>)['Content-Type'];
                    }
                    return data;
                },
            });

            const uploadBody = uploadRes.data;
            if (!uploadBody.success || !uploadBody.data) {
                throw new Error(uploadBody.error?.message || 'File upload failed');
            }

            const u = uploadBody.data;

            const evidenceRes = await api.post<ApiResponse<unknown>>(`/permits/${permitId}/evidence`, {
                permitId,
                fileName: u.fileName,
                filePath: u.path,
                fileSize: u.size,
                mimeType: u.mimeType,
                description: 'Initial evidence',
            });

            const evidenceBody = evidenceRes.data;
            if (!evidenceBody.success) {
                throw new Error(evidenceBody.error?.message || 'Failed to register waste evidence');
            }
            return evidenceBody;
        },
        onSuccess: (_, { permitId }) => {
            queryClient.invalidateQueries({ queryKey: ['permits'] });
            queryClient.invalidateQueries({ queryKey: ['permit', permitId] });
        },
    });
}
