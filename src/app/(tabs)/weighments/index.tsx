import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LucideAlertCircle,
  LucideDownload,
  LucideFileText,
  LucideRefreshCcw,
  LucideSearch,
  LucideScale,
} from 'lucide-react-native';

import { useWeighments } from '../../../hooks/use-weighments';
import { WeighmentListItem } from '../../../types/weighments';
import { downloadWeighmentPdf } from '../../../lib/download-pdf';

const PRIMARY = 'hsl(325 45% 32%)';
const MUTED = 'hsl(220 9% 46%)';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',  // Amber 500
  APPROVED: '#22c55e', // Green 500
  REJECTED: '#ef4444', // Red 500
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',  // Amber 500
  PAID: '#16a34a',     // Green 600 (Using COMPLETED color for paid)
  FAILED: '#ef4444',   // Red 500 (Using REJECTED color)
  REFUNDED: '#94a3b8', // Slate 400 (Using CANCELLED/DRAFT color)
};

function formatStatus(value?: string | null) {
  if (!value) return 'N/A';
  return value.replaceAll('_', ' ');
}

function getStatusColor(status?: string | null) {
  return STATUS_COLORS[status ?? ''] ?? MUTED;
}

function getPaymentColor(status?: string | null) {
  return PAYMENT_COLORS[status ?? ''] ?? MUTED;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function formatWeight(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} kg`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const color = getStatusColor(status);

  return (
    <View className="px-2.5 py-1 rounded-full self-start" style={{ backgroundColor: `${color}18` }}>
      <Text className="text-[11px] font-semibold uppercase" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function PaymentBadge({ status }: { status?: string | null }) {
  const color = getPaymentColor(status);

  return (
    <View className="px-2.5 py-1 rounded-full self-start" style={{ backgroundColor: `${color}18` }}>
      <Text className="text-[11px] font-semibold uppercase" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function DownloadAction({ weighment }: { weighment: WeighmentListItem }) {
  if (weighment.status === 'APPROVED' && weighment.paymentStatus === 'PAID' && weighment.fileUrl) {
    return (
      <TouchableOpacity
        className="bg-blue-600 px-3 py-2 rounded-xl flex-row items-center"
        onPress={() =>
          downloadWeighmentPdf({
            fileUrl: weighment.fileUrl,
            weighmentNumber: weighment.weighmentNumber,
            permitNumber: weighment.permit?.permitNumber,
          })
        }
      >
        <LucideDownload size={15} color="#fff" />
        <Text className="text-white font-semibold text-xs ml-1">Download</Text>
      </TouchableOpacity>
    );
  }

  if (weighment.status === 'APPROVED' && weighment.paymentStatus !== 'PAID') {
    return <Text className="text-xs text-orange-600 font-semibold">Payment Pending</Text>;
  }

  if (weighment.status === 'APPROVED') {
    return <Text className="text-xs text-muted-foreground font-medium">PDF pending</Text>;
  }

  return <Text className="text-xs text-muted-foreground">-</Text>;
}

function WeighmentCard({ weighment }: { weighment: WeighmentListItem }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/weighments/${weighment.id}`)}
      className="bg-card border border-border rounded-2xl p-4 mb-4"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-xs text-muted-foreground mb-1">Weighment No.</Text>
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {weighment.weighmentNumber}
          </Text>
        </View>

        <StatusBadge status={weighment.status} />
      </View>

      <View className="bg-muted/40 rounded-xl p-3 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-xs text-muted-foreground">Permit</Text>
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {weighment.permit?.permitNumber || 'N/A'}
          </Text>
        </View>

        {weighment.permit?.vehicleNumber ? (
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-muted-foreground">Vehicle</Text>
            <Text className="text-sm font-medium text-foreground">
              {weighment.permit.vehicleNumber}
            </Text>
          </View>
        ) : null}

        <View className="flex-row justify-between mb-2">
          <Text className="text-xs text-muted-foreground">Plant</Text>
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {weighment.plant?.name || 'N/A'}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-xs text-muted-foreground">Date</Text>
          <Text className="text-sm font-medium text-foreground">
            {formatDate(weighment.createdAt)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-xs text-muted-foreground mb-1">Net Weight</Text>
          <Text className="text-lg font-bold text-primary">
            {formatWeight(weighment.netWeight)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-xs text-muted-foreground mb-1">Payment</Text>
          <PaymentBadge status={weighment.paymentStatus} />
        </View>
      </View>

      {weighment.status === 'REJECTED' && weighment.rejectionReason ? (
        <View className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex-row items-start">
          <LucideAlertCircle size={16} color="hsl(0 72% 38%)" />
          <Text className="text-xs text-red-700 ml-2 flex-1" numberOfLines={2}>
            {weighment.rejectionReason}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between pt-3 border-t border-border">
        <Text className="text-xs text-muted-foreground">Tap to view details</Text>
        <DownloadAction weighment={weighment} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View className="items-center justify-center py-16">
      <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
        <LucideFileText size={30} color={MUTED} />
      </View>
      <Text className="text-lg font-bold text-foreground mb-1">No weighments found</Text>
      <Text className="text-sm text-muted-foreground text-center">
        {search ? 'Try a different weighment number.' : 'Your weighbridge records will appear here.'}
      </Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center justify-center py-16 px-4">
      <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
        <LucideAlertCircle size={30} color="hsl(0 72% 38%)" />
      </View>

      <Text className="text-lg font-bold text-foreground mb-1">Failed to load weighments</Text>
      <Text className="text-sm text-muted-foreground text-center mb-5">{message}</Text>

      <TouchableOpacity className="bg-primary px-5 py-3 rounded-xl flex-row items-center" onPress={onRetry}>
        <LucideRefreshCcw size={17} color="#fff" />
        <Text className="text-white font-semibold ml-2">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WeighmentsScreen() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      search,
    }),
    [page, search]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useWeighments(params);

  const weighments = data?.data ?? [];
  const meta = data?.pagination;

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const canGoPrevious = !!meta && meta.page > 1;
  const canGoNext = !!meta && meta.page < meta.totalPages;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-4 bg-primary">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-white/15 items-center justify-center mr-3">
            <LucideScale size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-xs opacity-80">My Records</Text>
            <Text className="text-white text-2xl font-bold">Weighments</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pt-4">
        <View className="bg-card border border-border rounded-2xl p-3 mb-4">
          <View className="flex-row items-center">
            <View className="flex-1 flex-row items-center bg-background border border-border rounded-xl px-3">
              <LucideSearch size={18} color={MUTED} />
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search by Weighment Number..."
                placeholderTextColor={MUTED}
                className="flex-1 px-2 py-3 text-foreground"
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
            </View>

            <TouchableOpacity
              className="ml-3 bg-primary px-4 py-3 rounded-xl"
              onPress={handleSearch}
            >
              <Text className="text-white font-semibold">Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text className="text-muted-foreground mt-3">Loading weighments...</Text>
        </View>
      ) : error ? (
        <ScrollView
          className="flex-1 px-5"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
        >
          <ErrorState message={error.message} onRetry={() => refetch()} />
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
          showsVerticalScrollIndicator={false}
        >
          {weighments.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            weighments.map((weighment) => (
              <WeighmentCard key={weighment.id} weighment={weighment} />
            ))
          )}

          {meta && meta.totalPages > 1 ? (
            <View className="flex-row justify-between items-center bg-card border border-border rounded-2xl p-4 mt-2">
              <TouchableOpacity
                disabled={!canGoPrevious}
                className={`px-4 py-2 rounded-xl ${canGoPrevious ? 'bg-primary' : 'bg-muted'}`}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text className={`font-semibold ${canGoPrevious ? 'text-white' : 'text-muted-foreground'}`}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </Text>

              <TouchableOpacity
                disabled={!canGoNext}
                className={`px-4 py-2 rounded-xl ${canGoNext ? 'bg-primary' : 'bg-muted'}`}
                onPress={() => setPage((current) => current + 1)}
              >
                <Text className={`font-semibold ${canGoNext ? 'text-white' : 'text-muted-foreground'}`}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}