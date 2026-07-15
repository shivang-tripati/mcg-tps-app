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
import SectionHeader from '../../../components/shared/section-header';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  LucideAlertCircle,
  LucideArrowLeft,
  LucideBuilding2,
  LucideCalendar,
  LucideDownload,
  LucideFactory,
  LucideFileText,
  LucideHash,
  LucideMapPin,
  LucideRefreshCcw,
  LucideScale,
  LucideTruck,
  LucideUser,
  LucideWallet,
} from 'lucide-react-native'


import { PRIMARY, MUTED, STATUS_COLORS, PAYMENT_COLORS } from '../../../data/contant';

import { useWeighment } from '../../../hooks/use-weighments';
import { WeighmentDetail } from '../../../types/weighments';
import { downloadWeighmentPdf } from '../../../lib/download-pdf';



function normalizeId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

function formatStatus(value?: string | null) {
  if (!value) return 'N/A';
  return value.replaceAll('_', ' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const amPm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  return `${day} ${month} ${year} ${String(hours).padStart(2, '0')}:${minutes} ${amPm}`;
}

function formatWeight(value?: number | null) {
  if (value === null || value === undefined) return 'N/A';
  return `${value} kg`;
}

function formatAmount(value?: number | null) {
  if (value === null || value === undefined) return 'N/A';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusColor(status?: string | null) {
  return STATUS_COLORS[status ?? ''] ?? MUTED;
}

function getPaymentColor(status?: string | null) {
  return PAYMENT_COLORS[status ?? ''] ?? MUTED;
}

function StatusBadge({ status }: { status?: string | null }) {
  const color = getStatusColor(status);

  return (
    <View className="px-3 py-1.5 rounded-full self-start" style={{ backgroundColor: `${color}18` }}>
      <Text className="text-xs font-semibold uppercase" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function PaymentBadge({ status }: { status?: string | null }) {
  const color = getPaymentColor(status);

  return (
    <View className="px-3 py-1.5 rounded-full self-start" style={{ backgroundColor: `${color}18` }}>
      <Text className="text-xs font-semibold uppercase" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`bg-card border border-border rounded-2xl p-4 mb-4 ${className}`}>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
  last = false,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-start py-3 ${last ? '' : 'border-b border-border'}`}>
      {Icon ? <Icon size={18} color={MUTED} /> : null}

      <View className={Icon ? 'ml-3 flex-1' : 'flex-1'}>
        <Text className="text-xs text-muted-foreground mb-1">{label}</Text>
        <Text className="text-sm text-foreground font-medium">
          {value || 'N/A'}
        </Text>
      </View>
    </View>
  );
}

function ErrorState({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
        <LucideAlertCircle size={30} color="hsl(0 72% 38%)" />
      </View>

      <Text className="text-error text-lg font-bold text-center mb-2">
        Failed to load weighment
      </Text>

      <Text className="text-muted-foreground text-sm text-center mb-6">
        {message}
      </Text>

      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-xl w-full items-center mb-3"
        onPress={onRetry}
      >
        <View className="flex-row items-center">
          <LucideRefreshCcw size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Try Again</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-card border border-border px-6 py-3 rounded-xl w-full items-center"
        onPress={onBack}
      >
        <Text className="text-foreground font-semibold">Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function WeightOverview({
  weighment,
}: {
  weighment: WeighmentDetail;
}) {
  return (
    <Card>
      <SectionHeader
        icon={LucideScale}
        title="Weighment Overview"
        rightElement={
          <StatusBadge status={weighment.status} />
        }
      />

      <InfoRow
        label="Weighment No."
        value={weighment.weighmentNumber || 'N/A'}
        icon={LucideHash}
      />

      <InfoRow
        label="First Weight"
        value={formatWeight(weighment.firstWeight)}
        icon={LucideScale}
      />

      <InfoRow
        label="Second Weight"
        value={formatWeight(weighment.secondWeight)}
        icon={LucideScale}
      />

      <InfoRow
        label="Net Weight"
        value={formatWeight(weighment.netWeight)}
        icon={LucideScale}
      />

      <InfoRow
        label="Created At"
        value={formatDateTime(weighment.createdAt)}
        icon={LucideCalendar}
      />

      {weighment.firstWeighmentAt ? (
        <InfoRow
          label="First Weighment At"
          value={formatDateTime(
            weighment.firstWeighmentAt
          )}
          icon={LucideCalendar}
        />
      ) : null}

      {weighment.secondWeighmentAt ? (
        <InfoRow
          label="Second Weighment At"
          value={formatDateTime(
            weighment.secondWeighmentAt
          )}
          icon={LucideCalendar}
        />
      ) : null}

      {weighment.approvedAt ? (
        <InfoRow
          label="Approved At"
          value={formatDateTime(
            weighment.approvedAt
          )}
          icon={LucideCalendar}
          last
        />
      ) : null}
    </Card>
  );
}

function PermitCard({ weighment }: { weighment: WeighmentDetail }) {
  const permit = weighment.permit;

  return (
    <Card>
      <SectionHeader icon={LucideFileText} title="Permit Details" />

      <InfoRow label="Permit No." value={permit?.permitNumber} icon={LucideHash} />
      <InfoRow label="Permit Status" value={formatStatus(permit?.status)} icon={LucideFileText} />
      <InfoRow label="Waste Type" value={formatStatus(permit?.wasteType)} icon={LucideFileText} />
      <InfoRow label="Vehicle Number" value={permit?.vehicleNumber} icon={LucideTruck} />
      <InfoRow label="Driver Name" value={permit?.driverName} icon={LucideUser} />
      <InfoRow label="Driver Phone" value={permit?.driverPhone} icon={LucideUser} />

      <InfoRow
        label="Project"
        value={permit?.project?.name}
        icon={LucideBuilding2}
      />

      <InfoRow
        label="Project Address"
        value={[permit?.project?.address, permit?.project?.city].filter(Boolean).join(', ') || 'N/A'}
        icon={LucideMapPin}
        last
      />
    </Card>
  );
}

function PlantCard({ weighment }: { weighment: WeighmentDetail }) {
  const plant = weighment.plant;

  return (
    <Card>
      <SectionHeader icon={LucideFactory} title="Plant Details" />

      <InfoRow label="Plant" value={plant?.name} icon={LucideFactory} />
      <InfoRow label="Code" value={plant?.code} icon={LucideHash} />
      <InfoRow
        label="Address"
        value={[plant?.address, plant?.city].filter(Boolean).join(', ') || 'N/A'}
        icon={LucideMapPin}
        last
      />
    </Card>
  );
}

 function PaymentCard({ weighment }: { weighment: WeighmentDetail }) {
  return (
    <Card>
      {/* Added flex-row layout constraints and a gap to keep the badge in bounds */}
      <View className="flex-row justify-between items-start mb-4 gap-2">
        <View className="flex-1">
          <SectionHeader icon={LucideWallet} title="Payment" />
        </View>
        
        <View className="flex-shrink-0">
          <PaymentBadge status={weighment.paymentStatus} />
        </View>
      </View>

      <InfoRow label="Payment Status" value={formatStatus(weighment.paymentStatus)} icon={LucideWallet} />
      <InfoRow label="Amount" value={formatAmount(weighment.paymentAmount)} icon={LucideWallet} />
      <InfoRow label="Method" value={weighment.paymentMethod} icon={LucideWallet} />
      <InfoRow label="Reference" value={weighment.paymentReference} icon={LucideHash} />

      {weighment.paidAt ? (
        <InfoRow label="Marked Paid At" value={formatDateTime(weighment.paidAt)} icon={LucideCalendar} />
      ) : null}

      {weighment.paidBy ? (
        <InfoRow label="Marked Paid By" value={weighment.paidBy.name} icon={LucideUser} last />
      ) : null}
    </Card>
  );
}

function ApprovalCard({ weighment }: { weighment: WeighmentDetail }) {
  if (!weighment.approvedBy && !weighment.rejectionReason && !weighment.notes) return null;

  return (
    <Card className={weighment.status === 'REJECTED' ? 'border-red-200 bg-red-50' : ''}>
      <SectionHeader
        icon={weighment.status === 'REJECTED' ? LucideAlertCircle : LucideUser}
        title={weighment.status === 'REJECTED' ? 'Rejection Details' : 'Approval Details'}
      />

      {weighment.approvedBy ? (
        <InfoRow label="Approved By" value={weighment.approvedBy.name} icon={LucideUser} />
      ) : null}

      {weighment.rejectionReason ? (
        <InfoRow label="Rejection Reason" value={weighment.rejectionReason} icon={LucideAlertCircle} />
      ) : null}

      {weighment.notes ? (
        <InfoRow label="Notes" value={weighment.notes} icon={LucideFileText} last />
      ) : null}
    </Card>
  );
}

function DownloadCard({ weighment }: { weighment: WeighmentDetail }) {
  if (weighment.status === 'APPROVED' && weighment.paymentStatus === 'PAID' && weighment.fileUrl) {
    return (
      <Card>
        <SectionHeader icon={LucideDownload} title="Weighment PDF" />

        <Text className="text-sm text-muted-foreground mb-4">
          Your weighment document is ready. You can download or share it from your device.
        </Text>

        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl items-center flex-row justify-center"
          onPress={() =>
            downloadWeighmentPdf({
              fileUrl: weighment.fileUrl,
              weighmentNumber: weighment.weighmentNumber,
              permitNumber: weighment.permit?.permitNumber,
            })
          }
        >
          <LucideDownload size={18} color="#fff" />
          <Text className="text-white font-semibold ml-2">Download PDF</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (weighment.status === 'APPROVED' && weighment.paymentStatus !== 'PAID') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <SectionHeader icon={LucideWallet} title="Payment Pending" />
        <Text className="text-sm text-orange-700">
          This weighment is approved, but payment is still pending. PDF download will be available after payment.
        </Text>
      </Card>
    );
  }

  if (weighment.status === 'APPROVED') {
    return (
      <Card>
        <SectionHeader icon={LucideFileText} title="PDF Pending" />
        <Text className="text-sm text-muted-foreground">
          The weighment PDF is not available yet. Please check again later.
        </Text>
      </Card>
    );
  }

  return null;
}

export default function WeighmentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeId(params.id);
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useWeighment(id);

  const weighment = data?.data;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text className="text-muted-foreground mt-3">Loading weighment details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !weighment) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Weighment not found.'}
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
          <Text className="text-white text-xs opacity-80">Weighment Detail</Text>
          <Text className="text-white text-xl font-bold" numberOfLines={1}>
            {weighment.weighmentNumber || 'Weighment Detail'}
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
        <View className="mb-4 flex-row items-center justify-between">
          <StatusBadge status={weighment.status} />
          <PaymentBadge status={weighment.paymentStatus} />
        </View>

        <WeightOverview weighment={weighment} />

        <DownloadCard weighment={weighment} />

        <PermitCard weighment={weighment} />

        <PlantCard weighment={weighment} />

        <PaymentCard weighment={weighment} />

        <ApprovalCard weighment={weighment} />
      </ScrollView>
    </SafeAreaView>
  );
}