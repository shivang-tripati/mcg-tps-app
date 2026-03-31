import { UserRole, PermitStatus, WeighmentStatus, PaymentStatus, DocumentType } from './database';

// ============================================================
// COMPANY & PROJECT
// ============================================================

export interface Company {
    id: string;
    name: string;
    registrationNumber?: string | null;
    gstNumber?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Nested relations
    users?: AdminUser[];
    projects?: Project[];
    _count?: {
        users: number;
        projects: number;
        permits: number;
    };
}

export interface Project {
    id: string;
    name: string;
    description?: string | null;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
    isActive: boolean;
    companyId: string;
    company?: Company;
    createdAt: string;
    updatedAt: string;
    _count?: {
        permits: number;
    };
}

// ============================================================
// PLANT
// ============================================================

export interface Plant {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    operatingHours?: string | null;
    capacity?: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        permits: number;
        weighments: number;
    };
}

// ============================================================
// USER & IDENTITY
// ============================================================

export interface IdentityDocument {
    id: string;
    type: DocumentType;
    documentNumber: string;
    filePath?: string | null;
    isVerified: boolean;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminUser {
    id: string;
    email: string;
    phone?: string | null;
    name: string;
    role: UserRole;
    isPhoneVerified: boolean;
    isEmailVerified: boolean;
    isActive: boolean;
    isSystemAdmin: boolean;
    companyId?: string | null;
    company?: Company | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string | null;
    identityDocuments?: IdentityDocument[];
    _count?: {
        permits: number;
    };
}

// ============================================================
// WEIGHMENT
// ============================================================

export interface Weighment {
    id: string;
    weighmentNumber: string;
    permitId: string;
    plantId: string;
    firstWeight?: number | null;
    firstWeighmentAt?: string | null;
    secondWeight?: number | null;
    secondWeighmentAt?: string | null;
    netWeight?: number | null;
    fileUrl?: string | null;
    status: WeighmentStatus;
    paymentStatus: PaymentStatus;
    paymentAmount?: number | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    approvedAt?: string | null;
    paidAt?: string | null;
    rejectionReason?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    weighedAt?: string | null;
    // Relations
    permit?: {
        id: string;
        permitNumber: string;
        status: PermitStatus;
        user?: {
            id: string;
            name: string;
            email: string;
        };
        company?: {
            id: string;
            name: string;
        } | null;
    };
    plant?: {
        id: string;
        name: string;
        code: string;
    };
}

// ============================================================
// ADMIN STATS
// ============================================================

export interface RecentActivityItem {
    id: string;
    permitNumber: string;
    status: PermitStatus;
    userName: string;
    projectName: string;
    updatedAt: string;
}

export interface AdminStats {
    stats: {
        totalPermits: number;
        pendingApproval: number;
        inTransit: number;
        completedToday: number;
    };
    recentActivity: RecentActivityItem[];
}

// ============================================================
// PERMIT DETAIL & ACTIONS
// ============================================================

export interface PermitDetail {
    id: string;
    permitNumber: string;
    token: string;
    status: PermitStatus;
    wasteType: string;
    estimatedWeight?: number | null;
    estimatedVolume?: number | null;
    wasteDescription?: string | null;
    pickupAddress: string;
    pickupCity: string;
    pickupState: string;
    pickupPincode: string;
    driverName?: string | null;
    driverPhone?: string | null;
    vehicleNumber?: string | null;
    vehicleType?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    submittedAt?: string | null;
    approvedAt?: string | null;
    transitStartedAt?: string | null;
    completedAt?: string | null;
    project: { id: string; name: string; address: string; city: string; company: { id: string; name: string } };
    plant: { id: string; name: string; code: string; address: string; city: string };
    user: { id: string; name: string; email: string; phone?: string | null };
    approvedBy?: { id: string; name: string } | null;
    rejectedBy?: { id: string; name: string } | null;
    wasteEvidences: Array<{
        id: string;
        fileName: string;
        filePath: string;
        description?: string | null;
    }>;
    weighments: Array<{
        id: string;
        weighmentNumber: string;
        status: string;
        firstWeight?: number | null;
        secondWeight?: number | null;
        netWeight?: number | null;
        fileUrl?: string | null;
        weighedAt?: string | null;
        plant: { name: string };
    }>;
}

export interface QRCodeData {
    qrCode: string;
    verificationUrl: string;
}

export interface ApprovePermitPayload {
    validUntil: string; // ISO datetime
}

export interface RejectPermitPayload {
    reason: string;
}

export interface RecordWeighmentPayload {
    permitId: string;
    plantId: string;
    firstWeight: number;
    secondWeight: number;
    notes?: string;
}

