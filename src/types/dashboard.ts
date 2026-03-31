export interface DashboardStats {
    totalPermits: number;
    activePermits: number;
    pendingApproval: number;
    completedThisMonth: number;
}

export interface RecentActivity {
    id: string;
    permitNumber: string;
    status: string;
    projectName: string;
    plantName: string;
    updatedAt: string;
}

export interface DashboardData {
    stats: DashboardStats;
    recentActivity: RecentActivity[];
}
