export interface Evidence {
  id: string;
  fileName: string;
  filePath: string;
  description?: string | null;
  mimeType?: string | null;
}

export interface PermitWeighment {
  id: string;
  weighmentNumber: string;
  status: string;
  firstWeight?: number | null;
  secondWeight?: number | null;
  netWeight?: number | null;
  fileUrl?: string | null;
  weighedAt?: string | null;
}

export interface PermitDetail {
  id: string;
  permitNumber: string;
  token?: string | null;
  status: string;
  wasteType: string;

  estimatedWeight?: number | null;
  estimatedVolume?: number | null;
  wasteDescription?: string | null;

  projectId?: string | null;
  companyId?: string | null;
  plantId: string;

  pickupAddress?: string | null;
  pickupCity?: string | null;
  pickupState?: string | null;
  pickupPincode?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;

  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
  vehicleType?: string | null;
  licenseNumber?: string | null;

  validFrom?: string | null;
  validUntil?: string | null;

  rejectionReason?: string | null;

  createdAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;

  project?: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    company?: {
      id: string;
      name: string;
    } | null;
  } | null;

  plant?: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
  } | null;

  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;

  weighments?: PermitWeighment[];

  wasteEvidences?: Evidence[];
}

export interface QRCodeData {
  qrCode: string;
  verificationUrl: string;
}