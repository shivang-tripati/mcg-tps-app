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
import { LucideArrowLeft, LucidePencil, LucideRefreshCw, } from 'lucide-react-native';

import { usePermit, usePermitQRCode } from '../../../../hooks/use-permits';
import { Card } from '../../../../components/shared/card';
import { ErrorState } from '../../../../components/shared/error-state';
import { OverviewCard } from '../../../../components/shared/overview-card';
import { LocationCards } from '../../../../components/shared/location-cards';
import { VehicleCard } from '../../../../components/shared/vehicle-card';
import { EvidenceSection } from '../../../../components/shared/evidence-section';
import { WeighmentSection } from '../../../../components/shared/weighment-section';
import { RejectionCard } from '../../../../components/shared/rejection-card';
import { DigitalPermitCard } from '../../../../components/shared/digital-permit-card';
import { StatusBreakdown } from '../../../../components/shared/status-breakdown-card';
import { normalizeId } from '../../../../components/shared/helpers';
import { PRIMARY } from '../../../../data/contant';

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


  const isDraft = permit.status === 'DRAFT';
  const hasEvidence =
    (permit.wasteEvidences?.length ?? 0) > 0;

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

        {isDraft ? (
          <Card>
            <View className="flex-row items-start">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <LucidePencil
                  size={20}
                  color={PRIMARY}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  Draft permit
                </Text>

                <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                  You can update permit details, add evidence and retry submission.
                </Text>

                {!hasEvidence ? (
                  <Text className="mt-2 text-xs font-medium text-amber-700">
                    Waste evidence is still required.
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/permits/${permit.id}/edit`
                )
              }
              activeOpacity={0.85}
              className="mt-4 flex-row items-center justify-center rounded-xl bg-primary px-4 py-3"
            >
              <LucidePencil
                size={18}
                color="white"
              />

              <Text className="ml-2 font-semibold text-white">
                Edit and continue
              </Text>
            </TouchableOpacity>
          </Card>
        ) : null}

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
