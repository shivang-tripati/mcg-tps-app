import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    LucideBuilding2,
    LucideMapPin,
    LucideMail,
    LucidePhone,
    LucideFileText,
    LucideFolder,
    LucideUsers,
    LucideChevronRight
} from 'lucide-react-native';
import { useCompany, useProjects } from '../../../hooks/use-admin';

export default function CompanyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: companyRes, isLoading: loadingCompany } = useCompany(id);
    const { data: projectsRes, isLoading: loadingProjects } = useProjects({ companyId: id });

    if (loadingCompany) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="hsl(325 45% 32%)" />
            </SafeAreaView>
        );
    }

    const company = companyRes?.data;
    const projects = projectsRes?.data || [];

    if (!company) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-muted-foreground">Company not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView className="flex-1">
                {/* Header Card */}
                <View className="bg-card m-4 rounded-xl border border-border p-4">
                    <View className="flex-row items-center mb-4">
                        <View className="p-3 rounded-xl bg-purple-100 mr-3">
                            <LucideBuilding2 size={28} color="hsl(262 83% 58%)" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-foreground">{company.name}</Text>
                            <View className={`mt-1 px-2 py-0.5 rounded-full self-start ${company.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                                <Text className={`text-xs ${company.isActive ? 'text-green-700' : 'text-red-700'}`}>
                                    {company.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Details */}
                    <View className="gap-3">
                        {company.registrationNumber && (
                            <View className="flex-row">
                                <Text className="text-muted-foreground w-24 text-sm">Reg. No:</Text>
                                <Text className="text-foreground flex-1 text-sm font-medium">{company.registrationNumber}</Text>
                            </View>
                        )}
                        {company.gstNumber && (
                            <View className="flex-row">
                                <Text className="text-muted-foreground w-24 text-sm">GST:</Text>
                                <Text className="text-foreground flex-1 text-sm font-medium">{company.gstNumber}</Text>
                            </View>
                        )}
                        {company.address && (
                            <View className="flex-row items-start">
                                <LucideMapPin size={16} color="hsl(240 3.8% 46.1%)" className="mt-0.5" />
                                <Text className="text-muted-foreground flex-1 text-sm ml-2">
                                    {company.address}, {company.city}, {company.state} - {company.pincode}
                                </Text>
                            </View>
                        )}
                        {company.contactEmail && (
                            <View className="flex-row items-center">
                                <LucideMail size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{company.contactEmail}</Text>
                            </View>
                        )}
                        {company.contactPhone && (
                            <View className="flex-row items-center">
                                <LucidePhone size={16} color="hsl(240 3.8% 46.1%)" />
                                <Text className="text-muted-foreground text-sm ml-2">{company.contactPhone}</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-3 mt-4 pt-4 border-t border-border">
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideUsers size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{company._count?.users || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Users</Text>
                        </View>
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideFolder size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{company._count?.projects || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Projects</Text>
                        </View>
                        <View className="flex-1 items-center bg-muted rounded-lg py-3">
                            <LucideFileText size={20} color="hsl(240 3.8% 46.1%)" />
                            <Text className="text-lg font-bold text-foreground mt-1">{company._count?.permits || 0}</Text>
                            <Text className="text-xs text-muted-foreground">Permits</Text>
                        </View>
                    </View>
                </View>

                {/* Projects List */}
                <View className="px-4 mb-4">
                    <Text className="text-lg font-semibold text-foreground mb-3">Projects</Text>
                    {loadingProjects ? (
                        <ActivityIndicator size="small" color="hsl(325 45% 32%)" />
                    ) : projects.length > 0 ? (
                        projects.map((project) => (
                            <TouchableOpacity
                                key={project.id}
                                className="bg-card rounded-xl p-4 border border-border mb-2"
                                onPress={() => {/* Navigate to project detail if needed */ }}
                            >
                                <View className="flex-row items-center">
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-foreground">{project.name}</Text>
                                        <View className="flex-row items-center mt-1">
                                            <LucideMapPin size={12} color="hsl(240 3.8% 46.1%)" />
                                            <Text className="text-xs text-muted-foreground ml-1">
                                                {project.city}, {project.state}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="bg-muted px-2 py-1 rounded-md mr-2">
                                        <Text className="text-[10px] text-muted-foreground">
                                            {project._count?.permits || 0} permits
                                        </Text>
                                    </View>
                                    <LucideChevronRight size={16} color="hsl(240 3.8% 46.1%)" />
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View className="bg-card rounded-xl p-6 border border-border items-center">
                            <LucideFolder size={32} color="hsl(240 3.8% 46.1%)" opacity={0.5} />
                            <Text className="text-muted-foreground mt-2">No projects yet</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
