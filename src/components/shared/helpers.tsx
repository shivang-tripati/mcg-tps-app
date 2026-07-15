import React from 'react';
import { View, Text, Linking } from 'react-native';
import {STATUS_COLORS, MUTED} from '../../data/contant';




export const WASTE_LABELS: Record<string, string> = {
  CND_SEGREGATED: 'C&D Segregated',
  CND_UNSEGREGATED: 'C&D Unsegregated',
};

export function normalizeId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

export function formatStatus(value?: string | null) {
  if (!value) return 'N/A';
  return value.replaceAll('_', ' ');
}

export function formatWasteType(value?: string | null) {
  if (!value) return 'N/A';
  return WASTE_LABELS[value] ?? formatStatus(value);
}


export function formatDate(value?: string | null) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatDateTime(value?: string | null) {
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

  const displayHour = String(hours).padStart(2, '0');

  return `${day} ${month} ${year} ${displayHour}:${minutes} ${amPm}`;
}

export function formatWeight(value?: number | null) {
  if (value === null || value === undefined) return 'N/A';
  return `${value} kg`;
}

export function formatDuration(from?: string | null, until?: string | null) {
  if (!from || !until) return null;

  const start = new Date(from);
  const end = new Date(until);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0 && remainingHours > 0) return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;

  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

export function getStatusColor(status?: string | null) {
  return STATUS_COLORS[status ?? ''] ?? MUTED;
}

export function openUrl(url?: string | null) {
  if (!url) return;

  Linking.openURL(url).catch(() => {
    // Keep UX silent here; API/file errors are already handled in cards.
  });
}

export function StatusBadge({ status }: { status?: string | null }) {
  const color = getStatusColor(status);

  return (
    <View
      className="px-3 py-1.5 rounded-full self-start"
      style={{ backgroundColor: `${color}18` }}
    >
      <Text className="text-xs font-semibold uppercase" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}
