import { create } from 'zustand';
import { api } from './api';

export interface OnboardingState {
    /** Whether we've checked the backend for onboarding status */
    checked: boolean;
    /** Whether the user has completed onboarding */
    isOnboarded: boolean;
    /** Whether we're currently checking */
    isChecking: boolean;

    /** For INDIVIDUAL: identity documents uploaded */
    hasAadhaar: boolean;
    hasPAN: boolean;
    aadhaarDoc: any | null;
    panDoc: any | null;

    /** For COMPANY_USER: company association */
    hasCompany: boolean;
    companyId: string | null;
    hasProject: boolean;

    /** Actions */
    checkOnboardingStatus: (user: { role: string; companyId?: string | null }) => Promise<void>;
    setDocumentUploaded: (type: 'AADHAAR' | 'PAN', doc: any) => void;
    setCompanyCreated: (companyId: string) => void;
    setProjectCreated: () => void;
    reset: () => void;
}

export const useOnboarding = create<OnboardingState>((set, get) => ({
    checked: false,
    isOnboarded: false,
    isChecking: false,
    hasAadhaar: false,
    hasPAN: false,
    aadhaarDoc: null,
    panDoc: null,
    hasCompany: false,
    companyId: null,
    hasProject: false,

    checkOnboardingStatus: async (user) => {
        if (get().isChecking) return;
        set({ isChecking: true });

        try {
            if (user.role === 'INDIVIDUAL') {
                // Check for identity documents
                const response = await api.get('/profile');
                const profile = response.data.data;
                const docs = profile?.identityDocuments || [];

                const aadhaar = docs.find((d: any) => d.type === 'AADHAAR');
                const pan = docs.find((d: any) => d.type === 'PAN');

                const hasAadhaar = !!aadhaar;
                const hasPAN = !!pan;

                set({
                    checked: true,
                    isOnboarded: hasAadhaar && hasPAN,
                    hasAadhaar,
                    hasPAN,
                    aadhaarDoc: aadhaar || null,
                    panDoc: pan || null,
                    isChecking: false,
                });
            } else if (user.role === 'COMPANY_USER') {
                const hasCompany = !!user.companyId;
                let hasProject = false;

                if (hasCompany) {
                    try {
                        const resp = await api.get('/projects');
                        const projects = resp.data.data || [];
                        hasProject = projects.length > 0;
                    } catch {
                        hasProject = false;
                    }
                }

                set({
                    checked: true,
                    isOnboarded: hasCompany && hasProject,
                    hasCompany,
                    companyId: user.companyId || null,
                    hasProject,
                    isChecking: false,
                });
            } else {
                // ADMIN / GUEST — skip onboarding
                set({ checked: true, isOnboarded: true, isChecking: false });
            }
        } catch (error) {
            console.error('Onboarding check failed:', error);
            // On error, allow passage to dashboard (don't block)
            set({ checked: true, isOnboarded: true, isChecking: false });
        }
    },

    setDocumentUploaded: (type, doc) => {
        if (type === 'AADHAAR') {
            const newState = { hasAadhaar: true, aadhaarDoc: doc };
            const hasPAN = get().hasPAN;
            set({ ...newState, isOnboarded: hasPAN });
        } else {
            const newState = { hasPAN: true, panDoc: doc };
            const hasAadhaar = get().hasAadhaar;
            set({ ...newState, isOnboarded: hasAadhaar });
        }
    },

    setCompanyCreated: (companyId) => {
        set({ hasCompany: true, companyId });
    },

    setProjectCreated: () => {
        set({ hasProject: true, isOnboarded: true });
    },

    reset: () => {
        set({
            checked: false,
            isOnboarded: false,
            isChecking: false,
            hasAadhaar: false,
            hasPAN: false,
            aadhaarDoc: null,
            panDoc: null,
            hasCompany: false,
            companyId: null,
            hasProject: false,
        });
    },
}));
