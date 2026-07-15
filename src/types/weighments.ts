export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationMeta;
  error?: {
    message?: string;
    code?: string;
  };
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WeighmentListItem {
  id: string;
  weighmentNumber: string;
  status: string;
  paymentStatus: string;
  paymentAmount?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  firstWeight?: number | null;
  secondWeight?: number | null;
  netWeight?: number | null;
  firstWeighmentAt?: string | null;
  secondWeighmentAt?: string | null;
  fileUrl?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;

  permit?: {
    id: string;
    permitNumber: string;
    status: string;
    driverName?: string | null;
    vehicleNumber?: string | null;
  } | null;

  plant?: {
    id: string;
    name: string;
    code: string;
  } | null;

  approvedBy?: {
    id: string;
    name: string;
  } | null;

  paidBy?: {
    id: string;
    name: string;
  } | null;
}

export interface WeighmentDetail {
  id: string;
  weighmentNumber: string;
  status: string;
  paymentStatus: string;
  paymentAmount?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;

  firstWeight?: number | null;
  secondWeight?: number | null;
  netWeight?: number | null;

  firstWeighmentAt?: string | null;
  secondWeighmentAt?: string | null;

  fileUrl?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;

  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;

  permit?: {
    id: string;
    permitNumber: string;
    status: string;
    wasteType?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    vehicleNumber?: string | null;
    vehicleType?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
    project?: {
      id: string;
      name: string;
      address?: string | null;
      city?: string | null;
    } | null;
  } | null;

  plant?: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
  } | null;

  approvedBy?: {
    id: string;
    name: string;
  } | null;

  paidBy?: {
    id: string;
    name: string;
  } | null;
}

export interface UseWeighmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
}