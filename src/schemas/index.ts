import { z } from 'zod';
export const UserRole = ["ADMIN", "COMPANY_USER", "INDIVIDUAL", "GUEST"] as const;
export const WasteType = ["CND_SEGREGATED", "CND_UNSEGREGATED"] as const;
export const DocumentType = ["AADHAAR", "PAN"] as const;


// regex patterns
const indianMobileRegex = /^[6-9]\d{9}$/;

const indianMobileMessage = "Enter a valid mobile number (10 digits)";

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const loginSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: z.email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
    role: z.enum(UserRole).default('INDIVIDUAL').optional(),
    companyId: z.uuid().optional(),
});

export const forgotPasswordSchema = z.object({
    email: z.email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const sendOTPSchema = z.object({
    phone: z.string().regex(indianMobileRegex, indianMobileMessage),
    purpose: z.enum(['LOGIN', 'REGISTER', 'PERMIT_CREATE', 'PASSWORD_RESET']),
});

export const verifyOTPSchema = z.object({
    phone: z.string().regex(indianMobileRegex, indianMobileMessage),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    purpose: z.enum(['LOGIN', 'REGISTER', 'PERMIT_CREATE', 'PASSWORD_RESET']),
});

// ============================================================
// USER SCHEMAS
// ============================================================

export const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
    isActive: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
});

// ============================================================
// COMPANY SCHEMAS
// ============================================================

export const createCompanySchema = z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    registrationNumber: z.string().optional(),
    gstNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code').optional(),
    contactEmail: z.email().optional(),
    contactPhone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ============================================================
// PROJECT SCHEMAS
// ============================================================

export const createProjectSchema = z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    description: z.string().optional(),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    companyId: z.string().uuid('Invalid company ID').optional()
});

export const updateProjectSchema = createProjectSchema.partial().omit({ companyId: true });

// ============================================================
// PLANT SCHEMAS
// ============================================================

export const createPlantSchema = z.object({
    name: z.string().min(2, 'Plant name must be at least 2 characters'),
    code: z.string().min(2, 'Plant code is required').max(20),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
    operatingHours: z.string().optional(),
    capacity: z.number().int().positive().optional(),
});

export const updatePlantSchema = createPlantSchema.partial().omit({ code: true });

// ============================================================
// PERMIT SCHEMAS
// ============================================================

const dateTimeField = (label: string) =>
    z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;

                // Accept HTML datetime-local
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return true;

                // Accept ISO
                const d = new Date(val);
                return !isNaN(d.getTime());
            },
            { message: `Please select a valid ${label}` }
        );



export const createPermitSchema = z.object({
    wasteType: z.enum(WasteType),

    estimatedWeight: z.number().positive().optional(),
    estimatedVolume: z.number().positive().optional(),
    wasteDescription: z.string().optional(),

    projectId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    plantId: z.string().uuid("Please select a destination plant"),

    pickupAddress: z.string().min(5, "Pickup address is required"),
    pickupCity: z.string().min(2, "Pickup city is required"),
    pickupState: z.string().min(2, "Pickup state is required"),
    pickupPincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
    pickupLatitude: z.number().min(-90).max(90).optional(),
    pickupLongitude: z.number().min(-180).max(180).optional(),

    driverName: z.string().optional(),
    driverPhone: z.string().regex(indianMobileRegex, indianMobileMessage).optional(),
    vehicleNumber: z.string().optional(),
    vehicleType: z.string().optional(),
    licenseNumber: z
    .string()
    .regex(
        /^([A-Z]{2})(\d{2}|\d{3})[A-Z]{0,1}(\d{4})(\d{7})$/i,
        "License must be like: DL0420110012345 (2 letters + 2-3 digits + optional letter + 4 digits year + 7 digits number)"
    )
    .optional()
    .or(z.literal('')),
    validFrom: dateTimeField("Start date & time"),
    validUntil: dateTimeField("End date & time"),

});

export const updatePermitSchema = createPermitSchema.partial();

