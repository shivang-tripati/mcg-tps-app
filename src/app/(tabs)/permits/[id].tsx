import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LucideArrowLeft } from 'lucide-react-native';

import { usePermit, usePermitQRCode } from '../../../hooks/use-permits';
import { Card } from '../../../components/shared/card';
import { ErrorState } from '../../../components/shared/error-state';
import { OverviewCard } from '../../../components/shared/overview-card';
import { LocationCards } from '../../../components/shared/location-cards';
import { VehicleCard } from '../../../components/shared/vehicle-card';
import { EvidenceSection } from '../../../components/shared/evidence-section';
import { WeighmentSection } from '../../../components/shared/weighment-section';
import { RejectionCard } from '../../../components/shared/rejection-card';
import { DigitalPermitCard } from '../../../components/shared/digital-permit-card';
import { StatusBreakdown } from '../../../components/shared/status-breakdown-card';
import { normalizeId} from '../../../components/shared/helpers';
import { PRIMARY } from '../../../data/contant';

export default function PermitDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeId(params.id);
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePermit(id);

  const permit = data?.data;
  const isApproved = permit ? ['APPROVED', 'IN_TRANSIT', 'COMPLETED'].includes(permit.status) : false;

  const {
    data: qrResponse,
    isLoading: isQrLoading,
  } = usePermitQRCode(id, isApproved);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text className="text-muted-foreground mt-3">Loading permit details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !permit) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Permit not found.'}
        onBack={() => router.back()}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-4 bg-primary flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <LucideArrowLeft size={24} color="white" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-white text-xs opacity-80">Permit Detail</Text>
          <Text className="text-white text-xl font-bold" numberOfLines={1}>
            {permit.permitNumber || 'Permit Detail'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={PRIMARY}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        <OverviewCard permit={permit} />

        <LocationCards permit={permit} />

        <VehicleCard permit={permit} />

        <EvidenceSection evidences={permit.wasteEvidences} />

        <WeighmentSection weighments={permit.weighments} />

        {permit.status === 'REJECTED' ? (
          <RejectionCard reason={permit.rejectionReason || 'No reason provided.'} />
        ) : null}

        {isApproved ? (
          isQrLoading ? (
            <Card>
              <View className="items-center py-6">
                <ActivityIndicator color={PRIMARY} />
                <Text className="text-muted-foreground text-sm mt-3">
                  Loading digital permit...
                </Text>
              </View>
            </Card>
          ) : (
            <DigitalPermitCard
              permit={permit}
              qrCode={qrResponse?.data?.qrCode}
              verificationUrl={qrResponse?.data?.verificationUrl}
            />
          )
        ) : null}

        <StatusBreakdown permit={permit} />
      </ScrollView>
    </SafeAreaView>
  );
}
