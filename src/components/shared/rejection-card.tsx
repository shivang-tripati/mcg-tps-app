import React from 'react';
import { Text } from 'react-native';
import { LucideAlertTriangle } from 'lucide-react-native';
import { Card, SectionHeader } from './card';

export function RejectionCard({ reason }: { reason?: string | null }) {
  if (!reason) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <SectionHeader icon={LucideAlertTriangle} title="Rejection Reason" />

      <Text className="text-red-700 font-semibold">
        {reason}
      </Text>

      <Text className="text-sm mt-3 text-red-600/80">
        Please review the application guidelines and submit a new permit with corrected information.
      </Text>
    </Card>
  );
}