export const submitPermitSchema = z.object({
    driverName: z.string().min(2, 'Driver name is required'),
    driverPhone: z.string().regex(indianMobileRegex, indianMobileMessage),
    vehicleNumber: z.string().min(4, 'Vehicle number is required'),
    vehicleType: z.string().optional(),
    licenseNumber: z
    .string()
    .regex(
        /^([A-Z]{2})(\d{2}|\d{3})[A-Z]{0,1}(\d{4})(\d{7})$/i,
        "License must be like: DL0420110012345 (2 letters + 2-3 digits + optional letter + 4 digits year + 7 digits number)"
    ).optional(),
});

export const approvePermitSchema = z.object({
    validFrom: dateTimeField("Valid from").refine(val => val !== null, "Valid from is required"),
    validUntil: dateTimeField("Permit expiry time").refine(val => val !== null, "Permit expiry time is required"),
});

export const rejectPermitSchema = z.object({
    reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export const cancelPermitSchema = z.object({
    reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
});

// ============================================================
// WEIGHMENT SCHEMAS
// ============================================================

export const createWeighmentSchema = z.object({
    permitId: z.string().uuid('Invalid permit ID'),
    plantId: z.string().uuid('Invalid plant ID'),
    firstWeighmentAt: z.iso.datetime({ offset: true }).optional(),
    firstWeight: z.number().positive().optional(),
    secondWeighmentAt: z.iso.datetime({ offset: true }).optional(),
    secondWeight: z.number().nonnegative().optional(),
    grossWeight: z.number().positive().optional(),
    tareWeight: z.number().nonnegative().optional(),
    notes: z.string().optional(),
});

export const updateWeighmentSchema = z.object({
    grossWeight: z.number().positive().optional(),
    tareWeight: z.number().nonnegative().optional(),
    notes: z.string().optional(),
});

export const approveWeighmentSchema = z.object({
    paymentAmount: z.number().nonnegative(),
    paymentMethod: z.string().optional(),
});

export const markWeighmentPaidSchema = z.object({
    paymentAmount: z.number().nonnegative('Payment amount must be non-negative'),
    paymentReference: z.string().min(1, 'Payment reference is required'),
    paymentMethod: z.string().optional(),
});

export const rejectWeighmentSchema = z.object({
    reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

// ============================================================
// WASTE EVIDENCE SCHEMAS
// ============================================================

export const createWasteEvidenceSchema = z.object({
    permitId: z.string().uuid('Invalid permit ID'),
    fileName: z.string().min(1),
    filePath: z.string().min(1),
    fileSize: z.number().positive(),
    mimeType: z.string(),
    description: z.string().optional(),
    capturedAt: z.string().datetime().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
});

// ============================================================
// IDENTITY DOCUMENT SCHEMAS
// ============================================================

export const createIdentityDocumentSchema = z.object({
    type: z.enum(['AADHAAR', 'PAN']),
    documentNumber: z.string().min(8, 'Document number is required'),
    filePath: z.string().min(1, 'File path is required').optional(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type SendOTPInput = z.infer<typeof sendOTPSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;
export type CreatePermitInput = z.infer<typeof createPermitSchema>;
export type UpdatePermitInput = z.infer<typeof updatePermitSchema>;
export type SubmitPermitInput = z.infer<typeof submitPermitSchema>;
export type ApprovePermitInput = z.infer<typeof approvePermitSchema>;
export type RejectPermitInput = z.infer<typeof rejectPermitSchema>;
export type CancelPermitInput = z.infer<typeof cancelPermitSchema>;
export type CreateWeighmentInput = z.infer<typeof createWeighmentSchema>;
export type UpdateWeighmentInput = z.infer<typeof updateWeighmentSchema>;
export type ApproveWeighmentInput = z.infer<typeof approveWeighmentSchema>;
export type MarkWeighmentPaidInput = z.infer<typeof markWeighmentPaidSchema>;
export type RejectWeighmentInput = z.infer<typeof rejectWeighmentSchema>;
export type CreateWasteEvidenceInput = z.infer<typeof createWasteEvidenceSchema>;
export type CreateIdentityDocumentInput = z.infer<typeof createIdentityDocumentSchema>;
