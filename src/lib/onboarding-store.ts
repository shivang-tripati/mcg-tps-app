import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, isNetworkError } from './api';

export interface OnboardingState {
    checked: boolean;
    isOnboarded: boolean;
    isChecking: boolean;
    hasAadhaar: boolean;
    hasPAN: boolean;
    aadhaarDoc: any | null;
    panDoc: any | null;
    hasCompany: boolean;
    companyId: string | null;
    hasProject: boolean;
    cachedProjects: any[] | null;
    lastCheckedAt: number | null;

    checkOnboardingStatus: (user: { role: string; companyId?: string | null }) => Promise<void>;
    handleIndividualOnboarding: () => Promise<void>;
    handleCompanyOnboarding: (user: { role: string; companyId?: string | null }) => Promise<void>;
    setDocumentUploaded: (type: 'AADHAAR' | 'PAN', doc: any) => void;
    setCompanyCreated: (companyId: string) => void;
    setProjectCreated: () => void;
    reset: () => void;
    refreshStatus: (user: { role: string; companyId?: string | null }) => Promise<void>;
    // ✅ Add a callback for when onboarding fails
    onOnboardingError?: (error: Error) => void;
}

export const useOnboarding = create<OnboardingState>()(
    persist(
        (set, get) => ({
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
            cachedProjects: null,
            lastCheckedAt: null,

            handleIndividualOnboarding: async () => {
                console.log('Checking INDIVIDUAL onboarding');
                try {
                    const response = await api.get('/profile', { timeout: 5000 });
                    const profile = response.data.data;
                    const docs = profile?.identityDocuments || [];

                    const aadhaar = docs.find((d: any) => d.type === 'AADHAAR');
                    const pan = docs.find((d: any) => d.type === 'PAN');

                    const hasAadhaar = !!aadhaar;
                    const hasPAN = !!pan;

                    console.log('Individual docs found:', { hasAadhaar, hasPAN });

                    set({
                        checked: true,
                        isOnboarded: hasAadhaar && hasPAN,
                        hasAadhaar,
                        hasPAN,
                        aadhaarDoc: aadhaar || null,
                        panDoc: pan || null,
                        isChecking: false,
                        lastCheckedAt: Date.now(),
                    });
                } catch (error) {
                    console.error('Individual onboarding check failed:', error);
                    set({ isChecking: false });
                    
                    // ✅ Call error callback if set
                    const onError = get().onOnboardingError;
                    if (onError) {
                        onError(error as Error);
                    }
                    
                    throw error;
                }
            },

            handleCompanyOnboarding: async (user: { role: string; companyId?: string | null }) => {
                const hasCompany = !!user.companyId;
                console.log('Has company:', hasCompany, 'Company ID:', user.companyId);
                
                let hasProject = false;
                let projects: any[] = [];

                if (hasCompany) {
                    try {
                        console.log('Fetching projects with timeout...');
                        const resp = await api.get('/projects', { timeout: 5000 });
                        projects = resp.data.data || [];
                        hasProject = projects.length > 0;
                        console.log('Projects found:', projects.length);
                        
                        set({ cachedProjects: projects });
                    } catch (error: any) {
                        console.error('Error fetching projects:', error);
                        
                        if (isNetworkError(error)) {
                            console.log('Network error fetching projects - using cache if available');
                            const cached = get().cachedProjects;
                            if (cached !== null) {
                                console.log('Using cached projects:', cached.length);
                                projects = cached;
                                hasProject = cached.length > 0;
                            } else {
                                hasProject = false;
                            }
                        } else {
                            const cached = get().cachedProjects;
                            if (cached !== null) {
                                console.log('Using cached projects:', cached.length);
                                projects = cached;
                                hasProject = cached.length > 0;
                            } else {
                                hasProject = false;
                            }
                        }
                    }
                }

                const isOnboarded = hasCompany && hasProject;
                console.log('Company user status:', { hasCompany, hasProject, isOnboarded });

                set({
                    checked: true,
                    isOnboarded,
                    hasCompany,
                    companyId: user.companyId || null,
                    hasProject,
                    isChecking: false,
                    lastCheckedAt: Date.now(),
                });
            },

            checkOnboardingStatus: async (user: { role: string; companyId?: string | null }) => {
                if (get().isChecking) {
                    console.log('Onboarding check already in progress');
                    return;
                }

                const lastChecked = get().lastCheckedAt;
                const cacheAge = lastChecked ? Date.now() - lastChecked : Infinity;
                const isCacheValid = cacheAge < 5 * 60 * 1000;

                if (get().checked && get().isOnboarded && isCacheValid) {
                    console.log('Using cached onboarding status');
                    return;
                }

                console.log('Starting onboarding check for user:', user.role);
                set({ isChecking: true });

                try {
                    if (user.role === 'INDIVIDUAL') {
                        await get().handleIndividualOnboarding();
                    } else if (user.role === 'COMPANY_USER') {
                        await get().handleCompanyOnboarding(user);
                    } else {
                        console.log('Admin or guest user - skipping onboarding');
                        set({ 
                            checked: true, 
                            isOnboarded: true, 
                            isChecking: false,
                            lastCheckedAt: Date.now(),
                        });
                    }
                } catch (error) {
                    console.error('Onboarding check failed:', error);

                    const cachedProjects = get().cachedProjects;
                    if (cachedProjects !== null) {
                        console.log('Using cached projects data on error');
                        const hasProject = cachedProjects.length > 0;
                        set({
                            checked: true,
                            isOnboarded: get().hasCompany && hasProject,
                            hasProject,
                            isChecking: false,
                            lastCheckedAt: Date.now(),
                        });
                    } else {
                        set({ 
                            checked: true, 
                            isOnboarded: false, 
                            isChecking: false,
                            lastCheckedAt: Date.now(),
                        });
                    }
                }
            },

            refreshStatus: async (user: { role: string; companyId?: string | null }) => {
                set({ 
                    checked: false, 
                    isOnboarded: false,
                    cachedProjects: null,
                    lastCheckedAt: null,
                });
                await get().checkOnboardingStatus(user);
            },

            setDocumentUploaded: (type: 'AADHAAR' | 'PAN', doc: any) => {
                if (type === 'AADHAAR') {
                    const newState = { hasAadhaar: true, aadhaarDoc: doc };
                    const hasPAN = get().hasPAN;
                    set({ ...newState, isOnboarded: hasPAN, lastCheckedAt: Date.now() });
                } else {
                    const newState = { hasPAN: true, panDoc: doc };
                    const hasAadhaar = get().hasAadhaar;
                    set({ ...newState, isOnboarded: hasAadhaar, lastCheckedAt: Date.now() });
                }
            },

            setCompanyCreated: (companyId: string) => {
                set({ 
                    hasCompany: true, 
                    companyId,
                    lastCheckedAt: Date.now(),
                });
            },

            setProjectCreated: () => {
                set({ 
                    hasProject: true, 
                    isOnboarded: true,
                    lastCheckedAt: Date.now(),
                });
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
                    cachedProjects: null,
                    lastCheckedAt: null,
                });
            },
        }),
        {
            name: 'onboarding-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                checked: state.checked,
                isOnboarded: state.isOnboarded,
                hasAadhaar: state.hasAadhaar,
                hasPAN: state.hasPAN,
                hasCompany: state.hasCompany,
                hasProject: state.hasProject,
                companyId: state.companyId,
                cachedProjects: state.cachedProjects,
                lastCheckedAt: state.lastCheckedAt,
            }),
        }
    )
);