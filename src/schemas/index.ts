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

const emptyStringToUndefined = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
};

const optionalText = z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
);

const optionalUuid = (message: string) =>
    z.preprocess(
        emptyStringToUndefined,
        z.string().uuid(message).optional()
    );

const optionalPositiveNumber = (label: string) =>
    z.preprocess(
        (value) => {
            if (value === '' || value === null || value === undefined) return undefined;
            if (typeof value === 'string') {
                const normalized = value.replace(/,/g, '').trim();
                if (!normalized) return undefined;
                return Number(normalized);
            }
            return value;
        },
        z
            // Use 'message' or 'error' instead of 'invalid_type_error'
            .number({ message: `${label} must be a number` })
            .finite(`${label} must be a valid number`)
            .positive(`${label} must be greater than 0`)
            .optional()
    );

const isValidDateTime = (value: string): boolean => {
    // HTML datetime-local value.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) {
        return !Number.isNaN(new Date(value).getTime());
    }

    // ISO date-time value, including timezone/Z.
    return !Number.isNaN(new Date(value).getTime());
};

const optionalDateTimeField = (label: string) =>
    z.preprocess(
        emptyStringToUndefined,
        z
            .string()
            .refine(isValidDateTime, { message: `Please select a valid ${label}` })
            .optional()
    );

const requiredDateTimeField = (label: string) =>
    z
        .string()
        .min(1, `${label} is required`)
        .refine(isValidDateTime, { message: `Please select a valid ${label}` });

const optionalIndianMobile = z.preprocess(
    emptyStringToUndefined,
    z.string().regex(indianMobileRegex, indianMobileMessage).optional()
);

const requiredIndianMobile = z
    .string()
    .trim()
    .min(1, 'Driver phone number is required')
    .regex(indianMobileRegex, indianMobileMessage);

const drivingLicenseRegex = /^([A-Z]{2})(\d{2}|\d{3})[A-Z]{0,1}(\d{4})(\d{7})$/i;
const drivingLicenseMessage =
    'Enter a valid driving licence number, for example DL0420110012345';

const optionalDrivingLicense = z.preprocess(
    emptyStringToUndefined,
    z.string().trim().toUpperCase().regex(drivingLicenseRegex, drivingLicenseMessage).optional()
);


const permitCreateShape = {
    wasteType: z.enum(WasteType),

    estimatedWeight: optionalPositiveNumber('Estimated weight'),
    estimatedVolume: optionalPositiveNumber('Estimated volume'),
    wasteDescription: optionalText,

    projectId: optionalUuid('Invalid project'),
    companyId: optionalUuid('Invalid company'),
    plantId: z
        .string()
        .min(1, 'Please select a destination plant')
        .uuid('Please select a valid destination plant'),

    pickupAddress: z
        .string()
        .trim()
        .min(5, 'Pickup address must be at least 5 characters'),
    pickupCity: z
        .string()
        .trim()
        .min(2, 'Pickup city must be at least 2 characters'),
    pickupState: z
        .string()
        .trim()
        .min(2, 'Pickup state must be at least 2 characters'),
    pickupPincode: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    pickupLatitude: z.number().min(-90).max(90).optional(),
    pickupLongitude: z.number().min(-180).max(180).optional(),

    driverName: optionalText,
    driverPhone: optionalIndianMobile,
    vehicleNumber: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().toUpperCase().optional()
    ),
    vehicleType: optionalText,
    licenseNumber: optionalDrivingLicense,

    validFrom: optionalDateTimeField('start date and time'),
    validUntil: optionalDateTimeField('permit expiry date and time'),
};

const validatePermitDateRange = (
    data: { validFrom?: string; validUntil?: string },
    ctx: z.RefinementCtx
) => {
    if (!data.validFrom || !data.validUntil) return;

    const from = new Date(data.validFrom);
    const until = new Date(data.validUntil);

    if (until.getTime() <= from.getTime()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['validUntil'],
            message: 'Permit expiry must be after the valid-from date and time',
        });
    }
};

const createPermitObjectSchema = z.object(permitCreateShape);

/**
 * Matches the current POST /api/v1/permits create contract.
 * Driver/vehicle fields and dates are optional for drafts.
 */
export const createPermitSchema = createPermitObjectSchema.superRefine(
    validatePermitDateRange
);

/**
 * Use this when mode=submit so the frontend and backend enforce the same
 * transport fields that the web form presents as required.
 * Dates remain optional because they are normally set/confirmed during approval.
 */
export const submitCreatePermitSchema = z
    .object({
        ...permitCreateShape,
        driverName: z.string().trim().min(2, 'Driver name is required'),
        driverPhone: requiredIndianMobile,
        vehicleNumber: z
            .string()
            .trim()
            .toUpperCase()
            .min(4, 'Vehicle registration number is required'),
        vehicleType: z.string().trim().min(2, 'Vehicle type is required'),
        licenseNumber: z
            .string()
            .trim()
            .toUpperCase()
            .regex(drivingLicenseRegex, drivingLicenseMessage),
    })
    .superRefine(validatePermitDateRange);

export const updatePermitSchema = createPermitObjectSchema
    .partial()
    .superRefine(validatePermitDateRange);

export const submitPermitSchema = z.object({
    driverName: z.string().trim().min(2, 'Driver name is required'),
    driverPhone: requiredIndianMobile,
    vehicleNumber: z
        .string()
        .trim()
        .toUpperCase()
        .min(4, 'Vehicle registration number is required'),
    vehicleType: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().optional()
    ),
    licenseNumber: z.preprocess(
        emptyStringToUndefined,
        z.string().trim().toUpperCase().regex(drivingLicenseRegex, drivingLicenseMessage).optional()
    ),
});

export const approvePermitSchema = z
    .object({
        validFrom: requiredDateTimeField('Valid from'),
        validUntil: requiredDateTimeField('Permit expiry time'),
    })
    .superRefine(validatePermitDateRange);

export const rejectPermitSchema = z.object({
    reason: z.string().trim().min(5, 'Rejection reason must be at least 10 characters'),
});

export const cancelPermitSchema = z.object({
    reason: z.string().trim().min(5, 'Cancellation reason must be at least 10 characters'),
});

export const createWasteEvidenceSchema = z.object({
    permitId: z.string().uuid('Invalid permit ID'),
    fileName: z.string().trim().min(1, 'File name is required'),
    filePath: z.string().trim().min(1, 'File path is required'),
    fileSize: z.number().positive('File size must be greater than 0'),
    mimeType: z.string().trim().min(1, 'MIME type is required'),
    description: optionalText,
    capturedAt: z.string().datetime().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
});

/**
 * TextInput values are strings while the API output uses numbers.
 * The Zod preprocessors convert these safely during validation.
 */
export type CreatePermitFormValues = Omit<
    CreatePermitInput,
    'estimatedWeight' | 'estimatedVolume'
> & {
    estimatedWeight?: string;
    estimatedVolume?: string;
};





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